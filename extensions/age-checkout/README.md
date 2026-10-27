# DLBR EID checkout panel

Read-only Plus checkout block at `purchase.checkout.block.render`, API 2026-10. Shopify CLI assigned its UID when scaffolding the linked development app.

The panel reads the app-owned shop policy and requirements for products currently in the cart. A protected nonempty cart displays an English/German 18+ warning explaining that wallet verification is unavailable. Unknown or malformed shop policy displays an unavailable status. An explicitly unprotected cart or empty cart renders no panel. This is display logic, never a checkout approval.

Network access, Storefront API access and progress blocking are disabled. The extension makes no backend requests, retrieves no session tokens, writes no cart metadata and presents no verification button. It does not activate the validation Function.

From the repository root:

```sh
make check
make function-test
```

`make check` covers policy decisions and the actual Preact component with simulated Shopify host signals in Chromium. These tests verify rendering, updates, EN/DE text and absence of I/O; they do not emulate Shopify's component renderer or prove live checkout placement. `make function-test` builds the validation Function and runs its fixtures; a linked development app is required.

For real-store evidence, open the block's Web preview from the Shopify dev console, or add **DLBR EID age verification** through Apps in the development store's checkout editor. Verify global policy on/off and translated messaging on a cart containing a demo product. A real checkout screenshot and the user’s global on/off test confirmed placement and shop-policy delivery on a demo-product cart on 2026-10-26. Other checkout paths and wallet enforcement remain unverified. Do not activate the deny-only validation prototype on a live store.
