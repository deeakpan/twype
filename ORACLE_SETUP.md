# Oracle Setup Guide

This guide explains how to set up and use both Pragma and UMA oracles in your prediction market platform.

## Overview

Your platform now supports **three oracle types**:

1. **Pragma Oracle** - For financial markets (price feeds)
2. **UMA Oracle** - For non-financial markets (sports, politics, etc.)
3. **Manual Resolution** - Admin-controlled fallback

## Quick Start

### 1. Pragma Oracle (Already Configured)

Pragma Oracle is ready to use on testnet. No deployment needed!

**Testnet Address:**
```
0x06df335982dddce41048e475b4c819e609a9c55a7b3b4c5c3f4e9779e2a8b5e
```

**Usage:**
```typescript
import { getPragmaOracleClient } from '@/oracle';

const client = getPragmaOracleClient('sepolia', 'spot');
const price = await client.getValue('BTC/USD');
console.log('BTC Price:', PragmaOracleClient.formatPrice(price.value));
```

### 2. UMA Oracle (Needs Deployment)

Deploy the UMA oracle contract first:

```bash
# Build the contract
cd contracts
scarb build

# Deploy (update script with your values)
npx tsx scripts/deploy-uma-oracle.ts
```

**Configuration:**
- Challenge Period: 1 hour (3600 seconds)
- Minimum Bond: 100 STRK
- Admin: Your admin address
- STRK Token: `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d` (Sepolia)

### 3. Update Market Contract

After deploying UMA oracle, redeploy your market contract with both oracle addresses:

```typescript
// In deploy.ts, update constructor:
constructor(
  admin,
  strkToken,
  pragmaOracleAddress,  // Pragma oracle
  umaOracleAddress,     // UMA oracle (new!)
  platformFeeBps
)
```

## Directory Structure

```
oracle/
├── pragma/
│   ├── config.ts      # Pragma configuration & addresses
│   └── client.ts      # Pragma client utilities
├── uma/
│   ├── config.ts      # UMA configuration & settings
│   └── client.ts      # UMA client utilities
├── utils.ts           # Shared utilities
├── index.ts           # Main exports
└── README.md          # Detailed documentation

contracts/src/
├── market.cairo       # Updated with UMA support
└── uma_oracle.cairo   # UMA oracle contract
```

## Usage Examples

### Financial Market (Pragma)

```typescript
// Create market
await contract.createMarket(
  "Will BTC hit $100k by end of 2026?",
  "Bitcoin must close above $100,000 USD",
  resolutionDate,
  "BTC/USD",           // Pragma pair ID
  BigInt(100000 * 1e18) // Threshold: $100k
);

// Resolve
await contract.resolveMarketWithOracle(marketId);
```

### Sports Market (UMA)

```typescript
import { UMAOracleClient } from '@/oracle';

// 1. Propose answer
const umaClient = new UMAOracleClient(umaAddress, account);
const questionId = UMAOracleClient.generateQuestionId(marketId, question);
await umaClient.proposeAnswer(questionId, true, bondAmount);

// 2. Wait for challenge period (or challenge if needed)
// ... challenge period passes ...

// 3. Finalize proposal
await umaClient.finalizeProposal(questionId);

// 4. Resolve market
await contract.resolveMarketWithUMA(marketId, questionId);
```

### Manual Resolution (Fallback)

```typescript
// For any market type
await contract.resolveMarketManual(marketId, true); // YES wins
```

## Environment Variables

Add to `.env.local`:

```bash
# Pragma Oracle (testnet)
NEXT_PUBLIC_PRAGMA_ORACLE_ADDRESS=0x06df335982dddce41048e475b4c819e609a9c55a7b3b4c5c3f4e9779e2a8b5e

# UMA Oracle (after deployment)
NEXT_PUBLIC_UMA_ORACLE_ADDRESS=<your_uma_oracle_address>

# Starknet RPC
NEXT_PUBLIC_STARKNET_RPC_URL=https://starknet-sepolia.g.alchemy.com/...
```

## Workflow

### For Financial Markets:
1. Create market with Pragma pair ID (e.g., "BTC/USD")
2. Users place bets
3. Admin calls `resolveMarketWithOracle()` when resolution date arrives
4. Contract queries Pragma, compares to threshold, resolves automatically

### For Non-Financial Markets:
1. Create market (oracle_pair_id can be "UMA" or dummy value)
2. Users place bets
3. **Before resolution date**: Someone proposes answer via UMA oracle
4. Challenge period: Others can challenge (optional)
5. **After resolution date**: Finalize UMA proposal
6. Admin calls `resolveMarketWithUMA()` with question ID
7. Contract queries UMA, gets finalized answer, resolves market

## Testing

### Test Pragma Oracle

```typescript
import { getPragmaOracleClient } from '@/oracle';

const client = getPragmaOracleClient('sepolia');
const price = await client.getValue('BTC/USD');
console.log('BTC/USD:', PragmaOracleClient.formatPrice(price.value));
```

### Test UMA Oracle

```typescript
import { UMAOracleClient } from '@/oracle';

const client = new UMAOracleClient(umaAddress, account);

// Propose
const questionId = 'test_question_1';
await client.proposeAnswer(questionId, true);

// Check status
const proposal = await client.getProposal(questionId);
console.log('Proposal:', proposal);

// Finalize (after challenge period)
await client.finalizeProposal(questionId);
```

## Key Features

### Pragma Oracle
- ✅ No deployment needed (uses public oracle)
- ✅ Free on testnet
- ✅ Real-time price feeds
- ✅ Automatic resolution
- ❌ Financial data only

### UMA Oracle
- ✅ Works for any data type
- ✅ Bond-based security
- ✅ Challenge mechanism
- ✅ Decentralized resolution
- ⚠️ Requires STRK bonds
- ⚠️ Needs deployment

### Manual Resolution
- ✅ Works for everything
- ✅ No setup needed
- ✅ Instant resolution
- ❌ Requires trust in admin

## Next Steps

1. **Deploy UMA Oracle**: Run `scripts/deploy-uma-oracle.ts`
2. **Update Market Contract**: Redeploy with UMA oracle address
3. **Update Frontend**: Add UMA oracle UI components
4. **Test**: Create test markets for both oracle types
5. **Document**: Add user-facing documentation

## Support

- Pragma Docs: https://docs.pragma.build/
- UMA Pattern: Based on UMA's optimistic oracle model
- Contract Issues: Check `contracts/src/` for Cairo code
- Frontend Issues: Check `oracle/` for TypeScript utilities
