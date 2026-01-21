import { Account, RpcProvider, constants, Signer } from 'starknet';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function deployAccount() {
  const privateKey = process.env.STARKNET_PRIVATE_KEY;
  const rpcUrl = process.env.STARKNET_RPC_URL || 'https://rpc.starknet-sepolia.public.lavanet.xyz';
  
  if (!privateKey) {
    throw new Error('STARKNET_PRIVATE_KEY not set in .env');
  }

  console.log('🚀 Deploying account to Starknet Testnet...');
  console.log(`RPC URL: ${rpcUrl}`);

  const provider = new RpcProvider({ 
    nodeUrl: rpcUrl,
    chainId: constants.StarknetChainId.SN_SEPOLIA
  });

  // Create signer to get public key
  const signer = new Signer(privateKey);
  const publicKey = await signer.getPubKey();
  
  console.log(`📝 Public key: ${publicKey}`);
  
  // For account deployment, use your wallet (ArgentX/Braavos)
  // They will calculate and deploy the account automatically
  
  console.log('\n📋 To deploy your account:');
  console.log('1. Open ArgentX or Braavos wallet extension');
  console.log('2. Click "Import Account" or "Add Account"');
  console.log('3. Select "Import Private Key"');
  console.log('4. Paste your private key from .env');
  console.log('5. Switch to Sepolia testnet');
  console.log('6. The wallet will show your account address');
  console.log('7. If not deployed, the wallet will prompt you to deploy');
  console.log('8. Confirm the deployment (costs ~0.0001 STRK)');
  console.log('9. After deployment, update STARKNET_ACCOUNT_ADDRESS in .env');
  
  console.log('\n💡 Tip: Make sure you have some STRK in your wallet for deployment fees');
  console.log('   Get testnet STRK from: https://starknet-faucet.vercel.app/');
  
  return null;
}

deployAccount()
  .then((address) => {
    console.log(`\n✅ Account address: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
