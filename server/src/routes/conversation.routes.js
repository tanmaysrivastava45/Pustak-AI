import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getConversationMessages } from '../controllers/conversation.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/:conversationId/messages', getConversationMessages);

export default router;
