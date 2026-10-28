import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCustomerWalletSession, newWalletAttemptKey, pollCustomerWalletSession} from '../extensions/age-checkout/src/customer-wallet-client.ts';

const id = '8cfbd12d-4af2-4549-8d77-3de3be71e263';
const valid = {id, status:'PENDING', verifiedAt:null, expiresAt:123456, walletUri:'openid4vp://?request_uri=synthetic', accessToken:'a'.repeat(43)};
const response = (body: unknown) => (async () => Response.json(body)) as typeof fetch;

test('uses a fresh Shopify token for every request to the fixed customer endpoint', async () => {
  let counter = 0;
  const headers: Headers[] = [];
  const provider = {get: async () => `token-${++counter}`};
  const fetcher = (async (input, init) => {
    assert.match(String(input), /^https:\/\/api\.dlbr\.app\/v1\/integrations\/shopify\/api\/customer-verifications/);
    assert.equal(init?.redirect, 'error'); assert.equal(init?.credentials, 'omit');
    headers.push(new Headers(init?.headers));
    return Response.json(init?.method === 'POST' ? valid : {id, status:'VERIFIED', verifiedAt:123000, expiresAt:valid.expiresAt});
  }) as typeof fetch;
  const key = newWalletAttemptKey(); assert.match(key, /^[A-Za-z0-9_-]{43}$/);
  const session = await createCustomerWalletSession(provider, key, fetcher);
  const result = await pollCustomerWalletSession(provider, session, fetcher);
  assert.equal(result.status, 'VERIFIED');
  assert.equal(headers[0]?.get('Authorization'), 'Bearer token-1');
  assert.equal(headers[1]?.get('Authorization'), 'Bearer token-2');
  assert.equal(headers[0]?.get('Idempotency-Key'), key);
  assert.equal(headers[1]?.get('X-Verification-Token'), valid.accessToken);
});

test('rejects malformed wallet sessions, mismatched status and unsafe URI', async () => {
  const provider = {get: async () => 'signed-token'};
  const key = newWalletAttemptKey();
  for (const data of [{...valid, walletUri:'https://evil.example'}, {...valid, walletUri:'openid4vp://bad\nlink'}, {...valid, id:'bad'}, {...valid, accessToken:'bad'}, {...valid, status:'VERIFIED'}, {...valid, expiresAt:null}]) {
    await assert.rejects(createCustomerWalletSession(provider, key, response(data)), /WALLET_RESPONSE_INVALID/);
  }
  const session = await createCustomerWalletSession(provider, key, response(valid));
  for (const data of [{id:'other', status:'PENDING', expiresAt:valid.expiresAt, verifiedAt:null}, {id, status:'UNKNOWN', expiresAt:valid.expiresAt, verifiedAt:null}, {id, status:'VERIFIED', expiresAt:5, verifiedAt:null}]) {
    await assert.rejects(pollCustomerWalletSession(provider, session, response(data)), /WALLET_RESPONSE_INVALID/);
  }
  await assert.rejects(createCustomerWalletSession(provider, key, response('x'.repeat(33000))), /WALLET_RESPONSE_INVALID/);
});
