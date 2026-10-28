import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {build} from 'esbuild';
import {chromium, expect} from '@playwright/test';

test('wallet modal presents the same request for QR and same-device link in both languages without network access', async () => {
  const bundle = await build({stdin:{contents:`import {render} from 'preact'; import {WalletModal} from './src/WalletModal.jsx'; window.mount = (uri, messages) => render(<WalletModal id="wallet" walletUri={uri} state={{phase:'pending',attempt:'test',expiresAt:1}} translate={key => key.split('.').reduce((value, part) => value[part], messages)} />, document.body);`,resolveDir:process.cwd() + "/extensions/age-checkout",loader:'jsx'},jsx:'automatic',jsxImportSource:'preact',bundle:true,write:false,format:'iife',platform:'browser'});
  const browser = await chromium.launch();
  try {
    for (const locale of ['en.default','de']) {
      const messages = JSON.parse(await readFile(`extensions/age-checkout/locales/${locale}.json`,'utf8'));
      const page = await browser.newPage();
      await page.setContent('<!doctype html><html><body></body></html>');
      let requests = 0; page.on('request', () => requests++);
      await page.addScriptTag({content:bundle.outputFiles[0]!.text});
      await page.evaluate(({messages}) => (window as any).mount('openid4vp://test-request', messages),{messages});
      await expect(page.locator('s-modal')).toHaveAttribute('heading', messages.walletModal.heading);
      await expect(page.locator('s-qr-code')).toHaveAttribute('content','openid4vp://test-request');
      await expect(page.locator('s-qr-code')).toHaveAttribute('accessibilityLabel', messages.walletModal.qrLabel);
      await expect(page.locator('s-clickable')).toHaveAttribute('href','openid4vp://test-request');
      await expect(page.locator('s-clickable')).toHaveAttribute('accessibilityLabel',messages.walletModal.openWallet);
      const base = `https://dlbr.app/assets/d-you/v1/d-you-wallet_button_verify_${locale === 'de' ? 'de' : 'en'}`;
      await expect(page.locator('s-image')).toHaveAttribute('src',`${base}.png`);
      await expect(page.locator('s-image')).toHaveAttribute('srcSet',`${base}.png 1x, ${base}%402x.png 2x, ${base}%403x.png 3x`);
      await expect(page.locator('s-banner')).toContainText(messages.walletStatus.pending);
      assert.equal(requests, 0);
      await page.close();
    }
  } finally { await browser.close(); }
});
