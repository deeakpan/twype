/**
 * Oracle Module - Main Export
 * Provides unified access to both Pragma and UMA oracles
 */

export * from './pragma/config';
export * from './pragma/client';
export * from './uma/config';
export * from './uma/client';

// Re-export types
export type { PragmaPriceData } from './pragma/client';
export type { UMAProposal } from './uma/client';
export { OracleState, ProposalStatus } from './uma/config';
