import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";

test("checkout component in Chromium with real Preact/Shopify hooks and simulated host signals", async (t) => {
  const bundle = await build({ entryPoints: ["extensions/age-checkout/src/Checkout.jsx"], bundle: true, write: false, format: "iife", globalName: "CheckoutUI", platform: "browser" });
  const script = bundle.outputFiles[0]!.text;
  const browser = await chromium.launch();
  const field = (value: string) => ({ target: { type: "shop", id: "gid://shopify/Shop/1" }, metafield: { namespace: "$app", key: "all_products_require_age_verification", type: "boolean", value } });
  try {
    for (const language of ["en.default", "de"]) await t.test(`renders unavailable text in ${language}, reacts to policy/cart changes and performs no I/O`, async () => {
      const messages = JSON.parse(await readFile(`extensions/age-checkout/locales/${language}.json`, "utf8")) as Record<string, string>;
      const page = await browser.newPage();
      let requests = 0;
      await page.route("**/*", route => { requests++; return route.abort(); });
      await page.setContent("<!doctype html><html><body></body></html>");
      await page.evaluate(({ messages, entries }) => {
        function signal(initial: unknown, event: string) {
          let current = initial;
          const listeners = new Set<(value: unknown) => void>();
          window.addEventListener(event, value => { current = (value as CustomEvent).detail; for (const listener of listeners) listener(current); });
          return { get value() { return current; }, subscribe(listener: (value: unknown) => void) { listeners.add(listener); return () => listeners.delete(listener); } };
        }
        const forbidden = () => { throw new Error("Read-only checkout block must not perform I/O or mutations"); };
        Object.assign(globalThis, { shopify: {
          lines: signal([{ merchandise: { product: { id: "gid://shopify/Product/1" } } }], "checkout:lines"),
          appMetafields: signal(entries, "checkout:metafields"),
          i18n: { translate: (key: string) => messages[key] },
          applyMetafieldChange: forbidden, query: forbidden, sessionToken: { get: forbidden },
        } });
      }, { messages, entries: [field("true")] });
      await page.addScriptTag({ content: script + "\nCheckoutUI.default();" });
      await expect(page.locator("s-banner")).toHaveAttribute("heading", messages.requiredHeading!);
      await expect(page.locator("s-paragraph")).toHaveText(messages.requiredBody!);
      assert.equal(await page.locator("s-checkbox,button,s-button,input").count(), 0);
      await page.evaluate(entries => window.dispatchEvent(new CustomEvent("checkout:metafields", { detail: entries })), [field("false")]);
      await expect(page.locator("s-banner")).toHaveCount(0);
      await page.evaluate(() => window.dispatchEvent(new CustomEvent("checkout:metafields", { detail: [] })));
      await expect(page.locator("s-banner")).toHaveAttribute("heading", messages.unknownHeading!);
      await expect(page.locator("s-paragraph")).toHaveText(messages.unknownBody!);
      await page.evaluate(() => window.dispatchEvent(new CustomEvent("checkout:lines", { detail: [] })));
      await expect(page.locator("s-banner")).toHaveCount(0);
      await page.evaluate(entries => {
        window.dispatchEvent(new CustomEvent("checkout:metafields", { detail: entries }));
        window.dispatchEvent(new CustomEvent("checkout:lines", { detail: [{ merchandise: {} }] }));
      }, [field("true")]);
      await expect(page.locator("s-banner")).toHaveAttribute("heading", messages.requiredHeading!);
      assert.equal(requests, 0);
      await page.close();
    });
  } finally { await browser.close(); }
});
