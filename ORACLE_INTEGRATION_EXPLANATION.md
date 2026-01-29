# Oracle Integration Explanation

## Quick Answers

### ✅ **Does it work on testnet?**
**Yes!** Pragma Oracle fully supports Starknet Sepolia Testnet:
- Spot price feeds available on testnet
- Computational feeds (TWAP, volatility) available on testnet
- Free to use for testing
- Specific contract addresses for testnet provided in Pragma docs

### 🔍 **Is it just price?**
**YES - Standard Pragma Oracle is FINANCIAL DATA ONLY**

**Standard Pragma Oracle (What Your Contract Uses):**
- ✅ **Mainnet**: Price feeds (BTC/USD, ETH/USD, stocks) - WORKS
- ✅ **Mainnet**: Computational feeds (volatility, yield curves) - WORKS
- ❌ **Mainnet**: Sports/politics - DOES NOT EXIST
- ❌ **Mainnet**: Non-financial data - DOES NOT EXIST

**For Politics & Sports Markets:**
- ✅ **Manual Resolution**: Use `resolve_market_manual()` - WORKS ON MAINNET NOW
- ⚠️ **Pragma Optimistic Oracle**: Testnet only (not mainnet public yet)
- ❌ **Standard Pragma**: Does NOT support sports/politics on mainnet

**Bottom Line**: Your contract uses Standard Pragma = FINANCIAL ONLY. For sports/politics, use Manual Resolution (works now) or wait for Optimistic Oracle mainnet.

### 🏀 **What about politics and sports?**
**Short answer: Use manual resolution - it's the ONLY thing that works on mainnet right now!**

- **Standard Pragma Oracle**: Financial data ONLY (prices, volatility) - NO sports/politics
- **Pragma Optimistic Oracle**: Testnet only (NOT mainnet public)
- **Politics/Sports on Mainnet**: Use `resolve_market_manual()` - WORKS NOW
- **Example**: "Will Lakers win?" → Admin checks NBA results → Calls `resolveMarketManual(marketId, true/false)`
- **Already built in**: Your contract has this feature ready to use!

See **Section 8** below for detailed examples.

### 🔄 **Other Oracle Options?**
**Yes! Multiple alternatives available:**

- **Chainlink Data Feeds**: ✅ Starknet support, price oracles (free testnet)
- **Chainlink Functions**: ❌ Not on Starknet yet, needs LINK token
- **RedStone**: ✅ Starknet native, fast financial feeds (free tier)
- **API3**: ⚠️ Check support, first-party data
- **Pyth**: ⚠️ Check support, ultra-fast prices
- **Manual**: ✅ Built-in, works for anything (free)

**Payment Note**: Chainlink Functions requires LINK token subscriptions. See **Section 13** for payment details!

See **Section 14** for full comparison and integration guide!

---

## Overview
Your prediction market contract already has **Pragma Oracle** integration built in. This document explains how it works with your current implementation.

---

## Architecture Flow

### 1. **Contract Setup (Cairo Contract)**

The contract stores the Pragma Oracle address during deployment:

```cairo
// In market.cairo constructor
self.pragma_oracle.write(pragma_oracle);  // Oracle contract address stored
```

**Key Components:**
- `pragma_oracle: ContractAddress` - Stores the Pragma Oracle contract address
- `oracle_pair_id: felt252` - The data pair to query (e.g., "BTC/USD")
- `threshold_value: u256` - The value threshold for YES to win

### 2. **Market Creation**

When creating a market, you specify:
- **Oracle Pair ID**: The data source (e.g., "BTC/USD", "ETH/USD")
- **Threshold Value**: The value that determines YES/NO outcome

**Example:**
```typescript
// Frontend: app/create/page.tsx
await contract.createMarket(
  "Will Bitcoin hit $150k by end of 2026?",
  "Price must close above $150,000 on Dec 31, 2026",
  timestamp,
  "BTC/USD",        // oracle_pair_id
  BigInt(150000)    // threshold_value (in base units)
);
```

**What Happens:**
1. Frontend calls `createMarket()` in `contract.ts`
2. Which calls `create_market()` on the Cairo contract
3. Contract stores `oracle_pair_id` and `threshold_value` in `MarketInfo`
4. Market is created and ready for betting

---

## 3. **Resolution Process**

### Step-by-Step Flow:

#### **A. Frontend Call**
```typescript
// In contract.ts (line 262-268)
async resolveMarketWithOracle(marketId: number): Promise<void> {
  await this.initialize();
  if (!this.account) throw new Error('Account not connected');
  if (!this.contract) throw new Error('Contract not initialized');
  
  await this.contract.resolve_market_with_oracle(marketId);
}
```

#### **B. Contract Execution** (in `market.cairo`)

