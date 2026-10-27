import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useState} from 'preact/hooks';
import {useAppMetafields, useInstructions} from '@shopify/ui-extensions/checkout/preact';

export default function extension() {
  render(<Probe />, document.body);
}

function Probe() {
  const fields = useAppMetafields({type: 'cart', namespace: '$app', key: 'binding_probe'});
  const canWrite = useInstructions().metafields.canSetCartMetafields;
  const [status, setStatus] = useState('idle');
  const field = fields.length === 1 ? fields[0].metafield : undefined;
  const serverVisible = field?.type === 'single_line_text_field' && field.value.startsWith('server:');
  const clientVisible = field?.value === 'client:diagnostic-only';
  /** @param {string} key */
  const translate = (key) => shopify.i18n.translate(key);

  async function overwrite() {
    if (!serverVisible || !canWrite || status === 'submitting') return;
    setStatus('submitting');
    try {
      const result = await shopify.applyMetafieldChange({
        type: 'updateCartMetafield',
        metafield: {namespace: '$app', key: 'binding_probe', type: 'single_line_text_field', value: 'client:diagnostic-only'},
      });
      setStatus(result.type === 'success' ? 'accepted' : 'rejected');
    } catch { setStatus('rejected'); }
  }

  return (
    <s-banner heading={translate('heading')}>
      <s-stack gap="base">
        <s-paragraph>{translate('description')}</s-paragraph>
        <s-paragraph>{translate(serverVisible ? 'serverVisible' : clientVisible ? 'clientVisible' : 'missing')}</s-paragraph>
        {!canWrite && <s-paragraph>{translate('unsupported')}</s-paragraph>}
        <s-button disabled={!serverVisible || !canWrite || status === 'submitting'} onClick={overwrite}>
          {translate(status === 'submitting' ? 'writing' : 'overwrite')}
        </s-button>
        {status !== 'idle' && <s-paragraph>{translate(status)}</s-paragraph>}
      </s-stack>
    </s-banner>
  );
}
