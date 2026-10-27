# DLBR EID checkout panel

Read-only Plus checkout block at `purchase.checkout.block.render`, API 2026-10. Shopify CLI assigned its UID when scaffolding the linked development app.

The panel reads the app-owned shop policy and requirements for products currently in the cart. A protected nonempty cart displays an English/German 18+ warning explaining that wallet verification is unavailable. Unknown or malformed shop policy displays an unavailable status. An explicitly unprotected cart or empty cart renders no panel. This is display logic, never a checkout approval.

`src/wallet-state.ts` is a standalone, display-only state model for a future wallet interface. It models pending, verified, rejected, expired, unavailable and cancelled states and ignores late responses from prior attempts. A caller must use a unique attempt ID for each new attempt. Its clock inputs are for display and must never establish verification validity or checkout authorization. The current checkout block does not use this model or start wallet sessions.

`src/WalletStatus.jsx` renders localized status text in a Shopify banner, which Shopify documents as a live region. It is not mounted in the current checkout block. Browser tests check markup and translations using simulated host signals; screen-reader announcements must still be verified in the real Shopify checkout. A future panel must manage the wallet lifecycle when it integrates this component.

Network access, Storefront API access and progress blocking are disabled. The extension makes no backend requests, retrieves no session tokens, writes no cart metadata and presents no verification button. It does not activate the validation Function.

From the repository root:

```sh
make check
make function-test
```

`make check` covers policy decisions and the actual Preact component with simulated Shopify host signals in Chromium. These tests verify rendering, updates, EN/DE text and absence of I/O; they do not emulate Shopify's component renderer or prove live checkout placement. `make function-test` builds the validation Function and runs its fixtures; a linked development app is required.

For real-store evidence, open the block's Web preview from the Shopify dev console, or add **DLBR EID age verification** through Apps in the development store's checkout editor. Verify global policy on/off and translated messaging on a cart containing a demo product. A real checkout screenshot and the user’s global on/off test confirmed placement and shop-policy delivery on a demo-product cart on 2026-10-26. Other checkout paths and wallet enforcement remain unverified. Do not activate the deny-only validation prototype on a live store.
