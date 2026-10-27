import assert from "node:assert/strict";
import { test } from "node:test";
import { cartValidationsGenerateRun } from "../extensions/age-validation/src/cart_validations_generate_run.ts";
import type { ValidationInput } from "../extensions/age-validation/src/cart_validations_generate_run.ts";

function input(step: Exclude<ValidationInput["buyerJourney"]["step"], undefined>, restricted: boolean): ValidationInput {
  return { shop: { allProductsAgeRestricted: null }, buyerJourney: { step }, cart: { bindingProbe: null, lines: [{ id: "gid://shopify/CartLine/fixture-1", merchandise: { __typename: "ProductVariant", product: { ageRestricted: { value: String(restricted) } } } }] } };
}
test("allows cart interactions so the customer can remove a restricted product", () => {
  for (const step of ["CART_INTERACTION", "CHECKOUT_INTERACTION"] as const) {
    assert.deepEqual(cartValidationsGenerateRun(input(step, true)), { operations: [] });
  }
});
test("blocks checkout completion for mixed carts with a protected product", () => {
  const value = input("CHECKOUT_COMPLETION", false);
  value.cart.lines.push(...input("CHECKOUT_COMPLETION", true).cart.lines);
  assert.equal(cartValidationsGenerateRun(value).operations[0]?.validationAdd?.errors[0]?.target, "$.cart");
});
test("ignores forged buyer flags and proof attributes", () => {
  const value = { ...input("CHECKOUT_COMPLETION", true), cartAttributes: { age_verified: "true", dlbr_eid_proof: "forged" } };
  assert.equal(cartValidationsGenerateRun(value).operations.length, 1);
});
test("allows unprotected carts and empty carts", () => {
  assert.deepEqual(cartValidationsGenerateRun(input("CHECKOUT_COMPLETION", false)), { operations: [] });
  assert.deepEqual(cartValidationsGenerateRun({ shop: { allProductsAgeRestricted: { value: "true" } }, buyerJourney: { step: "CHECKOUT_COMPLETION" }, cart: { bindingProbe: null, lines: [] } }), { operations: [] });
});
test("store-wide policy protects every nonempty cart, including custom products", () => {
  const value = input("CHECKOUT_COMPLETION", false);
  value.shop.allProductsAgeRestricted = { value: "true" };
  assert.equal(cartValidationsGenerateRun(value).operations.length, 1);
  value.cart.lines = [{ id: "gid://shopify/CartLine/fixture-1", merchandise: { __typename: "CustomProduct" } }];
  assert.equal(cartValidationsGenerateRun(value).operations.length, 1);
  value.buyerJourney.step = "CART_INTERACTION";
  assert.deepEqual(cartValidationsGenerateRun(value), { operations: [] });
  value.buyerJourney.step = "CHECKOUT_COMPLETION";
  value.shop.allProductsAgeRestricted = { value: "false" };
  assert.deepEqual(cartValidationsGenerateRun(value), { operations: [] });
});

test("server and client diagnostic cart markers never authorize protected checkout", () => {
  for (const value of ["server:diagnostic-only", "client:diagnostic-only", "verified", "true"]) {
    const inputValue = input("CHECKOUT_COMPLETION", true);
    inputValue.cart.bindingProbe = { value };
    assert.equal(cartValidationsGenerateRun(inputValue).operations.length, 1);
  }
});
