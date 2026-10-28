# Customer-bound verification experiment

This is a development-only experiment plan, not an authorization design. The
checkout validation Function remains fail-closed. Customer-bound verification
does not identify an individual cart and does not cover guest buyers.

1. With a dedicated development store and synthetic customer accounts, verify
   the scopes and protected customer data approvals needed to read and write an
   app-owned customer metafield. Do not add scopes until the experiment needs them.
2. After authenticating the customer independently at the backend, write a
   non-sensitive diagnostic marker using the Admin API. Query the authenticated
   customer and the marker in a temporary Function input. Exercise checkout and
   record Function input evidence for the same account, a second account and a
   guest. Remove the marker and temporary validation afterwards.
3. Separately test expiry with Shopify's `shop.localTime`. Input query variables
   come from a metafield on the Function owner, not from each customer metafield;
   demonstrate how a per-customer deadline can actually be supplied and tested
   before relying on it. Include timezone changes and daylight-saving transitions.
4. Test account switching, revocation, concurrent sessions, reinstall, cross-shop
   isolation, test/live separation and replay. Demonstrate actual wallet results
   and ensure test proofs cannot authorize live purchases.

Do not store raw identity documents or wallet proofs in the metafield. Any future
account-bound allow path requires an explicit product decision about reuse across
that account's carts and a separate security review. It cannot satisfy the current
exact-cart requirement or the requirement to support guests.
