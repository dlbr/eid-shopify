import assert from 'node:assert/strict';
import {test} from 'node:test';
import {loadProductPolicy, saveProductPolicy} from '../extensions/age-product-policy/src/policy.ts';

const id = 'gid://shopify/Product/123';
const hash = 'a'.repeat(64);
const otherHash = 'b'.repeat(64);
const field = (value: string, compareDigest: string = hash) => ({type: 'boolean', value, compareDigest});
const reply = (body: unknown, status = 200): typeof fetch => async () => Response.json(body, {status});

test('loads the selected product and global policy from Shopify', async () => {
  let request: {query: string; variables: {id: string}} | undefined;
  const fetcher: typeof fetch = async (url, init) => {
    assert.equal(url, 'shopify:admin/api/graphql.json');
    assert.equal(init?.method, 'POST');
    request = JSON.parse(String(init?.body));
    return Response.json({data: {product: {id, metafield: field('true')}, shop: {metafield: field('false')}}});
  };
  assert.deepEqual(await loadProductPolicy(id, fetcher), {required: true, allProducts: false, compareDigest: hash});
  assert.equal(request?.variables.id, id);
  assert.match(request?.query ?? '', /requires_age_verification/);
  assert.deepEqual(await loadProductPolicy(id, reply({data: {product: {id, metafield: null}, shop: {metafield: field('true')}}})),
    {required: false, allProducts: true, compareDigest: null});
  assert.deepEqual(await loadProductPolicy(id, reply({data: {product: {id, metafield: field('false')}, shop: {metafield: null}}})),
    {required: false, allProducts: false, compareDigest: hash});
});

test('rejects missing, invalid or mismatched policy rather than silently clearing it', async () => {
  const data = (product: unknown, shop: unknown) => reply({data: {product, shop}});
  for (const fetcher of [
    data(null, {metafield: null}),
    data({id: 'gid://shopify/Product/999', metafield: null}, {metafield: null}),
    data({id, metafield: {type: 'boolean', value: 'TRUE', compareDigest: hash}}, {metafield: null}),
    data({id, metafield: {type: 'boolean', value: 'true', compareDigest: 'bad'}}, {metafield: null}),
    data({id, metafield: null}, {metafield: {type: 'json', value: 'true'}}),
    reply({errors: [{message: 'denied'}]}),
    reply({error: 'unavailable'}, 503),
  ]) await assert.rejects(loadProductPolicy(id, fetcher));
  await assert.rejects(loadProductPolicy('gid://shopify/Customer/123', reply({})), /INVALID_PRODUCT/);
});

test('saves only the product flag with a compare-and-set digest', async () => {
  let variables: unknown;
  const fetcher: typeof fetch = async (_url, init) => {
    variables = JSON.parse(String(init?.body)).variables;
    return Response.json({data: {metafieldsSet: {metafields: [field('true', otherHash)], userErrors: []}}});
  };
  const current = {required: false, allProducts: true, compareDigest: hash};
  assert.deepEqual(await saveProductPolicy(id, true, current, fetcher), {required: true, allProducts: true, compareDigest: otherHash});
  assert.deepEqual(variables, {metafields: [{ownerId: id, namespace: '$app', key: 'requires_age_verification', type: 'boolean', value: 'true', compareDigest: hash}]});
  await saveProductPolicy(id, true, {...current, compareDigest: null}, fetcher);
  assert.equal((variables as {metafields: Array<{compareDigest: unknown}>}).metafields[0]?.compareDigest, null);
});

test('rejects stale, failed and unverifiable writes', async () => {
  const current = {required: false, allProducts: false, compareDigest: hash};
  for (const result of [
    {metafields: [], userErrors: [{code: 'STALE_OBJECT'}]},
    {metafields: [], userErrors: []},
    {metafields: [field('false')], userErrors: []},
    {metafields: [{type: 'boolean', value: 'true', compareDigest: null}], userErrors: []},
  ]) await assert.rejects(saveProductPolicy(id, true, current, reply({data: {metafieldsSet: result}})));
  await assert.rejects(saveProductPolicy(id, true, {...current, compareDigest: 'bad'}, reply({})), /INVALID_POLICY/);
});
