import { extractText, getDocumentProxy } from 'unpdf';

import { PDF_MAX_BYTES, PDF_MAX_CHARS } from './pdf-limits';

export { PDF_MAX_BYTES, PDF_MAX_CHARS };

/** Fewer characters than this almost always means a scanned / image-only PDF. */
const MIN_TEXT_CHARS = 40;

export type PdfExtractErrorCode = 'password' | 'corrupt' | 'no_text';

export class PdfExtractError extends Error {
  constructor(public code: PdfExtractErrorCode) {
    super(code);
  }
}

export type PdfExtractResult = {
  text: string;
  pages: number;
  truncated: boolean;
};

function tidy(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function extractPdfText(bytes: Uint8Array): Promise<PdfExtractResult> {
  let pages: string[];
  try {
    const pdf = await getDocumentProxy(bytes);
    const out = await extractText(pdf, { mergePages: false });
    pages = out.text;
  } catch (e) {
    const name = e instanceof Error ? e.name : '';
    if (name === 'PasswordException') throw new PdfExtractError('password');
    throw new PdfExtractError('corrupt');
  }

  const full = tidy(pages.map((p) => tidy(p)).filter(Boolean).join('\n\n'));
  if (full.length < MIN_TEXT_CHARS) throw new PdfExtractError('no_text');

  const truncated = full.length > PDF_MAX_CHARS;
  return {
    text: truncated ? full.slice(0, PDF_MAX_CHARS) : full,
    pages: pages.length,
    truncated,
  };
}
