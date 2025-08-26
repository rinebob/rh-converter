/**
 * Broker data source used for dropdowns and selections across the app.
 * Grouped by country/region for easier UI grouping.
 */

export interface BrokerOption {
  /** Display label for the broker (what users see) */
  label: string;
  /** Optional unique value; defaults to label if not provided */
  value?: string;
}

export interface BrokerGroup {
  /** Human-friendly country/region name */
  country: string;
  /** ISO-like country code or region key; used for lookups */
  key: string;
  /** Optional flag or emoji */
  flag?: string;
  /** Brokers under this country/region */
  brokers: ReadonlyArray<BrokerOption>;
}

/**
 * Canonical grouped broker list.
 * Note: Keep labels stable; forms may store the label string.
 */
export const BROKER_GROUPS: ReadonlyArray<BrokerGroup> = [
  {
    key: 'US',
    country: 'United States',
    flag: '🇺🇸',
    brokers: [
      // Major US Brokerage Firms
      { label: 'Charles Schwab' },
      { label: 'Fidelity Investments' },
      { label: 'Vanguard' },
      { label: 'J.P. Morgan Wealth Management' },
      { label: 'Morgan Stanley (includes E*TRADE)' },
      { label: 'Merrill Wealth Management (includes Merrill Edge)' },
      // Discount and Online Brokers
      { label: 'Interactive Brokers' },
      { label: 'Robinhood' },
      { label: 'Webull' },
      { label: 'Moomoo' },
      { label: 'Ally Invest' },
      { label: 'Firstrade' },
      { label: 'Tastytrade' },
      { label: 'TradeStation' },
      { label: 'SogoTrade' },
      // Robo-Advisors and Automated Platforms
      { label: 'Acorns' },
      { label: 'Betterment' },
      { label: 'Wealthfront' },
      { label: 'M1 Finance' },
      { label: 'SoFi Invest' },
      { label: 'Stash' },
      // Cryptocurrency Brokers and Exchanges
      { label: 'Coinbase' },
      { label: 'Kraken' },
      { label: 'Gemini' },
      { label: 'Binance' },
      // Regional and Specialized US Firms
      { label: 'Edward Jones' },
      { label: 'Ameriprise Financial' },
      { label: 'Stifel' },
      { label: 'Raymond James' },
      { label: 'Commonwealth Financial Network' },
      { label: 'Cambridge Investment Research' },
      { label: 'Zacks Trade' },
      { label: 'Fidelity Institutional' },
      { label: 'Charles Schwab Advisor Services' },
      { label: 'RBC Wealth Management' },
      { label: 'UBS Wealth Management USA' },
      { label: 'Wells Fargo Advisors' },
      { label: 'TD Ameritrade International' },
      // Other
      { label: 'NinjaTrader' },
    ],
  },
  {
    key: 'UK',
    country: 'United Kingdom',
    flag: '🇬🇧',
    brokers: [
      { label: 'IG Group' },
      { label: 'Hargreaves Lansdown' },
      { label: 'CMC Markets' },
      { label: 'City Index' },
      { label: 'CMC Invest' },
    ],
  },
  {
    key: 'CA',
    country: 'Canada',
    flag: '🇨🇦',
    brokers: [
      { label: 'Qtrade' },
      { label: 'Questrade' },
      { label: 'Wealthsimple' },
      { label: "CIBC Investor's Edge" },
      { label: 'TD Direct Investing' },
      { label: 'National Bank Direct Brokerage' },
      { label: 'BMO InvestorLine' },
    ],
  },
  {
    key: 'IN',
    country: 'India',
    flag: '🇮🇳',
    brokers: [
      { label: 'Zerodha' },
      { label: 'HDFC Securities' },
      { label: 'ICICI Direct' },
      { label: 'Kotak Securities' },
      { label: 'Sharekhan' },
      { label: 'Upstox' },
      { label: '5paisa' },
    ],
  },
  {
    key: 'AU',
    country: 'Australia',
    flag: '🇦🇺',
    brokers: [
      { label: 'CommSec' },
      { label: 'Stake' },
      { label: 'Bell Direct' },
      { label: 'Selfwealth' },
      { label: 'Pepperstone' },
      { label: 'IG Australia' },
      { label: 'Superhero' },
    ],
  },
  {
    key: 'OTHER',
    country: 'Other Countries',
    brokers: [
      { label: 'eToro (Israel)' },
      { label: 'Saxo Bank (Denmark)' },
      { label: 'Swissquote (Switzerland)' },
      { label: 'Plus500 Futures (Israel)' },
      { label: 'MEXEM (Cyprus)' },
      { label: 'Crypto.com (Singapore)' },
      { label: 'Bitstamp (Slovenia)' },
      { label: 'KuCoin (Seychelles)' },
      { label: 'Huobi (Seychelles)' },
      { label: 'Bybit (United Arab Emirates)' },
      { label: 'OKX (Seychelles)' },
      { label: 'AvaTrade (Ireland)' },
      { label: 'XTB (Poland)' },
      { label: 'Dukascopy (Switzerland)' },
    ],
  },
];

/**
 * Flattened list of all brokers for simple dropdowns.
 */
export const ALL_BROKERS: ReadonlyArray<BrokerOption> = BROKER_GROUPS.flatMap(g => g.brokers);

/**
 * Convenience structure for grouped dropdown components.
 */
export interface GroupedDropdownOption {
  label: string; // group label (e.g., "United States 🇺🇸")
  options: ReadonlyArray<BrokerOption>;
}

/**
 * Returns a grouped options structure suitable for UI dropdowns that support group labels.
 */
export function getGroupedBrokerOptions(): ReadonlyArray<GroupedDropdownOption> {
  return BROKER_GROUPS.map(g => ({
    label: g.flag ? `${g.country} ${g.flag}` : g.country,
    options: g.brokers,
  }));
}

/**
 * Flat broker model and canonical flat list derived from BROKER_GROUPS.
 */
export interface Broker {
  /** Country/region abbreviation (from group.key) */
  abbreviation: string;
  /** Full country/region name (from group.country) */
  country: string;
  /** Broker display name (from broker.label) */
  name: string;
}

/**
 * Canonical flat list of all brokers with country context.
 * This is a copy of the grouped data, flattened for UIs that don't need grouping.
 */
export const BROKERS: ReadonlyArray<Broker> = BROKER_GROUPS.flatMap(group =>
  group.brokers.map(b => ({
    abbreviation: group.key,
    country: group.country,
    name: b.label,
  }))
)
  // Sort at the source: US first, then by country abbreviation, then by name
  .sort((a, b) => {
    const aUS = a.abbreviation === 'US';
    const bUS = b.abbreviation === 'US';
    if (aUS !== bUS) return aUS ? -1 : 1; // US at top

    const abA = (a.abbreviation || '').toUpperCase();
    const abB = (b.abbreviation || '').toUpperCase();
    const abCmp = abA.localeCompare(abB);
    if (abCmp !== 0) return abCmp;

    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
