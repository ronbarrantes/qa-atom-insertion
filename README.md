# qa-atom-insertion

Chrome extension that appends a link icon (`🔗`) next to GTIN values on webpages and opens Walmart Atom Item Management in a new tab.

## Behavior

- Finds GTIN-looking numeric values in page text (not limited to tables).
- Appends a small link icon next to each GTIN.
- Opens:
  - `https://atom.walmart.com/item-management/all-about-an-item?gtin=<GTIN>`
- Does **not** run on:
  - `https://atom.walmart.com/*`
  - `https://teams.wal-mart.com/*`

## Build zip

```bash
./build-zip.sh
```

Creates `dist/qa-atom-insertion-ext.zip`.
