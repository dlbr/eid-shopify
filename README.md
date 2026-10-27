# DLBR EID for Shopify

Shopify extensions for EUDI wallet age verification through the DLBR EID Gateway.

**Status: development prototype.** The checkout panel displays the age policy, while the validation Function blocks protected checkout completion when an active rule invokes it. Wallet verification and checkout approval are not available. Do not activate the prototype on a live store.

This repository contains the Shopify checkout UI extension, cart and checkout validation Function, and a development-only diagnostic extension. The DLBR-hosted backend is maintained privately; its source, deployment configuration and D1 migrations are not included here. The [development API contract](docs/api-contract.md) describes the backend boundary. The backend does not currently authorize checkout after wallet verification. Supporting guests and logged-in buyers requires a proven Shopify-authoritative checkout binding and expiry with replay protection.

## Development

Requires Make, Node.js 22.18+ and pnpm 12.15.0.

```sh
make install
make browser-install
make check
```

`make check` runs type checks, coverage and browser tests of the extensions using simulated Shopify host signals. `make function-test` builds the Function and executes local Shopify runner fixtures; it requires a linked development app. No GitHub Actions are used. These tests do not establish real-wallet interoperability or successful protected checkout completion.

The checkout block requires Shopify Plus for information, shipping and payment steps. Follow Shopify documentation for Function and app distribution eligibility. Deployments and app credentials are managed separately by DLBR.
