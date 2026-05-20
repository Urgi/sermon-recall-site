import { createHash, randomBytes } from 'node:crypto';

const TOKEN_BYTES = 32;

export function generateInviteToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

export function hashInviteToken(rawToken: string): string {
  return createHash('sha256').update(rawToken.trim()).digest('hex');
}