```cairo
fn resolve_market_with_oracle(
    ref self: ContractState,
    market_id: u32
) {
    // 1. Admin check
    let caller = get_caller_address();
    assert(caller == self.admin.read(), 'Only admin can resolve');
    
    // 2. Get market info
    let mut market = self.markets.entry(market_id).read();
    assert(!market.resolved, 'Market already resolved');
    assert(get_block_timestamp() >= market.resolution_date, 'Resolution date not reached');
    
    // 3. Query Pragma Oracle
    let oracle = self.pragma_oracle.read();
    let dispatcher = IPragmaOracleDispatcher { contract_address: oracle };
    let (oracle_value, _timestamp) = dispatcher.get_value(market.oracle_pair_id);
    
    // 4. Compare with threshold
    // YES if oracle_value >= threshold_value, NO otherwise
    let result = oracle_value >= market.threshold_value;
    
    // 5. Update market state
    market.resolved = true;
    market.result = result;
    self.markets.entry(market_id).write(market);
    
    // 6. Emit event
    self.emit(MarketResolved { market_id, result });
}
```

---

## 4. **How It Works in Detail**

### **Oracle Query Process:**

1. **Contract Calls Pragma Oracle:**
   ```cairo
   let dispatcher = IPragmaOracleDispatcher { contract_address: oracle };
   let (oracle_value, _timestamp) = dispatcher.get_value(market.oracle_pair_id);
   ```
   - Uses the stored `pragma_oracle` address
   - Calls `get_value()` with the `oracle_pair_id` (e.g., "BTC/USD")
   - Returns: `(value: u256, timestamp: u64)`

2. **Threshold Comparison:**
   ```cairo
   let result = oracle_value >= market.threshold_value;
   ```
   - If `oracle_value >= threshold_value` → **YES wins**
   - If `oracle_value < threshold_value` → **NO wins**

3. **Market Resolution:**
   - Market is marked as `resolved = true`
   - `result` is set to the outcome
   - Event is emitted for frontend to detect

---

## 5. **Example Scenario**

### Market: "Will BTC hit $150k by Dec 31, 2026?"

**Market Creation:**
```typescript
oraclePairId: "BTC/USD"
thresholdValue: 150000 * 1e18  // $150,000 in base units
```

**Resolution (Dec 31, 2026):**
1. Admin calls `resolveMarketWithOracle(1)`
2. Contract queries Pragma Oracle for "BTC/USD"
3. Oracle returns: `(value: 155000 * 1e18, timestamp: 1735689600)`
4. Contract compares: `155000 >= 150000` → **YES wins**
5. Market is resolved with `result = true`
6. YES bettors can now claim payouts

---

## 6. **Current Implementation Status**

### ✅ **What's Already Implemented:**

1. **Contract Side:**
   - ✅ Oracle interface defined (`IPragmaOracle`)
   - ✅ Oracle address stored in contract
   - ✅ `resolve_market_with_oracle()` function
   - ✅ Threshold comparison logic
   - ✅ Market stores `oracle_pair_id` and `threshold_value`

2. **Frontend Side:**
   - ✅ `resolveMarketWithOracle()` method in `contract.ts`
   - ✅ Market creation form includes oracle fields
   - ✅ Oracle pair ID selection UI

### ⚠️ **What Needs Configuration:**

1. **Pragma Oracle Address:**
   - Must be set during contract deployment
   - Currently stored in contract constructor
   - Need to use Pragma's actual contract address on Starknet

2. **Oracle Pair IDs:**
   - Must match Pragma's supported pairs
   - Common pairs: "BTC/USD", "ETH/USD", "SOL/USD", etc.
   - Check Pragma docs for available pairs

3. **Admin Account:**
   - Only admin can call `resolve_market_with_oracle()`
   - Admin address set during contract deployment

---

## 7. **Integration Points**

### **Contract → Oracle:**
```cairo
// Interface definition (line 22-25 in market.cairo)
trait IPragmaOracle<TContractState> {
    fn get_value(self: @TContractState, pair_id: felt252) -> (u256, u64);
}

// Usage (line 268-270)
let dispatcher = IPragmaOracleDispatcher { contract_address: oracle };
let (oracle_value, _timestamp) = dispatcher.get_value(market.oracle_pair_id);
```

### **Frontend → Contract:**
```typescript
// Method call (contract.ts line 262)
await contract.resolveMarketWithOracle(marketId);

// Which calls (contract.ts line 267)
await this.contract.resolve_market_with_oracle(marketId);
```

---

## 8. **Manual Resolution - Complete Guide**

### **What is Manual Resolution?**

Manual resolution is a built-in feature that allows an **admin** to manually set the outcome of a prediction market based on real-world events. Unlike oracle-based resolution (which queries automated data feeds), manual resolution requires human judgment to determine the result.

### **When to Use Manual Resolution**

