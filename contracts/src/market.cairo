use starknet::ContractAddress;

// ERC20 Interface for STRK token
#[starknet::interface]
trait IERC20<TContractState> {
    fn transfer_from(
        self: @TContractState,
        sender: ContractAddress,
        recipient: ContractAddress,
        amount: u256
    ) -> bool;
    
    fn transfer(
        self: @TContractState,
        recipient: ContractAddress,
        amount: u256
    ) -> bool;
}

// Pragma Oracle Interface
// Note: In production, import Pragma's actual interface
#[starknet::interface]
trait IPragmaOracle<TContractState> {
    fn get_value(self: @TContractState, pair_id: felt252) -> (u256, u64);
}

#[starknet::interface]
trait IMarket<TContractState> {
    fn create_market(
        ref self: TContractState,
        question: felt252,
        description: felt252,
        resolution_date: u64,
        creator: ContractAddress,
        oracle_pair_id: felt252,  // Pragma pair ID (e.g., "BTC/USD")
        threshold_value: u256     // Threshold for YES (e.g., 100000 for 100k USD)
    ) -> u32;
    
    fn place_bet(
        ref self: TContractState,
        market_id: u32,
        side: bool,
        amount: u256
    );
    
    fn resolve_market_with_oracle(
        ref self: TContractState,
        market_id: u32
    );
    
    fn resolve_market_manual(
        ref self: TContractState,
        market_id: u32,
        result: bool
    );
    
    fn claim_payout(
        ref self: TContractState,
        market_id: u32
    ) -> u256;
    
    fn get_market_info(
        self: @TContractState,
        market_id: u32
    ) -> (felt252, felt252, u64, bool, u256, u256, u256);
    
    fn get_user_bet(
        self: @TContractState,
        market_id: u32,
        user: ContractAddress
    ) -> (u256, bool);
}

