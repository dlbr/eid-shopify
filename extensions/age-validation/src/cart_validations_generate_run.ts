import type { CartValidationsGenerateRunInputQuery, CartValidationsGenerateRunResult } from "../generated/api.ts";

export type ValidationInput = CartValidationsGenerateRunInputQuery;
export type ValidationResult = CartValidationsGenerateRunResult;

/** Development guard: deliberately has no checkout allow path for restricted carts. */
export function cartValidationsGenerateRun(input: ValidationInput): ValidationResult {
  if (input.buyerJourney.step !== "CHECKOUT_COMPLETION" || !input.cart.lines.length) return { operations: [] };
  const restricted = input.shop.allProductsAgeRestricted?.value === "true" || input.cart.lines.some(({ merchandise }) =>
    merchandise.__typename === "ProductVariant" && merchandise.product?.ageRestricted?.value === "true",
  );
  if (!restricted) return { operations: [] };
  return { operations: [{ validationAdd: { errors: [{
    message: "Age verification is not yet available for this product. Please contact the store.",
    target: "$.cart",
  }] } }] };
}
