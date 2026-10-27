# Development-only cart write probe

This diagnostic checkout block uses Shopify API 2026-10. It is intended only for a development app and must not be included in a production release.

The block reads the `$app.binding_probe` cart metafield. An explicit click attempts to overwrite that same key via `applyMetafieldChange`, using `client:diagnostic-only`. It never writes automatically, retrieves no session token, makes no network request and never approves or blocks checkout.

An accepted write is not proof that a Shopify Function received the value. A failed write is not proof that the field is protected from all client writes. The server-created cart, temporary validation rule and cleanup tooling used for the original experiment are maintained in the private DLBR integration workspace.

Browser tests exercise the component with simulated host signals. They do not prove real Shopify permission behavior or checkout authorization.
