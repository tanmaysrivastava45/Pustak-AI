import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let supabaseAdminInstance = null;

export function getSupabaseAdmin() {
  if (supabaseAdminInstance) {
    return supabaseAdminInstance;
  }

  const url = env.SUPABASE_URL;
  const isPlaceholderKey = (k) => !k || k.includes('your-supabase') || k.includes('placeholder');
  
  const key = (!isPlaceholderKey(env.SUPABASE_SERVICE_ROLE_KEY))
    ? env.SUPABASE_SERVICE_ROLE_KEY
    : (!isPlaceholderKey(env.SUPABASE_ANON_KEY) ? env.SUPABASE_ANON_KEY : null);

  if (!url || !key) {
    logger.warn('Supabase URL or Key missing. Supabase admin client cannot initialize.');
    return null;
  }

  supabaseAdminInstance = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: {
      transport: WebSocket,
    },
  });

  return supabaseAdminInstance;
}

export function getSupabaseUserClient(accessToken) {
  const url = env.SUPABASE_URL;
  const isPlaceholderKey = (k) => !k || k.includes('your-supabase') || k.includes('placeholder');
  const anonKey = (!isPlaceholderKey(env.SUPABASE_ANON_KEY))
    ? env.SUPABASE_ANON_KEY
    : (!isPlaceholderKey(env.SUPABASE_SERVICE_ROLE_KEY) ? env.SUPABASE_SERVICE_ROLE_KEY : null);

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: {
      transport: WebSocket,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
