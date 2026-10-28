# Product age policy block

This Shopify Admin block lets a merchant edit the selected product's app-owned `requires_age_verification` boolean. The merchant adds the block to the product details page. It reads the global policy as context and uses Shopify Admin API `metafieldsSet` with `compareDigest` to prevent overwriting a concurrent edit. An unconfirmed save requires a reload before another attempt.

The block does not perform wallet verification or authorize checkout. When the global policy is on, all products remain subject to it regardless of their individual setting.

On the development store, the merchant added the block under **Blocks** on a product details page and confirmed that enabling and disabling the checkbox both save. This confirms the product-setting workflow, not checkout enforcement or wallet verification.
