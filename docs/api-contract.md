# DLBR Shopify integration API contract

This contract describes the development backend used by the Shopify extensions. The backend is separately operated by DLBR; the pilot verification API is currently disabled and the checkout Function cannot authorize a purchase based on a Gateway result.

All paths are relative to `/v1/integrations/shopify`. Calls to merchant administration endpoints require a fresh Shopify App Bridge admin ID token. Checkout verification endpoints require a fresh Shopify checkout session token, which authenticates the shop but does not identify a guest or cart.

- `GET /health` reports liveness and `checkoutEnforcementReady: false`.
- `GET /ready` reports `503` while checkout binding is unresolved.
- `POST /api/verifications` creates a pilot verification. Generate a new secret 32-byte random `Idempotency-Key`, encoded as unpadded base64url, and reuse it only for retries of that request. A successful response contains an application verification ID, wallet URI, expiry and an access token. A replay may return the same response while the verification is pending. A request in progress or with an uncertain result returns `409`; a deliberately new operation requires a new key and the previous upstream session may still exist until expiry.
- `GET /api/verifications/{id}` uses the checkout session token and `X-Verification-Token` to return the verification status. Raw wallet claims are not returned.

The idempotency key and verification token are secret capabilities. Neither establishes checkout authorization. Verification requests are subject to a per-shop pilot rate limit. The API contract may change before production release.
