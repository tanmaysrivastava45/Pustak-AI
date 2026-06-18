import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let geminiClient = null;

export function getGeminiClient() {
  if (geminiClient) {
    return geminiClient;
  }

  if (!env.GEMINI_API_KEY) {
    logger.warn('GEMINI_API_KEY is not set. AI operations will require this key.');
    return null;
  }

  try {
    geminiClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    return geminiClient;
  } catch (err) {
    logger.error('Failed to initialize GoogleGenAI client:', err);
    return null;
  }
}

/**
 * Robust wrapper around ai.models.generateContent with automatic exponential backoff
 * and model failover for temporary 503 (High Demand) and 429 (Rate Limit) errors.
 * 
 * @param {object} params
 * @param {string} [params.model]
 * @param {string|object} params.contents
 * @param {object} [params.config]
 * @param {number} [params.maxRetries=3]
 * @returns {Promise<object>}
 */
export async function generateContentWithRetry({
  model = env.GEMINI_CHAT_MODEL || 'gemini-3.5-flash',
  contents,
  config,
  maxRetries = 3,
}) {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('Gemini client not initialized. Missing GEMINI_API_KEY.');
  }

  let currentModel = model;
  const fallbackModels = [model, 'gemini-3.5-flash-lite', 'gemini-flash-latest'];

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: currentModel,
        contents,
        ...(config ? { config } : {}),
      });
      return response;
    } catch (err) {
      const is503 =
        err.status === 'UNAVAILABLE' ||
        err.statusCode === 503 ||
        err.message?.includes('503') ||
        err.message?.includes('high demand');

      const is429 =
        err.status === 'RESOURCE_EXHAUSTED' ||
        err.statusCode === 429 ||
        err.message?.includes('429') ||
        err.message?.includes('quota') ||
        err.message?.includes('rate-limit');

      if ((is503 || is429) && attempt < maxRetries) {
        const delayMs = is429 ? 3500 * attempt : 2000 * attempt;
        logger.warn(
          `Gemini API ${is503 ? '503 (High Demand)' : '429 (Rate Limit)'} on attempt ${attempt}/${maxRetries}. Waiting ${(delayMs / 1000).toFixed(1)}s before retry...`
        );

        // On 503 spike, try fallback model
        if (is503 && fallbackModels[attempt]) {
          currentModel = fallbackModels[attempt];
          logger.info(`Switching to alternate model: ${currentModel}`);
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      throw err;
    }
  }
}
