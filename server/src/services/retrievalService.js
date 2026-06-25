import { generateEmbedding } from './embeddingService.js';
import { getSupabaseAdmin, getSupabaseUserClient } from '../lib/supabase.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { InternalServerError } from '../utils/errors.js';

/**
 * Retrieves the most semantically relevant document chunks for a user query.
 * 
 * RAG Retrieval Mechanics:
 * 1. The query text is converted into a 768-dimensional dense vector using the exact same
 *    model (text-embedding-004) that was used for document chunks.
 * 2. Supabase pgvector performs an HNSW index cosine distance search via RPC:
 *    `1 - (embedding <=> query_embedding)`
 * 3. Results are filtered by:
 *    - `filter_user_id`: Mandatory ownership check to prevent cross-tenant data leakage.
 *    - `filter_document_ids`: Optional filter if the user selected specific documents in the notebook.
 *    - `match_threshold`: Discards irrelevant passages with low similarity scores.
 * 4. Results are ordered by highest similarity and limited to top-k (default: 6).
 * 
 * @param {object} params
 * @param {string} params.query - Natural language user question
 * @param {string} params.userId - Authenticated user ID (strictly enforced)
 * @param {string[]} [params.documentIds] - Selected document IDs in the notebook
 * @param {number} [params.limit] - Max number of chunks to return (default: 6)
 * @param {number} [params.similarityThreshold] - Minimum cosine similarity threshold (default: 0.35)
 * @param {string} [params.token] - User session token (optional, for client-level scoping)
 * @returns {Promise<Array<{ id: string, documentId: string, fileName: string, pageNumber: number, chunkIndex: number, content: string, similarity: number }>>}
 */
export async function retrieveRelevantChunks({
  query,
  userId,
  documentIds = null,
  limit = env.RAG_RETRIEVAL_LIMIT,
  similarityThreshold = env.RAG_SIMILARITY_THRESHOLD,
  token = null,
}) {
  if (!query || query.trim().length === 0) {
    return [];
  }

  if (!userId) {
    throw new Error('userId is required for vector retrieval security');
  }

  logger.info(`Retrieving chunks for user ${userId}, query: "${query.substring(0, 50)}..."`);

  // Step 1: Embed the search query
  const queryEmbedding = await generateEmbedding(query);

  // Step 2: Query pgvector via Supabase RPC
  const supabase = token ? getSupabaseUserClient(token) : getSupabaseAdmin();
  if (!supabase) {
    throw new InternalServerError('Database connection unavailable for retrieval');
  }

  // Format filter document IDs: pass null if empty array
  const formattedDocIds = Array.isArray(documentIds) && documentIds.length > 0 
    ? documentIds 
    : null;

  const { data, error } = await supabase.rpc('match_document_chunks', {
    query_embedding: queryEmbedding,
    match_threshold: similarityThreshold,
    match_count: limit,
    filter_user_id: userId,
    filter_document_ids: formattedDocIds,
  });

  if (error) {
    logger.error('Vector search RPC error:', error);
    throw new InternalServerError(`Vector search failed: ${error.message}`);
  }

  if (!data || data.length === 0) {
    logger.info(`No chunks matched threshold ${similarityThreshold} for query.`);
    return [];
  }

  // Step 3: Map DB column names to clean camelCase properties
  const chunks = data.map(item => ({
    id: item.id,
    documentId: item.document_id,
    fileName: item.file_name,
    pageNumber: item.page_number,
    chunkIndex: item.chunk_index,
    content: item.content,
    similarity: item.similarity,
  }));

  logger.info(`Retrieved ${chunks.length} chunks. Highest similarity: ${chunks[0]?.similarity?.toFixed(3)}`);
  return chunks;
}
