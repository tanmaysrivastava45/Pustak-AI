import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  let statusCode = 500;
  let message = 'Internal server error';
  let details = null;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err.name === 'ZodError') {
    statusCode = 400;
    message = 'Validation failed';
    details = err.errors?.map(e => ({
      path: e.path.join('.'),
      message: e.message,
    }));
  } else if (err.name === 'MulterError') {
    statusCode = 400;
    message = `File upload error: ${err.message}`;
  } else {
    logger.error(`Unhandled error on ${req.method} ${req.originalUrl}:`, err);
    if (env.NODE_ENV === 'development') {
      message = err.message || message;
      details = err.stack;
    }
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      details,
    },
  });
}
