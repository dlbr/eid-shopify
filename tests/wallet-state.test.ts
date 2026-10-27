import assert from "node:assert/strict";
import { test } from "node:test";
import { walletState, type WalletState } from "../extensions/age-checkout/src/wallet-state.ts";

const idle: WalletState = { phase: "idle" };
const starting: WalletState = { phase: "starting", attempt: "a" };
const pending: WalletState = { phase: "pending", attempt: "a", expiresAt: 100 };

test("models a wallet result without making a checkout decision", () => {
  assert.deepEqual(walletState(idle, { type: "start", attempt: "a" }), starting);
  assert.deepEqual(walletState(starting, { type: "created", attempt: "a", expiresAt: 100, now: 1 }), pending);
  assert.deepEqual(walletState(pending, { type: "status", attempt: "a", status: "PENDING", now: 2 }), pending);
  assert.deepEqual(walletState(pending, { type: "status", attempt: "a", status: "VERIFIED", now: 2 }), { phase: "verified", attempt: "a" });
  for (const [status, phase] of [["REJECTED", "rejected"], ["FAILED", "unavailable"], ["EXPIRED", "expired"]] as const) {
    assert.deepEqual(walletState(pending, { type: "status", attempt: "a", status, now: 2 }), { phase, attempt: "a" });
  }
});

test("ignores late and mismatched results after cancellation or restart", () => {
  const cancelled = walletState(pending, { type: "cancel" });
  assert.deepEqual(cancelled, { phase: "cancelled", attempt: "a" });
  assert.deepEqual(walletState(cancelled, { type: "status", attempt: "a", status: "VERIFIED", now: 2 }), cancelled);
  assert.deepEqual(walletState(cancelled, { type: "start", attempt: "b" }), cancelled);
  const restarted = walletState(walletState(cancelled, { type: "reset" }), { type: "start", attempt: "b" });
  assert.deepEqual(walletState(restarted, { type: "created", attempt: "a", expiresAt: 100, now: 2 }), restarted);
  assert.deepEqual(walletState(restarted, { type: "error", attempt: "a" }), restarted);
});

test("treats expired, invalid or failed sessions as unavailable or expired", () => {
  assert.deepEqual(walletState(starting, { type: "created", attempt: "a", expiresAt: 5, now: 5 }), { phase: "expired", attempt: "a" });
  assert.deepEqual(walletState(starting, { type: "created", attempt: "a", expiresAt: NaN, now: 5 }), { phase: "unavailable", attempt: "a" });
  assert.deepEqual(walletState(pending, { type: "status", attempt: "a", status: "VERIFIED", now: 100 }), { phase: "expired", attempt: "a" });
  assert.deepEqual(walletState(pending, { type: "status", attempt: "a", status: "PENDING", now: NaN }), { phase: "unavailable", attempt: "a" });
  assert.deepEqual(walletState(pending, { type: "tick", now: 100 }), { phase: "expired", attempt: "a" });
  assert.deepEqual(walletState(starting, { type: "error", attempt: "a" }), { phase: "unavailable", attempt: "a" });
});

test("rejects invalid transitions and can reset terminal states", () => {
  assert.deepEqual(walletState(idle, { type: "start", attempt: "" }), idle);
  assert.deepEqual(walletState(idle, { type: "cancel" }), idle);
  assert.deepEqual(walletState(starting, { type: "status", attempt: "a", status: "VERIFIED", now: 1 }), starting);
  assert.deepEqual(walletState(pending, { type: "created", attempt: "a", expiresAt: 200, now: 1 }), pending);
  assert.deepEqual(walletState(pending, { type: "tick", now: 99 }), pending);
  assert.deepEqual(walletState(starting, { type: "tick", now: 100 }), starting);
  assert.deepEqual(walletState({ phase: "unavailable", attempt: "a" }, { type: "reset" }), idle);
});
