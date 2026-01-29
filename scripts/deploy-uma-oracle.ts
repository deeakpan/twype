/**
 * Deploy UMA Oracle Contract
 * 
 * Usage:
 *   npx tsx scripts/deploy-uma-oracle.ts
 */

import { Account, RpcProvider, constants, Contract, json, Signer } from 'starknet';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

// Configuration
const RPC_URL = process.env.STARKNET_RPC_URL || 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_9/O6ulR1EPy8Sn4fYG8_kqU';
const PRIVATE_KEY = process.env.STARKNET_PRIVATE_KEY || '';
const ADMIN_ADDRESS = process.env.STARKNET_ACCOUNT_ADDRESS || '';
const STRK_TOKEN_ADDRESS = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'; // Sepolia testnet
const CHALLENGE_PERIOD = 3600; // 1 hour in seconds
const MIN_BOND = BigInt(100) * BigInt(10 ** 18); // 100 STRK

async function deployUMAOracle() {
  console.log('🚀 Deploying UMA Oracle Contract...\n');

  if (!PRIVATE_KEY || !ADMIN_ADDRESS) {
    throw new Error('STARKNET_PRIVATE_KEY and STARKNET_ACCOUNT_ADDRESS must be set in .env');
  }

  // Initialize provider
  const provider = new RpcProvider({
    nodeUrl: RPC_URL,
    chainId: constants.StarknetChainId.SN_SEPOLIA,
  });

  // Create account with Signer (matching deploy.ts pattern)
  const signer = new Signer(PRIVATE_KEY);
  const account = new Account({
    provider,
    address: ADMIN_ADDRESS,
    signer: signer,
    cairoVersion: '1',
  });
  console.log(`📝 Using account: ${ADMIN_ADDRESS}\n`);

  // Load compiled contract files
  const contractClassPath = path.join(process.cwd(), 'contracts/target/dev/penkmarket_UMAOracle.contract_class.json');
  const casmPath = path.join(process.cwd(), 'contracts/target/dev/penkmarket_UMAOracle.compiled_contract_class.json');
  
  if (!fs.existsSync(contractClassPath)) {
    throw new Error(`Contract not found at ${contractClassPath}. Run 'scarb build' first.`);
  }
  
  if (!fs.existsSync(casmPath)) {
    throw new Error(`CASM file not found at ${casmPath}. Run 'scarb build' first.`);
  }

  const contractClass = json.parse(fs.readFileSync(contractClassPath, 'utf8'));
  const casm = json.parse(fs.readFileSync(casmPath, 'utf8'));

  console.log('📦 Declaring contract class...');
  const declareResponse = await account.declare({
    contract: contractClass,
    casm: casm,
  });

  console.log('⏳ Waiting for class declaration...');
  await provider.waitForTransaction(declareResponse.transaction_hash);
  console.log(`✅ Class declared! Class hash: ${declareResponse.class_hash}`);

  // Deploy contract
  console.log('📦 Deploying contract instance...');
  const deployResponse = await account.deployContract({
    classHash: declareResponse.class_hash,
    constructorCalldata: [
      ADMIN_ADDRESS,           // admin
      STRK_TOKEN_ADDRESS,      // strk_token
      CHALLENGE_PERIOD,        // challenge_period
      MIN_BOND.toString(),      // min_bond
    ],
  });

  console.log('⏳ Waiting for transaction...');
  await provider.waitForTransaction(deployResponse.transaction_hash);

  console.log('✅ UMA Oracle deployed successfully!');
  console.log(`📍 Contract Address: ${deployResponse.contract_address}`);
  console.log(`🔗 Transaction: https://sepolia.starkscan.co/tx/${deployResponse.transaction_hash}\n`);

  // Save address to .env
  const envPath = path.join(process.cwd(), '.env');
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
  
  if (envContent.includes('NEXT_PUBLIC_UMA_ORACLE_ADDRESS=')) {
    envContent = envContent.replace(
      /NEXT_PUBLIC_UMA_ORACLE_ADDRESS=.*/,
      `NEXT_PUBLIC_UMA_ORACLE_ADDRESS=${deployResponse.contract_address}`
    );
  } else {
    envContent += `\nNEXT_PUBLIC_UMA_ORACLE_ADDRESS=${deployResponse.contract_address}\n`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log('📝 Updated .env file with UMA oracle address');
  console.log(`📍 Contract Address: ${deployResponse.contract_address}\n`);

  return deployResponse.contract_address;
}

deployUMAOracle()
  .then((address) => {
    console.log('✨ Deployment complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
