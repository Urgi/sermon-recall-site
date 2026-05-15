/**
 * OpenAI Speech-to-Text (Whisper-class model). Server-only — requires OPENAI_API_KEY.
 * @see https://platform.openai.com/docs/api-reference/audio/createTranscription
 */
export async function transcribeAudioBuffer(params: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}): Promise<string> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error('Missing OPENAI_API_KEY on the server.');
  }

  const form = new FormData();
  const blob = new Blob([new Uint8Array(params.buffer)], { type: params.mimeType });
  form.append('file', blob, params.filename);
  form.append('model', process.env.OPENAI_TRANSCRIPTION_MODEL?.trim() || 'whisper-1');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
    },
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Transcription failed (${res.status}): ${detail.slice(0, 500)}`);
  }

  const json = (await res.json()) as { text?: string };
  const text = json.text?.trim() ?? '';
  if (!text) {
    throw new Error('Transcription returned empty text.');
  }
  return text;
}
