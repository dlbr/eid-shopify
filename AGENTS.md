# eid-shopify extensions

Keep the validation Function fail-closed for protected checkout completion. Buyer-writable flags, cart attributes, metafields, nonces and replayable assertions are not authorization proof. Do not add an allow path without a proven Shopify-authoritative binding and expiry for guest and logged-in buyers.

The DLBR Worker and deployment configuration are maintained privately. Use Makefile checks; do not add GitHub Actions. Never commit app credentials, secrets or real buyer data.
