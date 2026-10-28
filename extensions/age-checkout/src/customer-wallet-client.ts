/** Development client. Never use a wallet result as checkout authorization. */
const API = 'https://api.dlbr.app/v1/integrations/shopify/api/customer-verifications';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SECRET = /^[A-Za-z0-9_-]{43}$/;
const STATUSES = new Set(['PENDING', 'VERIFIED', 'REJECTED', 'FAILED', 'EXPIRED']);
type SessionToken = {get(): Promise<string>};
type Fetcher = typeof fetch;
export interface CustomerWalletSession {id: string; accessToken: string; walletUri: string; expiresAt: number}
export interface CustomerWalletStatus {id: string; status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'FAILED' | 'EXPIRED'; expiresAt: number; verifiedAt: number | null}
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Caller retains this key only for retrying the same request; never log it. */
export function newWalletAttemptKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function validUri(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 16384 || /[\u0000-\u0020\u007f]/.test(value)) return false;
  try { return new URL(value).protocol === 'openid4vp:'; } catch { return false; }
}

async function call(tokenProvider: SessionToken, path: string, headers: Record<string, string>, method: 'GET' | 'POST', fetcher: Fetcher, signal?: AbortSignal): Promise<unknown> {
  const token = await tokenProvider.get();
  if (signal?.aborted) throw new Error('WALLET_REQUEST_CANCELLED');
  if (typeof token !== 'string' || !token || token.length > 8192) throw new Error('SESSION_TOKEN_UNAVAILABLE');
  const response = await fetcher(path, {method, headers: {...headers, Authorization: `Bearer ${token}`}, redirect: 'error', credentials: 'omit', cache: 'no-store', ...(signal ? {signal} : {})});
  if (!response.ok) throw new Error('WALLET_REQUEST_FAILED');
  if (!response.body) throw new Error('WALLET_RESPONSE_INVALID');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let body = '', bytes = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > 32768) { await reader.cancel(); throw new Error('WALLET_RESPONSE_INVALID'); }
      body += decoder.decode(part.value, {stream: true});
    }
    body += decoder.decode();
  } finally { reader.releaseLock(); }
  try { return JSON.parse(body); } catch { throw new Error('WALLET_RESPONSE_INVALID'); }
}

export async function createCustomerWalletSession(tokenProvider: SessionToken, idempotencyKey: string, fetcher: Fetcher = fetch, signal?: AbortSignal): Promise<CustomerWalletSession> {
  if (!SECRET.test(idempotencyKey)) throw new Error('INVALID_ATTEMPT_KEY');
  const data = await call(tokenProvider, API, {'Idempotency-Key': idempotencyKey}, 'POST', fetcher, signal);
  if (!record(data) || typeof data.id !== 'string' || !UUID.test(data.id) || data.status !== 'PENDING' || data.verifiedAt !== null ||
      typeof data.accessToken !== 'string' || !SECRET.test(data.accessToken) || !validUri(data.walletUri) || typeof data.expiresAt !== 'number' || !Number.isFinite(data.expiresAt)) throw new Error('WALLET_RESPONSE_INVALID');
  return {id: data.id, accessToken: data.accessToken, walletUri: data.walletUri, expiresAt: data.expiresAt};
}

export async function pollCustomerWalletSession(tokenProvider: SessionToken, session: CustomerWalletSession, fetcher: Fetcher = fetch, signal?: AbortSignal): Promise<CustomerWalletStatus> {
  if (!UUID.test(session.id) || !SECRET.test(session.accessToken)) throw new Error('WALLET_SESSION_INVALID');
  const data = await call(tokenProvider, `${API}/${session.id}`, {'X-Verification-Token': session.accessToken}, 'GET', fetcher, signal);
  if (!record(data) || data.id !== session.id || typeof data.status !== 'string' || !STATUSES.has(data.status) ||
      typeof data.expiresAt !== 'number' || !Number.isFinite(data.expiresAt) || data.expiresAt !== session.expiresAt ||
      (data.verifiedAt !== null && (typeof data.verifiedAt !== 'number' || !Number.isFinite(data.verifiedAt)))) throw new Error('WALLET_RESPONSE_INVALID');
  return {id: session.id, status: data.status as CustomerWalletStatus['status'], expiresAt: data.expiresAt, verifiedAt: data.verifiedAt as number | null};
}
