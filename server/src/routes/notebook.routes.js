import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validator.js';
import {
  listNotebooks,
  createNotebook,
  getNotebook,
  updateNotebook,
  deleteNotebook,
  createNotebookSchema,
  updateNotebookSchema,
} from '../controllers/notebook.controller.js';
import { listNotebookDocuments } from '../controllers/document.controller.js';
import { listNotebookConversations, createConversation, createConversationSchema } from '../controllers/conversation.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', listNotebooks);
router.post('/', validateRequest({ body: createNotebookSchema }), createNotebook);
router.get('/:notebookId', getNotebook);
router.patch('/:notebookId', validateRequest({ body: updateNotebookSchema }), updateNotebook);
router.delete('/:notebookId', deleteNotebook);

// Nested sub-resources
router.get('/:notebookId/documents', listNotebookDocuments);
router.get('/:notebookId/conversations', listNotebookConversations);
router.post('/:notebookId/conversations', validateRequest({ body: createConversationSchema }), createConversation);

export default router;
