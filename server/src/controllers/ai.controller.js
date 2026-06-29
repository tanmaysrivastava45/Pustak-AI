import { answerQuestion } from '../services/chatService.js';
import { getOrGenerateSummary, generateNotebookSuggestedQuestions } from '../services/summaryService.js';
import { z } from 'zod';

export const chatRequestSchema = z.object({
  conversationId: z.string().uuid('Invalid conversationId format'),
  question: z.string().min(1, 'Question cannot be empty').max(2000, 'Question too long'),
  documentIds: z.array(z.string().uuid()).optional().nullable(),
});

export const summarizeRequestSchema = z.object({
  summaryType: z.enum(['concise', 'detailed', 'key_takeaways', 'suggested_questions']).default('concise'),
  forceRefresh: z.boolean().optional().default(false),
});

export async function chat(req, res, next) {
  try {
    const { notebookId } = req.params;
    const { conversationId, question, documentIds } = req.body;
    const userId = req.user.id;

    const result = await answerQuestion({
      notebookId,
      conversationId,
      userId,
      question,
      selectedDocumentIds: documentIds,
      token: req.token,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function summarizeDocument(req, res, next) {
  try {
    const { documentId } = req.params;
    const { summaryType, forceRefresh } = req.body;
    const userId = req.user.id;

    const result = await getOrGenerateSummary({
      documentId,
      userId,
      summaryType,
      forceRefresh,
      token: req.token,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function suggestedQuestions(req, res, next) {
  try {
    const { notebookId } = req.params;
    const userId = req.user.id;

    const questions = await generateNotebookSuggestedQuestions(notebookId, userId, req.token);

    res.json({
      success: true,
      data: {
        questions,
      },
    });
  } catch (error) {
    next(error);
  }
}
