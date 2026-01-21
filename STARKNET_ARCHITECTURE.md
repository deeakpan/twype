# Tinder-Style Prediction Market on Starknet Testnet - Architecture Guide

## Overview
This guide outlines what you'll need to build a prediction market on Starknet testnet, focusing on free oracle solutions and liquidity mechanisms that don't require you to seed pools.

---

## 1. Core Components You'll Need

### Frontend (Next.js - Already Started ✅)
- Tinder-style swipeable UI (you have this!)
- Starknet wallet integration (Starknet.js + Argent/Braavos wallets)
- Market browsing and betting interface
- Bet slip management

### Smart Contracts (Cairo)
- **Market Factory Contract**: Creates new prediction markets
- **Market Contract**: Manages individual markets (YES/NO shares, liquidity)
- **Oracle Adapter Contract**: Interfaces with oracle for resolution
- **AMM/Liquidity Pool Contract**: Handles trading and pricing

### Backend/Infrastructure
- API to fetch oracle data (if using centralized oracle)
- Market creation interface
- Event indexing for market state

---

## 2. Oracle Solutions (FREE Options)

### Option A: Pragma Oracle (Recommended - FREE on Testnet)
**Best for**: Price feeds, sports data, general market data

- **Free tier**: Yes, on testnet
- **What it provides**: Price feeds, sports scores, weather, etc.
- **How to use**: 
  - Query Pragma's oracle contracts on Starknet
  - Use their price feed aggregator
  - No API key needed for testnet
- **Limitations**: Limited data types, but good for most prediction markets
- **Docs**: https://docs.pragmaoracle.com/

### Option B: Chainlink Functions (FREE on Testnet)
**Best for**: Custom data sources via HTTP requests

- **Free tier**: Yes, on testnet (limited requests)
- **What it provides**: Custom API calls to any data source
- **How to use**:
  - Write JavaScript functions that fetch data
  - Chainlink executes and returns on-chain
- **Limitations**: More complex setup, request limits
- **Docs**: https://docs.chain.link/chainlink-functions

### Option C: Self-Serve Oracle (Simplest for MVP)
**Best for**: Manual resolution, trusted data sources

- **How it works**: 
  - You or trusted parties submit resolution data
  - Multi-sig or time-locked resolution
  - Users can challenge if wrong
- **Pros**: Full control, no costs
- **Cons**: Requires trust or governance

### Option D: API3 dAPIs (Check Availability)
- May have free testnet tier
- Similar to Chainlink but different architecture

**Recommendation**: Start with **Pragma Oracle** for price-based markets, or **Self-Serve Oracle** for custom questions.

---

## 3. Liquidity Mechanisms (No Pool Seeding Required)

### Option A: Automated Market Maker (AMM) - Like Polymarket
**How it works**:
- Uses a constant product formula (x * y = k)
- Initial liquidity: Create market with minimal liquidity (even 1 token)
- Users add liquidity as they bet
- Prices adjust automatically based on supply/demand

**Implementation**:
```
Initial State:
- YES shares: 100
- NO shares: 100
- Total liquidity: 200 tokens

User bets 10 tokens on YES:
- Buys YES shares, increasing YES price
- AMM calculates: new_yes_price = (no_shares / yes_shares) * bet_amount
- User receives YES shares based on current price
```

**Pros**:
- No upfront capital needed
- Self-balancing
- Users provide liquidity as they bet

**Cons**:
- Early markets have high slippage
- Need to handle edge cases (0 liquidity, etc.)

### Option B: Order Book Model
**How it works**:
- Users place limit orders
- Matches buyers and sellers
- No liquidity pool needed

**Pros**:
- No liquidity required
- Transparent pricing

**Cons**:
- Requires active market makers
- Can have low liquidity initially

### Option C: Parimutuel Pool (Simplest)
**How it works**:
- All bets go into a pool
- Winners split the pool proportionally
- No AMM needed

**Example**:
```
Pool: 1000 tokens total
- 600 tokens on YES
- 400 tokens on NO

If YES wins:
- Each YES bettor gets: (their_bet / 600) * 1000
- NO bettors get 0
```

**Pros**:
- Simplest to implement
- No liquidity seeding
- Fair distribution

