const DEFAULT_MODEL_CANDIDATES = ['gpt-4o-mini', 'gpt-4.1-mini'] as const;

export function getOpenAIApiKeyFromEnv(): string | null {
  return process.env.OPENAI_API_KEY?.trim() ?? null;
}

export function openaiDevotionalModelCandidates(): string[] {
  const explicit = process.env.OPENAI_DEVOTIONAL_MODEL?.trim();
  if (explicit) return [explicit];
  return [...DEFAULT_MODEL_CANDIDATES];
}

export type OpenAIJsonFailure = {
  error: string;
  hint?: string;
  status: number;
};

/**
 * Chat Completions with JSON object response (OpenAI structured output).
 */
export async function runOpenAIJsonPrompt(
  prompt: string,
): Promise<{ text: string } | OpenAIJsonFailure> {
  const apiKey = getOpenAIApiKeyFromEnv();
  if (!apiKey) {
    return {
      status: 500,
      error: 'Missing OPENAI_API_KEY on the server.',
    };
  }

  const candidates = openaiDevotionalModelCandidates();
  const explicitModel = Boolean(process.env.OPENAI_DEVOTIONAL_MODEL?.trim());

  for (let i = 0; i < candidates.length; i++) {
    const model = candidates[i];
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.7,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'You are a careful editorial assistant for a church devotional app. Respond with valid JSON only.',
            },
            { role: 'user', content: prompt },
          ],
        }),
      });

      if (!res.ok) {
        const detail = await res.text();
        const notFound = res.status === 404 || detail.includes('model') && detail.includes('not');
        if (!explicitModel && notFound && i < candidates.length - 1) {
          continue;
        }
        return {
          status: 502,
          error: `OpenAI request failed (${res.status}).`,
          hint: detail.slice(0, 300),
        };
      }

      const json = (await res.json()) as {
        choices?: { message?: { content?: string | null } }[];
      };
      const text = json.choices?.[0]?.message?.content?.trim() ?? '';
      if (!text) {
        throw new Error('Empty response from model.');
      }
      return { text };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      const canRetry = !explicitModel && i < candidates.length - 1;
      if (canRetry) continue;
      return {
        status: 502,
        error: err.message,
        hint: explicitModel
          ? 'Confirm OPENAI_DEVOTIONAL_MODEL is a valid chat model ID for your API key.'
          : `Tried: ${candidates.slice(0, i + 1).join(' → ')}. Set OPENAI_DEVOTIONAL_MODEL in site/.env if needed.`,
      };
    }
  }

  return { status: 502, error: 'Generation failed.' };
}