**Perfect for:**
- ✅ **Sports markets**: Game outcomes, championship winners, player stats
- ✅ **Political markets**: Election results, policy decisions, voting outcomes
- ✅ **Entertainment**: Award shows, TV show outcomes, celebrity events
- ✅ **Custom events**: Any event without an automated oracle feed
- ✅ **Testing/MVP**: Quick testing without oracle setup

**Not ideal for:**
- ❌ **Financial markets**: Use Pragma Oracle (automated price feeds)
- ❌ **High-frequency data**: Manual resolution is too slow
- ❌ **Controversial topics**: Requires trust in admin

---

### **How Manual Resolution Works**

#### **Step 1: Create Market (Same as Oracle Markets)**

When creating a market that will use manual resolution, you can use dummy oracle values since they won't be checked:

```typescript
// Frontend: app/create/page.tsx or your market creation
await contract.createMarket(
  "Will the Lakers win the 2025 NBA Championship?",
  "Lakers must win the NBA Finals series. Resolution based on official NBA results.",
  resolutionTimestamp,  // When the Finals end
  "MANUAL",             // Dummy oracle_pair_id (not used)
  BigInt(0)             // Dummy threshold_value (not used)
);
```

**What happens:**
- Market is created with ID (e.g., `marketId = 5`)
- `oracle_pair_id` and `threshold_value` are stored but **not used** for resolution
- Market is open for betting until `resolution_date`

#### **Step 2: Users Place Bets**

Users bet YES or NO as normal:

```typescript
// User bets 100 STRK on YES (Lakers will win)
await contract.placeBet(5, true, BigInt(100 * 1e18));

// Another user bets 50 STRK on NO (Lakers won't win)
await contract.placeBet(5, false, BigInt(50 * 1e18));
```

#### **Step 3: Event Happens (Real World)**

The actual event occurs:
- NBA Finals end
- Election results are announced
- Award show concludes
- etc.

#### **Step 4: Admin Resolves Market**

**After the event ends and results are known**, the admin calls `resolve_market_manual()`:

```typescript
// Frontend: contract.ts (line 271-277)
async resolveMarketManual(marketId: number, result: boolean): Promise<void> {
  await this.initialize();
  if (!this.account) throw new Error('Account not connected');
  if (!this.contract) throw new Error('Contract not initialized');
  
  await this.contract.resolve_market_manual(marketId, result);
}

// Usage:
// If Lakers won:
await contract.resolveMarketManual(5, true);   // YES wins

// If Lakers lost:
await contract.resolveMarketManual(5, false);  // NO wins
```

#### **Step 5: Contract Updates State**

The contract executes the resolution:

```cairo
// Contract: market.cairo (line 287-308)
fn resolve_market_manual(
    ref self: ContractState,
    market_id: u32,
    result: bool
) {
    // 1. Security check: Only admin can resolve
    let caller = get_caller_address();
    assert(caller == self.admin.read(), 'Only admin can resolve');
    
    // 2. Get market info
    let mut market = self.markets.entry(market_id).read();
    
    // 3. Validation checks
    assert(!market.resolved, 'Market already resolved');
    assert(get_block_timestamp() >= market.resolution_date, 'Resolution date not reached');
    
    // 4. Set the result
    market.resolved = true;
    market.result = result;  // true = YES wins, false = NO wins
    
    // 5. Save to storage
    self.markets.entry(market_id).write(market);
    
    // 6. Emit event for frontend
    self.emit(MarketResolved {
        market_id,
        result,
    });
}
```

#### **Step 6: Winners Claim Payouts**

After resolution, winners can claim their payouts:

```typescript
// Winners call claim_payout
const payout = await contract.claimPayout(5);
// Returns the amount they won (in STRK)
```

---

### **Complete Example: Sports Market**

**Full workflow:**

```typescript
// 1. Admin creates market
const marketId = await contract.createMarket(
  "Will the Lakers beat the Warriors in Game 7?",
  "Lakers must win the game. Resolution based on official NBA score.",
  BigInt(Math.floor(new Date('2025-06-15').getTime() / 1000)),
  "MANUAL",
  BigInt(0)
);
// Returns: marketId = 10

// 2. Users bet
await contract.placeBet(10, true, BigInt(100 * 1e18));   // User A: 100 STRK on YES
await contract.placeBet(10, false, BigInt(75 * 1e18));   // User B: 75 STRK on NO
await contract.placeBet(10, true, BigInt(50 * 1e18));    // User C: 50 STRK on YES

// Pool: YES = 150 STRK, NO = 75 STRK, Total = 225 STRK

// 3. Game happens (June 15, 2025)
// Lakers win 108-102

// 4. Admin resolves (after game ends)
await contract.resolveMarketManual(10, true);  // YES wins (Lakers won)

// 5. Winners claim payouts
// User A gets: (100/150) * 225 = 150 STRK (minus fees)
// User C gets: (50/150) * 225 = 75 STRK (minus fees)
// User B gets: 0 (lost)

const payoutA = await contract.claimPayout(10);  // User A claims
const payoutC = await contract.claimPayout(10);  // User C claims
```

