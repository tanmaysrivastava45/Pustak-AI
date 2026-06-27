import { describe, it, expect } from 'vitest';
import { validateAndExtractCitations, formatContextSourcesForPrompt } from '../src/services/citationService.js';

describe('Citation Service', () => {
  const mockChunks = [
    {
      id: 'chunk-uuid-1',
      documentId: 'doc-uuid-a',
      fileName: 'Deep_Learning_Intro.pdf',
      pageNumber: 3,
      chunkIndex: 0,
      content: 'Convolutional neural networks excel at spatial feature extraction in computer vision.',
    },
    {
      id: 'chunk-uuid-2',
      documentId: 'doc-uuid-a',
      fileName: 'Deep_Learning_Intro.pdf',
      pageNumber: 7,
      chunkIndex: 4,
      content: 'Transformers use multi-head self-attention mechanisms to process sequential tokens in parallel.',
    },
  ];

  it('should format context sources clearly for the LLM prompt', () => {
    const formatted = formatContextSourcesForPrompt(mockChunks);
    expect(formatted).toContain('--- [Source 1] ---');
    expect(formatted).toContain('Deep_Learning_Intro.pdf');
    expect(formatted).toContain('Page: 3');
    expect(formatted).toContain('--- [Source 2] ---');
    expect(formatted).toContain('Page: 7');
  });

  it('should extract valid citations and map metadata accurately', () => {
    const rawAnswer = 'CNNs are used for vision [cite:1]. Meanwhile, attention models excel at language [cite:2].';
    const { cleanAnswer, citations } = validateAndExtractCitations(rawAnswer, mockChunks);

    expect(cleanAnswer).toBe('CNNs are used for vision [cite:1]. Meanwhile, attention models excel at language [cite:2].');
    expect(citations.length).toBe(2);

    expect(citations[0]).toMatchObject({
      sourceIndex: 1,
      documentId: 'doc-uuid-a',
      documentName: 'Deep_Learning_Intro.pdf',
      pageNumber: 3,
      chunkId: 'chunk-uuid-1',
    });
    expect(citations[0].excerpt).toContain('Convolutional neural networks');

    expect(citations[1]).toMatchObject({
      sourceIndex: 2,
      pageNumber: 7,
      chunkId: 'chunk-uuid-2',
    });
  });

  it('should strip hallucinated citations that refer to non-existent sources', () => {
    // Model generated [cite:5] and [cite:99] when only 2 chunks exist
    const rawAnswer = 'Here is a supported claim [cite:1]. Here is a hallucinated claim [cite:5] and another [cite:99].';
    const { cleanAnswer, citations } = validateAndExtractCitations(rawAnswer, mockChunks);

    // [cite:5] and [cite:99] must be cleanly removed from the answer text
    expect(cleanAnswer).not.toContain('[cite:5]');
    expect(cleanAnswer).not.toContain('[cite:99]');
    expect(cleanAnswer).toContain('[cite:1]');

    // Only source 1 should be recorded
    expect(citations.length).toBe(1);
    expect(citations[0].sourceIndex).toBe(1);
  });

  it('should support bracketed numbers [1] citation syntax', () => {
    const rawAnswer = 'Transformers process tokens concurrently [2].';
    const { cleanAnswer, citations } = validateAndExtractCitations(rawAnswer, mockChunks);

    expect(cleanAnswer).toBe('Transformers process tokens concurrently [cite:2].');
    expect(citations.length).toBe(1);
    expect(citations[0].sourceIndex).toBe(2);
    expect(citations[0].pageNumber).toBe(7);
  });
});
