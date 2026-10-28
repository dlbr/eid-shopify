# Product age filter diagnostics

The development app enables `admin_filterable` on its app-owned boolean product metafield `requires_age_verification`. Enabling a capability and seeing it in the Shopify Admin filter menu do not prove that Shopify has finished preparing the filter.

On the development store, the definition reported `eligible: true`, `enabled: true`, and `status: IN_PROGRESS`. The Admin Products page exposed the True filter but displayed all 17 products. An independent Admin API read found one `true`, one `false`, and 15 missing values. A products query using the app-owned metafield returned `definition-not-admin-filterable`. This is an observed development-store result, not proof of a Shopify-wide defect.

Run `make shopify-age-filter-status SHOPIFY_STORE=your-development-store.myshopify.com`. Treat `IN_PROGRESS`, `FAILED`, `NOT_FILTERABLE`, missing definitions, and errors as not ready. If `FILTERABLE` appears, compare filtered True and False results with direct product metafield reads and test the Admin UI. Missing values and the global all-products policy must be assessed separately.

Shopify's documentation describes `IN_PROGRESS` as processing, but does not guarantee a completion time. If it remains pending, capture the shop domain, app identity, definition namespace/key, API version, status and request identifiers for Shopify investigation. Do not toggle or delete the definition to force reindexing without assessing impact on existing values.
