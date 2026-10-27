import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useAppMetafields, useCartLines} from '@shopify/ui-extensions/checkout/preact';
import {checkoutPolicy} from './policy.ts';

export default function extension() {
  render(<Extension />, document.body);
}

function Extension() {
  const lines = useCartLines();
  const productIds = lines.map(line => line.merchandise?.product?.id).filter(id => typeof id === 'string');
  const state = checkoutPolicy(useAppMetafields(), productIds, lines.length);
  if (state === 'not_required') return null;
  return (
    <s-banner heading={shopify.i18n.translate(state === 'required' ? 'requiredHeading' : 'unknownHeading')} tone="warning">
      <s-paragraph>{shopify.i18n.translate(state === 'required' ? 'requiredBody' : 'unknownBody')}</s-paragraph>
    </s-banner>
  );
}
