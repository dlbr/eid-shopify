import {walletStatusKey} from './wallet-state.ts';

/**
 * Display-only status for a future wallet panel. The caller owns lifecycle and
 * announcements; this component performs no I/O and makes no checkout decision.
 * @param {{state: import('./wallet-state.ts').WalletState, translate: (key: string) => string}} props
 */
export function WalletStatus({state, translate}) {
  return <s-paragraph>{translate(walletStatusKey(state))}</s-paragraph>;
}
