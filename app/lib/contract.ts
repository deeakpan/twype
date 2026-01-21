'use client';

import { Contract, RpcProvider, constants, AccountInterface, json } from 'starknet';

// Contract address from .env (will be set at build time or runtime)
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_MARKET_CONTRACT_ADDRESS || '0xf0bfd061e7fc1c10c81823d0a18708167376d1a069ec403f3ab4ceeb82fbfc';
const RPC_URL = process.env.NEXT_PUBLIC_STARKNET_RPC_URL || 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_9/O6ulR1EPy8Sn4fYG8_kqU';

// Initialize provider
const provider = new RpcProvider({
  nodeUrl: RPC_URL,
  chainId: constants.StarknetChainId.SN_SEPOLIA,
});

// Try to load contract class JSON, fallback to manual ABI
let CONTRACT_ABI: any[] = [
      {
        type: 'function',
        name: 'create_market',
        inputs: [
          { name: 'question', type: 'core::felt252' },
          { name: 'description', type: 'core::felt252' },
          { name: 'resolution_date', type: 'core::integer::u64' },
          { name: 'creator', type: 'core::starknet::contract_address::ContractAddress' },
          { name: 'oracle_pair_id', type: 'core::felt252' },
          { name: 'threshold_value', type: 'core::integer::u256' },
        ],
        outputs: [{ type: 'core::integer::u32' }],
        state_mutability: 'external',
      },
      {
        type: 'function',
        name: 'place_bet',
        inputs: [
          { name: 'market_id', type: 'core::integer::u32' },
          { name: 'side', type: 'core::bool' },
          { name: 'amount', type: 'core::integer::u256' },
        ],
        outputs: [],
        state_mutability: 'external',
      },
      {
        type: 'function',
        name: 'resolve_market_with_oracle',
        inputs: [{ name: 'market_id', type: 'core::integer::u32' }],
        outputs: [],
        state_mutability: 'external',
      },
      {
        type: 'function',
        name: 'resolve_market_manual',
        inputs: [
          { name: 'market_id', type: 'core::integer::u32' },
          { name: 'result', type: 'core::bool' },
        ],
        outputs: [],
        state_mutability: 'external',
      },
      {
        type: 'function',
        name: 'claim_payout',
        inputs: [{ name: 'market_id', type: 'core::integer::u32' }],
        outputs: [{ type: 'core::integer::u256' }],
        state_mutability: 'external',
      },
      {
        type: 'function',
        name: 'get_market_info',
        inputs: [{ name: 'market_id', type: 'core::integer::u32' }],
        outputs: [
          { type: 'core::felt252' },
          { type: 'core::felt252' },
          { type: 'core::integer::u64' },
          { type: 'core::bool' },
          { type: 'core::integer::u256' },
          { type: 'core::integer::u256' },
          { type: 'core::integer::u256' },
        ],
        state_mutability: 'view',
      },
      {
        type: 'function',
        name: 'get_user_bet',
        inputs: [
          { name: 'market_id', type: 'core::integer::u32' },
          { name: 'user', type: 'core::starknet::contract_address::ContractAddress' },
        ],
        outputs: [
          { type: 'core::integer::u256' },
          { type: 'core::bool' },
        ],
        state_mutability: 'view',
      },
];

// Load contract ABI from compiled contract (kept for backwards compatibility)
async function loadContractABI() {
  return CONTRACT_ABI;
}

export interface MarketInfo {
  question: string;
  description: string;
  resolutionDate: bigint;
  resolved: boolean;
  totalYes: bigint;
  totalNo: bigint;
  totalPool: bigint;
}

export interface UserBet {
  amount: bigint;
  side: boolean;
}

export class MarketContract {
  private contract: Contract | null = null;
  private account: AccountInterface | null = null;
  private provider: RpcProvider;
  private initializationFailed: boolean = false;

