/**
 * UMA-like Optimistic Oracle Client
 * Frontend utilities for interacting with the custom UMA oracle
 */

import { Contract, RpcProvider, constants, AccountInterface } from 'starknet';
import { OracleState, ProposalStatus, getChallengePeriod, getBondAmount } from './config';

// UMA Oracle Interface ABI
const UMA_ORACLE_ABI = [
  {
    type: 'function',
    name: 'propose_answer',
    inputs: [
      { name: 'question_id', type: 'core::felt252' },
      { name: 'answer', type: 'core::bool' },
      { name: 'bond', type: 'core::integer::u256' },
    ],
    outputs: [],
    state_mutability: 'external',
  },
  {
    type: 'function',
    name: 'challenge_proposal',
    inputs: [
      { name: 'question_id', type: 'core::felt252' },
      { name: 'bond', type: 'core::integer::u256' },
    ],
    outputs: [],
    state_mutability: 'external',
  },
  {
    type: 'function',
    name: 'finalize_proposal',
    inputs: [
      { name: 'question_id', type: 'core::felt252' },
    ],
    outputs: [],
    state_mutability: 'external',
  },
  {
    type: 'function',
    name: 'get_proposal',
    inputs: [
      { name: 'question_id', type: 'core::felt252' },
    ],
    outputs: [
      { type: 'core::bool' },      // answer
      { type: 'core::starknet::contract_address::ContractAddress' }, // proposer
      { type: 'core::integer::u256' }, // bond
      { type: 'core::integer::u64' },  // created_at
      { type: 'core::integer::u8' },   // status
    ],
    state_mutability: 'view',
  },
  {
    type: 'function',
    name: 'is_finalized',
    inputs: [
      { name: 'question_id', type: 'core::felt252' },
    ],
    outputs: [
      { type: 'core::bool' },
    ],
    state_mutability: 'view',
  },
] as const;

export interface UMAProposal {
  answer: boolean;
  proposer: string;
  bond: bigint;
  createdAt: bigint;
  status: ProposalStatus;
  challengeCount: number;
}

export class UMAOracleClient {
  private contract: Contract | null = null;
  private account: AccountInterface | null = null;
  private provider: RpcProvider;
  private oracleAddress: string;

  constructor(
    oracleAddress: string,
    account?: AccountInterface,
    provider?: RpcProvider
  ) {
    this.oracleAddress = oracleAddress;
    this.account = account || null;
    this.provider = provider || new RpcProvider({
      nodeUrl: process.env.NEXT_PUBLIC_STARKNET_RPC_URL || 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_9/O6ulR1EPy8Sn4fYG8_kqU',
      chainId: constants.StarknetChainId.SN_SEPOLIA,
    });
  }

  private async initialize() {
    if (this.contract) return;

    try {
      const providerOrAccount = this.account || this.provider;
      this.contract = new Contract({
        abi: UMA_ORACLE_ABI as any,
        address: this.oracleAddress,
        providerOrAccount,
      });
      
      if (this.account) {
        this.contract.connect(this.account);
      }
    } catch (error: any) {
      console.error('Failed to initialize UMA Oracle client:', error);
      throw new Error(`UMA Oracle initialization failed: ${error.message}`);
    }
  }

  setAccount(account: AccountInterface) {
    this.account = account;
    if (this.contract) {
      this.contract.connect(account);
    }
  }

  /**
   * Propose an answer to a question
   * @param questionId - Unique identifier for the question
   * @param answer - The proposed answer (true/false)
   * @param bond - Bond amount in STRK (will be calculated if not provided)
   * @param marketType - Type of market (affects challenge period)
   */
  async proposeAnswer(
    questionId: string,
    answer: boolean,
    bond?: bigint,
    marketType: 'sports' | 'politics' | 'general' = 'general'
  ): Promise<void> {
    await this.initialize();
    if (!this.account) throw new Error('Account not connected');
    if (!this.contract) throw new Error('Contract not initialized');

    // Calculate bond if not provided (would need market pool size)
    const bondAmount = bond || getBondAmount(BigInt(1000) * BigInt(10 ** 18));

    try {
      await this.contract.propose_answer(questionId, answer, bondAmount);
    } catch (error: any) {
      console.error(`Failed to propose answer for ${questionId}:`, error);
      throw new Error(`Failed to propose answer: ${error.message}`);
    }
  }

  /**
   * Challenge an existing proposal
   * @param questionId - The question ID to challenge
   * @param bond - Bond amount (must be >= proposal bond)
   */
  async challengeProposal(questionId: string, bond: bigint): Promise<void> {
    await this.initialize();
    if (!this.account) throw new Error('Account not connected');
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      await this.contract.challenge_proposal(questionId, bond);
    } catch (error: any) {
      console.error(`Failed to challenge proposal for ${questionId}:`, error);
      throw new Error(`Failed to challenge proposal: ${error.message}`);
    }
  }

  /**
   * Finalize a proposal (after challenge period expires)
   * @param questionId - The question ID to finalize
   */
  async finalizeProposal(questionId: string): Promise<void> {
    await this.initialize();
    if (!this.account) throw new Error('Account not connected');
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      await this.contract.finalize_proposal(questionId);
    } catch (error: any) {
      console.error(`Failed to finalize proposal for ${questionId}:`, error);
      throw new Error(`Failed to finalize proposal: ${error.message}`);
    }
  }

  /**
   * Get proposal details
   * @param questionId - The question ID
   * @returns Proposal information
   */
  async getProposal(questionId: string): Promise<UMAProposal> {
    await this.initialize();
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      const result = await this.contract.get_proposal(questionId);
      
      // Handle different return formats
      let answer: boolean;
      let proposer: string;
      let bond: bigint;
      let createdAt: bigint;
      let status: number;

      if (Array.isArray(result)) {
        answer = result[0] as boolean;
        proposer = result[1] as string;
        bond = BigInt(result[2]?.toString() || '0');
        createdAt = BigInt(result[3]?.toString() || '0');
        status = Number(result[4] || 0);
      } else if (typeof result === 'object') {
        answer = result.answer as boolean;
        proposer = result.proposer as string;
        bond = BigInt(result.bond?.toString() || '0');
        createdAt = BigInt(result.created_at?.toString() || '0');
        status = Number(result.status || 0);
      } else {
        throw new Error('Unexpected result format');
      }

      return {
        answer,
        proposer,
        bond,
        createdAt,
        status: status as ProposalStatus,
        challengeCount: 0, // Would need additional call to get this
      };
    } catch (error: any) {
      console.error(`Failed to get proposal for ${questionId}:`, error);
      throw new Error(`Failed to get proposal: ${error.message}`);
    }
  }

  /**
   * Check if a proposal is finalized
   * @param questionId - The question ID
   * @returns True if finalized
   */
  async isFinalized(questionId: string): Promise<boolean> {
    await this.initialize();
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      const result = await this.contract.is_finalized(questionId);
      return result as boolean;
    } catch (error: any) {
      console.error(`Failed to check if finalized for ${questionId}:`, error);
      return false;
    }
  }

  /**
   * Generate a question ID from market data
   * @param marketId - Market ID
   * @param question - Market question
   * @returns Unique question ID
   */
  static generateQuestionId(marketId: number, question: string): string {
    // In production, use a proper hash function
    // For now, use a simple format
    return `market_${marketId}_${question.substring(0, 20)}`;
  }
}
