import { UnauthorizedError } from '../utils/errors.js';
import { getSupabaseAdmin } from '../lib/supabase.js';
import { logger } from '../utils/logger.js';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or malformed Authorization header. Expected Bearer token.');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Bearer token is empty');
    }

    // In unit testing, allow a mock test token
    if (process.env.NODE_ENV === 'test' && token === 'mock-valid-token') {
      req.user = { id: '00000000-0000-0000-0000-000000000001', email: 'test@pustak.ai' };
      req.token = token;
      return next();
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      throw new UnauthorizedError('Authentication service unavailable: Supabase client not initialized');
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.warn('Token validation failed:', error?.message || 'User not found');
      throw new UnauthorizedError(error?.message || 'Invalid or expired session token');
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    next(error);
  }
}
