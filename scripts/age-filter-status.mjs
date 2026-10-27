import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {getAgeFilterStatus} from './age-filter-readiness.mjs';

const store = process.argv[2] ?? '';
if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(store)) {
  console.error('Provide a valid myshopify.com store domain.');
  process.exit(2);
}
const dir = await mkdtemp(join(tmpdir(), 'eid-age-filter-'));
try {
  const output = join(dir, 'result.json');
  await promisify(execFile)('pnpm', ['exec', 'shopify', 'app', 'execute', '--store', store, '--version', '2026-10', '--no-input', '--query-file', 'scripts/shopify-age-filter-status.graphql', '--output-file', output], {timeout: 45000, maxBuffer: 128000});
  const result = JSON.parse(await readFile(output, 'utf8'));
  const status = getAgeFilterStatus(result);
  console.log(`Age filter status: ${status}`);
  if (status === 'READY') console.log('Shopify reports FILTERABLE; verify the actual True and False results before relying on this filter.');
  else { console.error('Filter is not confirmed ready; do not rely on its results.'); process.exitCode = 1; }
} catch {
  console.error('Unable to retrieve or interpret the Shopify filter status.');
  process.exitCode = 2;
} finally { await rm(dir, {recursive:true, force:true}); }
