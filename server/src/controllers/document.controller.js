import {
  uploadAndProcessDocument,
  reprocessDocument as reprocessService,
  deleteDocument as deleteService,
  getDocumentViewUrl as getViewUrlService,
} from '../services/documentService.js';
import { getSupabaseAdmin, getSupabaseUserClient } from '../lib/supabase.js';
import { NotFoundError, ForbiddenError, InternalServerError } from '../utils/errors.js';

export async function listNotebookDocuments(req, res, next) {
  try {
    const { notebookId } = req.params;
    const userId = req.user.id;
    const supabase = req.token ? getSupabaseUserClient(req.token) : getSupabaseAdmin();

    // Verify notebook ownership
    const { data: notebook } = await supabase
      .from('notebooks')
      .select('id, user_id')
      .eq('id', notebookId)
      .single();

    if (!notebook || notebook.user_id !== userId) {
      throw new ForbiddenError('Notebook not found or access denied');
    }

    const { data: documents, error } = await supabase
      .from('documents')
      .select('id, notebook_id, file_name, file_size, page_count, status, error_message, created_at, updated_at')
      .eq('notebook_id', notebookId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerError(`Failed to fetch documents: ${error.message}`);
    }

    const formatted = (documents || []).map(d => ({
      id: d.id,
      notebookId: d.notebook_id,
      fileName: d.file_name,
      fileSize: d.file_size,
      pageCount: d.page_count,
      status: d.status,
      errorMessage: d.error_message,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
}

export async function uploadDocument(req, res, next) {
  try {
    const { notebookId } = req.params;
    const userId = req.user.id;
    const file = req.file;

    const document = await uploadAndProcessDocument({
      notebookId,
      userId,
      file,
      token: req.token,
    });

    res.status(202).json({
      success: true,
      message: 'Document uploaded and processing initiated',
      data: {
        id: document.id,
        notebookId: document.notebook_id,
        fileName: document.file_name,
        fileSize: document.file_size,
        pageCount: document.page_count,
        status: document.status,
        createdAt: document.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getDocument(req, res, next) {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;
    const supabase = req.token ? getSupabaseUserClient(req.token) : getSupabaseAdmin();

    const { data: doc, error } = await supabase
      .from('documents')
      .select('id, notebook_id, file_name, file_size, page_count, status, error_message, created_at, updated_at')
      .eq('id', documentId)
      .single();

    if (error || !doc) {
      throw new NotFoundError('Document not found');
    }

    const { data: ownerCheck } = await supabase
      .from('documents')
      .select('user_id')
      .eq('id', documentId)
      .single();

    if (ownerCheck?.user_id !== userId) {
      throw new ForbiddenError('You do not have access to this document');
    }

    res.json({
      success: true,
      data: {
        id: doc.id,
        notebookId: doc.notebook_id,
        fileName: doc.file_name,
        fileSize: doc.file_size,
        pageCount: doc.page_count,
        status: doc.status,
        errorMessage: doc.error_message,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getDocumentStatus(req, res, next) {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;
    const supabase = req.token ? getSupabaseUserClient(req.token) : getSupabaseAdmin();

    const { data: doc, error } = await supabase
      .from('documents')
      .select('id, status, error_message, page_count, updated_at, user_id')
      .eq('id', documentId)
      .single();

    if (error || !doc) {
      throw new NotFoundError('Document not found');
    }

    if (doc.user_id !== userId) {
      throw new ForbiddenError('Access denied');
    }

    res.json({
      success: true,
      data: {
        id: doc.id,
        status: doc.status,
        errorMessage: doc.error_message,
        pageCount: doc.page_count,
        updatedAt: doc.updated_at,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getDocumentViewUrl(req, res, next) {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;

    const result = await getViewUrlService(documentId, userId, req.token);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function reprocessDocument(req, res, next) {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;

    const result = await reprocessService(documentId, userId, req.token);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function deleteDocument(req, res, next) {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;

    const result = await deleteService(documentId, userId, req.token);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
