# Raize.club Prediction Market - Architecture Analysis

## Overview

[Raize.club](https://github.com/raize-club/raize_contracts) is a prediction market on Starknet. This document compares their implementation with ours.

## Key Architectural Differences

### 1. **Market Types - Separate Structs**

**Raize Approach:**
- `Market` - General markets (manual resolution)
- `CryptoMarket` - Crypto price markets (Pragma oracle)
- `SportsMarket` - Sports markets (API-based resolution)

**Our Approach:**
- Single `MarketInfo` struct with `oracle_pair_id` and `threshold_value`
- Resolution method determined by oracle type (Pragma/UMA/Manual)

**Raize Advantage:**
- ✅ Type safety - each market type has specific fields
- ✅ Clear separation of concerns
- ✅ Easier to add market-specific logic

**Our Advantage:**
- ✅ Simpler codebase
- ✅ More flexible - can add new oracle types without new structs
- ✅ Less code duplication

### 2. **Pricing Model**

**Raize Approach:**
```cairo
// Simple proportional shares
winnings = user_shares * total_pool / total_winning_shares
```

**Our Approach:**
```cairo
// Parimutuel pool
user_share = (user_bet / winning_side_total) * total_pool
```

**Both are similar!** Raize uses "shares" terminology, we use "bets". Same math.

### 3. **Pragma Oracle Integration**

**Raize Implementation:**
```cairo
use pragma_lib::abi::{IPragmaABIDispatcher, IPragmaABIDispatcherTrait};
use pragma_lib::types::{AggregationMode, DataType, PragmaPricesResponse};

fn get_asset_price_median(asset: DataType) -> u128 {
    let oracle_address: ContractAddress = contract_address_const::<
        0x2a85bd616f912537c50a49a4076db02c00b29b2cdc8a197ce92ed1837fa875b
    >();
    let oracle_dispatcher = IPragmaABIDispatcher { contract_address: oracle_address };
    let output: PragmaPricesResponse = oracle_dispatcher
        .get_data(asset, AggregationMode::Median(()));
    return output.price;
}

// Usage in settle_crypto_market:
let price = get_asset_price_median(DataType::SpotEntry(crypto_market.price_key));
```

**Our Implementation:**
```cairo
// Simplified interface
trait IPragmaOracle<TContractState> {
    fn get_value(self: @TContractState, pair_id: felt252) -> (u256, u64);
}

// Usage:
let (oracle_value, _timestamp) = dispatcher.get_value(market.oracle_pair_id);
```

**Key Differences:**
- ✅ **Raize uses `pragma_lib` dependency** - Full Pragma API access
- ✅ **Raize uses `DataType::SpotEntry(price_key)`** - Proper Pragma API
- ✅ **Raize gets `PragmaPricesResponse`** - More data (decimals, timestamp, sources)
- ❌ **Our interface is simplified** - Easier but less flexible

**We should update our contract to use `pragma_lib`!**

### 4. **Crypto Market Resolution**

**Raize:**
```cairo
fn settle_crypto_market(ref self: ContractState, market_id: u256) {
    let price = get_asset_price_median(DataType::SpotEntry(crypto_market.price_key));
    if crypto_market.conditions == 0 {  // less than
        if price < crypto_market.amount {
            // outcome1 wins
        }
    } else {  // greater than
        if price > crypto_market.amount {
            // outcome1 wins
        }
    }
}
```

**Our Approach:**
```cairo
fn resolve_market_with_oracle(ref self: ContractState, market_id: u32) {
    let (oracle_value, _timestamp) = dispatcher.get_value(market.oracle_pair_id);
    let result = oracle_value >= market.threshold_value;  // YES if >= threshold
}
```

**Raize Advantage:**
- ✅ Supports both "less than" and "greater than" conditions
- ✅ Uses proper Pragma API with `DataType::SpotEntry`

### 5. **Token Usage**

**Raize:**
- Uses **USDC** (Ethereum bridged)
- Address: `0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7`

**Our Approach:**
- Uses **STRK** (native Starknet token)
- Address: `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d` (testnet)

**Trade-offs:**
- USDC: More stable, familiar to users, requires bridging
- STRK: Native, no bridging, but less liquid

### 6. **Admin System**

**Raize:**
```cairo
admins: LegacyMap::<u128, ContractAddress>,
num_admins: u128,
// Loop through admins to check permissions
```

**Our Approach:**
```cairo
admin: ContractAddress,  // Single admin
```

**Raize Advantage:**
- ✅ Multiple admins
- ✅ More decentralized

### 7. **Sports Market Resolution**

**Raize:**
```cairo
pub struct SportsMarket {
    api_event_id: u64,  // External API event ID
    is_home: bool,
}
// Off-chain script queries API and settles market
```

**Our Approach:**
- UMA Oracle for sports/politics
- Manual resolution fallback

**Raize Approach:**
- Uses external API IDs
- Off-chain script handles resolution
- Simpler but requires trusted off-chain service

## What We Should Adopt from Raize

### 1. **Use `pragma_lib` Dependency**

**Current (Simplified):**
```cairo
trait IPragmaOracle<TContractState> {
    fn get_value(self: @TContractState, pair_id: felt252) -> (u256, u64);
}
```

**Should Be:**
```cairo
use pragma_lib::abi::{IPragmaABIDispatcher, IPragmaABIDispatcherTrait};
use pragma_lib::types::{AggregationMode, DataType, PragmaPricesResponse};

fn get_price(price_key: felt252) -> u128 {
    let oracle_address = contract_address_const::<
        0x36031daa264c24520b11d93af622c848b2499b66b41d611bac95e13cfca131a
    >();
    let dispatcher = IPragmaABIDispatcher { contract_address: oracle_address };
    let output: PragmaPricesResponse = dispatcher
        .get_data(DataType::SpotEntry(price_key), AggregationMode::Median(()));
    return output.price;
}
```

### 2. **Support Both Conditions (Less Than / Greater Than)**

Add a `condition` field to market:
```cairo
struct MarketInfo {
    // ... existing fields
    condition: u8,  // 0 = less than, 1 = greater than or equal
}
```

### 3. **Multiple Admins**

Consider adding admin list for better decentralization.

### 4. **Better Market Type Separation**

Consider separate structs for different market types for type safety.

## What We Do Better

### 1. **UMA Oracle**
- Raize doesn't have optimistic oracle
- We have custom UMA-like oracle for non-financial data

### 2. **Unified Market Structure**
- Our single struct is more flexible
- Easier to add new oracle types

### 3. **STRK Native Token**
- No bridging required
- Better for Starknet-native users

## Recommendations

### Immediate Updates Needed:

1. **Add `pragma_lib` to Scarb.toml:**
   ```toml
   pragma_lib = { git = "https://github.com/astraly-labs/pragma-lib" }
   ```

2. **Update Pragma Oracle Interface:**
   - Use `IPragmaABIDispatcher` instead of custom interface
   - Use `DataType::SpotEntry(price_key)` format
   - Get full `PragmaPricesResponse` with decimals, timestamp

3. **Add Condition Field:**
   - Support both "less than" and "greater than" thresholds

4. **Consider Multiple Admins:**
   - Add admin list for better decentralization

## Code Examples from Raize

### How They Use Pragma:
```cairo
// In Scarb.toml
pragma_lib = { git = "https://github.com/astraly-labs/pragma-lib" }

// In contract
use pragma_lib::abi::{IPragmaABIDispatcher, IPragmaABIDispatcherTrait};
use pragma_lib::types::{AggregationMode, DataType, PragmaPricesResponse};

// Get price
let price = get_asset_price_median(DataType::SpotEntry(price_key));
// price_key is the asset ID (felt252), e.g., 18669995996566340 for BTC/USD
```

### Market Creation:
```cairo
fn create_crypto_market(
    name: ByteArray,
    description: ByteArray,
    outcomes: (felt252, felt252),  // "YES", "NO"
    category: felt252,
    image: ByteArray,
    deadline: u64,
    conditions: u8,  // 0 = less than, 1 = greater than
    price_key: felt252,  // Asset ID from Pragma
    amount: u128,  // Threshold price
)
```

## Summary

**Raize's Strengths:**
- ✅ Proper Pragma integration using `pragma_lib`
- ✅ Type-safe market structures
- ✅ Multiple admins
- ✅ Supports both conditions

**Our Strengths:**
- ✅ UMA Oracle for non-financial data
- ✅ More flexible unified structure
- ✅ STRK native token
- ✅ Better oracle abstraction

**Next Steps:**
1. Update our contract to use `pragma_lib` dependency
2. Add condition field for less than/greater than
3. Consider multiple admins
4. Keep our UMA oracle (they don't have this!)
