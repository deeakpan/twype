# Pragma Integration Updates - Detailed Explanation

## What Needs to Change and Why

### 1. **Add `pragma_lib` to Scarb.toml**

**Current State:**
```toml
[dependencies]
starknet = ">=2.3.0"
# No pragma_lib dependency
```

**What to Add:**
```toml
[dependencies]
starknet = ">=2.3.0"
pragma_lib = { git = "https://github.com/astraly-labs/pragma-lib" }
```

**Why:**
- `pragma_lib` is the **official Pragma library** for Starknet
- It provides the correct interfaces and types
- Our current custom interface might not match Pragma's actual API
- Using the official library ensures compatibility and future updates

**What It Gives Us:**
- `IPragmaABIDispatcher` - The actual Pragma oracle interface
- `DataType` enum - Proper way to specify asset types (SpotEntry, FutureEntry, etc.)
- `AggregationMode` enum - Median, Mean, ConversionRate
- `PragmaPricesResponse` - Full response with price, decimals, timestamp, source count

---

### 2. **Update Contract to Use `IPragmaABIDispatcher`**

**Current (Our Custom Interface):**
```cairo
// Our simplified interface
#[starknet::interface]
trait IPragmaOracle<TContractState> {
    fn get_value(self: @TContractState, pair_id: felt252) -> (u256, u64);
}

// Usage:
let dispatcher = IPragmaOracleDispatcher { contract_address: oracle };
let (oracle_value, _timestamp) = dispatcher.get_value(market.oracle_pair_id);
```

**Problems:**
- ❌ This interface doesn't exist in Pragma's actual contract
- ❌ We're guessing the function signature
- ❌ Missing important data (decimals, source count, etc.)

**Should Be (Using pragma_lib):**
```cairo
use pragma_lib::abi::{IPragmaABIDispatcher, IPragmaABIDispatcherTrait};
use pragma_lib::types::{AggregationMode, DataType, PragmaPricesResponse};

// Helper function (like Raize does)
fn get_asset_price_median(price_key: felt252) -> u128 {
    let oracle_address: ContractAddress = contract_address_const::<
        0x36031daa264c24520b11d93af622c848b2499b66b41d611bac95e13cfca131a  // Sepolia
    >();
    let oracle_dispatcher = IPragmaABIDispatcher { contract_address: oracle_address };
    let output: PragmaPricesResponse = oracle_dispatcher
        .get_data(DataType::SpotEntry(price_key), AggregationMode::Median(()));
    return output.price;
}

// Usage in resolve_market_with_oracle:
let price = get_asset_price_median(market.oracle_pair_id);  // oracle_pair_id is the asset ID
let result = if market.condition == 0 {
    price < market.threshold_value  // Less than
} else {
    price >= market.threshold_value  // Greater than or equal
};
```

**Key Differences:**
- ✅ Uses `DataType::SpotEntry(price_key)` - Proper Pragma format
- ✅ Gets `PragmaPricesResponse` - Full data structure
- ✅ Uses `AggregationMode::Median` - Can also use Mean or ConversionRate
- ✅ Returns `u128` price (already scaled by decimals)

---

### 3. **Add Condition Field (Less Than / Greater Than)**

**Current State:**
```cairo
struct MarketInfo {
    // ... other fields
    threshold_value: u256,  // Only supports >= comparison
}

// Resolution logic:
let result = oracle_value >= market.threshold_value;  // Always "greater than or equal"
```

**Problem:**
- ❌ Can only ask: "Will price be >= $100k?"
- ❌ Cannot ask: "Will price be < $100k?" or "Will price drop below $50k?"

**Should Be:**
```cairo
struct MarketInfo {
    // ... other fields
    threshold_value: u256,
    condition: u8,  // 0 = less than, 1 = greater than or equal
}

// Resolution logic:
let result = if market.condition == 0 {
    oracle_value < market.threshold_value  // Less than
} else {
    oracle_value >= market.threshold_value  // Greater than or equal
};
```

**Example Markets:**
```typescript
// "Will BTC drop below $40k?"
condition: 0,  // less than
thresholdValue: 40000 * 1e18

// "Will BTC hit $100k?"
condition: 1,  // greater than or equal
thresholdValue: 100000 * 1e18
```

**Why This Matters:**
- ✅ More flexible market creation
- ✅ Can create both bullish and bearish markets
- ✅ Matches how Raize does it

---

## Raize's Market Types Analysis

### 1. **Price Markets (CryptoMarket)**

**Yes, they have price markets!**

```cairo
pub struct CryptoMarket {
    // ... basic fields
    conditions: u8,        // 0 = less than, 1 = greater than
    price_key: felt252,    // Asset ID (e.g., BTC/USD = 18669995996566340)
    amount: u128           // Threshold price
}
```

**How It Works:**
- Uses Pragma oracle with `DataType::SpotEntry(price_key)`
- Automatically resolves based on price comparison
- Supports both "less than" and "greater than" conditions

**Example:**
```cairo
// Market: "Will BTC go below $40,000?"
create_crypto_market(
    name: "BTC Price Drop",
    conditions: 0,  // less than
    price_key: 18669995996566340,  // BTC/USD asset ID
    amount: 40000 * 1e6  // $40k (u128, so 6 decimals)
)
```

---

### 2. **Custom Markets (Market)**

**Yes, they have custom markets!**

