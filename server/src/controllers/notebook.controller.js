import { getSupabaseAdmin, getSupabaseUserClient } from '../lib/supabase.js';
import { NotFoundError, ForbiddenError, InternalServerError } from '../utils/errors.js';
import { z } from 'zod';

export const createNotebookSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title cannot exceed 100 characters'),
});

export const updateNotebookSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title cannot exceed 100 characters'),
});

export async function listNotebooks(req, res, next) {
  try {
    const supabase = req.token ? getSupabaseUserClient(req.token) : getSupabaseAdmin();
    const userId = req.user.id;

    // Fetch notebooks along with source counts
    const { data: notebooks, error } = await supabase
      .from('notebooks')
      .select(`
        id,
        title,
        created_at,
        updated_at,
        documents:documents(count)
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new InternalServerError(`Failed to fetch notebooks: ${error.message}`);
    }

    const formatted = (notebooks || []).map(nb => ({
      id: nb.id,
      title: nb.title,
      createdAt: nb.created_at,
      updatedAt: nb.updated_at,
      sourceCount: nb.documents?.[0]?.count || 0,
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
}

export async function createNotebook(req, res, next) {
  try {
    const { title } = req.body;
    const userId = req.user.id;
    const supabase = req.token ? getSupabaseUserClient(req.token) : getSupabaseAdmin();

    const { data: notebook, error } = await supabase
      .from('notebooks')
      .insert({
        title: title.trim(),
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      throw new InternalServerError(`Failed to create notebook: ${error.message}`);
    }

    // Automatically create a default conversation for this notebook
    await supabase.from('conversations').insert({
      notebook_id: notebook.id,
      user_id: userId,
      title: 'Initial Conversation',
    });

    res.status(201).json({
      success: true,
      data: {
        id: notebook.id,
        title: notebook.title,
        createdAt: notebook.created_at,
        updatedAt: notebook.updated_at,
        sourceCount: 0,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getNotebook(req, res, next) {
  try {
    const { notebookId } = req.params;
    const userId = req.user.id;
    const supabase = req.token ? getSupabaseUserClient(req.token) : getSupabaseAdmin();

    const { data: notebook, error } = await supabase
      .from('notebooks')
      .select('*')
      .eq('id', notebookId)
      .single();

    if (error || !notebook) {
      throw new NotFoundError('Notebook not found');
    }

    if (notebook.user_id !== userId) {
      throw new ForbiddenError('You do not have access to this notebook');
    }

    res.json({
      success: true,
      data: {
        id: notebook.id,
        title: notebook.title,
        createdAt: notebook.created_at,
        updatedAt: notebook.updated_at,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateNotebook(req, res, next) {
  try {
    const { notebookId } = req.params;
    const { title } = req.body;
    const userId = req.user.id;
    const supabase = req.token ? getSupabaseUserClient(req.token) : getSupabaseAdmin();

    // Verify ownership
    const { data: existing } = await supabase
      .from('notebooks')
      .select('id, user_id')
      .eq('id', notebookId)
      .single();

    if (!existing) {
      throw new NotFoundError('Notebook not found');
    }

    if (existing.user_id !== userId) {
      throw new ForbiddenError('You do not have permission to modify this notebook');
    }

    const { data: updated, error } = await supabase
      .from('notebooks')
      .update({
        title: title.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', notebookId)
      .select()
      .single();

    if (error) {
      throw new InternalServerError(`Failed to update notebook: ${error.message}`);
    }

    res.json({
      success: true,
      data: {
        id: updated.id,
        title: updated.title,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteNotebook(req, res, next) {
  try {
    const { notebookId } = req.params;
    const userId = req.user.id;
    const supabase = req.token ? getSupabaseUserClient(req.token) : getSupabaseAdmin();

    const { data: existing } = await supabase
      .from('notebooks')
      .select('id, user_id')
      .eq('id', notebookId)
      .single();

    if (!existing) {
      throw new NotFoundError('Notebook not found');
    }

    if (existing.user_id !== userId) {
      throw new ForbiddenError('You do not have permission to delete this notebook');
    }

    const { error } = await supabase
      .from('notebooks')
      .delete()
      .eq('id', notebookId);

    if (error) {
      throw new InternalServerError(`Failed to delete notebook: ${error.message}`);
    }

    res.json({ success: true, message: 'Notebook deleted successfully' });
  } catch (error) {
    next(error);
  }
}
