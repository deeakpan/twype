/**
 * Pragma Oracle Configuration
 * 
 * IMPORTANT: Pragma uses a SINGLE oracle address for all feeds.
 * You pass the asset ID (felt252) as a parameter to get prices.
 * 
 * Asset IDs can be:
 * - Numeric felt252: 18669995996566340
 * - String literal: 'BTC/USD' (Cairo auto-converts to felt252)
 * 
 * Source: https://docs.pragma.build/starknet/development
 * Assets list: https://docs.pragma.build/starknet/assets
 */

// Pragma Oracle contract addresses
// Source: https://docs.pragma.build/starknet/development
export const PRAGMA_ORACLE_ADDRESSES = {
  sepolia: {
    // Single oracle address for all feeds (spot, computational, etc.)
    oracle: '0x36031daa264c24520b11d93af622c848b2499b66b41d611bac95e13cfca131a',
  },
  mainnet: {
    // Single oracle address for all feeds
    oracle: '0x2a85bd616f912537c50a49a4076db02c00b29b2cdc8a197ce92ed1837fa875b',
  },
} as const;

// Pragma Asset IDs (felt252) for each pair
// Each asset pair has a unique numeric identifier
// Source: https://docs.pragma.build/starknet/development
// Note: In Cairo, you can use either the numeric ID or string literal like 'BTC/USD'
export const PRAGMA_ASSET_IDS: Record<string, string> = {
  // Cryptocurrencies (from Pragma docs)
  'BTC/USD': '18669995996566340',
  'ETH/USD': '19514442401534788', // From earlier search
  'SOL/USD': '23449611697214276', // From Pragma docs
  'XSTRK/USD': '1629317993172502401860', // From Pragma docs (conversion rate)
  'STRK/USD': '0', // TODO: Check if this exists or use XSTRK
  'USDC/USD': '0', // TODO: Get from Pragma assets page
  'USDT/USD': '0', // TODO: Get from Pragma assets page
  
  // Stocks (need to check Pragma assets page)
  'TSLA/USD': '0', // TODO: Get from Pragma assets page
  'AAPL/USD': '0', // TODO: Get from Pragma assets page
  'GOOGL/USD': '0', // TODO: Get from Pragma assets page
  'MSFT/USD': '0', // TODO: Get from Pragma assets page
  'AMZN/USD': '0', // TODO: Get from Pragma assets page
  
  // Indices (need to check Pragma assets page)
  'SPX/USD': '0', // TODO: Get from Pragma assets page
  'DJI/USD': '0', // TODO: Get from Pragma assets page
  'NASDAQ/USD': '0', // TODO: Get from Pragma assets page
} as const;

// Common price feed pairs supported by Pragma (for UI display)
export const PRAGMA_PRICE_PAIRS = {
  crypto: [
    'BTC/USD',
    'ETH/USD',
    'SOL/USD',
    'STRK/USD',
    'USDC/USD',
    'USDT/USD',
  ],
  stocks: [
    'TSLA/USD',
    'AAPL/USD',
    'GOOGL/USD',
    'MSFT/USD',
    'AMZN/USD',
  ],
  indices: [
    'SPX/USD',
    'DJI/USD',
    'NASDAQ/USD',
  ],
} as const;

// Computational feed types
export const PRAGMA_COMPUTATIONAL_FEEDS = {
  twap: ['BTC_TWAP_24H', 'ETH_TWAP_24H', 'BTC_TWAP_7D', 'ETH_TWAP_7D'],
  volatility: ['BTC_VOLATILITY_30D', 'ETH_VOLATILITY_30D'],
} as const;

// Get the appropriate oracle address based on network
// Pragma uses a single oracle address for all feed types
export function getPragmaOracleAddress(network: 'sepolia' | 'mainnet' = 'sepolia'): string {
  return PRAGMA_ORACLE_ADDRESSES[network].oracle;
}

// Get asset ID for a pair name
export function getPragmaAssetId(pairName: string): string | null {
  return PRAGMA_ASSET_IDS[pairName] || null;
}

// Convert pair name to asset ID (felt252)
// Returns the numeric asset ID as a string (will be converted to felt252 in contract)
export function pairNameToAssetId(pairName: string): string {
  const assetId = PRAGMA_ASSET_IDS[pairName];
  if (!assetId || assetId === '0') {
    throw new Error(`Asset ID not found for pair: ${pairName}. Please check Pragma documentation.`);
  }
  return assetId;
}

// Validate if a pair ID is supported
export function isValidPragmaPair(pairId: string): boolean {
  return pairId in PRAGMA_ASSET_IDS && PRAGMA_ASSET_IDS[pairId] !== '0';
}