---

### **Security & Validation**

The contract includes several security checks:

1. **Admin-Only Access:**
   ```cairo
   assert(caller == self.admin.read(), 'Only admin can resolve');
   ```
   - Only the contract admin can resolve markets
   - Prevents unauthorized resolution

2. **One-Time Resolution:**
   ```cairo
   assert(!market.resolved, 'Market already resolved');
   ```
   - Market can only be resolved once
   - Prevents changing the result

3. **Timing Check:**
   ```cairo
   assert(get_block_timestamp() >= market.resolution_date, 'Resolution date not reached');
   ```
   - Can't resolve before the resolution date
   - Prevents premature resolution

---

### **Best Practices**

#### **1. Transparency**

**Document the data source:**
```typescript
// Good market description:
"Will Candidate X win the 2025 election? 
Resolution based on official election commission results published at election.gov.
Result will be determined within 24 hours of official announcement."
```

**Show proof when resolving:**
- Link to official source
- Screenshot of results
- Timestamp of resolution

#### **2. Clear Resolution Criteria**

**Define exactly what determines the outcome:**

✅ **Good:**
- "Lakers must win the game (not just the series)"
- "Price must close above $150k on Dec 31, 2025 at 11:59 PM UTC"
- "Candidate must receive >50% of popular vote"

❌ **Bad:**
- "If the team wins" (which game? which tournament?)
- "If price goes up" (how much? when?)

#### **3. Timing**

- **Resolve promptly**: Don't delay after event ends
- **Set clear deadlines**: "Resolution within 24 hours of event end"
- **Communicate delays**: If resolution is delayed, inform users

#### **4. Trust & Governance**

**For important markets, consider:**

- **Multi-sig admin**: Require multiple signatures to resolve
- **Time-locked resolution**: Delay resolution for challenges
- **Community voting**: Let users vote on disputed resolutions
- **Dispute period**: Allow challenges within X hours

**Example multi-sig (future enhancement):**
```cairo
// Would require 3 of 5 admins to sign
fn resolve_market_manual_multi_sig(
    market_id: u32,
    result: bool,
    signatures: Array<Signature>
) {
    assert(verify_signatures(signatures) >= 3, 'Need 3 admin signatures');
    // ... resolve market
}
```

---

### **Frontend Implementation**

**Add a resolution UI for admins:**

```typescript
// Example: Admin resolution component
function AdminResolutionPanel({ marketId }: { marketId: number }) {
  const { contract, account } = useMarketContract();
  const [resolving, setResolving] = useState(false);
  
  const handleResolve = async (result: boolean) => {
    try {
      setResolving(true);
      await contract.resolveMarketManual(marketId, result);
      // Show success message
    } catch (error) {
      // Show error
    } finally {
      setResolving(false);
    }
  };
  
  return (
    <div>
      <h3>Resolve Market</h3>
      <button onClick={() => handleResolve(true)} disabled={resolving}>
        Resolve: YES Wins
      </button>
      <button onClick={() => handleResolve(false)} disabled={resolving}>
        Resolve: NO Wins
      </button>
    </div>
  );
}
```

---

### **Comparison: Manual vs Oracle Resolution**

| Feature | Manual Resolution | Oracle Resolution |
|---------|------------------|-------------------|
| **Speed** | Slow (human action) | Fast (automatic) |
| **Data Types** | **Any** (sports, politics, etc.) | Financial only |
| **Trust** | Requires trust in admin | Trustless (oracle) |
| **Cost** | Free | Free (testnet) |
| **Setup** | None (built-in) | Oracle address needed |
| **Flexibility** | High (any event) | Low (oracle feeds only) |
| **Decentralization** | Low (admin-controlled) | High (oracle network) |

---

### **Use Cases**

#### **Sports Markets**
```typescript
// Example markets:
"Will the Lakers win the NBA Finals?"
"Will Team A score more than 100 points?"
"Will Player X score a hat-trick?"
```

#### **Political Markets**
```typescript
// Example markets:
"Will Candidate X win the election?"
"Will the bill pass in Congress?"
"Will the referendum pass?"
```

#### **Entertainment**
```typescript
// Example markets:
"Will Movie X win Best Picture?"
"Will TV Show Y get renewed?"
"Will Celebrity Z get married this year?"
```

#### **Custom Events**
```typescript
// Example markets:
"Will it rain in NYC on Dec 25?"
"Will the company IPO this year?"
"Will the product launch by Q2?"
```

---

### **Limitations & Considerations**

**Limitations:**
1. **Requires trust**: Users must trust admin to resolve correctly
2. **Single point of failure**: Admin account compromise = risk
3. **Delayed resolution**: Not instant like oracles
4. **Subjectivity**: Some events may be ambiguous

