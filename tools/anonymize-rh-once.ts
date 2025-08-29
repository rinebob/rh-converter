#!/usr/bin/env ts-node

/**
 * One-off anonymization script for Robinhood CSV export.
 *
 * - Preserves dates and prices
 * - Per-symbol scaling factor derived from seed (stable per symbol)
 * - Equities: quantity' = round6(quantity * sSym), amount' = sign * price * quantity'
 * - Options (BTO/STO/STC/BTC): quantity' = max(1, round(quantity * sSym)), amount' = sign * price * 100 * quantity'
 * - CDIV: amount' = roundCurrency(amount * sSym), leaves Quantity/Price blank
 * - Dividend Reinvestment buys: use scaled absolute Amount to compute quantity' = round6(|amount'| / price); set amount' = - price * quantity'
 * - Maintains CSV structure and quoting, including multi-line Description
 */

import { createReadStream, createWriteStream } from 'node:fs';
import { basename } from 'node:path';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';

// ----- Types -----
interface RowRec {
  [key: string]: string | undefined;
}

interface Args {
  inputPath: string;
  outputPath: string;
  seed: number; // 0..1
  globalScale?: number; // optional constant scale override (e.g., 0.25 for ~75% reduction)
}

// ----- CLI args -----
function parseArgs(argv: string[]): Args {
  const argMap: Record<string, string> = {};
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === '--in' || a === '-i') argMap['in'] = next;
    if (a === '--out' || a === '-o') argMap['out'] = next;
    if (a === '--seed' || a === '-s') argMap['seed'] = next;
    if (a === '--global-scale' || a === '-g') argMap['globalScale'] = next;
  }
  if (!argMap['in'] || !argMap['out'] || argMap['seed'] === undefined) {
    console.error('Usage: ts-node tools/anonymize-rh-once.ts --in <input.csv> --out <output.csv> --seed <0..1> [--global-scale <number>]');
    process.exit(1);
  }
  const seedNum = Number(argMap['seed']);
  if (!Number.isFinite(seedNum) || seedNum < 0 || seedNum > 1) {
    console.error('Error: --seed must be a number in [0,1].');
    process.exit(1);
  }
  let globalScale: number | undefined;
  if (argMap['globalScale'] !== undefined) {
    const gs = Number(argMap['globalScale']);
    if (!Number.isFinite(gs) || gs <= 0) {
      console.error('Error: --global-scale must be a positive number. Example: 0.25 for ~75% reduction.');
      process.exit(1);
    }
    globalScale = gs;
  }
  return { inputPath: argMap['in'], outputPath: argMap['out'], seed: seedNum, globalScale };
}

// ----- Utils -----
const HEADERS = [
  'Activity Date',
  'Process Date',
  'Settle Date',
  'Instrument',
  'Description',
  'Trans Code',
  'Quantity',
  'Price',
  'Amount',
] as const;

type Header = typeof HEADERS[number];

function trimOrEmpty(s?: string): string {
  return (s ?? '').trim();
}

function isOptionTransCode(code: string): boolean {
  return ['BTO', 'STO', 'STC', 'BTC'].includes(code);
}

function isDividend(code: string): boolean {
  return code === 'CDIV';
}

function isBuy(code: string): boolean {
  return code === 'Buy' || code === 'BTO' || code === 'BTC';
}

function isSell(code: string): boolean {
  return code === 'Sell' || code === 'STO' || code === 'STC';
}

function isDividendReinvestment(desc: string, code: string): boolean {
  return code === 'Buy' && /Dividend Reinvestment/i.test(desc);
}

function parseMoney(m: string): number | null {
  // Examples: "$1,029.42 ", "($500.00)", "$95.75 "
  const t = trimOrEmpty(m).replace(/^\$/,'').replace(/\$/,'').replace(/,/g,'');
  if (!t) return null;
  const neg = /^\(/.test(t) && /\)$/.test(t);
  const numStr = t.replace(/[()]/g, '').replace(/^\$/,'');
  const n = Number(numStr);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

function formatMoney(n: number): string {
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n < 0) return `(${formatted})`;
  return `$${formatted} `; // Positive amounts in samples have a leading $ and a trailing space
}

