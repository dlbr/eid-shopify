import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import {loadProductPolicy, saveProductPolicy} from './policy.ts';

export default function extension() {
  render(<Extension />, document.body);
}

function Extension() {
  const {data, i18n} = shopify;
  const productId = data.selected[0]?.id;
  const [policy, setPolicy] = useState(/** @type {import('./policy.ts').ProductPolicy | null} */ (null));
  const [selected, setSelected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError('');
    setNotice('');
    if (!productId) {
      setPolicy(null);
      setLoading(false);
      setError(i18n.translate('loadError'));
      return () => { current = false; };
    }
    loadProductPolicy(productId).then(value => {
      if (!current) return;
      setPolicy(value);
      setSelected(value.required);
      setLoading(false);
    }).catch(() => {
      if (!current) return;
      setPolicy(null);
      setLoading(false);
      setError(i18n.translate('loadError'));
    });
    return () => { current = false; };
  }, [productId, reload]);

  async function save() {
    if (!productId || !policy || saving || selected === policy.required) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const next = await saveProductPolicy(productId, selected, policy);
      setPolicy(next);
      setSelected(next.required);
      setNotice(i18n.translate('saved'));
    } catch {
      // A failed or interrupted write may have succeeded. Reload before retrying.
      setPolicy(null);
      setError(i18n.translate('saveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <s-admin-block heading={i18n.translate('heading')}>
      <s-stack direction="block" gap="base">
        <s-checkbox label={i18n.translate('required')} checked={selected}
          disabled={loading || saving || !policy}
          onInput={event => { setSelected(event.currentTarget.checked); setNotice(''); }} />
        {policy?.allProducts && <s-paragraph>{i18n.translate('allProducts')}</s-paragraph>}
        <s-paragraph>{i18n.translate('unavailable')}</s-paragraph>
        {error && <s-banner tone="critical">{error}</s-banner>}
        {notice && <s-paragraph>{notice}</s-paragraph>}
        <s-stack direction="inline" gap="base">
          <s-button variant="primary" disabled={!policy || loading || saving || selected === policy.required} onClick={save}>{i18n.translate('save')}</s-button>
          <s-button disabled={loading || saving} onClick={() => setReload(value => value + 1)}>{i18n.translate('reload')}</s-button>
        </s-stack>
      </s-stack>
    </s-admin-block>
  );
}
