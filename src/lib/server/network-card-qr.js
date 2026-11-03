import { createHmac, timingSafeEqual } from 'node:crypto';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

const QR_TTL_MS = 5 * 60 * 1000;

function encode(value) {
  return Buffer.from(value).toString('base64url');
}

function signature(payload) {
  return createHmac('sha256', SUPABASE_SERVICE_ROLE_KEY).update(payload).digest('base64url');
}

export function createNetworkCardQrToken(cardId, ownerId) {
  const payload = encode(JSON.stringify({ cardId, ownerId, exp: Date.now() + QR_TTL_MS }));
  return { token: `${payload}.${signature(payload)}`, expiresAt: new Date(Date.now() + QR_TTL_MS).toISOString() };
}

export function verifyNetworkCardQrToken(token) {
  const [payload, receivedSignature] = String(token ?? '').split('.');
  if (!payload || !receivedSignature) return null;

  const expectedSignature = signature(payload);
  const received = Buffer.from(receivedSignature);
  const expected = Buffer.from(expectedSignature);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data?.cardId || !data?.ownerId || !Number.isFinite(data.exp) || data.exp <= Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}