  constructor(account?: AccountInterface) {
    // Create provider in constructor like STRKToken does
    this.provider = new RpcProvider({
      nodeUrl: RPC_URL,
      chainId: constants.StarknetChainId.SN_SEPOLIA,
    });
    
    if (account) {
      this.account = account;
    }
  }

  // Check if contract is available
  isAvailable(): boolean {
    return !this.initializationFailed && this.contract !== null;
  }

  async initialize() {
    if (!this.contract) {
      try {
        // Ensure ABI is properly formatted as an array
        if (!Array.isArray(CONTRACT_ABI) || CONTRACT_ABI.length === 0) {
          throw new Error('Contract ABI is invalid or empty');
        }
        
        // Validate address
        if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === '') {
          throw new Error('Contract address is not set');
        }
        
        // Validate provider
        if (!this.provider) {
          throw new Error('Provider is not initialized');
        }
        
        // Ensure ABI entries have required fields
        const validAbi = CONTRACT_ABI.filter(item => 
          item && 
          typeof item === 'object' && 
          item.type && 
          item.name
        );
        
        if (validAbi.length === 0) {
          throw new Error('No valid ABI entries found');
        }
        
        console.log('Creating contract with:', {
          abiLength: validAbi.length,
          address: CONTRACT_ADDRESS,
          hasProvider: !!this.provider
        });
        
        // Create contract with ABI, address, and provider (matching STRKToken pattern)
        // Try-catch the actual Contract creation to get better error info
        try {
          // For starknet.js v9, Contract constructor signature: new Contract(abi, address, provider)
          // The ABI format might need to match the contract class JSON format
          // If this fails, it's likely an ABI format issue - starknet.js v9 might expect
          // the full contract class JSON instead of just the ABI array
          this.contract = new Contract(validAbi, CONTRACT_ADDRESS, this.provider);
        } catch (contractError: any) {
          console.error('Contract constructor error:', contractError);
          console.error('Error details:', {
            message: contractError.message,
            abiLength: validAbi.length,
            address: CONTRACT_ADDRESS,
            hasProvider: !!this.provider
          });
          console.error('ABI sample:', JSON.stringify(validAbi[0], null, 2));
          console.warn('Contract initialization failed. This is likely due to ABI format incompatibility with starknet.js v9.');
          console.warn('The ABI format may need to be the full contract class JSON instead of just the ABI array.');
          
          // Set contract to null and mark initialization as failed
          this.contract = null;
          this.initializationFailed = true;
          throw new Error(`Contract initialization failed: ${contractError.message}. The ABI format may not be compatible with starknet.js v9. You may need to use the contract class JSON file instead.`);
        }
        
        if (this.account) {
          this.contract.connect(this.account);
        }
      } catch (error: any) {
        console.error('Failed to initialize contract:', error);
        console.error('ABI type:', typeof CONTRACT_ABI, 'length:', CONTRACT_ABI?.length);
        console.error('Address:', CONTRACT_ADDRESS);
        throw error;
      }
    }
  }

  async setAccount(account: AccountInterface) {
    this.account = account;
    // Don't initialize contract here - only connect if it already exists
    // Contract will be initialized lazily when actually needed (e.g., createMarket, placeBet)
    if (this.contract) {
      this.contract.connect(account);
    }
    // If contract doesn't exist yet, it will be initialized when first used
  }

  // Create a new market
  async createMarket(
    question: string,
    description: string,
    resolutionDate: bigint,
    oraclePairId: string,
    thresholdValue: bigint
  ): Promise<bigint> {
    try {
      await this.initialize();
    } catch (error: any) {
      console.error('Contract initialization error:', error);
      throw new Error(`Failed to initialize contract: ${error.message}. Please check your contract address and ABI.`);
    }
    
    if (!this.account) throw new Error('Account not connected');
    if (!this.contract) throw new Error('Contract not initialized');
    
    const result = await this.contract.create_market(
      question,
      description,
      resolutionDate,
      this.account.address,
      oraclePairId,
      thresholdValue
    );
    return result;
  }

  // Place a bet
  async placeBet(marketId: number, side: boolean, amount: bigint): Promise<void> {
    await this.initialize();
    if (!this.account) throw new Error('Account not connected');
    if (!this.contract) throw new Error('Contract not initialized');
    
    await this.contract.place_bet(marketId, side, amount);
  }

  // Resolve market with oracle
  async resolveMarketWithOracle(marketId: number): Promise<void> {
    await this.initialize();
    if (!this.account) throw new Error('Account not connected');
    if (!this.contract) throw new Error('Contract not initialized');
    
    await this.contract.resolve_market_with_oracle(marketId);
  }

  // Resolve market manually
  async resolveMarketManual(marketId: number, result: boolean): Promise<void> {
    await this.initialize();
    if (!this.account) throw new Error('Account not connected');
    if (!this.contract) throw new Error('Contract not initialized');
    
    await this.contract.resolve_market_manual(marketId, result);
  }

  // Claim payout
  async claimPayout(marketId: number): Promise<bigint> {
    await this.initialize();
    if (!this.account) throw new Error('Account not connected');
    if (!this.contract) throw new Error('Contract not initialized');
    
    const result = await this.contract.claim_payout(marketId);
    return result;
  }

  // Get market info (view function)
  async getMarketInfo(marketId: number): Promise<MarketInfo> {
    // Don't try to initialize if it previously failed
    if (this.initializationFailed) {
      throw new Error('Contract initialization failed. Please check your contract address and ABI format.');
    }
    
    try {
      await this.initialize();
    } catch (error: any) {
      // If initialization fails, mark as failed and throw
      this.initializationFailed = true;
      throw new Error(`Contract initialization failed: ${error.message}. This might be due to an invalid contract address or ABI format issue.`);
    }
    
    if (!this.contract) throw new Error('Contract not initialized');
    
    try {
      const result = await this.contract.get_market_info(marketId);
      return {
        question: result[0],
        description: result[1],
        resolutionDate: result[2],
        resolved: result[3],
        totalYes: result[4],
        totalNo: result[5],
        totalPool: result[6],
      };
    } catch (error: any) {
      throw new Error(`Failed to get market info: ${error.message}`);
    }
  }

  // Get user bet (view function)
  async getUserBet(marketId: number, userAddress: string): Promise<UserBet> {
    await this.initialize();
    if (!this.contract) throw new Error('Contract not initialized');
    
    try {
      const result = await this.contract.call('get_user_bet', [marketId, userAddress]);
      return {
        amount: result[0] as bigint,
        side: result[1] as boolean,
      };
    } catch (error) {
      // Fallback: try direct method call
      const result = await (this.contract as any).get_user_bet(marketId, userAddress);
      return {
        amount: result[0] as bigint,
        side: result[1] as boolean,
      };
    }
  }

  // Helper to convert felt252 to string
  // starknet.js should handle this, but we provide a fallback
  static feltToString(felt: bigint | string): string {
    if (typeof felt === 'string') return felt;
    // For now, return as string - in production you'd decode felt252 properly
    // For short strings (< 31 chars), felt252 contains ASCII directly
    return felt.toString();
  }

  // Helper to convert u256 to number (for display)
  static u256ToNumber(value: bigint): number {
    return Number(value) / 1e18; // Assuming 18 decimals for STRK
  }
}

// Singleton instance
let contractInstance: MarketContract | null = null;

export async function getMarketContract(account?: AccountInterface): Promise<MarketContract> {
  if (!contractInstance) {
    contractInstance = new MarketContract(account);
    // Don't initialize here - make it lazy, only initialize when actually needed
    // await contractInstance.initialize();
  } else if (account) {
    await contractInstance.setAccount(account);
  }
  return contractInstance;
}
