export interface ProductPolicy {
  required: boolean;
  allProducts: boolean;
  compareDigest: string | null;
}

const PRODUCT_QUERY = `query ProductAgePolicy($id: ID!) {
  product(id: $id) { id metafield(namespace: "$app", key: "requires_age_verification") { type value compareDigest } }
  shop { metafield(namespace: "$app", key: "all_products_require_age_verification") { type value } }
}`;
const PRODUCT_MUTATION = `mutation SetProductAgePolicy($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) { metafields { type value compareDigest } userErrors { code } }
}`;
type Fetcher = typeof fetch;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const digest = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

function productIdIsValid(id: string): boolean {
  return /^gid:\/\/shopify\/Product\/[1-9][0-9]*$/.test(id);
}

function booleanField(value: unknown, requireDigest: boolean): {value: boolean; compareDigest: string | null} {
  if (value === null) return {value: false, compareDigest: null};
  if (!record(value) || value.type !== 'boolean' || (value.value !== 'true' && value.value !== 'false') ||
      (requireDigest && !digest(value.compareDigest))) throw new Error('INVALID_POLICY');
  return {value: value.value === 'true', compareDigest: requireDigest ? value.compareDigest as string : null};
}

async function queryGraphQL(query: string, variables: Record<string, unknown>, fetcher: Fetcher): Promise<Record<string, unknown>> {
  const response = await fetcher('shopify:admin/api/graphql.json', {
    method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({query, variables}),
  });
  if (!response.ok) throw new Error('SHOPIFY_UNAVAILABLE');
  const body: unknown = await response.json();
  if (!record(body) || body.errors !== undefined || !record(body.data)) throw new Error('SHOPIFY_INVALID_RESPONSE');
  return body.data;
}

export async function loadProductPolicy(id: string, fetcher: Fetcher = fetch): Promise<ProductPolicy> {
  if (!productIdIsValid(id)) throw new Error('INVALID_PRODUCT');
  const data = await queryGraphQL(PRODUCT_QUERY, {id}, fetcher);
  if (!record(data.product) || data.product.id !== id || !record(data.shop)) throw new Error('INVALID_POLICY');
  const product = booleanField(data.product.metafield, true);
  const shop = booleanField(data.shop.metafield, false);
  return {required: product.value, allProducts: shop.value, compareDigest: product.compareDigest};
}

export async function saveProductPolicy(id: string, required: boolean, current: ProductPolicy, fetcher: Fetcher = fetch): Promise<ProductPolicy> {
  if (!productIdIsValid(id) || typeof required !== 'boolean' ||
      (current.compareDigest !== null && !digest(current.compareDigest))) throw new Error('INVALID_POLICY');
  const data = await queryGraphQL(PRODUCT_MUTATION, {metafields: [{
    ownerId: id, namespace: '$app', key: 'requires_age_verification', type: 'boolean',
    value: String(required), compareDigest: current.compareDigest,
  }]}, fetcher);
  if (!record(data.metafieldsSet) || !Array.isArray(data.metafieldsSet.userErrors) ||
      data.metafieldsSet.userErrors.length || !Array.isArray(data.metafieldsSet.metafields) ||
      data.metafieldsSet.metafields.length !== 1) throw new Error('SAVE_FAILED');
  const saved = booleanField(data.metafieldsSet.metafields[0], true);
  if (saved.value !== required) throw new Error('INVALID_POLICY');
  return {required: saved.value, allProducts: current.allProducts, compareDigest: saved.compareDigest};
}
