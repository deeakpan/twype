/**
 * UMA-like Optimistic Oracle Configuration
 * Custom oracle for non-financial data (sports, politics, etc.)
 */

// Default challenge period (in seconds)
export const DEFAULT_CHALLENGE_PERIOD = 3600; // 1 hour

// Default bond amount in STRK (18 decimals)
export const DEFAULT_BOND_AMOUNT = BigInt(100) * BigInt(10 ** 18); // 100 STRK

// Dispute resolution settings
export const DISPUTE_SETTINGS = {
  // Minimum number of voters required for dispute resolution
  minVoters: 3,
  // Percentage of voters needed to overturn (e.g., 51 = 51%)
  overturnThreshold: 51,
  // Time window for voting (in seconds)
  votingPeriod: 86400, // 24 hours
} as const;

// Oracle states
export enum OracleState {
  Uninitialized = 0,
  Proposed = 1,
  Disputed = 2,
  Resolved = 3,
  Expired = 4,
}

// Proposal status
export enum ProposalStatus {
  Pending = 0,
  Accepted = 1,
  Challenged = 2,
  Finalized = 3,
}

// Get challenge period based on market type
export function getChallengePeriod(marketType: 'sports' | 'politics' | 'general' = 'general'): bigint {
  const periods = {
    sports: 7200,      // 2 hours (sports results are usually clear quickly)
    politics: 86400,   // 24 hours (politics may need more time)
    general: 3600,     // 1 hour (default)
  };
  return BigInt(periods[marketType]);
}

// Get bond amount based on market size
export function getBondAmount(totalPool: bigint): bigint {
  // Bond is 1% of total pool, minimum 10 STRK, maximum 1000 STRK
  const onePercent = totalPool / BigInt(100);
  const minBond = BigInt(10) * BigInt(10 ** 18);
  const maxBond = BigInt(1000) * BigInt(10 ** 18);
  
  if (onePercent < minBond) return minBond;
  if (onePercent > maxBond) return maxBond;
  return onePercent;
}
