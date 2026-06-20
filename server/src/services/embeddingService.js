import { getGeminiClient } from '../lib/gemini.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { InternalServerError } from '../utils/errors.js';

/**
 * Expected vector dimension for Gemini text-embedding-004
 */
export const EMBEDDING_DIMENSION = 768;

/**
 * Generates an embedding vector for a single text string (used during question answering).
 * 
 * In RAG, question embedding translates the user's natural language question into the
 * same high-dimensional geometric semantic vector space as the document chunks.
 * 
 * @param {string} text - User query or document passage
 * @returns {Promise<number[]>} 768-dimensional float array
 */
export async function generateEmbedding(text) {
  if (!text || text.trim().length === 0) {
    throw new Error('Cannot generate embedding for empty text');
  }

  // Handle mock environment for testing
  if (process.env.NODE_ENV === 'test' && !env.GEMINI_API_KEY) {
    return new Array(EMBEDDING_DIMENSION).fill(0.01);
  }

  const ai = getGeminiClient();
  if (!ai) {
    throw new InternalServerError('Gemini AI client is not configured. Missing GEMINI_API_KEY.');
  }

  try {
    const response = await ai.models.embedContent({
      model: env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
      contents: text,
      config: {
        outputDimensionality: EMBEDDING_DIMENSION,
      },
    });

    const values = response.embedding?.values || response.embeddings?.[0]?.values;
    if (!values || values.length === 0) {
      throw new Error('Gemini API returned an empty embedding vector');
    }

    return values;
  } catch (error) {
    logger.error('Failed to generate embedding for query:', error);
    throw new InternalServerError(`Embedding generation failed: ${error.message}`);
  }
}

/**
 * Generates embeddings for an array of document chunks in controlled batches.
 * 
 * Batching prevents HTTP request payload limits, handles API rate quotas,
 * and maintains sequential order matching the chunks.
 * 
 * @param {string[]} texts - Array of chunk texts
 * @param {number} [batchSize=20] - Number of chunks per batch
 * @returns {Promise<Array<number[]>>} Array of 768d vectors
 */
export async function generateBatchEmbeddings(texts, batchSize = 20) {
  if (!texts || texts.length === 0) {
    return [];
  }

  // Handle mock environment for testing
  if (process.env.NODE_ENV === 'test' && !env.GEMINI_API_KEY) {
    return texts.map(() => new Array(EMBEDDING_DIMENSION).fill(0.01));
  }

  const ai = getGeminiClient();
  if (!ai) {
    throw new InternalServerError('Gemini AI client is not configured. Missing GEMINI_API_KEY.');
  }

  const allEmbeddings = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    logger.info(`Embedding batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(texts.length / batchSize)} (${batch.length} chunks)...`);

    try {
      const response = await ai.models.embedContent({
        model: env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
        contents: batch,
        config: {
          outputDimensionality: EMBEDDING_DIMENSION,
        },
      });

      if (response.embeddings && response.embeddings.length > 0) {
        for (const emb of response.embeddings) {
          if (!emb.values || emb.values.length === 0) {
            throw new Error('Empty embedding vector in batch response');
          }
          allEmbeddings.push(emb.values);
        }
      } else if (response.embedding?.values) {
        allEmbeddings.push(response.embedding.values);
      } else {
        throw new Error('No embeddings returned by Gemini API for batch');
      }

      // Small delay between batches to respect API rate limits
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      logger.error(`Error embedding batch starting at index ${i}:`, error);
      throw new InternalServerError(`Batch embedding failed: ${error.message}`);
    }
  }

  return allEmbeddings;
}
