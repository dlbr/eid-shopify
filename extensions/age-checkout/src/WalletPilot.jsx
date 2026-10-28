import {useEffect, useRef, useState} from 'preact/hooks';
import {CustomerWalletController} from './customer-wallet-controller.ts';
import {WalletModal} from './WalletModal.jsx';

/**
 * Unmounted pilot only. UI eligibility is advisory; the server must verify the
 * signed customer claim for every request. This component never approves checkout.
 * @param {{signedIn: boolean, tokenProvider: {get: () => Promise<string>}, translate: (key: string) => string, fetcher?: typeof fetch}} props
 */
export function WalletPilot({signedIn, tokenProvider, translate, fetcher}) {
  const [state, setState] = useState(/** @type {import('./wallet-state.ts').WalletState} */ ({phase:'idle'}));
  const [uri, setUri] = useState(/** @type {string | null} */ (null));
  const controller = useRef(/** @type {CustomerWalletController | null} */ (null));
  const active = useRef(false);
  useEffect(() => {
    let mounted = true;
    const current = new CustomerWalletController({tokenProvider, onChange: (next, nextUri) => { active.current = next.phase === 'starting' || next.phase === 'pending'; if (mounted) { setState(next); setUri(nextUri); } }, ...(fetcher ? {fetcher} : {})});
    controller.current = current;
    return () => { mounted = false; controller.current = null; current.cancel(); };
  }, [tokenProvider, fetcher]);
  useEffect(() => { if (!signedIn) controller.current?.cancel(); }, [signedIn]);
  function start() {
    if (!signedIn || !controller.current || active.current) return;
    controller.current.reset();
    void controller.current.start();
  }
  return <s-stack gap="base">
    <s-paragraph>{translate('walletPilot.explanation')}</s-paragraph>
    <s-button command="--show" commandFor="dlbr-wallet-pilot" disabled={!signedIn} onClick={start}>{translate('walletModal.openWallet')}</s-button>
    {!signedIn && <s-paragraph>{translate('walletPilot.signIn')}</s-paragraph>}
    <WalletModal id="dlbr-wallet-pilot" state={state} walletUri={uri} translate={translate} onHide={() => controller.current?.cancel()} />
  </s-stack>;
}
