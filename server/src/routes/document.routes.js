import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';
import {
  uploadDocument,
  getDocument,
  getDocumentStatus,
  getDocumentViewUrl,
  reprocessDocument,
  deleteDocument,
} from '../controllers/document.controller.js';

const router = Router();

// Configure Multer for memory buffer storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB
  },
});

router.use(requireAuth);

// Upload document under notebook (also mapped via router)
router.post('/notebooks/:notebookId/documents', uploadLimiter, upload.single('file'), uploadDocument);

// Document specific endpoints
router.get('/:documentId', getDocument);
router.get('/:documentId/status', getDocumentStatus);
router.get('/:documentId/view-url', getDocumentViewUrl);
router.post('/:documentId/reprocess', reprocessDocument);
router.delete('/:documentId', deleteDocument);

export default router;