function parsePrice(p: string): number | null {
  // Examples: "$6.57 ", "$452.35 "
  const t = trimOrEmpty(p).replace(/^\$/,'').replace(/,/g,'');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function formatPrice(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} `;
}

function parseQuantity(q: string): number | null {
  const t = trimOrEmpty(q);
  if (!t) return null;
  const n = Number(t.replace(/,/g,'').trim());
  return Number.isFinite(n) ? n : null;
}

function formatQuantity(n: number): string {
  // Up to 6 decimals, trim trailing zeros
  const s = n.toFixed(6).replace(/\.0+$/,'').replace(/(\.[0-9]*[1-9])0+$/, '$1');
  return s;
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

function roundCurrency(n: number): number {
  return Math.round(n * 100) / 100;
}

// Simple stable hash -> pseudo random [0,1)
function hashToUnit(seedStr: string): number {
  let h = 2166136261 >>> 0; // FNV-like
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // xorshift
  h += h << 13; h ^= h >>> 7; h += h << 3; h ^= h >>> 17; h += h << 5;
  // map to [0,1)
  return ((h >>> 0) % 1_000_000) / 1_000_000;
}

function perSymbolScale(symbol: string, seed: number): number {
  // Base: map seed in [0,1] to [0.6, 1.4]
  const base = 0.6 + 0.8 * seed;
  // Jitter per symbol +/- 10%
  const r = hashToUnit(`${symbol}|${seed}`); // 0..1
  const jitter = 0.9 + 0.2 * r; // 0.9..1.1
  const s = base * jitter;
  // Clamp to [0.6, 1.4]
  return Math.max(0.6, Math.min(1.4, s));
}

function scaleForSymbol(symbol: string, seed: number, globalScale?: number): number {
  return globalScale !== undefined ? globalScale : perSymbolScale(symbol, seed);
}

// ----- Core transform -----
function transformRow(row: RowRec, seed: number, globalScale?: number): RowRec {
  const symbol = trimOrEmpty(row['Instrument']);
  const desc = trimOrEmpty(row['Description']);
  const code = trimOrEmpty(row['Trans Code']);
  const sSym = scaleForSymbol(symbol, seed, globalScale);

  const qRaw = parseQuantity(row['Quantity'] || '');
  const pRaw = parsePrice(row['Price'] || '');
  const aRaw = parseMoney(row['Amount'] || '');

  const out: RowRec = { ...row };

  // CDIV: scale amount only
  if (isDividend(code)) {
    if (aRaw !== null) {
      const aScaled = roundCurrency(aRaw * sSym);
      out['Amount'] = formatMoney(aScaled);
    }
    // Leave Quantity/Price blank
    out['Quantity'] = '';
    out['Price'] = '';
    return out;
  }

  // Options handling — only trust the Trans Code to avoid matching ETF names like "Covered Call"
  const isOption = isOptionTransCode(code);

  // Dividend Reinvestment Buy: derive shares from scaled amount
  if (isDividendReinvestment(desc, code)) {
    if (pRaw === null || aRaw === null) return out; // cannot fix without price/amount
    const amountAbsScaled = roundCurrency(Math.abs(aRaw) * sSym);
    const qPrime = round6(amountAbsScaled / pRaw);
    const amtPrime = -roundCurrency(pRaw * qPrime);
    out['Quantity'] = formatQuantity(qPrime);
    out['Price'] = formatPrice(pRaw);
    out['Amount'] = formatMoney(amtPrime);
    return out;
  }

  // Regular equity/options buys/sells
  if (pRaw !== null) {
    if (isOption) {
      // Integer contract count
      const q0 = qRaw ?? 1;
      const qPrimeInt = Math.max(1, Math.round(q0 * sSym));
      const sign = isSell(code) ? +1 : -1;
      const amtPrime = roundCurrency(sign * pRaw * 100 * qPrimeInt);
      out['Quantity'] = String(qPrimeInt);
      out['Price'] = formatPrice(pRaw);
      out['Amount'] = formatMoney(amtPrime);
      return out;
    } else {
      // Equity: quantity scaled to 6dp
      const q0 = qRaw ?? 0;
      const qPrime = round6(q0 * sSym);
      const sign = isSell(code) ? +1 : -1;
      const amtPrime = roundCurrency(sign * pRaw * qPrime);
      out['Quantity'] = formatQuantity(qPrime);
      out['Price'] = formatPrice(pRaw);
      out['Amount'] = formatMoney(amtPrime);
      return out;
    }
  }

  // Default: if we cannot parse price/amount, just return as-is
  return out;
}

async function run() {
  const { inputPath, outputPath, seed, globalScale } = parseArgs(process.argv);
  console.log(`Anonymizing ${basename(inputPath)} -> ${outputPath} with seed=${seed}${globalScale !== undefined ? ` globalScale=${globalScale}` : ''}`);

  const records: RowRec[] = [];
  const parser = createReadStream(inputPath).pipe(
    parse({
      columns: true,
      relax_quotes: true,
      skip_empty_lines: false,
      bom: true,
    })
  );

  for await (const rec of parser as AsyncIterable<RowRec>) {
    records.push(rec);
  }

  // Transform all
  const transformed = records.map((r) => transformRow(r, seed, globalScale));

  // Ensure header order and write
  const stringifier = stringify({
    header: true,
    columns: HEADERS as unknown as string[],
  });
  const ws = createWriteStream(outputPath);
  stringifier.pipe(ws);

  for (const r of transformed) {
    // Normalize missing headers
    const rowOut: Record<string, string> = {};
    (HEADERS as unknown as string[]).forEach((h) => {
      rowOut[h] = (r[h] ?? '') as string;
    });
    stringifier.write(rowOut);
  }
  stringifier.end();

  await new Promise<void>((res, rej) => {
    ws.on('finish', () => res());
    ws.on('error', (e) => rej(e));
  });

  console.log('Done.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
