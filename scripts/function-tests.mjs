import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Execute the compiled WASM in Shopify's runner, including its schema/query checks.
const cases = [
  ["restricted-checkout", true],
  ["server-probe-no-approval", true],
  ["client-probe-no-approval", true],
  ["all-products-checkout", true],
  ["all-products-custom", true],
  ["all-products-interaction", false],
  ["all-products-empty", false],
  ["mixed-checkout", true],
  ["unrestricted-checkout", false],
  ["missing-metafield", false],
  ["cart-interaction", false],
  ["checkout-interaction", false],
  ["custom-product", false],
];
const evidence = [];
for (const [name, blocked] of cases) {
  const result = spawnSync("pnpm", ["exec", "shopify", "app", "function", "run",
    "--path", "extensions/age-validation", "--export", "cart-validations-generate-run",
    "--input", resolve(`extensions/age-validation/fixtures/${name}.json`), "--json", "--no-input",
  ], { encoding: "utf8", timeout: 60_000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${name}: ${result.stderr}\n${result.stdout}`);
  const run = JSON.parse(result.stdout);
  assert.equal(run.success, true, `${name}: runner must succeed`);
  assert.deepEqual(run.output, blocked ? { operations: [{ validationAdd: { errors: [{
    message: "Age verification is not yet available for this product. Please contact the store.",
    target: "$.cart",
  }] } }] } : { operations: [] }, name);
  evidence.push({ name, instructions: run.instructions, memoryUsage: run.memory_usage });
  console.log(`PASS ${name} (${run.instructions} instructions)`);
}
await mkdir("reports", { recursive: true });
await writeFile("reports/function-runtime.json", JSON.stringify({ cases: evidence }, null, 2) + "\n");
