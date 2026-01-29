import { hash } from 'starknet';
import { getMarketContractAddress, getRpcProvider } from './common';
import { loadState, saveState } from './state';

const POLL_MS = Number(process.env.BOT_POLL_MS || 6000);
const MAX_BLOCKS_PER_QUERY = Number(process.env.BOT_MAX_BLOCKS_PER_QUERY || 200);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const provider = getRpcProvider();
  const contractAddress = getMarketContractAddress();

  const eventKey = hash.getSelectorFromName('MarketCreated');

  let state = loadState();

  console.log('👂 Listening for MarketCreated events…');
  console.log(`- Contract: ${contractAddress}`);
  console.log(`- Start block: ${state.lastProcessedBlock || '(will auto-set to latest)'}`);
  console.log(`- Poll: ${POLL_MS}ms`);

  while (true) {
    try {
      const latest = await provider.getBlock('latest');
      const latestBlock = Number((latest as any).block_number);

      if (!state.lastProcessedBlock || state.lastProcessedBlock <= 0) {
        // Start from latest to avoid backfilling huge history by default
        state.lastProcessedBlock = Math.max(0, latestBlock - 3);
        saveState(state);
      }

      const from = state.lastProcessedBlock + 1;
      const to = Math.min(latestBlock, from + MAX_BLOCKS_PER_QUERY - 1);

      if (from > to) {
        await sleep(POLL_MS);
        continue;
      }

      const res = await provider.getEvents({
        address: contractAddress,
        from_block: { block_number: from },
        to_block: { block_number: to },
        keys: [[eventKey]],
        chunk_size: 100,
      });

      if (res?.events?.length) {
        for (const ev of res.events) {
          // Raw event.data layout for MarketCreated is:
          // [market_id (u32), question (felt252), creator (ContractAddress), resolution_date (u64)]
          const data = (ev as any).data as string[] | undefined;
          if (!data || data.length < 4) continue;

          const marketId = BigInt(data[0]).toString();
          const resolutionDate = BigInt(data[3]).toString();

          if (!state.markets[marketId]) {
            state.markets[marketId] = {
              id: marketId,
              resolutionDate,
              createdTx: (ev as any).transaction_hash,
            };
            console.log(`✅ MarketCreated: id=${marketId} resolution_date=${resolutionDate}`);
          }
        }
        saveState(state);
      }

      state.lastProcessedBlock = to;
      saveState(state);
    } catch (err) {
      console.error('Listener error:', err);
      // keep going
    }

    await sleep(POLL_MS);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

