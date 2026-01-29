import { getAccount, getMarketContractAddress, getRpcProvider } from './common';
import { loadState, saveState } from './state';

const POLL_MS = Number(process.env.BOT_POLL_MS || 12000);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const provider = getRpcProvider();
  const account = getAccount(provider);
  const contractAddress = getMarketContractAddress();

  console.log('🧹 Resolving due markets…');
  console.log(`- Contract: ${contractAddress}`);
  console.log(`- Admin: ${account.address}`);
  console.log(`- Poll: ${POLL_MS}ms`);

  while (true) {
    let state = loadState();
    const ids = Object.keys(state.markets).sort((a, b) => Number(a) - Number(b));

    if (ids.length === 0) {
      await sleep(POLL_MS);
      continue;
    }

    const now = Math.floor(Date.now() / 1000);

    for (const id of ids) {
      try {
        const tracked = state.markets[id];
        const resolutionDate = Number(tracked.resolutionDate);

        if (Number.isFinite(resolutionDate) && now < resolutionDate) {
          continue;
        }

        // Confirm on-chain resolved flag before trying
        // get_market_info returns:
        // (question felt, description felt, resolution_date u64, resolved bool, total_yes u256, total_no u256, total_pool u256)
        const callRes = await provider.callContract({
          contractAddress,
          entrypoint: 'get_market_info',
          calldata: [id],
        });
        const res = (callRes as any)?.result as string[] | undefined;
        const resolved = res?.[3] ? BigInt(res[3]) === BigInt(1) : false;
        if (resolved) {
          delete state.markets[id];
          saveState(state);
          continue;
        }

        console.log(`⏱️ Resolving market ${id}…`);
        const tx = await account.execute([
          {
            contractAddress,
            entrypoint: 'resolve_market_with_oracle',
            calldata: [id],
          },
        ]);
        console.log(`- tx: ${tx.transaction_hash}`);
        await provider.waitForTransaction(tx.transaction_hash);
        console.log(`✅ Resolved market ${id}`);

        delete state.markets[id];
        saveState(state);
      } catch (err) {
        console.error(`Resolver error for market ${id}:`, err);
        // keep it in the list and retry later
      }
    }

    await sleep(POLL_MS);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

