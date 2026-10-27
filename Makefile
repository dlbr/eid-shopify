PNPM ?= pnpm
.DEFAULT_GOAL := help
.PHONY: help install typecheck test coverage browser-install browser-test check function-build function-test shopify-build clean
help:
	@echo "make check         Typecheck, coverage and browser E2E"
	@echo "make function-test Run Shopify Function WASM fixtures (linked app)"
install:
	$(PNPM) install --frozen-lockfile
typecheck:
	$(PNPM) typecheck
	$(PNPM) --filter age-checkout typecheck
	$(PNPM) --filter cart-binding-probe typecheck
test:
	$(PNPM) test
coverage:
	$(PNPM) coverage
browser-install:
	$(PNPM) exec playwright install chromium
browser-test:
	mkdir -p reports
	node --test --test-reporter=spec --test-reporter-destination=stdout --test-reporter=junit --test-reporter-destination=reports/browser.xml tests/browser/*.test.ts
check: typecheck coverage browser-test
function-build:
	$(PNPM) exec shopify app function build --path extensions/age-validation --no-input
function-test: function-build
	node scripts/function-tests.mjs
shopify-build:
	$(PNPM) exec shopify app build
clean:
	rm -rf dist coverage reports
