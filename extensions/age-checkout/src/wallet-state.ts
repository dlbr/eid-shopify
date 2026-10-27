/** Display-only wallet state. It never authorizes a Shopify checkout. */
export type WalletState =
  | { phase: "idle" }
  | { phase: "starting"; attempt: string }
  | { phase: "pending"; attempt: string; expiresAt: number }
  | { phase: "verified" | "rejected" | "expired" | "unavailable" | "cancelled"; attempt: string };

export type WalletEvent =
  | { type: "start"; attempt: string }
  | { type: "created"; attempt: string; expiresAt: number; now: number }
  | { type: "status"; attempt: string; status: "PENDING" | "VERIFIED" | "REJECTED" | "FAILED" | "EXPIRED"; now: number }
  | { type: "tick"; attempt: string; now: number }
  | { type: "error"; attempt: string }
  | { type: "cancel" }
  | { type: "reset" };

/** Ignore late responses from cancelled or superseded attempts. */
export function walletState(state: WalletState, event: WalletEvent): WalletState {
  if (event.type === "reset") return { phase: "idle" };
  if (event.type === "start") {
    if (state.phase !== "idle" || !event.attempt) return state;
    return { phase: "starting", attempt: event.attempt };
  }
  if (event.type === "cancel") {
    return state.phase === "starting" || state.phase === "pending"
      ? { phase: "cancelled", attempt: state.attempt } : state;
  }
  if (event.type === "tick") {
    return state.phase === "pending" && event.attempt === state.attempt && Number.isFinite(event.now) && event.now >= state.expiresAt
      ? { phase: "expired", attempt: state.attempt } : state;
  }
  if (state.phase !== "starting" && state.phase !== "pending") return state;
  if (event.attempt !== state.attempt) return state;
  if (event.type === "error") return { phase: "unavailable", attempt: state.attempt };
  if (event.type === "created") {
    if (state.phase !== "starting") return state;
    if (!Number.isFinite(event.expiresAt) || !Number.isFinite(event.now)) return { phase: "unavailable", attempt: state.attempt };
    return event.expiresAt <= event.now ? { phase: "expired", attempt: state.attempt }
      : { phase: "pending", attempt: state.attempt, expiresAt: event.expiresAt };
  }
  if (state.phase !== "pending") return state;
  if (!Number.isFinite(event.now)) return { phase: "unavailable", attempt: state.attempt };
  if (event.now >= state.expiresAt || event.status === "EXPIRED") return { phase: "expired", attempt: state.attempt };
  switch (event.status) {
    case "PENDING": return state;
    case "VERIFIED": return { phase: "verified", attempt: state.attempt };
    case "REJECTED": return { phase: "rejected", attempt: state.attempt };
    case "FAILED": return { phase: "unavailable", attempt: state.attempt };
  }
}

/** Translation key for presentation only; a verified result does not approve checkout. */
export function walletStatusKey(state: WalletState): string {
  return `walletStatus.${state.phase}`;
}
