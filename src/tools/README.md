# CSV Tools: README

This guide explains how to use the CSV helper scripts to anonymize Robinhood exports and diff two CSVs row-by-row.

- Sources:
  - `tools/anonymize-rh-once.ts`
  - `tools/diff-csv.ts`
- Primary use cases:
  - Produce an anonymized, shareable CSV from your real Robinhood export
  - Verify the anonymization by printing per-row, per-column differences

---

## What the scripts do

1) `anonymize-rh-once.ts`
- Preserves dates and prices
- Scales quantities and dividend amounts deterministically
  - Per-symbol scale derived from a `--seed` in [0, 1]
  - Optional global override with `--global-scale` (e.g., `0.25` for ~75% reduction)
- Transaction handling
  - Equities (Buy/Sell): quantity' = round6(quantity × scale); amount' = sign × price × quantity'
  - Options (BTO/STO/STC/BTC): integer contracts scaled; amount' uses price × 100 × contracts
  - Dividends (CDIV): amount' = round2(amount × scale); Quantity/Price remain empty
  - Dividend Reinvestment (Buy + "Dividend Reinvestment" in Description): shares derived from scaled amount and price; amount recomputed as `-price × shares`
- Maintains CSV headers and quoted multi-line Description fields

2) `diff-csv.ts`
- Parses both CSVs (handles quoted multi-line fields) and prints, for each row:
  - A key: `Activity Date | Instrument | Trans Code`
  - Any differing columns with values from A (real) and B (anon)

---

## Prerequisites

- Node 18+ (Node 22 recommended)
- Package dependencies (already minimal in this repo):
  - `csv-parse`, `csv-stringify`
- Use `tsx` to run TypeScript directly (no tsconfig changes needed)

Install dependencies if needed:

```bash
npm i csv-parse csv-stringify
```

---

## Usage — Anonymize a CSV

From repo root:

```bash
# Basic: seed-only (varies scale per symbol; prices unchanged)
npx -y tsx tools/anonymize-rh-once.ts \
  --in src/assets/example-files/rh-export-example-real.csv \
  --out src/assets/example-files/rh-export-example-anon.csv \
  --seed 0.73
```

Fixed reduction (~75% smaller quantities/amounts) across all symbols:

```bash
npx -y tsx tools/anonymize-rh-once.ts \
  --in src/assets/example-files/rh-export-example-real.csv \
  --out src/assets/example-files/rh-export-example-anon.csv \
  --seed 0.73 \
  --global-scale 0.25
```

Notes:
- `--seed` controls per-symbol scaling (ignored when `--global-scale` is provided).
- Prices and dates are preserved.

---

## Usage — Diff two CSVs

```bash
npx -y tsx tools/diff-csv.ts \
  --a src/assets/example-files/rh-export-example-real.csv \
  --b src/assets/example-files/rh-export-example-anon.csv
```

This prints rows that differ and, for each changed column, shows A vs B values.

---

## Parameters and constants

- Required headers (order preserved):
  - `Activity Date`, `Process Date`, `Settle Date`, `Instrument`, `Description`, `Trans Code`, `Quantity`, `Price`, `Amount`
- Options detection: only via `Trans Code` in {`BTO`,`STO`,`STC`,`BTC`} (prevents misclassifying ETFs)
- Rounding:
  - Quantities to 6 decimals (equities)
  - Currency to 2 decimals

---

## Troubleshooting

- Unknown .ts extension when running with ts-node on Node 22:
  - Prefer `tsx` (examples above), or run ts-node in CJS mode:
    ```bash
    npx ts-node --compiler-options '{"module":"commonjs"}' tools/anonymize-rh-once.ts ...
    ```
- Diff shows huge amounts for ETF rows mentioning "Call/Put":
  - Fixed by detecting options via `Trans Code` only; update scripts if needed.
- Windows quoting issues:
  - Prefer PowerShell or escape quotes accordingly.

---

## Example end-to-end

```bash
# 1) Anonymize
npx -y tsx tools/anonymize-rh-once.ts \
  --in src/assets/example-files/rh-export-example-real.csv \
  --out src/assets/example-files/rh-export-example-anon.csv \
  --seed 0.2654 \
  --global-scale 0.25

# 2) Diff to verify
npx -y tsx tools/diff-csv.ts \
  --a src/assets/example-files/rh-export-example-real.csv \
  --b src/assets/example-files/rh-export-example-anon.csv
```

---

This doc lives at `src/tools/README.md`. The helper scripts live at `tools/anonymize-rh-once.ts` and `tools/diff-csv.ts`. Use them to prepare sharable, anonymized CSVs and to verify differences quickly.
