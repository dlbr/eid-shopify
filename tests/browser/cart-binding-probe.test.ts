import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";

test("development cart probe component never writes automatically and limits explicit writes to its diagnostic field", async (t) => {
  const bundle = await build({ entryPoints: ["extensions/cart-binding-probe/src/Checkout.jsx"], bundle: true, write: false, format: "iife", globalName: "ProbeUI", platform: "browser" });
  const browser = await chromium.launch();
  try {
    for (const language of ["en.default", "de"]) await t.test(`explicit write, signal updates and API outcomes (${language})`, async () => {
      const messages = JSON.parse(await readFile(`extensions/cart-binding-probe/locales/${language}.json`, "utf8")) as Record<string, string>;
      const page = await browser.newPage();
      await page.route("**/*", route => route.abort());
      await page.setContent("<!doctype html><html><body></body></html>");
      await page.evaluate(messages => {
        function signal(initial: unknown, event: string) {
          let current = initial;
          const listeners = new Set<(value: unknown) => void>();
          window.addEventListener(event, value => { current = (value as CustomEvent).detail; for (const listener of listeners) listener(current); });
          return { get value() { return current; }, subscribe(listener: (value: unknown) => void) { listeners.add(listener); return () => listeners.delete(listener); } };
        }
        const fields = [{ target: { type: "cart", id: "fixture-cart" }, metafield: { namespace: "$app", key: "binding_probe", type: "single_line_text_field", value: "server:fixture" } }];
        const writes: unknown[] = [];
        let finish: ((value: unknown) => void) | undefined;
        Object.assign(globalThis, { probeWrites: writes, probeFields: fields, resolveProbeWrite: (value: unknown) => finish?.(value), shopify: {
          appMetafields: signal(fields, "probe:fields"), instructions: signal({ metafields: { canSetCartMetafields: true } }, "probe:instructions"),
          i18n: { translate: (key: string) => messages[key] },
          applyMetafieldChange: (change: unknown) => { writes.push(change); return new Promise(resolve => { finish = resolve; }); },
        } });
      }, messages);
      await page.addScriptTag({ content: bundle.outputFiles[0]!.text + "\nProbeUI.default();" });
      await expect(page.locator("s-banner")).toHaveAttribute("heading", messages.heading!);
      await expect(page.locator("s-stack")).toContainText(messages.serverVisible!);
      assert.equal(await page.evaluate(() => (globalThis as any).probeWrites.length), 0);
      await page.locator("s-button").click();
      await expect(page.locator("s-button")).toHaveAttribute("disabled", "true");
      // Even a manually dispatched click during the request must not start another write.
      await page.locator("s-button").dispatchEvent("click");
      assert.deepEqual(await page.evaluate(() => (globalThis as any).probeWrites), [{ type: "updateCartMetafield", metafield: { namespace: "$app", key: "binding_probe", type: "single_line_text_field", value: "client:diagnostic-only" } }]);
      await page.evaluate(() => (globalThis as any).resolveProbeWrite({ type: "error", message: "untrusted backend message" }));
      await expect(page.locator("s-stack")).toContainText(messages.rejected!);
      await expect(page.locator("s-stack")).not.toContainText("untrusted backend message");
      await page.locator("s-button").click();
      await page.evaluate(() => (globalThis as any).resolveProbeWrite({ type: "success" }));
      await expect(page.locator("s-stack")).toContainText(messages.accepted!);
      await page.evaluate(() => {
        const fields = (globalThis as any).probeFields;
        window.dispatchEvent(new CustomEvent("probe:fields", { detail: [{ ...fields[0], metafield: { ...fields[0].metafield, value: "client:diagnostic-only" } }] }));
      });
      await expect(page.locator("s-stack")).toContainText(messages.clientVisible!);
      await expect(page.locator("s-button")).toHaveAttribute("disabled", "true");
      await page.evaluate(() => window.dispatchEvent(new CustomEvent("probe:fields", { detail: [] })));
      await expect(page.locator("s-stack")).toContainText(messages.missing!);
      await page.evaluate(() => window.dispatchEvent(new CustomEvent("probe:instructions", { detail: { metafields: { canSetCartMetafields: false } } })));
      await expect(page.locator("s-stack")).toContainText(messages.unsupported!);
      assert.equal(await page.evaluate(() => (globalThis as any).probeWrites.length), 2);
      await page.close();
    });
  } finally { await browser.close(); }
});
