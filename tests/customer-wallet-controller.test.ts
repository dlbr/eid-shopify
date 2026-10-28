import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CustomerWalletController} from '../extensions/age-checkout/src/customer-wallet-controller.ts';

const id = '8cfbd12d-4af2-4549-8d77-3de3be71e263';
const token = 'a'.repeat(43);
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

test('starts only on demand and polls until verified without authorizing checkout', async () => {
  let calls = 0, tokenCalls = 0;
  const states: string[] = [], uris: (string | null)[] = [];
  const expiresAt = Date.now() + 5000;
  const controller = new CustomerWalletController({tokenProvider:{get:async()=>`token-${++tokenCalls}`}, pollIntervalMs:5,
    onChange:(s, uri)=>{ states.push(s.phase); uris.push(uri); }, fetcher: (async (_input, init) => {
      calls++;
      return Response.json(init?.method === 'POST' ? {id,status:'PENDING',verifiedAt:null,expiresAt,walletUri:'openid4vp://?request_uri=synthetic',accessToken:token} : {id,status:'VERIFIED',verifiedAt:Date.now(),expiresAt});
    }) as typeof fetch});
  assert.equal(calls, 0);
  await controller.start(); await sleep(40);
  assert.deepEqual(states, ['starting','pending','verified']);
  assert.equal(uris[1], 'openid4vp://?request_uri=synthetic'); assert.equal(uris[2], null);
  assert.equal(calls, 2); assert.equal(tokenCalls, 2);
  controller.reset();
});

test('cancellation prevents a late token from starting a request', async () => {
  let resolveToken!: (token: string) => void;
  let calls = 0; const states: string[] = [];
  const controller = new CustomerWalletController({tokenProvider:{get:()=>new Promise(resolve => {resolveToken=resolve;})},onChange:s=>states.push(s.phase),fetcher:(async ()=>{ calls++; throw new Error('unexpected'); }) as typeof fetch});
  const starting = controller.start(); controller.cancel(); resolveToken('late'); await starting; await sleep(10);
  assert.deepEqual(states, ['starting','cancelled']); assert.equal(calls, 0);
});

test('failed or stalled creation becomes unavailable and does not expose a QR', async () => {
  const snapshots: Array<{phase:string; uri:string | null}> = [];
  const controller = new CustomerWalletController({tokenProvider:{get:()=>new Promise(()=>{})},requestTimeoutMs:10,onChange:(s,uri)=>snapshots.push({phase:s.phase,uri})});
  await controller.start();
  assert.deepEqual(snapshots, [{phase:'starting',uri:null},{phase:'unavailable',uri:null}]);
});

test('expires locally and stops polling when the session deadline passes', async () => {
  let now = 1000, calls = 0; const states: string[] = [];
  const controller = new CustomerWalletController({tokenProvider:{get:async()=> 'token'},now:()=>now,pollIntervalMs:10,onChange:s=>states.push(s.phase),fetcher:(async (_input, init)=>{
    calls++;
    if (init?.method === 'POST') return Response.json({id,status:'PENDING',verifiedAt:null,expiresAt:1010,walletUri:'openid4vp://?request_uri=synthetic',accessToken:token});
    throw new Error('must not poll after expiry');
  }) as typeof fetch});
  await controller.start(); now = 1010; await sleep(30);
  assert.deepEqual(states,['starting','pending','expired']); assert.equal(calls,1);
});
