import { YahooProvider } from './yahoo';
import type { DataProvider } from './types';

let cached: DataProvider | null = null;

export function getProvider(): DataProvider {
  if (cached) return cached;
  const name = process.env.DATA_PROVIDER ?? 'yahoo';
  switch (name) {
    case 'yahoo':
    default:
      cached = new YahooProvider();
      return cached;
  }
}

export type { DataProvider } from './types';
