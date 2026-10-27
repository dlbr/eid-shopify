import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";

test("wallet status component renders all translations without network or checkout actions", async (t) => {
  const bundle = await build({
    stdin: {
      contents: `import {render, h} from 'preact';
        import {WalletStatus} from './src/WalletStatus.jsx';
        window.addEventListener('wallet:state', event => render(h(WalletStatus, {
          state: event.detail, translate: key => window.walletMessages[key.split('.')[1]]
        }), document.body));`,
      resolveDir: `${process.cwd()}/extensions/age-checkout`, loader: "js",
    }, bundle: true, write: false, format: "iife", platform: "browser",
  });
  const browser = await chromium.launch();
  try {
    for (const locale of ["en.default", "de"]) await t.test(locale, async () => {
      const messages = JSON.parse(await readFile(`extensions/age-checkout/locales/${locale}.json`, "utf8")) as { walletStatus: Record<string, string> };
      const page = await browser.newPage();
      let requests = 0;
      await page.route("**/*", route => { requests++; return route.abort(); });
      await page.setContent("<!doctype html><html><body></body></html>");
      await page.evaluate(values => Object.assign(window, { walletMessages: values }), messages.walletStatus);
      await page.addScriptTag({ content: bundle.outputFiles[0]!.text });
      for (const phase of ["idle", "starting", "pending", "verified", "rejected", "expired", "unavailable", "cancelled"]) {
        await page.evaluate(value => window.dispatchEvent(new CustomEvent("wallet:state", { detail: { phase: value, attempt: "test", expiresAt: 100 } })), phase);
        await expect(page.locator("s-paragraph")).toHaveText(messages.walletStatus[phase]!);
        const tone = ["rejected", "expired", "unavailable"].includes(phase) ? "warning" : "info";
        await expect(page.locator("s-banner")).toHaveAttribute("tone", tone);
      }
      assert.equal(await page.locator("button,s-button,input,a").count(), 0);
      assert.equal(requests, 0);
      await page.close();
    });
  } finally { await browser.close(); }
});
