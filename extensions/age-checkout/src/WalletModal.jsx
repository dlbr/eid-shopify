import {WalletStatus} from './WalletStatus.jsx';
import {useEffect, useRef} from 'preact/hooks';

/**
 * Display-only wallet modal. The caller must authenticate the session, validate
 * the wallet URI and own cancellation and status polling before mounting it.
 * It makes no network request and cannot authorize checkout.
 * @param {{id: string, walletUri: string | null, state: import('./wallet-state.ts').WalletState, translate: (key: string) => string, onHide?: () => void}} props
 */
export function WalletModal({id, walletUri, state, translate, onHide}) {
  // This unmounted pilot targets d-you specifically; do not use these assets
  // for other wallet profiles.
  const locale = translate('walletModal.assetLocale') === 'de' ? 'de' : 'en';
  const base = `https://dlbr.app/assets/d-you/v1/d-you-wallet_button_verify_${locale}`;
  const modal = useRef(/** @type {HTMLElementTagNameMap['s-modal'] | null} */ (null));
  useEffect(() => {
    const node = modal.current;
    if (!node || !onHide) return;
    node.addEventListener('hide', onHide);
    return () => node.removeEventListener('hide', onHide);
  }, [onHide]);
  return <s-modal ref={modal} id={id} heading={translate('walletModal.heading')}>
    <s-stack gap="base">
      {walletUri && <>
      <s-paragraph>{translate('walletModal.otherDevice')}</s-paragraph>
      <s-qr-code content={walletUri} accessibilityLabel={translate('walletModal.qrLabel')} />
      <s-paragraph>{translate('walletModal.or')}</s-paragraph>
      <s-paragraph>{translate('walletModal.thisDevice')}</s-paragraph>
      <s-clickable href={walletUri} accessibilityLabel={translate('walletModal.openWallet')}>
        <s-box inlineSize="202px" maxInlineSize="100%">
          <s-image src={`${base}.png`} srcSet={`${base}.png 1x, ${base}%402x.png 2x, ${base}%403x.png 3x`} alt="" objectFit="contain" />
        </s-box>
      </s-clickable>
      </>}
      <s-link href="https://eudi-wallet.gov.de/" target="_blank">{translate('walletModal.about')}</s-link>
      <WalletStatus state={state} translate={translate} />
    </s-stack>
  </s-modal>;
}
