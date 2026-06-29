import { retrieveRelevantChunks } from './retrievalService.js';
import { formatContextSourcesForPrompt, validateAndExtractCitations } from './citationService.js';
import { getGeminiClient, generateContentWithRetry } from '../lib/gemini.js';
import { getSupabaseAdmin, getSupabaseUserClient } from '../lib/supabase.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { InternalServerError, NotFoundError, ForbiddenError } from '../utils/errors.js';

/**
 * Builds the strict grounding prompt for Gemini.
 */
function buildGroundingPrompt(question, formattedSources, conversationHistory = []) {
  const historyText = conversationHistory.length > 0
    ? `\nPREVIOUS CONVERSATION HISTORY:\n${conversationHistory
        .slice(-4)
        .map(m => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n')}\n`
    : '';

  return `You are Pustak AI, a document-grounded research assistant inspired by NotebookLM.
Your mission is to provide accurate, truthful, and strictly evidence-backed answers based ONLY on the provided Context Sources.

CRITICAL GROUNDING RULES:
1. Base your answer EXCLUSIVELY on the facts provided in the Context Sources below.
2. DO NOT use outside general knowledge, do not extrapolate, and do not make assumptions.
3. Every factual claim must include an inline citation marker [cite:X] indicating the source number that supports it, e.g., "The algorithm uses gradient descent [cite:1]."
4. Place citation markers immediately after the sentence or clause containing the claim.
5. If the provided Context Sources do NOT contain enough information to answer the question, state honestly and clearly:
   "The available documents do not provide enough evidence to answer this question."
   Do NOT attempt to fabricate an answer or invent citations.
6. Format your response cleanly using GitHub-flavored Markdown (bullet points, bold text, code blocks where appropriate).

${formattedSources}
${historyText}
USER QUESTION:
${question}

GROUNDED ANSWER (with [cite:X] citations):`;
}

/**
 * Processes a user question in a notebook conversation, retrieves passages,
 * calls Gemini, validates citations, and stores the message in PostgreSQL.
 * 
 * @param {object} params
 * @param {string} params.notebookId - Notebook ID
 * @param {string} params.conversationId - Conversation ID
 * @param {string} params.userId - Authenticated user ID
 * @param {string} params.question - User's question
 * @param {string[]} [params.selectedDocumentIds] - Specific documents selected by user
 * @param {string} [params.token] - User JWT token
 * @returns {Promise<{ userMessage: object, assistantMessage: object }>}
 */
export async function answerQuestion({
  notebookId,
  conversationId,
  userId,
  question,
  selectedDocumentIds = null,
  token = null,
}) {
  const supabase = token ? getSupabaseUserClient(token) : getSupabaseAdmin();
  if (!supabase) {
    throw new InternalServerError('Database connection unavailable');
  }

  // Step 1: Verify conversation belongs to notebook and user
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .select('id, notebook_id, user_id')
    .eq('id', conversationId)
    .single();

  if (convError || !conv) {
    throw new NotFoundError('Conversation not found');
  }

  if (conv.user_id !== userId || conv.notebook_id !== notebookId) {
    throw new ForbiddenError('You do not have permission to post to this conversation');
  }

  // Step 2: Fetch recent message history for context
  const { data: history } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(6);

  // Step 3: Save user's question to database
  const { data: userMessage, error: userMsgError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      user_id: userId,
      role: 'user',
      content: question,
      citations: [],
    })
    .select()
    .single();

  if (userMsgError) {
    logger.error('Failed to save user message:', userMsgError);
    throw new InternalServerError('Failed to save user question');
  }

  // Step 4: Retrieve relevant document chunks using vector similarity
  const chunks = await retrieveRelevantChunks({
    query: question,
    userId,
    documentIds: selectedDocumentIds,
    limit: env.RAG_RETRIEVAL_LIMIT,
    similarityThreshold: env.RAG_SIMILARITY_THRESHOLD,
    token,
  });

  // Step 5: Handle Insufficient Evidence
  if (!chunks || chunks.length === 0) {
    const insufficientEvidenceAnswer = 
      "The available documents do not provide enough evidence or information to answer this question. Please ensure relevant documents are uploaded and selected in the Sources panel.";

    const { data: assistantMsg } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        role: 'assistant',
        content: insufficientEvidenceAnswer,
        citations: [],
      })
      .select()
      .single();

    return {
      userMessage,
      assistantMessage: assistantMsg,
    };
  }

  // Step 6: Format retrieved context & construct prompt
  const formattedSources = formatContextSourcesForPrompt(chunks);
  const prompt = buildGroundingPrompt(question, formattedSources, history || []);

  // Step 7: Invoke Gemini API
  let rawResponseText = '';
  const ai = getGeminiClient();

  if (!ai && process.env.NODE_ENV === 'test') {
    // Mock response for test environment without API key
    rawResponseText = `Based on the provided document [cite:1], here is the verified answer.`;
  } else if (!ai) {
    throw new InternalServerError('Gemini AI client is not configured. Missing GEMINI_API_KEY.');
  } else {
    try {
      const response = await generateContentWithRetry({
        model: env.GEMINI_CHAT_MODEL || 'gemini-3.5-flash',
        contents: prompt,
      });

      rawResponseText = response.text || '';
    } catch (error) {
      logger.error('Gemini generateContent error:', error);
      throw new InternalServerError(`AI generation failed: ${error.message}`);
    }
  }

  // Step 8: Validate and clean citations against actual retrieved chunks
  const { cleanAnswer, citations } = validateAndExtractCitations(rawResponseText, chunks);

  // Step 9: Save assistant response and structured citations to database
  const { data: assistantMessage, error: asstError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      user_id: userId,
      role: 'assistant',
      content: cleanAnswer,
      citations: citations,
    })
    .select()
    .single();

  if (asstError) {
    logger.error('Failed to save assistant message:', asstError);
    throw new InternalServerError('Failed to record assistant message');
  }

  // Step 10: Auto-update conversation title if it's the first exchange
  if (!history || history.length === 0) {
    const briefTitle = question.length > 35 ? `${question.substring(0, 35)}...` : question;
    await supabase
      .from('conversations')
      .update({ title: briefTitle, updated_at: new Date().toISOString() })
      .eq('id', conversationId);
  }

  return {
    userMessage,
    assistantMessage,
  };
}