#[starknet::contract]
mod Market {
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp, get_contract_address};
    use starknet::storage::{
        Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess
    };
    use super::{IPragmaOracleDispatcher, IPragmaOracleDispatcherTrait, IERC20Dispatcher, IERC20DispatcherTrait};
    
    #[storage]
    struct Storage {
        markets: Map<u32, MarketInfo>,
        market_count: u32,
        user_bets: Map<(u32, ContractAddress), BetInfo>,
        platform_fee_bps: u16,
        admin: ContractAddress,
        strk_token: ContractAddress,
        pragma_oracle: ContractAddress,  // Pragma oracle contract address
    }
    
    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        MarketCreated: MarketCreated,
        BetPlaced: BetPlaced,
        MarketResolved: MarketResolved,
        PayoutClaimed: PayoutClaimed,
    }
    
    #[derive(Drop, starknet::Event)]
    struct MarketCreated {
        market_id: u32,
        question: felt252,
        creator: ContractAddress,
        resolution_date: u64,
    }
    
    #[derive(Drop, starknet::Event)]
    struct BetPlaced {
        market_id: u32,
        user: ContractAddress,
        side: bool,
        amount: u256,
    }
    
    #[derive(Drop, starknet::Event)]
    struct MarketResolved {
        market_id: u32,
        result: bool,
    }
    
    #[derive(Drop, starknet::Event)]
    struct PayoutClaimed {
        market_id: u32,
        user: ContractAddress,
        amount: u256,
    }
    
    #[derive(Drop, Serde, starknet::Store)]
    struct MarketInfo {
        question: felt252,
        description: felt252,
        resolution_date: u64,
        resolved: bool,
        result: bool,
        total_yes: u256,
        total_no: u256,
        total_pool: u256,
        oracle_pair_id: felt252,  // Pragma pair ID (e.g., "BTC/USD")
        threshold_value: u256,     // Threshold for YES (e.g., 100000 for 100k USD)
    }
    
    #[derive(Drop, Serde, starknet::Store)]
    struct BetInfo {
        amount: u256,
        side: bool,
        claimed: bool,
    }
    
    #[constructor]
    fn constructor(
        ref self: ContractState,
        admin: ContractAddress,
        strk_token: ContractAddress,
        pragma_oracle: ContractAddress,
        platform_fee_bps: u16
    ) {
        self.admin.write(admin);
        self.strk_token.write(strk_token);
        self.pragma_oracle.write(pragma_oracle);
        self.platform_fee_bps.write(platform_fee_bps);
        self.market_count.write(0);
    }
    
    #[abi(embed_v0)]
    impl MarketImpl of super::IMarket<ContractState> {
        fn create_market(
            ref self: ContractState,
            question: felt252,
            description: felt252,
            resolution_date: u64,
            creator: ContractAddress,
            oracle_pair_id: felt252,
            threshold_value: u256
        ) -> u32 {
            let current_time = get_block_timestamp();
            assert(resolution_date > current_time, 'Resolution date must be future');
            
            let market_id = self.market_count.read();
            self.market_count.write(market_id + 1);
            
            let market_info = MarketInfo {
                question,
                description,
                resolution_date,
                resolved: false,
                result: false,
                total_yes: 0,
                total_no: 0,
                total_pool: 0,
                oracle_pair_id,
                threshold_value,
            };
            
            self.markets.entry(market_id).write(market_info);
            
            self.emit(MarketCreated {
                market_id,
                question,
                creator,
                resolution_date,
            });
            
            market_id
        }
        
        fn place_bet(
            ref self: ContractState,
            market_id: u32,
            side: bool,
            amount: u256
        ) {
            assert(amount > 0, 'Amount must be greater than 0');
            
            let caller = get_caller_address();
            let mut market = self.markets.entry(market_id).read();
            
            assert(!market.resolved, 'Market already resolved');
            assert(get_block_timestamp() < market.resolution_date, 'Market resolution date passed');
            
            // Transfer STRK tokens from user to contract
            // User must have approved this contract to spend their STRK
            let strk_token = self.strk_token.read();
            let token_dispatcher = IERC20Dispatcher { contract_address: strk_token };
            let contract_address = get_contract_address();
            
            let transfer_success = token_dispatcher.transfer_from(caller, contract_address, amount);
            assert(transfer_success, 'Transfer failed');
            
            if side {
                market.total_yes += amount;
            } else {
                market.total_no += amount;
            }
            market.total_pool += amount;
            
            // Get existing bet or create new one
            let mut user_bet = self.user_bets.entry((market_id, caller)).read();
            user_bet.amount += amount;
            user_bet.side = side;
            user_bet.claimed = false;
            
            self.user_bets.entry((market_id, caller)).write(user_bet);
            self.markets.entry(market_id).write(market);
            
            self.emit(BetPlaced {
                market_id,
                user: caller,
                side,
                amount,
            });
        }
        
        fn resolve_market_with_oracle(
            ref self: ContractState,
            market_id: u32
        ) {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin can resolve');
            
            let mut market = self.markets.entry(market_id).read();
            assert(!market.resolved, 'Market already resolved');
            assert(get_block_timestamp() >= market.resolution_date, 'Resolution date not reached');
            
            // Query Pragma oracle
            let oracle = self.pragma_oracle.read();
            let dispatcher = IPragmaOracleDispatcher { contract_address: oracle };
            let (oracle_value, _timestamp) = dispatcher.get_value(market.oracle_pair_id);
            
            // Compare oracle value with threshold
            // YES if oracle_value >= threshold_value, NO otherwise
            let result = oracle_value >= market.threshold_value;
            
            market.resolved = true;
            market.result = result;
            
            self.markets.entry(market_id).write(market);
            
            self.emit(MarketResolved {
                market_id,
                result,
            });
        }
        
        fn resolve_market_manual(
            ref self: ContractState,
            market_id: u32,
            result: bool
        ) {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin can resolve');
            
            let mut market = self.markets.entry(market_id).read();
            assert(!market.resolved, 'Market already resolved');
            assert(get_block_timestamp() >= market.resolution_date, 'Resolution date not reached');
            
            market.resolved = true;
            market.result = result;
            
            self.markets.entry(market_id).write(market);
            
            self.emit(MarketResolved {
                market_id,
                result,
            });
        }
        
        fn claim_payout(
            ref self: ContractState,
            market_id: u32
        ) -> u256 {
            let caller = get_caller_address();
            let market = self.markets.entry(market_id).read();
            
            assert(market.resolved, 'Market not resolved yet');
            
            let mut user_bet = self.user_bets.entry((market_id, caller)).read();
            assert(user_bet.amount > 0, 'No bet found');
            assert(!user_bet.claimed, 'Payout already claimed');
            assert(user_bet.side == market.result, 'You bet on losing side');
            
            let winning_total = if market.result {
                market.total_yes
            } else {
                market.total_no
            };
            
            assert(winning_total != 0, 'No winning bets');
            
            let user_share = (user_bet.amount * market.total_pool) / winning_total;
            let fee_bps = self.platform_fee_bps.read();
            let fee = (user_share * fee_bps.into()) / 10000;
            let payout = user_share - fee;
            
            user_bet.claimed = true;
            self.user_bets.entry((market_id, caller)).write(user_bet);
            
            // Transfer STRK tokens from contract to user
            let strk_token = self.strk_token.read();
            let token_dispatcher = IERC20Dispatcher { contract_address: strk_token };
            
            let transfer_success = token_dispatcher.transfer(caller, payout);
            assert(transfer_success, 'Payout failed');
            
            self.emit(PayoutClaimed {
                market_id,
                user: caller,
                amount: payout,
            });
            
            payout
        }
        
        fn get_market_info(
            self: @ContractState,
            market_id: u32
        ) -> (felt252, felt252, u64, bool, u256, u256, u256) {
            let market = self.markets.entry(market_id).read();
            (
                market.question,
                market.description,
                market.resolution_date,
                market.resolved,
                market.total_yes,
                market.total_no,
                market.total_pool
            )
        }
        
        fn get_user_bet(
            self: @ContractState,
            market_id: u32,
            user: ContractAddress
        ) -> (u256, bool) {
            let bet = self.user_bets.entry((market_id, user)).read();
            (bet.amount, bet.side)
        }
    }
}