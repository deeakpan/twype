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


// Chainlink Aggregator Interface
// Note: Chainlink returns signed integers, but we'll use u256 and assume prices are positive
#[starknet::interface]
trait IChainlinkAggregator<TContractState> {
    fn latest_round_data(
        self: @TContractState
    ) -> (u256, u256, u256, u256, u256);
    
    fn latest_answer(
        self: @TContractState
    ) -> u256;
}

// UMA Oracle Interface
#[starknet::interface]
trait IUMAOracle<TContractState> {
    fn get_proposal(
        self: @TContractState,
        question_id: felt252
    ) -> (bool, ContractAddress, u256, u64, u8);
    
    fn is_finalized(
        self: @TContractState,
        question_id: felt252
    ) -> bool;
}

#[starknet::interface]
trait IMarket<TContractState> {
    fn create_market(
        ref self: TContractState,
        question: felt252,
        description: felt252,
        resolution_date: u64,
        creator: ContractAddress,
        chainlink_feed_address: ContractAddress,  // Chainlink feed address (e.g., BTC/USD feed)
        threshold_value: u256,     // Threshold for comparison (e.g., 100000 * 1e8 for $100k, Chainlink uses 8 decimals)
        condition: u8              // 0 = less than, 1 = greater than or equal
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
    
    fn resolve_market_with_uma(
        ref self: TContractState,
        market_id: u32,
        question_id: felt252
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
    use super::{
        IUMAOracleDispatcher, IUMAOracleDispatcherTrait,
        IERC20Dispatcher, IERC20DispatcherTrait,
        IChainlinkAggregatorDispatcher, IChainlinkAggregatorDispatcherTrait
    };
    
    #[storage]
    struct Storage {
        markets: Map<u32, MarketInfo>,
        market_count: u32,
        user_bets: Map<(u32, ContractAddress), BetInfo>,
        platform_fee_bps: u16,
        admin: ContractAddress,
        strk_token: ContractAddress,
        pragma_oracle: ContractAddress,  // Pragma oracle contract address
        uma_oracle: ContractAddress,    // UMA oracle contract address
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
        chainlink_feed_address: ContractAddress,  // Chainlink feed address
        threshold_value: u256,     // Threshold for comparison (e.g., 100000 * 1e8 for $100k, Chainlink uses 8 decimals)
        condition: u8,             // 0 = less than, 1 = greater than or equal
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
        uma_oracle: ContractAddress,
        platform_fee_bps: u16
    ) {
        self.admin.write(admin);
        self.strk_token.write(strk_token);
        self.pragma_oracle.write(pragma_oracle);
        self.uma_oracle.write(uma_oracle);
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
            chainlink_feed_address: ContractAddress,
            threshold_value: u256,
            condition: u8
        ) -> u32 {
            let current_time = get_block_timestamp();
            assert(resolution_date > current_time, 'Resolution date must be future');
            assert(condition <= 1_u8, 'Invalid condition');
            
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
                chainlink_feed_address,
                threshold_value,
                condition,
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
            
            // Query Chainlink Aggregator for latest price
            let feed_address = market.chainlink_feed_address;
            let aggregator_dispatcher = IChainlinkAggregatorDispatcher { contract_address: feed_address };
            
            // Get latest answer (price) from Chainlink feed
            // Chainlink prices are returned with 8 decimals (e.g., BTC/USD = 50000 * 10^8)
            let price = aggregator_dispatcher.latest_answer();
            
            // Compare price with threshold based on condition
            // condition: 0 = less than, 1 = greater than or equal
            let result = if market.condition == 0 {
                // Less than: YES if price < threshold
                price < market.threshold_value
            } else {
                // Greater than or equal: YES if price >= threshold
                price >= market.threshold_value
            };
            
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
        
        fn resolve_market_with_uma(
            ref self: ContractState,
            market_id: u32,
            question_id: felt252
        ) {
            let caller = get_caller_address();
            assert(caller == self.admin.read(), 'Only admin can resolve');
            
            let mut market = self.markets.entry(market_id).read();
            assert(!market.resolved, 'Market already resolved');
            assert(get_block_timestamp() >= market.resolution_date, 'Resolution date not reached');
            
            // Query UMA oracle
            let uma_oracle = self.uma_oracle.read();
            let dispatcher = IUMAOracleDispatcher { contract_address: uma_oracle };
            
            // Check if proposal is finalized
            let is_finalized = dispatcher.is_finalized(question_id);
            assert(is_finalized, 'UMA proposal not finalized yet');
            
            // Get proposal answer
            let (answer, _proposer, _bond, _created_at, _status) = dispatcher.get_proposal(question_id);
            
            // Use the answer from UMA oracle
            market.resolved = true;
            market.result = answer;
            
            self.markets.entry(market_id).write(market);
            
            self.emit(MarketResolved {
                market_id,
                result: answer,
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