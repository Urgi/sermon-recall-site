import ws from 'ws';

/** Supabase Realtime transport on Node (browser `WebSocket` types differ from `ws`). */
export const supabaseNodeWebSocketTransport = ws as unknown as typeof WebSocket;
