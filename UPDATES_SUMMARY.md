# Pragma Integration Updates - Summary

## ✅ What We've Updated

### 1. **Added `pragma_lib` to Scarb.toml**
```toml
pragma_lib = { git = "https://github.com/astraly-labs/pragma-lib" }
```

### 2. **Updated Contract to Use `IPragmaABIDispatcher`**
- Removed custom `IPragmaOracle` interface
- Added proper imports:
  ```cairo
  use pragma_lib::abi::{IPragmaABIDispatcher, IPragmaABIDispatcherTrait};
  use pragma_lib::types::{AggregationMode, DataType, PragmaPricesResponse};
  ```

### 3. **Added Condition Field**
- Added `condition: u8` to `MarketInfo` struct
- `0` = less than threshold
- `1` = greater than or equal to threshold
- Updated `create_market` to accept condition parameter
- Updated resolution logic to support both conditions

### 4. **Updated Resolution Logic**
```cairo
fn resolve_market_with_oracle(ref self: ContractState, market_id: u32) {
    // Get price using proper Pragma API
    let price = get_asset_price_median(ref self, market.oracle_pair_id);
    
    // Compare based on condition
    let result = if market.condition == 0 {
        price < market.threshold_value  // Less than
    } else {
        price >= market.threshold_value  // Greater than or equal
    };
    // ...
}
```

### 5. **Added Helper Function**
```cairo
fn get_asset_price_median(
    ref self: ContractState,
    price_key: felt252
) -> u256 {
    let oracle_address = self.pragma_oracle.read();
    let oracle_dispatcher = IPragmaABIDispatcher { contract_address: oracle_address };
    let output: PragmaPricesResponse = oracle_dispatcher
        .get_data(DataType::SpotEntry(price_key), AggregationMode::Median(()));
    output.price.into()  // Convert u128 to u256
}
```

### 6. **Updated Frontend**
- Updated `createMarket()` to accept `condition` parameter (defaults to 1)
- Updated ABI to include condition field

## ⚠️ Known Issue

**Dependency Conflict:**
- `pragma_lib` depends on OpenZeppelin from registry
- There's a version mismatch causing compilation errors
- This is a known issue with `pragma_lib` dependencies

**Workaround Options:**
1. Wait for `pragma_lib` to update dependencies
2. Use a specific commit/tag of `pragma_lib` that works
3. Manually define the Pragma interface (less ideal but works)

## 📝 Next Steps

1. **Resolve dependency conflict** - Try different versions of pragma_lib
2. **Test compilation** - Once dependencies are resolved
3. **Update deployment scripts** - Add condition parameter
4. **Update frontend** - Add UI for condition selection

## 🎯 What This Enables

### Before:
- ❌ Only "Will price be >= $100k?" markets
- ❌ Custom interface (might not work)
- ❌ Simplified response

### After:
- ✅ "Will price be >= $100k?" (condition = 1)
- ✅ "Will price drop below $50k?" (condition = 0)
- ✅ Proper Pragma API integration
- ✅ Full response with decimals, timestamp, sources

## 📚 Key Changes

### Market Creation:
```typescript
// Bullish market: "Will BTC hit $100k?"
await contract.createMarket(
  "Will BTC hit $100k?",
  "BTC price prediction",
  resolutionDate,
  btcAssetId,  // 18669995996566340
  BigInt(100000 * 1e18),  // $100k threshold
  1  // Greater than or equal
);

// Bearish market: "Will BTC drop below $40k?"
await contract.createMarket(
  "Will BTC drop below $40k?",
  "BTC price drop prediction",
  resolutionDate,
  btcAssetId,
  BigInt(40000 * 1e18),  // $40k threshold
  0  // Less than
);
```

### Resolution:
- Automatically queries Pragma oracle
- Compares price with threshold based on condition
- Sets market result accordingly
