export interface CurrencyRate {
  code: string;
  name: string;
  buying: number;
  selling: number;
  banknoteBuying: number;
  banknoteSelling: number;
  change: number;
}

export interface CryptoRate {
  id: string;
  symbol: string;
  name: string;
  priceUsd: number;
  priceTry: number;
  change24h: number;
}

export interface GoldRates {
  ounceUsd: number;
  ounceTry: number;
  gramTry: number;
  ceyrekTry: number;
  cumhuriyetTry: number;
  change24h: number;
}

export interface BistIndex {
  code: string;
  name: string;
  price: number;
  change: number;
  high: number;
  low: number;
  volume: string;
}

export interface BistStock {
  code: string;
  name: string;
  price: number;
  change: number;
  high: number;
  low: number;
  volume: string;
}

export interface BistData {
  indices: BistIndex[];
  stocks: BistStock[];
}

export interface MarketData {
  isFallback: boolean;
  lastUpdated: string;
  currencies: CurrencyRate[];
  crypto: CryptoRate[];
  gold: GoldRates;
  bist: BistData;
  globalRates: Record<string, number>;
}
