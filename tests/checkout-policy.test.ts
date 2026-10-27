import assert from "node:assert/strict";
import { test } from "node:test";
import { checkoutPolicy, type PolicyMetafield } from "../extensions/age-checkout/src/policy.ts";

const shop = (value: string): PolicyMetafield => ({ target: { type: "shop", id: "gid://shopify/Shop/1" }, metafield: { namespace: "$app", key: "all_products_require_age_verification", type: "boolean", value } });
const product = (value: string, id = "gid://shopify/Product/1"): PolicyMetafield => ({ target: { type: "product", id }, metafield: { namespace: "$app", key: "requires_age_verification", type: "boolean", value } });
const ids = ["gid://shopify/Product/1"];

test("checkout display follows global or current-product policy, including custom/empty carts", () => {
  assert.equal(checkoutPolicy([shop("true")], ids, 1), "required");
  assert.equal(checkoutPolicy([shop("true")], [], 1), "required");
  assert.equal(checkoutPolicy([shop("true")], ids, 0), "not_required");
  assert.equal(checkoutPolicy([shop("false"), product("true")], ids, 1), "required");
  assert.equal(checkoutPolicy([product("true")], ids, 1), "required");
  assert.equal(checkoutPolicy([shop("false")], ids, 1), "not_required");
  assert.equal(checkoutPolicy([shop("false"), product("false")], ids, 1), "not_required");
});

test("missing, ambiguous or malformed policy is unknown instead of approval", () => {
  for (const entries of [[], [shop("yes")], [shop("true"), shop("false")], [{ ...shop("true"), metafield: { ...shop("true").metafield, type: "single_line_text_field" } }], [shop("false"), product("yes")], [shop("false"), { ...product("false"), metafield: { ...product("false").metafield, type: "json" } }]]) {
    assert.equal(checkoutPolicy(entries, ids, 1), "unknown");
  }
});

test("cart flags, other namespaces and stale product metadata cannot change display policy", () => {
  const forged = { ...product("true"), metafield: { ...product("true").metafield, namespace: "custom" } };
  const cartFlag = { target: { type: "cart", id: "cart-id" }, metafield: { namespace: "$app", key: "age_verified", type: "boolean", value: "true" } };
  const otherKey = { ...product("true"), metafield: { ...product("true").metafield, key: "unrelated" } };
  assert.equal(checkoutPolicy([shop("false"), forged, cartFlag, otherKey, product("true", "gid://shopify/Product/2")], ids, 1), "not_required");
  assert.equal(checkoutPolicy([{ ...shop("true"), metafield: { ...shop("true").metafield, key: "age_verified" } }], ids, 1), "unknown");
});
