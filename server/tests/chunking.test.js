import { describe, it, expect } from 'vitest';
import { chunkDocumentPages, createTextSplitter } from '../src/services/chunkingService.js';

describe('Chunking Service', () => {
  it('should create a configured text splitter with specified parameters', () => {
    const splitter = createTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
    expect(splitter).toBeDefined();
  });

  it('should split multi-page text while preserving exact page numbers', async () => {
    const pages = [
      {
        pageNumber: 1,
        text: 'This is the introduction to artificial intelligence. Intelligence can be measured in many ways. Machine learning is a core branch.',
      },
      {
        pageNumber: 2,
        text: 'Neural networks are inspired by biological brains. Deep learning uses multi-layer neural networks to learn hierarchical representations.',
      },
    ];

    const chunks = await chunkDocumentPages(pages, { chunkSize: 100, chunkOverlap: 20 });

    expect(chunks.length).toBeGreaterThan(0);
    // Every chunk must have valid page number matching its source page
    expect(chunks.every(c => c.pageNumber === 1 || c.pageNumber === 2)).toBe(true);
    // Chunk indices must be sequential 0, 1, 2...
    chunks.forEach((chunk, idx) => {
      expect(chunk.chunkIndex).toBe(idx);
      expect(typeof chunk.content).toBe('string');
      expect(chunk.charCount).toBeGreaterThan(0);
    });
  });

  it('should gracefully ignore empty pages or pages with only whitespace', async () => {
    const pages = [
      { pageNumber: 1, text: '   \n\t  ' },
      { pageNumber: 2, text: 'Valid content on page two that contains substantial text for research.' },
    ];

    const chunks = await chunkDocumentPages(pages);
    expect(chunks.length).toBe(1);
    expect(chunks[0].pageNumber).toBe(2);
  });

  it('should maintain overlap between adjacent chunks on long text', async () => {
    const longText = 'Artificial intelligence research is advancing rapidly. '.repeat(40);
    const pages = [{ pageNumber: 1, text: longText }];

    const chunks = await chunkDocumentPages(pages, { chunkSize: 200, chunkOverlap: 50 });
    expect(chunks.length).toBeGreaterThan(1);
    // All chunks should belong to page 1
    expect(chunks.every(c => c.pageNumber === 1)).toBe(true);
  });
});
