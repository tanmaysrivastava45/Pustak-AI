import { describe, it, expect } from 'vitest';
import { retrieveRelevantChunks } from '../src/services/retrievalService.js';

describe('Retrieval Service & Filtering', () => {
  it('should return an empty array if the search query is empty', async () => {
    const results = await retrieveRelevantChunks({
      query: '',
      userId: 'test-user-id',
    });
    expect(results).toEqual([]);
  });

  it('should enforce userId requirement to prevent cross-user data leakage', async () => {
    await expect(
      retrieveRelevantChunks({
        query: 'What is deep learning?',
        userId: null,
      })
    ).rejects.toThrow('userId is required');
  });
});
