import { extractTextPageByPage, validatePdfSignature } from './pdfExtractionService.js';
import { chunkDocumentPages } from './chunkingService.js';
import { generateBatchEmbeddings } from './embeddingService.js';
import { getSupabaseAdmin, getSupabaseUserClient } from '../lib/supabase.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { BadRequestError, NotFoundError, ForbiddenError, InternalServerError } from '../utils/errors.js';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

/**
 * Handles PDF document upload, storage, and initiates the ingestion pipeline.
 * 
 * @param {object} params
 * @param {string} params.notebookId - Notebook ID
 * @param {string} params.userId - Authenticated user ID
 * @param {Express.Multer.File} params.file - Uploaded file from multer
 * @param {string} [params.token] - User auth token
 * @returns {Promise<object>} Created document record
 */
export async function uploadAndProcessDocument({
  notebookId,
  userId,
  file,
  token = null,
}) {
  if (!file || !file.buffer) {
    throw new BadRequestError('No file provided for upload');
  }

  // 1. Validate file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new BadRequestError(`File size exceeds 25MB limit. Uploaded: ${(file.size / (1024 * 1024)).toFixed(1)}MB`);
  }

  // 2. Validate MIME type and PDF magic bytes
  if (file.mimetype !== 'application/pdf') {
    throw new BadRequestError(`Invalid MIME type: ${file.mimetype}. Only application/pdf is accepted.`);
  }

  if (!validatePdfSignature(file.buffer)) {
    throw new BadRequestError('File content is not a valid PDF (%PDF- signature missing).');
  }

  const supabase = token ? getSupabaseUserClient(token) : getSupabaseAdmin();
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabase || !supabaseAdmin) {
    throw new InternalServerError('Database client unavailable');
  }

  // 3. Verify notebook ownership
  const { data: notebook, error: nbError } = await supabase
    .from('notebooks')
    .select('id, user_id')
    .eq('id', notebookId)
    .single();

  if (nbError || !notebook) {
    throw new NotFoundError('Notebook not found');
  }

  if (notebook.user_id !== userId) {
    throw new ForbiddenError('You do not own this notebook');
  }

  const safeFileName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${userId}/${Date.now()}-${safeFileName}`;

  // 4. Upload raw PDF to private Supabase Storage
  const { error: storageError } = await supabaseAdmin.storage
    .from(env.PDF_STORAGE_BUCKET)
    .upload(storagePath, file.buffer, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (storageError) {
    logger.warn('Storage upload error (will attempt bucket creation if not existing):', storageError);
    // If bucket doesn't exist yet, attempt to create it
    if (storageError.message?.includes('bucket not found') || storageError.statusCode === '404') {
      await supabaseAdmin.storage.createBucket(env.PDF_STORAGE_BUCKET, { public: false });
      const retry = await supabaseAdmin.storage
        .from(env.PDF_STORAGE_BUCKET)
        .upload(storagePath, file.buffer, { contentType: 'application/pdf', upsert: false });
      if (retry.error) {
        throw new InternalServerError(`Failed to upload to storage: ${retry.error.message}`);
      }
    } else {
      throw new InternalServerError(`Storage upload failed: ${storageError.message}`);
    }
  }

  // 5. Create Document record with status: 'uploaded'
  const { data: document, error: docError } = await supabase
    .from('documents')
    .insert({
      notebook_id: notebookId,
      user_id: userId,
      file_name: file.originalname,
      storage_path: storagePath,
      mime_type: file.mimetype,
      file_size: file.size,
      page_count: 0,
      status: 'uploaded',
    })
    .select()
    .single();

  if (docError) {
    logger.error('Failed to create document record:', docError);
    // Cleanup stored file
    await supabaseAdmin.storage.from(env.PDF_STORAGE_BUCKET).remove([storagePath]);
    throw new InternalServerError('Failed to save document metadata');
  }

  // 6. Execute processing pipeline asynchronously (or await in background)
  processDocumentAsync(document.id, file.buffer, userId).catch(err => {
    logger.error(`Background processing failed for document ${document.id}:`, err);
  });

  return document;
}

/**
 * Executes the complete RAG ingestion pipeline:
 * 1. Update status -> 'processing'
 * 2. Extract text page-by-page
 * 3. Split into overlapping chunks
 * 4. Generate Gemini embeddings for each chunk
 * 5. Batch-insert chunks into document_chunks table
 * 6. Update status -> 'ready'
 * 
 * If any step fails:
 * - Status -> 'failed'
 * - Clean up any partial chunks
 */
export async function processDocumentAsync(documentId, pdfBuffer, userId) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return;

  try {
    logger.info(`Starting ingestion for document ${documentId}...`);
    // State machine: uploaded -> processing
    await supabaseAdmin
      .from('documents')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', documentId);

    // Step A: Extract page-wise text
    const { totalPages, pages } = await extractTextPageByPage(pdfBuffer);

    await supabaseAdmin
      .from('documents')
      .update({ page_count: totalPages, updated_at: new Date().toISOString() })
      .eq('id', documentId);

    // Step B: Split pages into overlapping chunks
    const chunks = await chunkDocumentPages(pages);

    if (chunks.length === 0) {
      throw new Error('No valid text chunks could be extracted from document.');
    }

    // Step C: Generate embeddings for chunks
    const chunkTexts = chunks.map(c => c.content);
    const embeddings = await generateBatchEmbeddings(chunkTexts);

    if (embeddings.length !== chunks.length) {
      throw new Error(`Embedding count mismatch: expected ${chunks.length}, got ${embeddings.length}`);
    }

    // Step D: Clean up any previous chunks (in case of reprocess)
    await supabaseAdmin
      .from('document_chunks')
      .delete()
      .eq('document_id', documentId);

    // Step E: Prepare rows for insertion
    const chunkRows = chunks.map((chunk, index) => ({
      document_id: documentId,
      user_id: userId,
      chunk_index: chunk.chunkIndex,
      page_number: chunk.pageNumber,
      content: chunk.content,
      embedding: embeddings[index],
    }));

    // Insert in batches of 50 to avoid request size limits
    const BATCH_INSERT_SIZE = 50;
    for (let i = 0; i < chunkRows.length; i += BATCH_INSERT_SIZE) {
      const slice = chunkRows.slice(i, i + BATCH_INSERT_SIZE);
      const { error: insertError } = await supabaseAdmin
        .from('document_chunks')
        .insert(slice);

      if (insertError) {
        throw new Error(`Failed to store chunks in database: ${insertError.message}`);
      }
    }

    // State machine: processing -> ready
    await supabaseAdmin
      .from('documents')
      .update({
        status: 'ready',
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    logger.info(`Document ${documentId} processed successfully: ${chunks.length} chunks ready for RAG.`);
  } catch (error) {
    logger.error(`Document processing failed for ${documentId}:`, error);

    // Safe cleanup on failure
    await supabaseAdmin
      .from('document_chunks')
      .delete()
      .eq('document_id', documentId);

    // Invalidate cached summaries
    await supabaseAdmin
      .from('document_summaries')
      .delete()
      .eq('document_id', documentId);

    // State machine: processing -> failed
    await supabaseAdmin
      .from('documents')
      .update({
        status: 'failed',
        error_message: error.message || 'Processing failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId);
  }
}

/**
 * Reprocesses an existing document (e.g. if initial processing failed or parameters changed).
 */
export async function reprocessDocument(documentId, userId, token = null) {
  const supabase = token ? getSupabaseUserClient(token) : getSupabaseAdmin();
  const supabaseAdmin = getSupabaseAdmin();

  const { data: doc, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (error || !doc) {
    throw new NotFoundError('Document not found');
  }

  if (doc.user_id !== userId) {
    throw new ForbiddenError('You do not own this document');
  }

  // Download raw PDF from storage
  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
    .from(env.PDF_STORAGE_BUCKET)
    .download(doc.storage_path);

  if (downloadError || !fileData) {
    throw new InternalServerError('Failed to download source PDF from storage for reprocessing');
  }

  const arrayBuffer = await fileData.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Invalidate summaries
  await supabase
    .from('document_summaries')
    .delete()
    .eq('document_id', documentId);

  // Start processing
  processDocumentAsync(documentId, buffer, userId).catch(err => {
    logger.error(`Reprocessing failed for ${documentId}:`, err);
  });

  return { message: 'Document reprocessing initiated', documentId, status: 'processing' };
}

/**
 * Deletes a document and its raw storage file.
 */
export async function deleteDocument(documentId, userId, token = null) {
  const supabase = token ? getSupabaseUserClient(token) : getSupabaseAdmin();
  const supabaseAdmin = getSupabaseAdmin();

  const { data: doc, error } = await supabase
    .from('documents')
    .select('id, user_id, storage_path')
    .eq('id', documentId)
    .single();

  if (error || !doc) {
    throw new NotFoundError('Document not found');
  }

  if (doc.user_id !== userId) {
    throw new ForbiddenError('You do not own this document');
  }

  // Delete from storage
  if (doc.storage_path) {
    await supabaseAdmin.storage
      .from(env.PDF_STORAGE_BUCKET)
      .remove([doc.storage_path]);
  }

  // Delete document record (foreign keys cascade delete chunks and summaries)
  const { error: deleteError } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId);

  if (deleteError) {
    throw new InternalServerError(`Failed to delete document: ${deleteError.message}`);
  }

  return { success: true, message: 'Document and associated data deleted successfully' };
}

/**
 * Generates a signed URL for secure PDF viewing in the client viewer.
 */
export async function getDocumentViewUrl(documentId, userId, token = null) {
  const supabase = token ? getSupabaseUserClient(token) : getSupabaseAdmin();
  const supabaseAdmin = getSupabaseAdmin();

  const { data: doc, error } = await supabase
    .from('documents')
    .select('id, user_id, storage_path, file_name')
    .eq('id', documentId)
    .single();

  if (error || !doc) {
    throw new NotFoundError('Document not found');
  }

  if (doc.user_id !== userId) {
    throw new ForbiddenError('You do not have permission to view this document');
  }

  // Create a signed URL valid for 1 hour (3600 seconds)
  const { data: signedData, error: signError } = await supabaseAdmin.storage
    .from(env.PDF_STORAGE_BUCKET)
    .createSignedUrl(doc.storage_path, 3600);

  if (signError || !signedData?.signedUrl) {
    throw new InternalServerError('Failed to generate secure document access URL');
  }

  return {
    documentId: doc.id,
    fileName: doc.file_name,
    signedUrl: signedData.signedUrl,
    expiresIn: 3600,
  };
}
