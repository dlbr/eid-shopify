# Development-only cart write probe

Shopify CLI scaffold, API 2026-10. This diagnostic block is excluded from the release configuration example. Add its directory only to an ignored development app config; never include it in a production release.

The block reads `$app.binding_probe` cart metadata and shows whether a server marker is present. An explicit click attempts to overwrite that same key via `applyMetafieldChange`, with `type: updateCartMetafield`, using `client:diagnostic-only`. It never writes automatically, retrieves no session token, makes no network request and never approves or blocks checkout. A failed call is not proof of server-only permissions, and an accepted call is not proof of Function visibility.

The experiment requires the server-created cart from `make shopify-cart-probe`, a running app preview and a temporary development validation from `make shopify-validation-probe`. First confirm that the Function reads the exact server marker. Only then click **Attempt client overwrite**, refresh checkout and compare the subsequent Function input and server Storefront read-back. Clean up the diagnostic metafield/token afterward with `make shopify-cart-probe-clean`.

Browser tests exercise the actual component with simulated host signals and accepted/rejected API results. Real Shopify permission behavior is separate evidence. No wallet result, expiry or permit is accepted by either extension.
