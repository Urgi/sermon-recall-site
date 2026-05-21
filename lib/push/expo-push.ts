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

export type ExpoPushSendResult = {
  /** Per-message error detail strings from Expo. */
  ticketErrors: string[];
  /** Push tokens that should be removed (DeviceNotRegistered, etc.). */
  staleTokens: string[];
};

function isStaleTokenError(detail: string): boolean {
  return (
    detail === 'DeviceNotRegistered' ||
    detail.includes('DeviceNotRegistered') ||
    detail === 'InvalidCredentials' ||
    detail.includes('InvalidCredentials')
  );
}

/**
 * Sends push notifications via Expo Push API. Chunks to respect batch limits.
 * @see https://docs.expo.dev/push-notifications/sending-notifications/
 */
export async function sendExpoPushMessages(
  messages: ExpoPushMessage[],
): Promise<ExpoPushSendResult> {
  const ticketErrors: string[] = [];
  const staleTokens: string[] = [];
  if (messages.length === 0) return { ticketErrors, staleTokens };

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
      const text = await res.text();
      console.warn('[expo-push] HTTP', res.status, text);
      ticketErrors.push(`expo_http_${res.status}: ${text.slice(0, 240)}`);
      continue;
    }

    const json = (await res.json()) as ExpoPushResponse;
    const tickets = json.data ?? [];
    for (let j = 0; j < tickets.length; j++) {
      const t = tickets[j];
      const token = chunk[j]?.to;
      if (t.status === 'error') {
        const detail = t.details?.error ?? t.message ?? 'unknown';
        console.warn('[expo-push] ticket error', detail, token?.slice(0, 12));
        ticketErrors.push(detail);
        if (token && isStaleTokenError(detail)) {
          staleTokens.push(token);
        }
      }
    }
  }

  return { ticketErrors, staleTokens };
}
