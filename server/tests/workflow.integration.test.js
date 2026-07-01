import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { validatePdfSignature } from '../src/services/pdfExtractionService.js';
import { chunkDocumentPages } from '../src/services/chunkingService.js';
import { validateAndExtractCitations } from '../src/services/citationService.js';

describe('End-to-End Workflow & Integration Tests', () => {
  it('should respond with healthy status from /api/v1/health', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('pustak-ai-api');
    expect(typeof res.body.uptime).toBe('number');
  });

  it('should validate PDF magic bytes signature accurately', () => {
    const validPdfBuffer = Buffer.from('%PDF-1.4 sample content');
    const invalidBuffer = Buffer.from('NOT A PDF FILE');

    expect(validatePdfSignature(validPdfBuffer)).toBe(true);
    expect(validatePdfSignature(invalidBuffer)).toBe(false);
  });

  it('should execute end-to-end simulated RAG workflow: Extract -> Chunk -> Retrieve -> Cite', async () => {
    // 1. Simulated extracted pages from PDF parser
    const simulatedPages = [
      {
        pageNumber: 1,
        text: 'Pustak AI is a document-grounded research assistant. It allows users to ask questions grounded in their private documents.',
      },
      {
        pageNumber: 2,
        text: 'The architecture employs vector embeddings and cosine similarity search in PostgreSQL via pgvector.',
      },
    ];

    // 2. Chunking stage: 300 chunk size ensures each page fits cleanly in one chunk
    const chunks = await chunkDocumentPages(simulatedPages, { chunkSize: 300, chunkOverlap: 20 });
    expect(chunks.length).toBe(2);
    expect(chunks[0].pageNumber).toBe(1);
    expect(chunks[1].pageNumber).toBe(2);

    // 3. Simulated retrieval result with assigned documentId and fileName
    const retrievedChunks = chunks.map((c, i) => ({
      id: `chunk-${i}`,
      documentId: 'doc-123',
      fileName: 'Pustak_Architecture.pdf',
      pageNumber: c.pageNumber,
      chunkIndex: c.chunkIndex,
      content: c.content,
      similarity: 0.88 - i * 0.1,
    }));

    // 4. Model response citation verification
    const simulatedModelResponse = 'Pustak AI grounds answers directly in user documents [cite:1] using pgvector [cite:2].';
    const { cleanAnswer, citations } = validateAndExtractCitations(simulatedModelResponse, retrievedChunks);

    expect(cleanAnswer).toContain('[cite:1]');
    expect(cleanAnswer).toContain('[cite:2]');
    expect(citations.length).toBe(2);
    expect(citations[0].pageNumber).toBe(1);
    expect(citations[1].pageNumber).toBe(2);
    expect(citations[0].documentName).toBe('Pustak_Architecture.pdf');
  });
});
