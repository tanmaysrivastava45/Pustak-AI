import { getSupabaseAdmin, getSupabaseUserClient } from '../lib/supabase.js';
import { NotFoundError, ForbiddenError, InternalServerError } from '../utils/errors.js';
import { z } from 'zod';

export const createConversationSchema = z.object({
  title: z.string().max(100).optional(),
});

export async function listNotebookConversations(req, res, next) {
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

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('id, notebook_id, title, created_at, updated_at')
      .eq('notebook_id', notebookId)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new InternalServerError(`Failed to fetch conversations: ${error.message}`);
    }

    res.json({ success: true, data: conversations || [] });
  } catch (error) {
    next(error);
  }
}

export async function createConversation(req, res, next) {
  try {
    const { notebookId } = req.params;
    const { title } = req.body;
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

    const convTitle = title?.trim() || 'New Conversation';

    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        notebook_id: notebookId,
        user_id: userId,
        title: convTitle,
      })
      .select()
      .single();

    if (error) {
      throw new InternalServerError(`Failed to create conversation: ${error.message}`);
    }

    res.status(201).json({ success: true, data: conversation });
  } catch (error) {
    next(error);
  }
}

export async function getConversationMessages(req, res, next) {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    const supabase = req.token ? getSupabaseUserClient(req.token) : getSupabaseAdmin();

    // Verify conversation ownership
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .select('id, notebook_id, user_id, title')
      .eq('id', conversationId)
      .single();

    if (convError || !conv) {
      throw new NotFoundError('Conversation not found');
    }

    if (conv.user_id !== userId) {
      throw new ForbiddenError('Access denied');
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, conversation_id, role, content, citations, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new InternalServerError(`Failed to fetch messages: ${error.message}`);
    }

    res.json({
      success: true,
      data: {
        conversation: conv,
        messages: messages || [],
      },
    });
  } catch (error) {
    next(error);
  }
}
