export interface PolicyMetafield {
  target: { type: string; id: string };
  metafield: { namespace: string; key: string; type: string; value: string };
}
export type CheckoutPolicy = "required" | "not_required" | "unknown";

/** Display policy only. This function never issues a checkout approval. */
export function checkoutPolicy(entries: readonly PolicyMetafield[], productIds: readonly string[], lineCount: number): CheckoutPolicy {
  if (!lineCount) return "not_required";
  const fields = entries.filter(entry => entry.metafield.namespace === "$app");
  const products = fields.filter(entry => entry.target.type === "product" && productIds.includes(entry.target.id) && entry.metafield.key === "requires_age_verification");
  if (products.some(entry => entry.metafield.type === "boolean" && entry.metafield.value === "true")) return "required";
  const shops = fields.filter(entry => entry.target.type === "shop" && entry.metafield.key === "all_products_require_age_verification");
  if (shops.length !== 1 || shops[0]!.metafield.type !== "boolean") return "unknown";
  const global = shops[0]!.metafield.value;
  if (global === "true") return "required";
  if (global !== "false" || products.some(entry => entry.metafield.type !== "boolean" || entry.metafield.value !== "false")) return "unknown";
  return "not_required";
}
