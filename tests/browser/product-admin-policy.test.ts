import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {build} from 'esbuild';
import {chromium, expect} from '@playwright/test';

test('product block saves the selected product and requires reload after an uncertain save', async () => {
  const bundle = await build({entryPoints: ['extensions/age-product-policy/src/BlockExtension.jsx'], bundle: true, write: false, format: 'iife', globalName: 'ProductPolicyUI', platform: 'browser'});
  const messages = JSON.parse(await readFile('extensions/age-product-policy/locales/en.default.json', 'utf8')) as Record<string, string>;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent('<!doctype html><html><body></body></html>');
    await page.evaluate(messages => {
      class MockCheckbox extends HTMLElement { checked = false; disabled = false; }
      class MockButton extends HTMLElement { disabled = false; }
      customElements.define('s-checkbox', MockCheckbox);
      customElements.define('s-button', MockButton);
      const state = {required: false, failWrite: false, writes: [] as unknown[]};
      Object.assign(globalThis, {shopify: {data: {selected: [{id: 'gid://shopify/Product/123'}]}, i18n: {translate: (key: string) => messages[key]}}, productPolicyTest: state});
      globalThis.fetch = async (_url, init) => {
        const request = JSON.parse(String(init?.body));
        const hash = 'a'.repeat(64);
        if (request.query.includes('query ProductAgePolicy')) {
          return Response.json({data: {product: {id: 'gid://shopify/Product/123', metafield: state.required ? {type: 'boolean', value: 'true', compareDigest: hash} : null}, shop: {metafield: {type: 'boolean', value: 'true'}}}});
        }
        state.writes.push(request.variables);
        if (state.failWrite) return Response.json({data: {metafieldsSet: {metafields: [], userErrors: [{code: 'STALE_OBJECT'}]}}});
        state.required = request.variables.metafields[0].value === 'true';
        return Response.json({data: {metafieldsSet: {metafields: [{type: 'boolean', value: String(state.required), compareDigest: hash}], userErrors: []}}});
      };
    }, messages);
    await page.addScriptTag({content: bundle.outputFiles[0]!.text + '\nProductPolicyUI.default();'});
    const checkbox = page.locator('s-checkbox');
    const save = page.locator('s-button').first();
    await expect(checkbox).toHaveAttribute('label', messages.required!);
    await expect(page.locator('s-paragraph')).toContainText([messages.allProducts!, messages.unavailable!]);
    await expect.poll(() => checkbox.evaluate((element: any) => element.disabled)).toBe(false);
    await checkbox.evaluate((element: any) => { element.checked = true; element.dispatchEvent(new Event('input', {bubbles: true})); });
    await expect.poll(() => save.evaluate((element: any) => element.disabled)).toBe(false);
    await save.click();
    await expect(page.getByText(messages.saved!)).toBeVisible();
    const writes = await page.evaluate(() => (globalThis as any).productPolicyTest.writes);
    assert.deepEqual(writes[0], {metafields: [{ownerId: 'gid://shopify/Product/123', namespace: '$app', key: 'requires_age_verification', type: 'boolean', value: 'true', compareDigest: null}]});

    await page.evaluate(() => { (globalThis as any).productPolicyTest.failWrite = true; });
    await checkbox.evaluate((element: any) => { element.checked = false; element.dispatchEvent(new Event('input', {bubbles: true})); });
    await save.click();
    await expect(page.locator('s-banner')).toHaveText(messages.saveError!);
    await expect.poll(() => checkbox.evaluate((element: any) => element.disabled)).toBe(true);
    await page.locator('s-button').last().click();
    await expect.poll(() => checkbox.evaluate((element: any) => element.disabled)).toBe(false);
    await expect.poll(() => checkbox.evaluate((element: any) => element.checked)).toBe(true);
    await page.close();
  } finally { await browser.close(); }
});