**Mitigations:**
- Use multi-sig for important markets
- Clear resolution criteria
- Transparent data sources
- Community governance for disputes
- Time-locked resolutions

---

### **Future Enhancements**

**Possible improvements:**

1. **Optimistic Oracle Integration:**
   - Use Pragma's Optimistic Oracle
   - Community can challenge incorrect resolutions
   - More decentralized

2. **Multi-Sig Resolution:**
   - Require multiple admin signatures
   - Higher security

3. **Dispute Period:**
   - Allow challenges within X hours
   - Community voting on disputes

4. **Automated Data Sources:**
   - Integrate sports APIs
   - Election result APIs
   - Still manual trigger, but data verified

---

### **Summary**

**Manual resolution is:**
- ✅ **Built-in** - Already in your contract
- ✅ **Flexible** - Works for any event type
- ✅ **Free** - No oracle costs
- ✅ **Simple** - Just call `resolveMarketManual()`

**Perfect for:**
- Sports markets
- Political markets
- Entertainment events
- Custom questions
- MVP/testing

**Remember:**
- Only admin can resolve
- Must wait until resolution date
- Can only resolve once
- Requires trust in admin
- Document data sources for transparency

---

## 9. **Pragma Oracle Setup**

### **✅ Testnet Support:**

**Yes, Pragma Oracle works on Starknet Sepolia Testnet!**

- **Testnet Environment**: Fully supported for development and testing
- **Computational Feeds**: Available on Sepolia testnet (TWAP, volatility, etc.)
- **Spot Price Feeds**: Available on testnet
- **No Cost**: Free to use on testnet

### **Getting Pragma Oracle Address:**

1. **Testnet (Sepolia):**
   - Check Pragma documentation for testnet contract address
   - Computational feeds have specific Sepolia addresses
   - Spot price feeds available on testnet
   - Docs: https://docs.pragma.build/

2. **Mainnet:**
   - Use Pragma's mainnet oracle address
   - Deploy contract with this address

### **Supported Data Types:**

**Standard Pragma Oracle (Financial Data Only):**

1. **Spot Price Feeds** (Most Common):
   - `BTC/USD`, `ETH/USD`, `SOL/USD` - Cryptocurrency prices
   - `TSLA/USD`, `AAPL/USD` - Stock prices
   - `SPX/USD` - Index prices

2. **Computational Feeds** (Advanced):
   - **TWAP** (Time-Weighted Average Price) - Average price over time
   - **Realized Volatility** - Price fluctuation metrics
   - **Yield Curve** - Financial term structure (coming soon)
   - Custom computed metrics

3. **How It Works:**
   - The `pair_id` (felt252) is just an identifier string
   - Represents price pairs OR computational feed IDs
   - Contract calls `get_value(pair_id)` which returns `(u256, u64)`
   - The `u256` value can be:
     - A price (e.g., BTC/USD = 50000 * 1e18)
     - A computed metric (e.g., TWAP, volatility)

4. **Example Use Cases:**
   ```typescript
   // Price-based market
   oraclePairId: "BTC/USD"
   thresholdValue: 150000 * 1e18  // $150k
   
   // Volatility-based market
   oraclePairId: "BTC_VOLATILITY_30D"
   thresholdValue: 50 * 1e18  // 50% volatility
   
   // TWAP-based market
   oraclePairId: "ETH_TWAP_24H"
   thresholdValue: 3000 * 1e18  // 24h average
   ```

**⚠️ NOT Supported by Standard Oracle:**
- ❌ Sports scores/outcomes
- ❌ Election results
- ❌ Political events
- ❌ Non-financial binary outcomes

**✅ For Politics/Sports:** Use `resolve_market_manual()` - see Section 8 below!

### **Value Format:**
- Pragma returns `u256` values
- Usually in base units (e.g., BTC/USD might be in cents or wei)
- Your threshold must match the format
- Check Pragma docs for specific feed formats

---

## 10. **Testing the Integration**

### **Test Flow:**

1. **Deploy Contract:**
   ```bash
   # Set Pragma Oracle address in constructor
   pragma_oracle: <PRAGMA_ORACLE_ADDRESS>
   ```

2. **Create Market:**
   ```typescript
   await contract.createMarket(
     "Test: Will BTC hit $100k?",
     "Test description",
     futureTimestamp,
     "BTC/USD",
     BigInt(100000 * 1e18)
   );
   ```

3. **Wait for Resolution Date**

4. **Resolve with Oracle:**
   ```typescript
   await contract.resolveMarketWithOracle(marketId);
   ```

5. **Check Result:**
   ```typescript
   const marketInfo = await contract.getMarketInfo(marketId);
   console.log("Resolved:", marketInfo.resolved);
   console.log("Result:", marketInfo.result);  // true = YES, false = NO
   ```

