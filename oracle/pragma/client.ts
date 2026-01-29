/**
 * Pragma Oracle Client
 * Frontend utilities for interacting with Pragma Oracle
 */

import { Contract, RpcProvider, constants, AccountInterface } from 'starknet';
import { getPragmaOracleAddress, pairNameToAssetId } from './config';

// Note: Pragma's actual API uses get_data() with DataType enum and AggregationMode
// This is a simplified interface. For full functionality, use pragma_lib dependency

// Pragma Oracle Interface ABI
const PRAGMA_ORACLE_ABI = [
  {
    type: 'function',
    name: 'get_value',
    inputs: [
      { name: 'pair_id', type: 'core::felt252' },
    ],
    outputs: [
      { type: 'core::integer::u256' }, // value
      { type: 'core::integer::u64' },  // timestamp
    ],
    state_mutability: 'view',
  },
  {
    type: 'function',
    name: 'get_value_with_decimals',
    inputs: [
      { name: 'pair_id', type: 'core::felt252' },
    ],
    outputs: [
      { type: 'core::integer::u256' }, // value
      { type: 'core::integer::u64' },  // timestamp
      { type: 'core::integer::u8' },   // decimals
    ],
    state_mutability: 'view',
  },
] as const;

export interface PragmaPriceData {
  value: bigint;
  timestamp: bigint;
  decimals?: number;
}

export class PragmaOracleClient {
  private contract: Contract | null = null;
  private provider: RpcProvider;
  private oracleAddress: string;

  constructor(
    network: 'sepolia' | 'mainnet' = 'sepolia',
    provider?: RpcProvider
  ) {
    this.oracleAddress = getPragmaOracleAddress(network);
    this.provider = provider || new RpcProvider({
      nodeUrl: process.env.NEXT_PUBLIC_STARKNET_RPC_URL || 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_9/O6ulR1EPy8Sn4fYG8_kqU',
      chainId: constants.StarknetChainId.SN_SEPOLIA,
    });
  }

  private async initialize() {
    if (this.contract) return;

    try {
      this.contract = new Contract({
        abi: PRAGMA_ORACLE_ABI as any,
        address: this.oracleAddress,
        providerOrAccount: this.provider,
      });
    } catch (error: any) {
      console.error('Failed to initialize Pragma Oracle client:', error);
      throw new Error(`Pragma Oracle initialization failed: ${error.message}`);
    }
  }

  /**
   * Get the current price/value for a pair ID
   * @param pairId - The pair name (e.g., "BTC/USD") or asset ID (felt252 as string)
   * @returns Price data with value, timestamp, and decimals
   */
  async getValue(pairId: string): Promise<PragmaPriceData> {
    await this.initialize();
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      // Convert pair name to asset ID if needed
      // If pairId is already a numeric string, use it directly
      // Otherwise, convert from pair name to asset ID
      const assetId = /^\d+$/.test(pairId) ? pairId : pairNameToAssetId(pairId);
      
      const result = await this.contract.getValue(assetId);
      
      // Handle different return formats
      if (Array.isArray(result)) {
        return {
          value: BigInt(result[0]?.toString() || '0'),
          timestamp: BigInt(result[1]?.toString() || '0'),
        };
      }
      
      // If result is an object
      if (typeof result === 'object' && 'value' in result) {
        return {
          value: BigInt(result.value?.toString() || '0'),
          timestamp: BigInt(result.timestamp?.toString() || '0'),
          decimals: result.decimals,
        };
      }

      throw new Error('Unexpected result format from Pragma Oracle');
    } catch (error: any) {
      console.error(`Failed to get value for pair ${pairId}:`, error);
      throw new Error(`Failed to fetch Pragma Oracle value: ${error.message}`);
    }
  }

  /**
   * Get value with decimals information
   * @param pairId - The pair name (e.g., "BTC/USD") or asset ID (felt252 as string)
   * @returns Price data including decimals
   */
  async getValueWithDecimals(pairId: string): Promise<PragmaPriceData> {
    await this.initialize();
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      // Convert pair name to asset ID if needed
      const assetId = /^\d+$/.test(pairId) ? pairId : pairNameToAssetId(pairId);
      
      const result = await this.contract.getValueWithDecimals?.(assetId);
      
      if (result && Array.isArray(result) && result.length >= 3) {
        return {
          value: BigInt(result[0]?.toString() || '0'),
          timestamp: BigInt(result[1]?.toString() || '0'),
          decimals: Number(result[2] || 18),
        };
      }

      // Fallback to regular getValue
      return await this.getValue(pairId);
    } catch (error: any) {
      console.error(`Failed to get value with decimals for pair ${pairId}:`, error);
      // Fallback to regular getValue
      return await this.getValue(pairId);
    }
  }

  /**
   * Format price value for display
   * @param value - The raw value from oracle
   * @param decimals - Number of decimals (default 18)
   * @returns Formatted price string
   */
  static formatPrice(value: bigint, decimals: number = 18): string {
    const divisor = BigInt(10 ** decimals);
    const whole = value / divisor;
    const fractional = value % divisor;
    
    if (fractional === BigInt(0)) {
      return whole.toString();
    }
    
    const fractionalStr = fractional.toString().padStart(decimals, '0');
    const trimmed = fractionalStr.replace(/0+$/, '');
    
    return `${whole}.${trimmed}`;
  }

  /**
   * Convert price value to number
   * @param value - The raw value from oracle
   * @param decimals - Number of decimals (default 18)
   * @returns Price as number
   */
  static priceToNumber(value: bigint, decimals: number = 18): number {
    return Number(value) / (10 ** decimals);
  }
}

// Singleton instance for easy access
let pragmaClientInstance: PragmaOracleClient | null = null;

export function getPragmaOracleClient(
  network: 'sepolia' | 'mainnet' = 'sepolia'
): PragmaOracleClient {
  if (!pragmaClientInstance) {
    pragmaClientInstance = new PragmaOracleClient(network);
  }
  return pragmaClientInstance;
}
