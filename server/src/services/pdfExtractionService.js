// Polyfill globalThis.Iterator for Node.js < 22 (PDF.js / unpdf compatibility)
if (typeof globalThis.Iterator === 'undefined') {
  globalThis.Iterator = class Iterator {};
}

import { extractText, getDocumentProxy } from 'unpdf';
import { BadRequestError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Validates the file buffer magic bytes to ensure it's a true PDF.
 * A valid PDF must begin with '%PDF-' (hex: 25 50 44 46 2d)
 * 
 * @param {Buffer} buffer - File buffer to inspect
 * @returns {boolean} True if magic bytes match PDF signature
 */
export function validatePdfSignature(buffer) {
  if (!buffer || buffer.length < 5) return false;
  // '%PDF-'
  return (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  );
}

/**
 * Extracts text from a PDF buffer page-by-page.
 * Preserving page numbers is crucial for verifiable RAG citations.
 * 
 * @param {Buffer} pdfBuffer - Raw PDF file buffer
 * @returns {Promise<{ totalPages: number, pages: Array<{ pageNumber: number, text: string }> }>}
 */
export async function extractTextPageByPage(pdfBuffer) {
  // Step 1: Validate file magic bytes
  if (!validatePdfSignature(pdfBuffer)) {
    throw new BadRequestError('Invalid PDF file signature. The uploaded file does not start with %PDF-.');
  }

  try {
    // Step 2: Initialize PDF proxy via unpdf (pure JS Mozilla PDF.js wrapper)
    const uint8Array = new Uint8Array(pdfBuffer);
    const pdf = await getDocumentProxy(uint8Array);

    // Step 3: Extract text with mergePages: false to preserve page boundaries
    const { totalPages, text } = await extractText(pdf, { mergePages: false });

    logger.info(`Extracted PDF: ${totalPages} pages found.`);

    // Step 4: Map raw pages into structured array with 1-based page numbers
    const pages = [];
    let totalTextLength = 0;

    const pageTexts = Array.isArray(text) ? text : [text];

    for (let i = 0; i < pageTexts.length; i++) {
      const pageNumber = i + 1;
      const rawText = pageTexts[i] || '';
      
      // Clean and normalize whitespace while preserving paragraph breaks
      const cleanedText = rawText
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .trim();

      totalTextLength += cleanedText.length;

      pages.push({
        pageNumber,
        text: cleanedText,
      });
    }

    // Step 5: Check if document has extractable text (e.g. Scanned image PDF)
    if (totalTextLength === 0) {
      throw new BadRequestError(
        'The uploaded PDF contains no extractable text. Scanned or image-only PDFs without an OCR text layer are not currently supported.'
      );
    }

    return {
      totalPages,
      pages,
    };
  } catch (error) {
    if (error instanceof BadRequestError) {
      throw error;
    }
    logger.error('PDF extraction failed:', error);
    throw new BadRequestError(`Failed to parse PDF document: ${error.message}`);
  }
}
