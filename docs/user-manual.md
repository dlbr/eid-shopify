# DLBR EID for Shopify: merchant guide

## Current availability

DLBR EID for Shopify is a development prototype. The app can save an age policy and display a product notice, but wallet verification and checkout approval are not available. Do not use the prototype on a live store or rely on the notice as an age check.

## Mark an individual product

1. In Shopify Admin, open **Products** and select a product.
2. Scroll to **Blocks**. If the DLBR block is not there, select **+ Block** and add **DLBR EID age policy**. You can pin the block for easier access.
3. In **DLBR EID age verification**, select **Require age verification for this product** and click **Save**.
4. To remove the individual requirement, clear the checkbox and click **Save**. Use **Reload** to read the current saved setting.

This product setting was tested in the development store. If the store-wide policy below is enabled, clearing an individual setting does not exempt that product.

## Set a policy for all products

1. In Shopify Admin, open **Apps → DLBR EID**.
2. Under **Age verification policy**, select **Require age verification for all products**. The app saves changes immediately.
3. Clear the checkbox to turn off the store-wide policy. Individual product settings remain in effect.

The policy is configuration only. It does not activate wallet verification or guarantee that checkout is blocked.

## Show the notice on product pages

The product notice is an optional Shopify theme app block. A compatible product template and a section that supports app blocks are required. The block displays **Age-restricted product** when the individual or store-wide setting is enabled; the German translation is **Produkt mit Altersbeschränkung**.

1. In Shopify Admin, open **Online Store → Themes** and choose **Customize** for the theme you want to edit.
2. Select **Products → Default product**, then choose a product whose individual age setting is enabled in the preview selector.
3. Under **Product information**, choose **Add block → Apps → 18+ product notice**. The block name in the editor differs from the customer-facing text.
4. Move the block to the desired position. Add it only once to avoid duplicate notices.
5. Check the preview, then save the theme when ready. Saving an active theme makes the change visible on that theme.

If the block is missing, make sure you are editing a supported product template and an app-block-compatible section. If the notice is not visible, check which product is selected in the preview and confirm its setting is saved. When the global setting is off, an unmarked product should not show the notice; test this on your theme before relying on it. The development store confirmed that the notice appears for a marked product; the off state and all theme combinations have not yet been verified.

## What the notice means

The notice communicates a product's age restriction. It does not collect a wallet proof, verify a buyer's age, or authorize a purchase. The development checkout extension may show a separate informational message; it does not complete verification. Do not activate the deny-only validation prototype on a live store.

## Filtering products

The development store exposes a **Requires age verification** metafield filter, but Shopify reported that its index was still being prepared and returned unfiltered results. Do not rely on the filter until its status and results have been verified. An unset individual field is distinct from a saved `false`; the global policy applies independently.
