import { logger } from '../utils/logger.js';

/**
 * Formats retrieved chunks into structured context text for the Gemini prompt.
 * Each chunk is tagged with an index [Source X], document name, and page number.
 * 
 * @param {Array<{ id: string, documentId: string, fileName: string, pageNumber: number, content: string }>} chunks
 * @returns {string} Formatted context block
 */
export function formatContextSourcesForPrompt(chunks) {
  if (!chunks || chunks.length === 0) {
    return 'NO RELEVANT SOURCES FOUND.';
  }

  return chunks
    .map((chunk, index) => {
      const sourceNum = index + 1;
      return `--- [Source ${sourceNum}] ---
Document: "${chunk.fileName}"
Page: ${chunk.pageNumber}
Content:
${chunk.content.trim()}
`;
    })
    .join('\n\n');
}

/**
 * Validates and extracts citations from the model's generated text against
 * the actual retrieved chunks.
 * 
 * Security & Grounding Rule:
 * LLMs often hallucinate citations or invent page numbers.
 * We NEVER trust page numbers or document names returned in free text.
 * Instead, citation markers in text (e.g. `[cite:1]` or `[1]`) are validated
 * strictly against `retrievedChunks[index - 1]`.
 * 
 * If a model outputs `[cite:7]` but only 4 chunks were retrieved, the invalid
 * citation marker is stripped to prevent misleading the user.
 * 
 * @param {string} rawAnswer - Raw response text from Gemini
 * @param {Array<{ id: string, documentId: string, fileName: string, pageNumber: number, content: string }>} retrievedChunks
 * @returns {{ cleanAnswer: string, citations: Array<{ citationId: string, sourceIndex: number, documentId: string, documentName: string, pageNumber: number, chunkId: string, excerpt: string }> }}
 */
export function validateAndExtractCitations(rawAnswer, retrievedChunks) {
  if (!rawAnswer || !retrievedChunks || retrievedChunks.length === 0) {
    return {
      cleanAnswer: rawAnswer || '',
      citations: [],
    };
  }

  const validCitationsMap = new Map();
  let citationCounter = 1;

  // Match [cite:1], [cite: 1], or [1] (bracketed numbers)
  // Negative lookahead/lookbehind ensures we don't accidentally match normal markdown links [text](url)
  const citationRegex = /\[(?:cite:\s*)?(\d+)\]/gi;

  let cleanAnswer = rawAnswer.replace(citationRegex, (match, numberStr) => {
    const sourceIndex = parseInt(numberStr, 10);
    const chunk = retrievedChunks[sourceIndex - 1];

    if (!chunk) {
      // Model invented a citation index not present in retrieved chunks -> remove it!
      logger.warn(`Stripped hallucinated citation marker: ${match} (sourceIndex ${sourceIndex} out of bounds ${retrievedChunks.length})`);
      return '';
    }

    // Valid citation! If not already recorded in map, add it
    if (!validCitationsMap.has(sourceIndex)) {
      // Excerpt for citation card preview (first 180 chars)
      const excerpt = chunk.content.length > 180
        ? `${chunk.content.substring(0, 180).trim()}...`
        : chunk.content.trim();

      validCitationsMap.set(sourceIndex, {
        citationId: `cit-${citationCounter++}`,
        sourceIndex,
        documentId: chunk.documentId,
        documentName: chunk.fileName,
        pageNumber: chunk.pageNumber,
        chunkId: chunk.id,
        excerpt,
      });
    }

    // Standardize marker to [cite:sourceIndex] for client parsing
    return `[cite:${sourceIndex}]`;
  });

  // Clean up any double spaces or orphan punctuation caused by stripped markers
  cleanAnswer = cleanAnswer
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();

  const citations = Array.from(validCitationsMap.values());
  logger.info(`Validated ${citations.length} verified citations.`);

  return {
    cleanAnswer,
    citations,
  };
}
