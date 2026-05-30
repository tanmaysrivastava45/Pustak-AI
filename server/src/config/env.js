import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  PDF_STORAGE_BUCKET: process.env.PDF_STORAGE_BUCKET || 'documents',

  // Google Gemini API
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_EMBEDDING_MODEL: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
  GEMINI_CHAT_MODEL: process.env.GEMINI_CHAT_MODEL || 'gemini-3.5-flash',

  // RAG Configuration
  RAG_CHUNK_SIZE: parseInt(process.env.RAG_CHUNK_SIZE || '800', 10),
  RAG_CHUNK_OVERLAP: parseInt(process.env.RAG_CHUNK_OVERLAP || '120', 10),
  RAG_RETRIEVAL_LIMIT: parseInt(process.env.RAG_RETRIEVAL_LIMIT || '6', 10),
  RAG_SIMILARITY_THRESHOLD: parseFloat(process.env.RAG_SIMILARITY_THRESHOLD || '0.35'),
};

export function validateEnv() {
  const missing = [];
  if (!env.SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!env.SUPABASE_SERVICE_ROLE_KEY && !env.SUPABASE_ANON_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY');
  if (!env.GEMINI_API_KEY) missing.push('GEMINI_API_KEY');

  if (missing.length > 0 && env.NODE_ENV !== 'test') {
    console.warn(`[WARN] Missing environment variables: ${missing.join(', ')}. Please configure them in server/.env`);
  }
}
