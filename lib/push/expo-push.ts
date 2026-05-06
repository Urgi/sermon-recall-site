const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
};

type ExpoPushTicket = {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
};

type ExpoPushResponse = {
  data?: ExpoPushTicket[];
};

/**
 * Sends push notifications via Expo Push API. Chunks to respect batch limits.
 * @see https://docs.expo.dev/push-notifications/sending-notifications/
 */
export async function sendExpoPushMessages(messages: ExpoPushMessage[]): Promise<void> {
  if (messages.length === 0) return;

  const chunkSize = 100;
  for (let i = 0; i < messages.length; i += chunkSize) {
    const chunk = messages.slice(i, i + chunkSize);
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chunk),
    });

    if (!res.ok) {
      console.warn('[expo-push] HTTP', res.status, await res.text());
      continue;
    }

    const json = (await res.json()) as ExpoPushResponse;
    const tickets = json.data ?? [];
    for (const t of tickets) {
      if (t.status === 'error') {
        console.warn('[expo-push] ticket error', t.message ?? t.details?.error);
      }
    }
  }
}
