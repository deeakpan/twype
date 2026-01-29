/**
 * Oracle Utilities
 * Helper functions for working with oracles
 */

import { getPragmaOracleClient, PragmaOracleClient } from './pragma/client';
import { UMAOracleClient } from './uma/client';
import { pairNameToAssetId } from './pragma/config';

/**
 * Determine which oracle to use based on market type
 */
export type OracleType = 'pragma' | 'uma' | 'manual';

export interface OracleConfig {
  type: OracleType;
  pragmaPairId?: string;
  umaQuestionId?: string;
  thresholdValue?: bigint;
}

/**
 * Get oracle type based on market question/description
 * Simple heuristic: if it mentions price/crypto/stock, use Pragma
 */
export function determineOracleType(question: string, description: string): OracleType {
  const text = `${question} ${description}`.toLowerCase();
  
  // Financial keywords
  const financialKeywords = [
    'price', 'usd', 'btc', 'eth', 'crypto', 'bitcoin', 'ethereum',
    'stock', 'tsla', 'aapl', 'googl', 'msft', 'amzn',
    'volatility', 'twap', 'index', 'spx', 'dji', 'nasdaq'
  ];
  
  // Non-financial keywords
  const nonFinancialKeywords = [
    'sport', 'game', 'match', 'team', 'player', 'championship',
    'election', 'vote', 'candidate', 'political', 'president',
    'award', 'oscar', 'grammy', 'entertainment', 'movie', 'tv'
  ];
  
  if (financialKeywords.some(keyword => text.includes(keyword))) {
    return 'pragma';
  }
  
  if (nonFinancialKeywords.some(keyword => text.includes(keyword))) {
    return 'uma';
  }
  
  // Default to manual for ambiguous cases
  return 'manual';
}

/**
 * Generate oracle configuration for a market
 */
export function generateOracleConfig(
  question: string,
  description: string,
  marketId: number,
  oracleType?: OracleType
): OracleConfig {
  const type = oracleType || determineOracleType(question, description);
  
  if (type === 'pragma') {
    // Extract pair ID from question/description or use default
    const pairName = extractPragmaPairId(question, description) || 'BTC/USD';
    // Convert pair name to asset ID (felt252) - Pragma uses numeric IDs, not strings
    const assetId = pairNameToAssetId(pairName);
    return {
      type: 'pragma',
      pragmaPairId: assetId, // Store as asset ID (felt252), not pair name
      thresholdValue: extractThresholdValue(question, description),
    };
  }
  
  if (type === 'uma') {
    const questionId = UMAOracleClient.generateQuestionId(marketId, question);
    return {
      type: 'uma',
      umaQuestionId: questionId,
    };
  }
  
  return {
    type: 'manual',
  };
}

/**
 * Extract Pragma pair ID from text
 */
function extractPragmaPairId(question: string, description: string): string | null {
  const text = `${question} ${description}`;
  
  // Common patterns
  const patterns = [
    /(BTC|ETH|SOL|STRK|USDC|USDT)\/USD/gi,
    /(TSLA|AAPL|GOOGL|MSFT|AMZN)\/USD/gi,
    /(SPX|DJI|NASDAQ)\/USD/gi,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].toUpperCase();
    }
  }
  
  return null;
}

/**
 * Extract threshold value from text
 */
function extractThresholdValue(question: string, description: string): bigint | undefined {
  const text = `${question} ${description}`;
  
  // Look for dollar amounts
  const dollarPattern = /\$([\d,]+(?:\.\d+)?)[kK]?/g;
  const match = dollarPattern.exec(text);
  
  if (match) {
    let value = parseFloat(match[1].replace(/,/g, ''));
    if (match[0].toLowerCase().includes('k')) {
      value *= 1000;
    }
    return BigInt(Math.floor(value * 1e18)); // Convert to wei
  }
  
  return undefined;
}

/**
 * Get current price from Pragma for a pair
 */
export async function getCurrentPrice(pairId: string): Promise<bigint> {
  const client = getPragmaOracleClient('sepolia', 'spot');
  const priceData = await client.getValue(pairId);
  return priceData.value;
}

/**
 * Format price for display
 */
export function formatPrice(value: bigint, decimals: number = 18): string {
  return PragmaOracleClient.formatPrice(value, decimals);
}
