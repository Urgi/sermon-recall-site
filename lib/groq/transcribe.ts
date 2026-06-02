/**
 * Groq Speech-to-Text (OpenAI-compatible). Server / worker only — requires GROQ_API_KEY.
 * @see https://console.groq.com/docs/speech-text
 */
export async function transcribeWithGroq(params: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  language?: string;
}): Promise<string> {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) {
    throw new Error('Missing GROQ_API_KEY on the server.');
  }

  const form = new FormData();
  const blob = new Blob([new Uint8Array(params.buffer)], { type: params.mimeType });
  form.append('file', blob, params.filename);
  form.append(
    'model',
    process.env.GROQ_TRANSCRIPTION_MODEL?.trim() || 'whisper-large-v3-turbo',
  );
  const lang = params.language?.trim() || process.env.GROQ_TRANSCRIPTION_LANGUAGE?.trim();
  if (lang) {
    form.append('language', lang);
  }

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text();
    const err = new Error(`Groq transcription failed (${res.status}): ${detail.slice(0, 500)}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }

  const json = (await res.json()) as { text?: string };
  const text = json.text?.trim() ?? '';
  if (!text) {
    throw new Error('Groq transcription returned empty text.');
  }
  return text;
}
