// Global polyfill for Node.js < 22 (PDF.js unpdf compatibility)
if (typeof globalThis.Iterator === 'undefined') {
  globalThis.Iterator = class Iterator {};
}

import app from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

const PORT = env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT} [${env.NODE_ENV}]`);
  logger.info(`Health check available at http://localhost:${PORT}/api/v1/health`);
});

// Handle graceful shutdown
const shutdown = (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    logger.info('Server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
