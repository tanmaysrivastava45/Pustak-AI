import { Router } from 'express';
import authRoutes from './auth.routes.js';
import notebookRoutes from './notebook.routes.js';
import documentRoutes from './document.routes.js';
import conversationRoutes from './conversation.routes.js';
import aiRoutes from './ai.routes.js';
import { uploadDocument } from '../controllers/document.controller.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';
import { requireAuth } from '../middleware/auth.js';
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'pustak-ai-api',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Direct upload under /notebooks/:notebookId/documents
router.post('/notebooks/:notebookId/documents', requireAuth, uploadLimiter, upload.single('file'), uploadDocument);

router.use('/', authRoutes);
router.use('/notebooks', notebookRoutes);
router.use('/documents', documentRoutes);
router.use('/conversations', conversationRoutes);
router.use('/', aiRoutes);

export default router;
