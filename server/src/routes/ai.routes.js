import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validator.js';
import { aiEndpointLimiter } from '../middleware/rateLimiter.js';
import {
  chat,
  summarizeDocument,
  suggestedQuestions,
  chatRequestSchema,
  summarizeRequestSchema,
} from '../controllers/ai.controller.js';

const router = Router();

router.use(requireAuth);
router.use(aiEndpointLimiter);

router.post('/notebooks/:notebookId/chat', validateRequest({ body: chatRequestSchema }), chat);
router.post('/documents/:documentId/summarize', validateRequest({ body: summarizeRequestSchema }), summarizeDocument);
router.post('/notebooks/:notebookId/suggested-questions', suggestedQuestions);

export default router;