---

## 11. **Key Takeaways**

1. **Oracle is Already Integrated:** Your contract has full Oracle support built in
2. **Pragma Oracle:** Uses Pragma's oracle contract for price/data feeds
3. **Threshold-Based:** YES wins if oracle value >= threshold, NO otherwise
4. **Admin-Only Resolution:** Only admin can trigger oracle resolution
5. **Automatic Comparison:** Contract automatically compares oracle value to threshold
6. **Manual Fallback:** Can use `resolveMarketManual()` if needed

---

## 12. **Next Steps**

1. **Get Pragma Oracle Address:**
   - Check Pragma docs for Starknet Sepolia testnet address
   - Update contract deployment script

2. **Test Oracle Query:**
   - Deploy contract with Pragma address
   - Create test market
   - Resolve and verify oracle value is fetched correctly

3. **Handle Edge Cases:**
   - What if oracle is unavailable?
   - What if oracle returns stale data?
   - Add timestamp validation if needed

4. **Frontend Integration:**
   - Add UI button for admin to resolve markets
   - Show oracle value when resolving
   - Display resolution status

---

## 13. **Chainlink Functions Payment Explained**

### **How Chainlink Functions Payment Works**

**Short Answer: Yes, you need LINK token to pay for Chainlink Functions.**

### **Payment Model: Subscription-Based**

1. **Create a Subscription Account:**
   - You create a subscription (like a prepaid account)
   - Fund it with **LINK tokens**
   - This is a one-time setup

2. **Link Your Contracts:**
   - Your smart contracts (consumers) connect to the subscription
   - Multiple contracts can share one subscription
   - No need to hold LINK in each contract

3. **Automatic Deduction:**
   - Each Function request deducts LINK from subscription
   - Cost: Usually a few cents per request (converted to LINK)
   - Billing shown in USD, but paid in LINK

### **LINK Token on Starknet**

