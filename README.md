# DLBR EID for Shopify

Shopify extensions for EUDI wallet age verification through the DLBR EID Gateway.

**Status: development prototype.** The checkout panel displays the age policy, while the validation Function blocks protected checkout completion when an active rule invokes it. Wallet verification and checkout approval are not available. Do not activate the prototype on a live store.

This repository contains the Shopify product Admin block, checkout UI extension, cart and checkout validation Function, and a development-only diagnostic extension. The DLBR-hosted backend is maintained privately; its source, deployment configuration and D1 migrations are not included here. The [development API contract](docs/api-contract.md) describes the backend boundary. The backend does not currently authorize checkout after wallet verification. Supporting guests and logged-in buyers requires a proven Shopify-authoritative checkout binding and expiry with replay protection.

The product Admin block edits an individual product's 18+ flag using Shopify's Admin API. A merchant adds the block to the product details page; the store-wide setting still applies to all products when enabled. The block has local tests with simulated Shopify responses. Its placement and saving in Shopify Admin must still be confirmed in a development store. See the [product block](extensions/age-product-policy/README.md).

The product metafield is configured for filtering in Shopify Admin. In Products, use search and filter → Add filter → Metafields → Requires age verification. The development store exposed this filter while Shopify reported `adminFilterable.status = IN_PROGRESS` and returned all products, so do not rely on it until the status is `FILTERABLE` and its results are verified. The filter matches the saved per-product value; products without a value may not match `false`, and the global policy can require verification for all products regardless of this filter.

Run `make shopify-age-filter-status SHOPIFY_STORE=your-development-store.myshopify.com` to inspect the definition status using the linked development app and Shopify CLI. The command exits successfully only when Shopify reports an eligible, enabled `FILTERABLE` definition; verify actual matching results separately. Missing definitions, pending indexing, errors and unexpected responses exit nonzero.

## Development

Requires Make, Node.js 22.18+ and pnpm 12.15.0.

```sh
make install
make browser-install
make check
```

`make check` runs type checks, coverage and browser tests of the extensions using simulated Shopify host signals. `make function-test` builds the Function and executes local Shopify runner fixtures; it requires a linked development app. No GitHub Actions are used. These tests do not establish real-wallet interoperability or successful protected checkout completion.

For Shopify CLI builds, copy `config/shopify.app.toml.example` to the ignored `shopify.app.toml` and fill in the client ID and application URL from a real linked development app. Its extension list excludes the diagnostic cart probe; include that extension only in a separate development configuration. The example is for local builds and is not a deployment configuration. Shopify app versions and backend deployment are managed separately.

The checkout block requires Shopify Plus for information, shipping and payment steps. Follow Shopify documentation for Function and app distribution eligibility. Deployments and app credentials are managed separately by DLBR.
