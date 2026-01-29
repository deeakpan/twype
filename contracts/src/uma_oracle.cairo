use starknet::ContractAddress;
use starknet::get_caller_address;
use starknet::get_block_timestamp;
use starknet::get_contract_address;
use starknet::contract_address_const;
use starknet::storage::{
    StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess
};

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

// UMA-like Optimistic Oracle Interface
#[starknet::interface]
trait IUMAOracle<TContractState> {
    fn propose_answer(
        ref self: TContractState,
        question_id: felt252,
        answer: bool,
        bond: u256
    );
    
    fn challenge_proposal(
        ref self: TContractState,
        question_id: felt252,
        bond: u256
    );
    
    fn finalize_proposal(
        ref self: TContractState,
        question_id: felt252
    );
    
    fn get_proposal(
        self: @TContractState,
        question_id: felt252
    ) -> (bool, ContractAddress, u256, u64, u8);
    
    fn is_finalized(
        self: @TContractState,
        question_id: felt252
    ) -> bool;
}

#[starknet::contract]
mod UMAOracle {
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp, get_contract_address, contract_address_const};
    use starknet::storage::{
        Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess
    };
    use super::{IERC20Dispatcher, IERC20DispatcherTrait};
    
    #[storage]
    struct Storage {
        proposals: Map<felt252, Proposal>,
        challengers: Map<(felt252, ContractAddress), Challenger>,
        admin: ContractAddress,
        strk_token: ContractAddress,
        challenge_period: u64,
        min_bond: u256,
    }
    
    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        ProposalCreated: ProposalCreated,
        ProposalChallenged: ProposalChallenged,
        ProposalFinalized: ProposalFinalized,
        BondSlashed: BondSlashed,
    }
    
    #[derive(Drop, starknet::Event)]
    struct ProposalCreated {
        question_id: felt252,
        proposer: ContractAddress,
        answer: bool,
        bond: u256,
    }
    
    #[derive(Drop, starknet::Event)]
    struct ProposalChallenged {
        question_id: felt252,
        challenger: ContractAddress,
        bond: u256,
    }
    
    #[derive(Drop, starknet::Event)]
    struct ProposalFinalized {
        question_id: felt252,
        answer: bool,
        winner: ContractAddress,
    }
    
    #[derive(Drop, starknet::Event)]
    struct BondSlashed {
        question_id: felt252,
        slashed_address: ContractAddress,
        amount: u256,
    }
    
    // Proposal status state machine:
    // 0 = Pending (initial state after creation)
    // 1 = Accepted (no challenges within period - can be finalized)
    // 2 = Challenged (someone challenged the proposal)
    // 3 = Finalized (bonds distributed, proposal complete)
    //
    // Note: When reading from Map storage, non-existent entries return default values (all zeros).
    // Since status=0 is also "Pending", we use proposer address to check existence:
    // - proposer.is_zero() = proposal doesn't exist
    // - !proposer.is_zero() = proposal exists
    #[derive(Drop, Serde, starknet::Store)]
    struct Proposal {
        answer: bool,
        proposer: ContractAddress,  // Used to check existence: zero = doesn't exist
        bond: u256,
        created_at: u64,
        status: u8, // 0 = Pending, 1 = Accepted, 2 = Challenged, 3 = Finalized
        challenge_count: u32,
    }
    
    #[derive(Drop, Serde, starknet::Store)]
    struct Challenger {
        bond: u256,
        challenged_at: u64,
    }
    
    #[constructor]
    fn constructor(
        ref self: ContractState,
        admin: ContractAddress,
        strk_token: ContractAddress,
        challenge_period: u64,
        min_bond: u256
    ) {
        self.admin.write(admin);
        self.strk_token.write(strk_token);
        self.challenge_period.write(challenge_period);
        self.min_bond.write(min_bond);
    }
    
    #[abi(embed_v0)]
    impl UMAOracleImpl of super::IUMAOracle<ContractState> {
        fn propose_answer(
            ref self: ContractState,
            question_id: felt252,
            answer: bool,
            bond: u256
        ) {
            let caller = get_caller_address();
            let min_bond = self.min_bond.read();
            assert(bond >= min_bond, 'Bond too low');
            
            // Check if proposal already exists
            // Note: Cairo Map returns default values (all zeros) for non-existent entries.
            // Since status=0 is also "Pending", we can't use status to check existence.
            // Instead, we check if proposer is zero (non-existent) or status is Finalized (3).
            // A zero address can never be a valid proposer (get_caller_address() never returns zero).
            let existing_proposal = self.proposals.entry(question_id).read();
            let zero_address: ContractAddress = contract_address_const::<0>();
            let proposer_is_zero = existing_proposal.proposer == zero_address;
            assert(proposer_is_zero || existing_proposal.status == 3, 'Proposal already exists');
            
            // Transfer bond from proposer to contract
            let strk_token = self.strk_token.read();
            let token_dispatcher = IERC20Dispatcher { contract_address: strk_token };
            let contract_address = get_contract_address();
            
            let transfer_success = token_dispatcher.transfer_from(caller, contract_address, bond);
            assert(transfer_success, 'Bond transfer failed');
            
            // Create proposal
            let proposal = Proposal {
                answer,
                proposer: caller,
                bond,
                created_at: get_block_timestamp(),
                status: 0, // Pending
                challenge_count: 0,
            };
            
            self.proposals.entry(question_id).write(proposal);
            
            self.emit(ProposalCreated {
                question_id,
                proposer: caller,
                answer,
                bond,
            });
        }
        
        fn challenge_proposal(
            ref self: ContractState,
            question_id: felt252,
            bond: u256
        ) {
            let caller = get_caller_address();
            let mut proposal = self.proposals.entry(question_id).read();
            
            // Check that proposal exists (proposer is not zero) and is challengeable
            let zero_address: ContractAddress = contract_address_const::<0>();
            let proposer_is_zero = proposal.proposer == zero_address;
            assert(!proposer_is_zero, 'Proposal does not exist');
            assert(proposal.status == 0 || proposal.status == 1, 'Proposal not challengeable');
            assert(bond >= proposal.bond, 'Bond must be >= proposal bond');
            
            let challenge_period = self.challenge_period.read();
            let current_time = get_block_timestamp();
            assert(current_time <= proposal.created_at + challenge_period, 'Challenge period expired');
            
            // Transfer bond from challenger to contract
            let strk_token = self.strk_token.read();
            let token_dispatcher = IERC20Dispatcher { contract_address: strk_token };
            let contract_address = get_contract_address();
            
            let transfer_success = token_dispatcher.transfer_from(caller, contract_address, bond);
            assert(transfer_success, 'Bond transfer failed');
            
            // Update proposal status
            proposal.status = 2; // Challenged
            proposal.challenge_count += 1;
            self.proposals.entry(question_id).write(proposal);
            
            // Record challenger
            let challenger = Challenger {
                bond,
                challenged_at: current_time,
            };
            self.challengers.entry((question_id, caller)).write(challenger);
            
            self.emit(ProposalChallenged {
                question_id,
                challenger: caller,
                bond,
            });
        }
        
        fn finalize_proposal(
            ref self: ContractState,
            question_id: felt252
        ) {
            let mut proposal = self.proposals.entry(question_id).read();
            
            // Check that proposal exists (proposer is not zero)
            let zero_address: ContractAddress = contract_address_const::<0>();
            let proposer_is_zero = proposal.proposer == zero_address;
            assert(!proposer_is_zero, 'Proposal does not exist');
            assert(proposal.status != 3, 'Already finalized');
            
            let challenge_period = self.challenge_period.read();
            let current_time = get_block_timestamp();
            
            // Can finalize if:
            // 1. No challenges and challenge period passed, OR
            // 2. Admin manually finalizes (for disputed cases)
            let caller = get_caller_address();
            let admin = self.admin.read();
            
            let can_finalize = if proposal.status == 2 {
                // Challenged - only admin can finalize
                caller == admin
            } else {
                // Not challenged - anyone can finalize after challenge period
                current_time > proposal.created_at + challenge_period
            };
            
            assert(can_finalize, 'Cannot finalize yet');
            
            // Determine winner
            let winner = if proposal.status == 2 {
                // If challenged, admin decides (in real UMA, this would be a dispute resolution)
                // For now, we'll give it to the proposer if no admin override
                proposal.proposer
            } else {
                // No challenge, proposer wins
                proposal.proposer
            };
            
            // Transfer bonds to winner
            let strk_token = self.strk_token.read();
            let token_dispatcher = IERC20Dispatcher { contract_address: strk_token };
            
            let total_bond = proposal.bond;
            
            // If challenged, add challenger bonds to winner
            if proposal.status == 2 {
                // In a real implementation, you'd iterate through challengers
                // For simplicity, we'll just use the proposal bond
                // TODO: Implement challenger bond aggregation
            }
            
            let transfer_success = token_dispatcher.transfer(winner, total_bond);
            assert(transfer_success, 'Bond transfer failed');
            
            // Save answer before writing (Cairo moves values, can't use after write)
            let final_answer = proposal.answer;
            
            // Update status
            proposal.status = 3; // Finalized
            self.proposals.entry(question_id).write(proposal);
            
            self.emit(ProposalFinalized {
                question_id,
                answer: final_answer,
                winner,
            });
        }
        
        fn get_proposal(
            self: @ContractState,
            question_id: felt252
        ) -> (bool, ContractAddress, u256, u64, u8) {
            let proposal = self.proposals.entry(question_id).read();
            (
                proposal.answer,
                proposal.proposer,
                proposal.bond,
                proposal.created_at,
                proposal.status
            )
        }
        
        fn is_finalized(
            self: @ContractState,
            question_id: felt252
        ) -> bool {
            let proposal = self.proposals.entry(question_id).read();
            proposal.status == 3
        }
    }
    
    // Admin function to resolve disputes
    #[external(v0)]
    fn resolve_dispute(
        ref self: ContractState,
        question_id: felt252,
        winner: ContractAddress
    ) {
        let caller = get_caller_address();
        assert(caller == self.admin.read(), 'Only admin');
        
        let mut proposal = self.proposals.entry(question_id).read();
        
        // Check that proposal exists (proposer is not zero) and is in dispute
        let zero_address: ContractAddress = contract_address_const::<0>();
        let proposer_is_zero = proposal.proposer == zero_address;
        assert(!proposer_is_zero, 'Proposal does not exist');
        assert(proposal.status == 2, 'Not in dispute');
        
        // Transfer bonds to winner
        let strk_token = self.strk_token.read();
        let token_dispatcher = IERC20Dispatcher { contract_address: strk_token };
        
        let total_bond = proposal.bond;
        let final_answer = proposal.answer; // Save before write (Cairo moves values)
        
        let transfer_success = token_dispatcher.transfer(winner, total_bond);
        assert(transfer_success, 'Bond transfer failed');
        
        // Update status
        proposal.status = 3; // Finalized
        self.proposals.entry(question_id).write(proposal);
        
        self.emit(ProposalFinalized {
            question_id,
            answer: final_answer,
            winner,
        });
    }
}
