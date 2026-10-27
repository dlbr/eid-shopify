import {walletStatusKey} from './wallet-state.ts';

/**
 * Display-only status for a future wallet panel. The caller owns lifecycle;
 * this component performs no I/O and makes no checkout decision.
 * @param {{state: import('./wallet-state.ts').WalletState, translate: (key: string) => string}} props
 */
export function WalletStatus({state, translate}) {
  const warning = state.phase === 'rejected' || state.phase === 'expired' || state.phase === 'unavailable';
  return <s-banner tone={warning ? 'warning' : 'info'}><s-paragraph>{translate(walletStatusKey(state))}</s-paragraph></s-banner>;
}
