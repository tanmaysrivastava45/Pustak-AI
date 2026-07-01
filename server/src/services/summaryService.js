import { getGeminiClient, generateContentWithRetry } from '../lib/gemini.js';
import { getSupabaseAdmin, getSupabaseUserClient } from '../lib/supabase.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { NotFoundError, ForbiddenError, InternalServerError, BadRequestError } from '../utils/errors.js';

const VALID_SUMMARY_TYPES = ['concise', 'detailed', 'key_takeaways', 'suggested_questions'];

/**
 * Builds the summarization prompt based on summary type.
 */
function buildSummaryPrompt(summaryType, textContent, docName) {
  switch (summaryType) {
    case 'concise':
      return `You are an expert research analyst. Provide a clear, concise executive summary (2-3 paragraphs) of the following document content from "${docName}". Focus on the core objective, main arguments, and primary conclusions.
      
DOCUMENT CONTENT:
${textContent}

CONCISE EXECUTIVE SUMMARY:`;

    case 'detailed':
      return `You are an expert research analyst. Provide a comprehensive, structured summary of the following document content from "${docName}".
Organize the summary with clear markdown headings:
- **Overview & Background**
- **Core Findings & Methodology**
- **Detailed Insights & Results**
- **Significance & Implications**

DOCUMENT CONTENT:
${textContent}

DETAILED SUMMARY:`;

    case 'key_takeaways':
      return `You are an expert research analyst. Extract 5 to 8 essential, high-impact key takeaways from "${docName}".
Format as a clean markdown bulleted list. Each bullet should have a bold title followed by a concise explanation.

DOCUMENT CONTENT:
${textContent}

KEY TAKEAWAYS:`;

    case 'suggested_questions':
      return `Based on the provided content from "${docName}", generate 5 thoughtful, insightful questions that a researcher or student should explore next.
Format as a numbered markdown list. Ensure questions are specific to the document's content.

DOCUMENT CONTENT:
${textContent}

SUGGESTED RESEARCH QUESTIONS:`;

    default:
      throw new BadRequestError(`Unsupported summary type: ${summaryType}`);
  }
}

/**
 * Generates or retrieves cached summary for a document.
 * Handles staged summarization for large documents to avoid token overflow.
 * 
 * @param {object} params
 * @param {string} params.documentId - Document ID
 * @param {string} params.userId - Authenticated user ID
 * @param {string} params.summaryType - 'concise' | 'detailed' | 'key_takeaways' | 'suggested_questions'
 * @param {boolean} [params.forceRefresh=false] - Invalidate cache if true
 * @param {string} [params.token] - User auth token
 * @returns {Promise<{ summaryType: string, content: string, cached: boolean }>}
 */
export async function getOrGenerateSummary({
  documentId,
  userId,
  summaryType = 'concise',
  forceRefresh = false,
  token = null,
}) {
  if (!VALID_SUMMARY_TYPES.includes(summaryType)) {
    throw new BadRequestError(`Invalid summary type. Must be one of: ${VALID_SUMMARY_TYPES.join(', ')}`);
  }

  const supabase = token ? getSupabaseUserClient(token) : getSupabaseAdmin();
  if (!supabase) {
    throw new InternalServerError('Database client unavailable');
  }

  // Step 1: Verify document ownership
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('id, file_name, user_id, status')
    .eq('id', documentId)
    .single();

  if (docError || !doc) {
    throw new NotFoundError('Document not found');
  }

  if (doc.user_id !== userId) {
    throw new ForbiddenError('You do not have permission to view or summarize this document');
  }

  if (doc.status !== 'ready') {
    throw new BadRequestError(`Document is currently ${doc.status}. Wait until it is 'ready' to generate summaries.`);
  }

  // Step 2: Check cache (unless forceRefresh is requested)
  if (!forceRefresh) {
    const { data: cachedSummary } = await supabase
      .from('document_summaries')
      .select('content, updated_at')
      .eq('document_id', documentId)
      .eq('summary_type', summaryType)
      .maybeSingle();

    if (cachedSummary && cachedSummary.content) {
      logger.info(`Returning cached ${summaryType} summary for document ${documentId}`);
      return {
        summaryType,
        content: cachedSummary.content,
        cached: true,
      };
    }
  }

  // Step 3: Fetch document chunks
  const { data: chunks, error: chunkError } = await supabase
    .from('document_chunks')
    .select('content, chunk_index, page_number')
    .eq('document_id', documentId)
    .order('chunk_index', { ascending: true });

  if (chunkError || !chunks || chunks.length === 0) {
    throw new BadRequestError('No processed text chunks found for this document');
  }

  const ai = getGeminiClient();
  if (!ai && process.env.NODE_ENV === 'test') {
    return {
      summaryType,
      content: `Mock ${summaryType} summary for ${doc.file_name}`,
      cached: false,
    };
  }

  if (!ai) {
    throw new InternalServerError('Gemini AI client is not configured. Missing GEMINI_API_KEY.');
  }

  // Step 4: Prepare aggregate content for summarization
  // Gemini 3.5 Flash features a 1M token context window (~4M characters).
  // Rather than making dozens of fragmented calls that trigger the 5 RPM Free Tier quota limit,
  // we compile the full document or representative sample into a clean single prompt.
  let aggregateContent = '';
  const totalChars = chunks.reduce((acc, c) => acc + (c.content?.length || 0), 0);

  if (totalChars <= 150000) {
    // Fits comfortably in single call
    aggregateContent = chunks.map(c => `[Page ${c.page_number}]: ${c.content}`).join('\n\n');
  } else {
    logger.info(`Large document (${chunks.length} chunks, ${totalChars} chars). Sampling representative passages across entire document...`);
    // Sample evenly across the document to keep under 120,000 chars while covering all chapters
    const sampleRate = Math.ceil(chunks.length / 120);
    const sampled = chunks.filter((_, idx) => idx % sampleRate === 0);
    aggregateContent = sampled.map(c => `[Page ${c.page_number}]: ${c.content}`).join('\n\n');
  }

  // Step 5: Final Synthesis Prompt with automatic retry on 503/429
  const prompt = buildSummaryPrompt(summaryType, aggregateContent, doc.file_name);
  const response = await generateContentWithRetry({
    model: env.GEMINI_CHAT_MODEL || 'gemini-3.5-flash',
    contents: prompt,
  });

  const generatedContent = response.text || '';

  // Step 6: Store in document_summaries cache
  const { error: upsertError } = await supabase
    .from('document_summaries')
    .upsert({
      document_id: documentId,
      user_id: userId,
      summary_type: summaryType,
      content: generatedContent,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'document_id,summary_type',
    });

  if (upsertError) {
    logger.warn('Failed to cache document summary:', upsertError);
  }

  return {
    summaryType,
    content: generatedContent,
    cached: false,
  };
}

