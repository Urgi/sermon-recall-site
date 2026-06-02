import { transcribeWithGroq } from '@/lib/groq/transcribe';
import { transcribeAudioBuffer as transcribeWithOpenAI } from '@/lib/openai/transcribe';

const RETRYABLE = new Set([429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Transcribe audio: Groq Turbo primary, OpenAI fallback on missing key or hard failure.
 */
export async function transcribeAudioBuffer(params: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  language?: string;
}): Promise<string> {
  const hasGroq = Boolean(process.env.GROQ_API_KEY?.trim());
  if (hasGroq) {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        return await transcribeWithGroq(params);
      } catch (e) {
        lastErr = e;
        const status = (e as Error & { status?: number }).status;
        if (status && RETRYABLE.has(status) && attempt < 3) {
          await sleep(1000 * 2 ** attempt);
          continue;
        }
        break;
      }
    }
    if (process.env.OPENAI_API_KEY?.trim()) {
      console.warn('[stt] Groq failed, falling back to OpenAI:', lastErr);
      return transcribeWithOpenAI(params);
    }
    throw lastErr instanceof Error ? lastErr : new Error('Transcription failed.');
  }

  return transcribeWithOpenAI(params);
}
