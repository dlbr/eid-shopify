import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {build} from 'esbuild';
import {chromium, expect} from '@playwright/test';

test('pilot needs buyer action, shows pending QR, and stops on modal hide', async () => {
  const bundle = await build({stdin:{contents:`import {render} from 'preact'; import {WalletPilot} from './src/WalletPilot.jsx'; const provider={get:async()=> 'signed-token'}; window.mount=(signedIn,messages)=>render(<WalletPilot signedIn={signedIn} tokenProvider={provider} translate={key=>key.split('.').reduce((value, part)=>value[part],messages)} />,document.body);`,resolveDir:process.cwd()+'/extensions/age-checkout',loader:'jsx'},jsx:'automatic',jsxImportSource:'preact',bundle:true,write:false,format:'iife',platform:'browser'});
  const messages=JSON.parse(await readFile('extensions/age-checkout/locales/en.default.json','utf8'));
  const browser=await chromium.launch();
  try {
    const page=await browser.newPage(); await page.setContent('<!doctype html><html><body></body></html>');
    await page.evaluate(()=>{
      class Button extends HTMLElement {disabled=false;}
      customElements.define('s-button', Button);
      const state={calls:0}; (window as any).pilotTest=state;
      globalThis.fetch=async()=>{state.calls++; return Response.json({id:'8cfbd12d-4af2-4549-8d77-3de3be71e263',status:'PENDING',verifiedAt:null,expiresAt:Date.now()+30000,walletUri:'openid4vp://?request_uri=synthetic',accessToken:'a'.repeat(43)});};
    });
    await page.addScriptTag({content:bundle.outputFiles[0]!.text});
    await page.evaluate(messages=>(window as any).mount(false,messages),messages);
    await expect.poll(()=>page.locator('s-button').evaluate((e:any)=>e.disabled)).toBe(true);
    assert.equal(await page.evaluate(()=>(window as any).pilotTest.calls),0);
    await page.evaluate(messages=>(window as any).mount(true,messages),messages);
    await expect.poll(()=>page.locator('s-button').evaluate((e:any)=>e.disabled)).toBe(false);
    await page.waitForTimeout(100);
    await page.locator('s-button').click();
    await expect(page.locator('s-qr-code')).toHaveAttribute('content','openid4vp://?request_uri=synthetic');
    await page.locator('s-modal').evaluate(e=>e.dispatchEvent(new Event('hide')));
    await expect(page.locator('s-qr-code')).toHaveCount(0);
    await expect(page.locator('s-banner')).toContainText(messages.walletStatus.cancelled);
    assert.equal(await page.evaluate(()=>(window as any).pilotTest.calls),1);
  } finally {await browser.close();}
});