/**
 * Generates notebook-level suggested questions based on uploaded documents.
 * 
 * @param {string} notebookId - Notebook ID
 * @param {string} userId - Authenticated user ID
 * @param {string} [token] - User token
 * @returns {Promise<string[]>} List of suggested starter questions
 */
export async function generateNotebookSuggestedQuestions(notebookId, userId, token = null) {
  const supabase = token ? getSupabaseUserClient(token) : getSupabaseAdmin();
  if (!supabase) {
    throw new InternalServerError('Database client unavailable');
  }

  // Verify notebook ownership
  const { data: notebook } = await supabase
    .from('notebooks')
    .select('id, title, user_id')
    .eq('id', notebookId)
    .single();

  if (!notebook || notebook.user_id !== userId) {
    throw new ForbiddenError('Notebook not found or access denied');
  }

  // Fetch ready documents in notebook
  const { data: docs } = await supabase
    .from('documents')
    .select('id, file_name')
    .eq('notebook_id', notebookId)
    .eq('status', 'ready');

  if (!docs || docs.length === 0) {
    return [
      "What are the main topics discussed in these documents?",
      "Can you summarize the primary findings?",
      "What methodology was used in the research?",
      "What are the practical applications mentioned?",
    ];
  }

  // Sample top chunks from each document
  const docIds = docs.map(d => d.id);
  const { data: sampleChunks } = await supabase
    .from('document_chunks')
    .select('content, document_id')
    .in('document_id', docIds)
    .eq('chunk_index', 0)
    .limit(6);

  const contextSnippet = sampleChunks?.map(c => c.content).join('\n---\n') || docs.map(d => d.file_name).join(', ');

  const ai = getGeminiClient();
  if (!ai && process.env.NODE_ENV === 'test') {
    return [
      `What is the primary conclusion of ${docs[0]?.file_name}?`,
      "Can you compare the key findings across sources?",
      "What evidence is presented to support the claims?",
      "What are the main limitations identified?",
    ];
  }

  if (!ai) {
    return [
      "What are the key takeaways from these sources?",
      "Can you provide an overview of the documents?",
      "What are the most significant insights?",
    ];
  }

  const prompt = `Based on the following document excerpts from notebook "${notebook.title}", suggest 4 concise, intriguing questions a researcher might ask.
Return ONLY a valid JSON array of 4 strings, with no markdown code fences or other text.
Example format: ["Question 1?", "Question 2?", "Question 3?", "Question 4?"]

EXCERPTS:
${contextSnippet}`;

  try {
    const response = await generateContentWithRetry({
      model: env.GEMINI_CHAT_MODEL || 'gemini-3.5-flash',
      contents: prompt,
    });

    const text = response.text || '';
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const questions = JSON.parse(cleanJson);
    if (Array.isArray(questions) && questions.length > 0) {
      return questions.slice(0, 5);
    }
  } catch (error) {
    logger.warn('Failed to parse dynamic suggested questions, returning fallbacks:', error);
  }

  return [
    `What are the most significant conclusions in ${docs[0]?.file_name}?`,
    "Can you synthesize the key themes across these documents?",
    "What specific methodologies are highlighted?",
    "What recommendations are made for future study?",
  ];
}
