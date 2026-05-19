import { GoogleGenerativeAI } from '@google/generative-ai';

const DEFAULT_MODEL_CANDIDATES = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
] as const;

export function getGeminiApiKeyFromEnv(): string | null {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    null
  );
}

export function geminiModelCandidatesFromEnv(): string[] {
  const explicit = process.env.GEMINI_MODEL?.trim();
  if (explicit) return [explicit];
  return [...DEFAULT_MODEL_CANDIDATES];
}

export function isGeminiModelNotFoundError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.message.includes('404') && err.message.includes('models/');
}

export type GeminiJsonFailure = {
  error: string;
  hint?: string;
  status: number;
};

/**
 * Calls Gemini with JSON response mode; tries model fallbacks when GEMINI_MODEL is unset.
 */
export async function runGeminiJsonPrompt(
  apiKey: string,
  prompt: string,
): Promise<{ text: string } | GeminiJsonFailure> {
  const candidates = geminiModelCandidatesFromEnv();
  const explicitModel = Boolean(process.env.GEMINI_MODEL?.trim());
  const genAI = new GoogleGenerativeAI(apiKey);

  for (let i = 0; i < candidates.length; i++) {
    const modelId = candidates[i];
    try {
      const model = genAI.getGenerativeModel({
        model: modelId,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (!text) throw new Error('Empty response from model.');
      return { text };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      const canRetry =
        !explicitModel && isGeminiModelNotFoundError(e) && i < candidates.length - 1;
      if (canRetry) continue;
      return {
        status: 502,
        error: err.message,
        hint: explicitModel
          ? 'Confirm GEMINI_MODEL matches a model ID from Google AI Studio for this API key.'
          : `Tried: ${candidates.slice(0, i + 1).join(' → ')}. Set GEMINI_MODEL in site/.env to an ID from AI Studio if needed.`,
      };
    }
  }

  return { status: 502, error: 'Generation failed.' };
}
