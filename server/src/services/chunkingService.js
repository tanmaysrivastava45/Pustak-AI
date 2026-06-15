import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Creates a configured RecursiveCharacterTextSplitter instance.
 * 
 * Why RecursiveCharacterTextSplitter?
 * In RAG (Retrieval-Augmented Generation), chunking quality directly determines retrieval accuracy.
 * Recursive character splitting attempts to split text hierarchically:
 * 1. Paragraph breaks ("\n\n") to preserve thematic units
 * 2. Line breaks ("\n")
 * 3. Sentence boundaries (". ")
 * 4. Words (" ")
 * 5. Characters ("") as a fallback
 * 
 * Chunk Overlap prevents semantic information at the boundaries from being cut in half,
 * ensuring continuous context between adjacent chunks.
 * 
 * @param {object} options
 * @param {number} options.chunkSize - Target chunk size in characters (~800)
 * @param {number} options.chunkOverlap - Overlap size in characters (~120)
 * @returns {RecursiveCharacterTextSplitter}
 */
export function createTextSplitter({
  chunkSize = env.RAG_CHUNK_SIZE,
  chunkOverlap = env.RAG_CHUNK_OVERLAP,
} = {}) {
  return new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: ['\n\n', '\n', '. ', '? ', '! ', '; ', ' ', ''],
  });
}

/**
 * Splits extracted pages into structured chunks, preserving exact page numbers.
 * 
 * Crucial RAG rule: Never throw away source attribution metadata.
 * By tracking the page number on every chunk, we can return clickable citations
 * that lead the user directly to the exact page of the PDF.
 * 
 * @param {Array<{ pageNumber: number, text: string }>} pages - Extracted document pages
 * @param {object} [options] - Optional override for chunkSize and chunkOverlap
 * @returns {Promise<Array<{ chunkIndex: number, pageNumber: number, content: string, charCount: number }>>}
 */
export async function chunkDocumentPages(pages, options = {}) {
  const splitter = createTextSplitter(options);
  const chunks = [];
  let globalChunkIndex = 0;

  for (const page of pages) {
    const { pageNumber, text } = page;
    if (!text || text.trim().length === 0) {
      continue;
    }

    // Split page text into smaller passages
    const pageSplits = await splitter.splitText(text);

    for (const split of pageSplits) {
      const trimmed = split.trim();
      // Skip empty or tiny fragments that offer no semantic value
      if (trimmed.length < 15) {
        continue;
      }

      chunks.push({
        chunkIndex: globalChunkIndex++,
        pageNumber,
        content: trimmed,
        charCount: trimmed.length,
      });
    }
  }

  logger.info(`Chunking complete: ${chunks.length} chunks generated from ${pages.length} pages.`);
  return chunks;
}
