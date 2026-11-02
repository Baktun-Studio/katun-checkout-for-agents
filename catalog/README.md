# Synthetic catalog

One hundred synthetic products for a fictional outdoor-equipment store, in English and in US dollars, in the CSV format the Katun
sandbox imports. Nothing here is a real product, brand or price.

## Generate

```
node catalog/generate-catalog.mjs
```

Writes `catalog/products.csv` (100 rows) and two placeholder photos per product: `catalog/images/{sku}.png`, the one the CSV points
to, and `catalog/images/{sku}.svg`, kept for reference. The photos are PNG because the Airwallex catalog uses the Google Merchant
Center format, and Merchant Center does not accept SVG images. The output is deterministic: running it twice with the same Node.js
gives the same files.

Options:

- `--image-base <https URL>`: prefix for the `image` column. Default:
  `https://raw.githubusercontent.com/Baktun-Studio/katun-checkout-for-agents/main/catalog/images/`, which serves the files once
  this repository is public. The sandbox publishes to assistants only products that have a photo, and the photo must be an `https`
  address reachable when the catalog is imported, so with a fork or a private copy point `--image-base` at any public `https` host
  where you copied `catalog/images/`.
- `--image-format png|svg`: which files the CSV points to (default `png`).
- `--count <n>`: number of products (default 100, the minimum the hackathon kit asks for).

## CSV format

Read on 26 October 2026 at `https://sandbox.katunpay.com/docs/guia-del-comercio?lang=en` and from the sandbox's own template:

```
sku,name,description,price,stock,category,image
```

- `price` uses a decimal point and no thousands separator (`1799.00`).
- The sandbox works in US dollars; the currency column is optional and omitted here.
- `stock` is a whole number.
- `image` is an `https` address. A product without a photo is not published to assistants.
- The import is processed row by row: valid rows are saved, rows with problems are reported with their line number and reason,
  and products missing from the file are not deleted.

## Load it in the Katun sandbox

The sandbox has no public import API; the catalog is loaded from the merchant panel.

1. Register a sandbox at `https://sandbox.katunpay.com` (sign-in by email or WhatsApp code; no password), choose Processor, PSP
   or partner, and add the store from Your stores, as `scripts/walkthrough.md` says. The store's payment method and its Airwallex
   connection are set up by the institution's operator, so a Single store sandbox is not enough for this demonstration.
2. In the panel, open Catalog and download the CSV template once to confirm the column names have not changed since the date
   above. If they changed, update `generate-catalog.mjs` and this file.
3. Import `catalog/products.csv`. Check the import report: 100 rows saved, 0 with problems.
4. Set the order limit of the store low enough for the demo (we use USD 150) so that an order above it waits for a human
   approval. The limit is in Your business, Order limit.
5. Note the merchant connector URL shown in the panel (`https://sandbox.katunpay.com/t/{publisher}/m/{merchant}/mcp`). The
   reproduction scripts take it as a parameter.

Do not seed orders. The orders shown in the demo are the real test orders made while rehearsing.