**Cons**:
- Can't exit position early
- Less flexible than AMM

**Recommendation**: Start with **Parimutuel Pool** for MVP, then upgrade to **AMM** for better UX.

---

## 4. Recommended Architecture

### Phase 1: MVP (Parimutuel + Self-Serve Oracle)
```
1. Market Creation
   - Admin creates market with question
   - Sets resolution date
   - Initial state: 0 tokens in pool

2. Betting
   - Users bet YES or NO
   - Tokens go into pool
   - Track: total_yes, total_no

3. Resolution
   - Admin/Oracle submits result
   - Contract calculates payouts
   - Winners claim rewards

4. Payout Formula
   - winner_share = (user_bet / winning_side_total) * total_pool
   - fee = winner_share * 0.02 (2% platform fee)
   - payout = winner_share - fee
```

### Phase 2: AMM Upgrade
```
1. Market starts with minimal liquidity (1 YES + 1 NO share)
2. Users buy/sell shares at market price
3. Price = (opposite_shares / your_shares) * base_price
4. Users can exit anytime by selling shares
```

---

## 5. Tech Stack

### Smart Contracts
- **Language**: Cairo 2.0
- **Framework**: Scarb (Starknet package manager)
- **Testing**: Starknet Foundry or Protostar

### Frontend
- **Wallet**: get-starknet-core or starknet-react
- **RPC**: Starknet testnet RPC (free from Infura/Alchemy)
- **Contract Interaction**: starknet.js

### Oracle Integration
- **Pragma**: Call their oracle contracts directly
- **Self-Serve**: Admin function to resolve markets

---

## 6. Cost Breakdown (Testnet)

| Component | Cost |
|-----------|------|
| Contract Deployment | FREE (testnet ETH) |
| Oracle Queries | FREE (Pragma testnet) |
| Transactions | FREE (testnet ETH) |
| RPC Calls | FREE (Infura/Alchemy free tier) |
| **Total** | **$0** |

---

## 7. Implementation Steps

1. **Set up Cairo development environment**
   - Install Scarb
   - Set up Starknet Foundry

2. **Build Market Contract (Parimutuel)**
   - Create market function
   - Bet function (YES/NO)
   - Resolve function
   - Claim function

3. **Integrate Oracle**
   - Start with self-serve (admin resolves)
   - Later add Pragma integration

4. **Update Frontend**
   - Replace Solana wallet with Starknet
   - Connect to your contracts
   - Update betting flow

5. **Test on Testnet**
   - Deploy contracts
   - Test full flow
   - Get testnet ETH from faucet

---

## 8. Example Market Flow

```
1. Admin creates: "Will BTC hit $100k by Dec 2026?"
   - Market ID: 1
   - Resolution: Dec 31, 2026
   - Oracle: Pragma BTC/USD price feed

2. User A bets 100 tokens on YES
   - Pool: YES=100, NO=0, Total=100

3. User B bets 50 tokens on NO
   - Pool: YES=100, NO=50, Total=150

4. User C bets 200 tokens on YES
   - Pool: YES=300, NO=50, Total=350

5. Dec 31, 2026: Oracle reports BTC = $105k
   - Result: YES wins
   - User A gets: (100/300) * 350 = 116.67 tokens
   - User C gets: (200/300) * 350 = 233.33 tokens
   - User B gets: 0 (lost)
```

---

## 9. Key Considerations

### Security
- Use time locks for resolution
- Multi-sig for admin functions
- Validate oracle data

### UX
- Show real-time odds
- Display potential winnings
- Clear resolution status

### Scalability
- Batch transactions where possible
- Index events off-chain
- Cache market data

---

## 10. Next Steps

1. Choose oracle solution (recommend Pragma or Self-Serve)
2. Choose liquidity model (recommend Parimutuel for MVP)
3. Set up Cairo development environment
4. Build minimal market contract
5. Integrate with frontend
6. Test on testnet

---

## Resources

- **Starknet Docs**: https://docs.starknet.io/
- **Cairo Book**: https://book.cairo-lang.org/
- **Pragma Oracle**: https://docs.pragmaoracle.com/
- **Starknet.js**: https://www.starknetjs.com/
- **Scarb**: https://docs.swmansion.com/scarb/
