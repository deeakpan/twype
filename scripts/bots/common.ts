import { Account, RpcProvider, constants, Contract, Signer } from 'starknet';
import * as dotenv from 'dotenv';

dotenv.config();

// Minimal ABI (starknet.js compatible) for the methods our bots call.
// NOTE: This must match your deployed contract's external interface.
const MARKET_ABI: any[] = [
  {
    type: 'function',
    name: 'create_market',
    inputs: [
      { name: 'question', type: 'core::felt252' },
      { name: 'description', type: 'core::felt252' },
      { name: 'resolution_date', type: 'core::integer::u64' },
      { name: 'creator', type: 'core::starknet::contract_address::ContractAddress' },
      { name: 'chainlink_feed_address', type: 'core::starknet::contract_address::ContractAddress' },
      { name: 'threshold_value', type: 'core::integer::u256' },
      { name: 'condition', type: 'core::integer::u8' },
    ],
    outputs: [{ type: 'core::integer::u32' }],
    state_mutability: 'external',
  },
  {
    type: 'function',
    name: 'resolve_market_with_oracle',
    inputs: [{ name: 'market_id', type: 'core::integer::u32' }],
    outputs: [],
    state_mutability: 'external',
  },
  {
    type: 'function',
    name: 'get_market_info',
    inputs: [{ name: 'market_id', type: 'core::integer::u32' }],
    outputs: [
      { type: 'core::felt252' },
      { type: 'core::felt252' },
      { type: 'core::integer::u64' },
      { type: 'core::bool' },
      { type: 'core::integer::u256' },
      { type: 'core::integer::u256' },
      { type: 'core::integer::u256' },
    ],
    state_mutability: 'view',
  },
];

export function getRpcProvider() {
  const rpcUrl =
    process.env.STARKNET_RPC_URL ||
    process.env.NEXT_PUBLIC_STARKNET_RPC_URL ||
    'https://rpc.starknet-sepolia.public.lavanet.xyz';

  return new RpcProvider({
    nodeUrl: rpcUrl,
    chainId: constants.StarknetChainId.SN_SEPOLIA,
  });
}

export function getAccount(provider: RpcProvider) {
  const privateKey = process.env.STARKNET_PRIVATE_KEY;
  const accountAddress = process.env.STARKNET_ACCOUNT_ADDRESS;

  if (!privateKey) throw new Error('STARKNET_PRIVATE_KEY not set in .env');
  if (!accountAddress) throw new Error('STARKNET_ACCOUNT_ADDRESS not set in .env');

  const signer = new Signer(privateKey);
  return new Account({
    provider,
    address: accountAddress,
    signer,
    cairoVersion: '1',
  });
}

export function getMarketContractAddress() {
  const addr =
    process.env.MARKET_CONTRACT_ADDRESS ||
    process.env.NEXT_PUBLIC_MARKET_CONTRACT_ADDRESS ||
    process.env.NEXT_PUBLIC_MARKET_ADDRESS;
  if (!addr) throw new Error('MARKET_CONTRACT_ADDRESS (or NEXT_PUBLIC_MARKET_CONTRACT_ADDRESS) not set');
  return addr;
}

export function getMarketContract(providerOrAccount: RpcProvider | Account) {
  const address = getMarketContractAddress();
  return new Contract(MARKET_ABI, address, providerOrAccount);
}

