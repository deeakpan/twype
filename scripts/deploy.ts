import { Account, RpcProvider, Contract, json, constants, Signer } from 'starknet';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function deploy() {
  const privateKey = process.env.STARKNET_PRIVATE_KEY;
  // Use public RPC endpoint - try Lava Network or default to Alchemy
  const rpcUrl = process.env.STARKNET_RPC_URL || 'https://rpc.starknet-sepolia.public.lavanet.xyz';
  const accountAddress = process.env.STARKNET_ACCOUNT_ADDRESS;

  if (!privateKey) {
    throw new Error('STARKNET_PRIVATE_KEY not set in .env');
  }

  if (!accountAddress) {
    throw new Error('STARKNET_ACCOUNT_ADDRESS not set in .env');
  }

  console.log('🚀 Deploying to Starknet Testnet...');
  console.log(`RPC URL: ${rpcUrl}`);

  // Initialize provider and account
  // Use RpcProvider with proper configuration
  const provider = new RpcProvider({ 
    nodeUrl: rpcUrl,
    chainId: constants.StarknetChainId.SN_SEPOLIA // Starknet Sepolia testnet
  });
  
  // Verify connection
  try {
    const block = await provider.getBlock('latest');
    console.log(`✅ Connected to chain. Latest block: ${block.block_number}`);
  } catch (error) {
    console.error('❌ Failed to connect to RPC:', error);
    throw error;
  }
  
  // New Account API - need to create signer from privateKey
  const signer = new Signer(privateKey);
  const account = new Account({
    provider,
    address: accountAddress,
    signer: signer,
    cairoVersion: '1', // Cairo 1 account
  });

  // Read contract class and CASM
  const contractClassPath = path.join(process.cwd(), 'contracts/target/dev/penkmarket_Market.contract_class.json');
  const casmPath = path.join(process.cwd(), 'contracts/target/dev/penkmarket_Market.compiled_contract_class.json');
  
  if (!fs.existsSync(contractClassPath)) {
    throw new Error(`Contract not found at ${contractClassPath}. Run 'scarb build' first.`);
  }
  
  if (!fs.existsSync(casmPath)) {
    throw new Error(`CASM file not found at ${casmPath}. Run 'scarb build' first.`);
  }
  
  const contractClass = json.parse(fs.readFileSync(contractClassPath).toString('utf-8'));
  const casm = json.parse(fs.readFileSync(casmPath).toString('utf-8'));

  console.log('📦 Declaring contract class...');

  // Declare the contract class first with CASM
  // Newer starknet.js versions handle block tags better
  const declareResponse = await account.declare({
    contract: contractClass,
    casm: casm,
  });

  console.log('⏳ Waiting for class declaration...');
  await provider.waitForTransaction(declareResponse.transaction_hash);
  console.log(`✅ Class declared! Class hash: ${declareResponse.class_hash}`);

  console.log('📦 Deploying contract instance...');

  // Deploy contract instance
  const deployResponse = await account.deployContract({
    classHash: declareResponse.class_hash,
    constructorCalldata: [
      accountAddress, // admin
      '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d', // STRK token address (testnet)
      '0x36031daa264c24520b11d93af622c848b2499b66b41d611bac95e13cfca131a', // pragma_oracle (Sepolia testnet - from Pragma docs)
      process.env.NEXT_PUBLIC_UMA_ORACLE_ADDRESS || '0x0000000000000000000000000000000000000000000000000000000000000000', // uma_oracle
      200, // platform_fee_bps (2%)
    ],
  });

  console.log('⏳ Waiting for deployment transaction...');
  await provider.waitForTransaction(deployResponse.transaction_hash);

  console.log('✅ Contract deployed!');
  console.log(`Contract Address: ${deployResponse.contract_address}`);
  console.log(`Transaction Hash: ${deployResponse.transaction_hash}`);

  // Update .env file
  const envPath = path.join(process.cwd(), '.env');
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
  
  // Update or add MARKET_CONTRACT_ADDRESS
  if (envContent.includes('MARKET_CONTRACT_ADDRESS=')) {
    envContent = envContent.replace(
      /MARKET_CONTRACT_ADDRESS=.*/,
      `MARKET_CONTRACT_ADDRESS=${deployResponse.contract_address}`
    );
  } else {
    envContent += `\nMARKET_CONTRACT_ADDRESS=${deployResponse.contract_address}\n`;
  }

  // Update or add NEXT_PUBLIC_MARKET_CONTRACT_ADDRESS (for frontend)
  if (envContent.includes('NEXT_PUBLIC_MARKET_CONTRACT_ADDRESS=')) {
    envContent = envContent.replace(
      /NEXT_PUBLIC_MARKET_CONTRACT_ADDRESS=.*/,
      `NEXT_PUBLIC_MARKET_CONTRACT_ADDRESS=${deployResponse.contract_address}`
    );
  } else {
    envContent += `\nNEXT_PUBLIC_MARKET_CONTRACT_ADDRESS=${deployResponse.contract_address}\n`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log('📝 Updated .env file with contract address');

  return deployResponse.contract_address;
}

deploy()
  .then((address) => {
    console.log(`\n🎉 Deployment complete! Contract at: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