**✅ LINK is available on Starknet:**
- Bridged via **StarkGate** (Starknet's bridge)
- LINK contract deployed on Starknet
- Can hold and transfer LINK on Starknet

**How to get LINK:**
- Bridge from Ethereum via StarkGate
- Buy on Starknet DEXs (if available)
- Get testnet LINK from faucets (for testing)

### **Payment Abstraction (Optional)**

**Newer Feature:**
- You *might* be able to pay in other tokens (ETH, stablecoins)
- Automatically converts to LINK behind the scenes
- Still requires LINK in the end, but you don't need to hold it

**Example:**
```
You pay: 0.01 ETH
System converts: ETH → LINK (via DEX)
Node operators receive: LINK
```

### **⚠️ Important: Chainlink Functions on Starknet**

**Current Status:**
- ❌ **Chainlink Functions** (custom API/compute) is **NOT officially supported on Starknet**
- ✅ **Chainlink Data Feeds** (price oracles) **ARE available** on Starknet
- ✅ LINK token **IS available** on Starknet

**What this means:**
- You can use Chainlink **price feeds** on Starknet (no Functions needed)
- You **cannot** use Chainlink Functions for custom APIs on Starknet yet
- If/when Functions comes to Starknet, you'll need LINK for subscriptions

### **Cost Breakdown**

**Chainlink Functions (when available):**
- **Subscription setup**: Fund with LINK (e.g., $10-50 worth)
- **Per request**: ~$0.01-0.10 (converted to LINK)
- **Testnet**: May have free tier, but still needs LINK subscription

**Chainlink Data Feeds (available now):**
- **Free on testnet**: No LINK needed
- **Mainnet**: Usually free to read (funded by Chainlink)

### **Example Workflow (If Functions Were on Starknet)**

```typescript
// 1. Get LINK tokens
// Bridge from Ethereum or buy on Starknet

// 2. Create subscription
const subscriptionId = await createSubscription();
await linkToken.transfer(subscriptionAddress, linkAmount);

// 3. Link your contract to subscription
await linkConsumerToSubscription(contractAddress, subscriptionId);

// 4. Your contract can now call Functions
// LINK automatically deducted from subscription
await contract.requestData(); // Costs LINK from subscription
```

### **Alternatives (No LINK Needed)**

Since Chainlink Functions isn't on Starknet yet:

1. **Pragma Oracle** (Current):
   - ✅ Free on testnet
   - ✅ No LINK needed
   - ✅ Financial data only

2. **Manual Resolution** (Current):
   - ✅ Free
   - ✅ No LINK needed
   - ✅ Works for sports/politics

3. **RedStone**:
   - ✅ Free tier available
   - ✅ No LINK needed
   - ✅ Financial data

### **Summary**

- **LINK token**: Required for Chainlink Functions (subscription model)
- **LINK on Starknet**: Available via StarkGate bridge
- **Chainlink Functions**: Not on Starknet yet (only Data Feeds are)
- **Current solution**: Use Pragma (free) or Manual Resolution (free)
- **Future**: If Functions comes to Starknet, you'll need LINK subscriptions

---

## 14. **Other Oracle Options**

While your contract is currently set up for **Pragma Oracle**, here are other oracle solutions you could integrate:

### **Oracle Comparison for Starknet**

| Oracle | Starknet Support | Best For | Cost | Data Types | Payment |
|---------|----------------|----------|------|------------|---------|
| **Pragma** | ✅ Native | Price feeds, testnet | Free (testnet) | Financial, some custom | None (testnet) |
| **Chainlink Data Feeds** | ✅ Supported | Price oracles | Free (testnet) | Financial only | None (testnet) |
| **Chainlink Functions** | ❌ Not yet | Custom APIs, any data | LINK subscription | **Any** (via HTTP) | LINK token |
| **Pyth Network** | ⚠️ Check | Real-time prices | Paid | Financial only | Varies |
| **API3 dAPIs** | ⚠️ Check | First-party data | Varies | Financial, weather, etc. | Varies |
| **RedStone** | ✅ Supported | Multi-chain, fast | Free tier | Financial, RWAs | None (free tier) |
| **Manual/Admin** | ✅ Built-in | Politics, sports | Free | **Any** | None |

### **1. Chainlink Functions** (⚠️ Limited Starknet Support)

**⚠️ Important: Chainlink Functions is NOT fully supported on Starknet yet!**

**What IS available on Starknet:**
- ✅ **Chainlink Data Feeds** - Price oracles (BTC/USD, ETH/USD, etc.)
- ✅ **LINK token** - Available via StarkGate bridge
- ❌ **Chainlink Functions** - Custom API/compute NOT officially supported

**Why it's great (when available):**
- ✅ **Any data source** - Call any HTTP API
- ✅ **Sports/Politics** - Fetch from ESPN, election APIs, etc.
- ✅ **Subscription model** - Fund once, use multiple times

**How payment works:**
1. **Create a subscription account** (funded with LINK tokens)
2. **Link your contract** to the subscription
3. **Each Function call** deducts LINK from subscription
4. **Cost**: Usually a few cents per request (converted to LINK)

**Payment Details:**
- **Primary payment**: LINK token (required)
- **Payment Abstraction**: May allow paying in other tokens (ETH, stablecoins), but still converts to LINK
- **Testnet**: May have free tier, but still requires LINK subscription setup
- **Subscription model**: Fund once, multiple contracts can use it

**How it works (when supported):**
```javascript
// Chainlink Functions lets you write JavaScript
async function fetchData() {
  const response = await fetch('https://api.example.com/sports-score');
  const data = await response.json();
  return data.winner; // Returns to contract
}
```

**Integration (if/when available on Starknet):**
- Different interface than Pragma
- Would need to modify contract to use Chainlink Functions contract
- Need LINK token for subscription
- More flexible but more complex setup

**Current Status:**
- ✅ **Chainlink Data Feeds**: Available on Starknet (price oracles only)
- ❌ **Chainlink Functions**: Not officially supported on Starknet yet
- 🔄 **Future**: May come to Starknet, check Chainlink roadmap

**Alternative for Starknet:**
- Use **Chainlink Data Feeds** for price data (already available)
- Use **Manual Resolution** for sports/politics (current solution)
- Wait for **Chainlink Functions** support on Starknet

**Docs**: 
- Data Feeds: https://docs.chain.link/data-feeds/starknet
- Functions: https://docs.chain.link/chainlink-functions (EVM chains only)

### **2. RedStone Oracle**

**Why it's great:**
- ✅ **Starknet support** - Native integration
- ✅ **Fast updates** - Sub-second latency
- ✅ **Many feeds** - 1000+ assets
- ✅ **Free tier available**

**What it provides:**
- Price feeds (crypto, stocks, commodities)
- Real-world asset data
- Custom feeds possible

**Integration:**
- Similar to Pragma (price feeds)
- Different contract interface
- Good for financial markets

**Docs**: https://docs.redstone.finance/

### **3. API3 dAPIs**

**Why it's great:**
- ✅ **First-party oracles** - Data providers run nodes
- ✅ **More transparent** - Know the data source
- ✅ **Weather, sports** - Beyond just financial

**Starknet Support:**
- ⚠️ Check current status - may need verification
- Similar architecture to Chainlink

**Integration:**
- Would need custom contract integration
- Good for trusted data sources

**Docs**: https://docs.api3.org/

### **4. Pyth Network**

**Why it's great:**
- ✅ **Ultra-fast** - Sub-second updates
- ✅ **High-quality** - Aggregated from exchanges
- ✅ **Many feeds** - Crypto, stocks, commodities

**Starknet Support:**
- ⚠️ Check current status - originally Solana-focused
- May have Starknet support now

**Limitations:**
- Financial data only
- May be paid service

**Docs**: https://docs.pyth.network/

### **5. Manual Resolution (Current Built-in)**

**Why it's great:**
- ✅ **Already implemented** - `resolve_market_manual()`
- ✅ **Any data type** - Sports, politics, events
- ✅ **Free** - No oracle costs
- ✅ **Full control** - You decide resolution

**Best for:**
- Sports markets
- Political events
- Custom questions
- MVP/testing

**How to use:**
```typescript
// Admin resolves after checking real-world result
await contract.resolveMarketManual(marketId, true);  // YES wins
```

### **6. Custom Oracle Contract**

**Build your own:**
- Fetch data from APIs off-chain
- Submit to your own oracle contract
- Multi-sig or governance for security
- Full control over data sources

**Example flow:**
1. Off-chain service fetches data (sports API, election results)
2. Submits to your oracle contract
3. Your market contract reads from oracle contract
4. Resolves markets automatically

### **Recommendations by Use Case**

**Financial Markets (BTC price, etc.):**
- ✅ **Pragma** (current) - Simple, native
- ✅ **RedStone** - Fast, many feeds
- ✅ **Pyth** - If supported, very fast

**Sports/Politics:**
- ✅ **Manual Resolution** (current) - Simplest, works now
- ⚠️ **Chainlink Functions** - Not on Starknet yet, would need LINK
- ✅ **Custom Oracle** - Full control, no LINK needed

**Custom Data (weather, events, etc.):**
- ⚠️ **Chainlink Functions** - Not on Starknet yet (would need LINK)
- ✅ **API3** - If they support your data source
- ✅ **Manual Resolution** - For MVP, works now

**High-Frequency Trading:**
- ✅ **Pyth** - Sub-second updates
- ✅ **RedStone** - Fast push model

### **Migration Path**

If you want to switch from Pragma to another oracle:

1. **Update Oracle Interface:**
   ```cairo
   // Replace IPragmaOracle with new oracle interface
   trait IChainlinkOracle<TContractState> {
       fn get_latest_answer(self: @TContractState) -> u256;
   }
   ```

2. **Update Contract:**
   - Change oracle address in constructor
   - Update `resolve_market_with_oracle()` to use new interface
   - Adjust data format if needed

3. **Update Frontend:**
   - Change oracle contract address
   - Update method calls if interface differs

### **Hybrid Approach**

You can support **multiple oracles**:

```cairo
enum OracleType {
    Pragma,
    Chainlink,
    Manual
}

struct MarketInfo {
    // ... existing fields
    oracle_type: OracleType,
    oracle_address: ContractAddress,  // Can be different per market
}
```

This lets you:
- Use Pragma for financial markets
- Use Chainlink Functions for sports/politics
- Use manual for custom markets

---

## Summary

Your Oracle integration is **fully implemented** in the contract. The flow is:

1. **Create Market** → Store `oracle_pair_id` and `threshold_value`
2. **Users Bet** → Pool grows
3. **Resolution Date Reached** → Admin calls `resolveMarketWithOracle()`
4. **Contract Queries Oracle** → Gets current value for the pair
5. **Contract Compares** → `oracle_value >= threshold_value` → YES/NO
6. **Market Resolved** → Winners can claim payouts

The only missing piece is **configuring the Pragma Oracle contract address** during deployment!

**For politics/sports**: Use `resolve_market_manual()` - already built in!

**To add other oracles**: Modify the oracle interface and contract address - the architecture supports it!

---

## **CLEAR ANSWER: What Actually Works on Mainnet?**

### **The Truth - No BS**

**Standard Pragma Oracle (Your Contract):**
- ✅ **Mainnet**: Financial data (BTC/USD, ETH/USD, volatility) - **WORKS**
- ❌ **Mainnet**: Sports/politics - **DOES NOT EXIST**

**Pragma Optimistic Oracle (Different Product):**
- ✅ **Testnet**: Sports/politics - **WORKS** (permissionless)
- ❌ **Mainnet**: Sports/politics - **NOT PUBLIC** (private alpha only)

**Manual Resolution (Built-in):**
- ✅ **Mainnet**: Sports/politics - **WORKS NOW**
- ✅ **Testnet**: Sports/politics - **WORKS NOW**

### **What Should You Use?**

**For Sports/Politics on Mainnet:**
- ✅ **Manual Resolution** - ONLY option that works right now
- ❌ **Standard Pragma** - Does NOT support this
- ❌ **Optimistic Oracle** - Not publicly available on mainnet

**For Financial Markets on Mainnet:**
- ✅ **Standard Pragma Oracle** - Works great

**Bottom Line**: Standard Pragma = Financial ONLY. For sports/politics on mainnet, use Manual Resolution. It's your only real option.
