/**
 * Diff two Robinhood CSV files row-by-row, showing per-column changes.
 * Handles quoted multi-line descriptions via csv-parse.
 *
 * Usage:
 *   npx -y tsx tools/diff-csv.ts --a <pathA.csv> --b <pathB.csv>
 */

import { createReadStream } from 'node:fs';
import { basename } from 'node:path';
import { parse } from 'csv-parse';

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

type Row = Record<string, string>;

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k === '--a') args['a'] = v;
    if (k === '--b') args['b'] = v;
  }
  if (!args['a'] || !args['b']) {
    console.error('Usage: npx -y tsx tools/diff-csv.ts --a <pathA.csv> --b <pathB.csv>');
    process.exit(1);
  }
  return { a: args['a'], b: args['b'] };
}

async function readCsv(path: string): Promise<Row[]> {
  const out: Row[] = [];
  const parser = createReadStream(path).pipe(
    parse({ columns: true, relax_quotes: true, skip_empty_lines: false, bom: true })
  );
  for await (const rec of parser as AsyncIterable<Row>) out.push(rec);
  return out;
}

function normalize(s: string | undefined): string {
  return (s ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function rowKey(r: Row): string {
  // A readable key to identify the row in output
  const d = r['Activity Date'] || '?';
  const sym = r['Instrument'] || '?';
  const code = r['Trans Code'] || '?';
  return `${d} | ${sym} | ${code}`;
}

function diffRows(a: Row, b: Row): Array<{ col: string; a: string; b: string }> {
  const diffs: Array<{ col: string; a: string; b: string }> = [];
  for (const h of HEADERS as unknown as string[]) {
    const av = normalize(a[h]);
    const bv = normalize(b[h]);
    if (av !== bv) diffs.push({ col: h, a: av, b: bv });
  }
  return diffs;
}

async function run() {
  const { a, b } = parseArgs(process.argv);
  console.log(`Diffing A=${basename(a)} vs B=${basename(b)}`);
  const [rowsA, rowsB] = await Promise.all([readCsv(a), readCsv(b)]);

  if (rowsA.length !== rowsB.length) {
    console.log(`Row count differs: A=${rowsA.length} B=${rowsB.length}`);
  }
  const n = Math.min(rowsA.length, rowsB.length);

  let changes = 0;
  for (let i = 0; i < n; i++) {
    const ra = rowsA[i];
    const rb = rowsB[i];
    const diffs = diffRows(ra, rb);
    if (diffs.length > 0) {
      changes += diffs.length;
      console.log(`\n# Row ${i + 1} (${rowKey(ra)}):`);
      for (const d of diffs) {
        console.log(`- ${d.col}:`);
        console.log(`  A: ${d.a}`);
        console.log(`  B: ${d.b}`);
      }
    }
  }

  if (rowsA.length !== rowsB.length) {
    // Show extra rows
    if (rowsA.length > rowsB.length) {
      for (let i = rowsB.length; i < rowsA.length; i++) {
        console.log(`\n# Extra in A at ${i + 1}: ${rowKey(rowsA[i])}`);
      }
    } else {
      for (let i = rowsA.length; i < rowsB.length; i++) {
        console.log(`\n# Extra in B at ${i + 1}: ${rowKey(rowsB[i])}`);
      }
    }
  }

  if (changes === 0 && rowsA.length === rowsB.length) {
    console.log('\nNo differences.');
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
