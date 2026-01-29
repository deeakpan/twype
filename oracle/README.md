# Oracle Integration

This directory contains oracle integrations for the prediction market platform.

## Structure

- `pragma/` - Pragma Oracle integration for price feeds (financial data)
- `uma/` - Custom UMA-like optimistic oracle for non-financial data (sports, politics, etc.)

## Pragma Oracle

### Purpose
Used for **financial markets only** - price feeds like BTC/USD, ETH/USD, stock prices, etc.

### Features
- ✅ Works on Starknet Sepolia Testnet
- ✅ Free to use on testnet
- ✅ Real-time price feeds
- ✅ Computational feeds (TWAP, volatility)

### Usage

```typescript
import { getPragmaOracleClient } from '@/oracle';

// Get client (single address for all feeds)
const pragmaClient = getPragmaOracleClient('sepolia');

// Get price (can use pair name - client converts to asset ID automatically)
const priceData = await pragmaClient.getValue('BTC/USD');
console.log(`BTC Price: $${PragmaOracleClient.formatPrice(priceData.value)}`);

// Or use asset ID directly (felt252 as string)
const priceData2 = await pragmaClient.getValue('18669995996566340'); // BTC/USD asset ID
```

**Note:** Pragma uses numeric Asset IDs (felt252) for each pair. The client automatically converts pair names like "BTC/USD" to the corresponding asset ID. You can also use the asset ID directly.

### Supported Pairs

**Cryptocurrencies:**
- BTC/USD, ETH/USD, SOL/USD, STRK/USD, USDC/USD, USDT/USD

**Stocks:**
- TSLA/USD, AAPL/USD, GOOGL/USD, MSFT/USD, AMZN/USD

**Indices:**
- SPX/USD, DJI/USD, NASDAQ/USD

**Computational:**
- BTC_TWAP_24H, ETH_TWAP_24H, BTC_VOLATILITY_30D, etc.

## UMA Oracle

### Purpose
Used for **non-financial markets** - sports, politics, entertainment, custom events.

### Features
- ✅ Optimistic oracle model (propose → challenge → finalize)
- ✅ Bond-based security (proposers and challengers post bonds)
- ✅ Challenge period for disputes
- ✅ Works with STRK token on testnet

### How It Works

1. **Propose Answer**: Someone proposes an answer (YES/NO) and posts a bond
2. **Challenge Period**: Others can challenge the proposal by posting a bond
3. **Finalization**: After challenge period, proposal is finalized
4. **Resolution**: Winner gets bonds from losers

### Usage

```typescript
import { UMAOracleClient } from '@/oracle';

// Initialize client
const umaClient = new UMAOracleClient(umaOracleAddress, account);

// Propose an answer
const questionId = UMAOracleClient.generateQuestionId(marketId, question);
await umaClient.proposeAnswer(questionId, true, bondAmount);

// Challenge a proposal
await umaClient.challengeProposal(questionId, bondAmount);

// Finalize after challenge period
await umaClient.finalizeProposal(questionId);

// Get proposal status
const proposal = await umaClient.getProposal(questionId);
```

## Configuration

### Testnet Addresses

**Pragma Oracle (Sepolia):**
- Spot Price Oracle: `0x06df335982dddce41048e475b4c819e609a9c55a7b3b4c5c3f4e9779e2a8b5e`
- Computational Oracle: `0x06df335982dddce41048e475b4c819e609a9c55a7b3b4c5c3f4e9779e2a8b5e`

**UMA Oracle:**
- Deploy the `uma_oracle.cairo` contract and use its address

### Environment Variables

Add to `.env.local`:
```bash
NEXT_PUBLIC_PRAGMA_ORACLE_ADDRESS=0x06df335982dddce41048e475b4c819e609a9c55a7b3b4c5c3f4e9779e2a8b5e
NEXT_PUBLIC_UMA_ORACLE_ADDRESS=<your_uma_oracle_address>
NEXT_PUBLIC_STARKNET_RPC_URL=https://starknet-sepolia.g.alchemy.com/...
```

## Integration with Market Contract

The market contract supports both oracle types:

1. **Pragma**: Use `resolve_market_with_oracle()` for financial markets
2. **UMA**: Use `resolve_market_with_uma()` for non-financial markets (when implemented)
3. **Manual**: Use `resolve_market_manual()` as fallback

## Deployment

### Deploy UMA Oracle

```bash
cd contracts
scarb build
starkli deploy target/dev/penkmarket_UMAOracle.contract_class.json \
  --constructor-calldata <admin> <strk_token> <challenge_period> <min_bond>
```

### Update Market Contract

The market contract constructor should include both oracle addresses:

```cairo
constructor(
    admin: ContractAddress,
    strk_token: ContractAddress,
    pragma_oracle: ContractAddress,
    uma_oracle: ContractAddress,  // Add this
    platform_fee_bps: u16
)
```

## Testing

### Test Pragma Oracle

```typescript
const client = getPragmaOracleClient('sepolia');
const price = await client.getValue('BTC/USD');
console.log('BTC Price:', price);
```

### Test UMA Oracle

```typescript
const client = new UMAOracleClient(umaAddress, account);
const questionId = 'test_question_1';
await client.proposeAnswer(questionId, true);
const proposal = await client.getProposal(questionId);
console.log('Proposal:', proposal);
```

## Notes

- Pragma Oracle is **read-only** - no transactions needed
- UMA Oracle requires **STRK tokens** for bonds
- Challenge periods are configurable per market type
- Bonds are returned to winners, slashed from losers