```cairo
pub struct Market {
    name: ByteArray,
    description: ByteArray,
    outcomes: (Outcome, Outcome),  // YES/NO
    deadline: u64,
    // No oracle fields - manual resolution only
}
```

**How It Works:**
- Admin creates market with question
- Users bet on outcomes
- Admin manually settles with `settle_market(market_id, winning_outcome)`
- No oracle - fully manual

**Use Cases:**
- Politics: "Will Candidate X win?"
- Entertainment: "Will Movie Y win Oscar?"
- Custom questions: "Will it rain tomorrow?"
- Anything without an oracle feed

**Limitation:**
- ❌ Requires admin to manually resolve
- ❌ No automatic resolution
- ❌ No oracle integration

---

### 3. **Sports Markets (SportsMarket)**

```cairo
pub struct SportsMarket {
    // ... basic fields
    api_event_id: u64,  // External API event ID
    is_home: bool,
}
```

**How It Works:**
- Stores `api_event_id` for external sports API
- Off-chain script queries API using event ID
- Script calls `settle_sports_market()` with result
- Still requires off-chain service

**Limitation:**
- ❌ Requires trusted off-chain script
- ❌ Not fully on-chain
- ❌ Depends on external API

---

## Comparison: Our Approach vs Raize

### Price Markets

**Raize:**
- ✅ Uses `pragma_lib` (official)
- ✅ Supports both conditions (< and >=)
- ✅ Uses `DataType::SpotEntry`
- ✅ Gets full `PragmaPricesResponse`

**Ours:**
- ❌ Custom interface (might not work)
- ❌ Only supports >= condition
- ❌ Simplified response

**Verdict:** We should update to match Raize's approach!

---

### Custom Markets

**Raize:**
- ✅ `Market` struct for custom markets
- ✅ Manual resolution by admin
- ❌ No optimistic oracle
- ❌ No UMA-like system

**Ours:**
- ✅ `resolve_market_manual()` - Same as Raize
- ✅ **UMA Oracle** - They don't have this!
- ✅ More flexible oracle system

**Verdict:** We're better! We have UMA oracle for non-financial data.

---

### Sports Markets

**Raize:**
- Uses `api_event_id` + off-chain script
- Requires external API service

**Ours:**
- UMA Oracle (on-chain, decentralized)
- Manual resolution fallback

**Verdict:** Our UMA approach is more decentralized!

---

## Summary

### What Raize Has:
1. ✅ **Price Markets** - Using proper `pragma_lib` with conditions
2. ✅ **Custom Markets** - Manual resolution (same as our manual)
3. ✅ **Sports Markets** - API-based (less decentralized than our UMA)

### What We Have:
1. ✅ **Price Markets** - But need to update to use `pragma_lib` properly
2. ✅ **Custom Markets** - Manual resolution (same)
3. ✅ **UMA Oracle** - They don't have this! More decentralized for sports/politics

### What We Should Do:
1. **Add `pragma_lib` dependency** - Use official library
2. **Update to `IPragmaABIDispatcher`** - Proper Pragma API
3. **Add condition field** - Support both < and >= comparisons
4. **Keep our UMA Oracle** - It's better than their API approach!

---

## Code Changes Needed

### Step 1: Update Scarb.toml
```toml
[dependencies]
starknet = ">=2.3.0"
pragma_lib = { git = "https://github.com/astraly-labs/pragma-lib" }
```

### Step 2: Update market.cairo
```cairo
use pragma_lib::abi::{IPragmaABIDispatcher, IPragmaABIDispatcherTrait};
use pragma_lib::types::{AggregationMode, DataType, PragmaPricesResponse};

struct MarketInfo {
    // ... existing fields
    oracle_pair_id: felt252,  // Asset ID (e.g., 18669995996566340 for BTC/USD)
    threshold_value: u256,
    condition: u8,  // NEW: 0 = less than, 1 = greater than or equal
}

fn get_asset_price_median(price_key: felt252) -> u128 {
    let oracle_address = self.pragma_oracle.read();
    let dispatcher = IPragmaABIDispatcher { contract_address: oracle_address };
    let output: PragmaPricesResponse = dispatcher
        .get_data(DataType::SpotEntry(price_key), AggregationMode::Median(()));
    return output.price;
}

fn resolve_market_with_oracle(ref self: ContractState, market_id: u32) {
    // ... checks ...
    let price = get_asset_price_median(market.oracle_pair_id);
    let result = if market.condition == 0 {
        price < market.threshold_value  // Less than
    } else {
        price >= market.threshold_value  // Greater than or equal
    };
    // ... set result ...
}
```

---

## Final Answer to Your Questions

### 1. "Explain the three updates"
- **pragma_lib**: Add official Pragma library dependency
- **IPragmaABIDispatcher**: Replace our custom interface with Pragma's real API
- **condition field**: Add support for both "less than" and "greater than" comparisons

### 2. "STRK is not an issue"
✅ Agreed! STRK is fine. Raize uses USDC, we use STRK - both work.

### 3. "Do they have price markets?"
✅ **Yes!** They have `CryptoMarket` struct specifically for price markets using Pragma oracle.

### 4. "What about custom markets?"
✅ **Yes!** They have `Market` struct for custom markets with manual resolution (same as our `resolve_market_manual()`).

**Key Difference:**
- They have 3 separate structs (Market, CryptoMarket, SportsMarket)
- We have 1 unified struct with oracle type determined by fields
- **We have UMA Oracle** - they don't! This is our advantage.
