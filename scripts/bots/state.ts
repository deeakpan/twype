import * as fs from 'fs';
import * as path from 'path';

export type TrackedMarket = {
  id: string; // u32 as decimal string
  resolutionDate: string; // u64 seconds as decimal string
  createdTx?: string;
};

export type BotState = {
  lastProcessedBlock: number;
  markets: Record<string, TrackedMarket>;
};

const STATE_PATH = path.join(process.cwd(), 'scripts', 'bots', '.state.json');

export function loadState(): BotState {
  if (!fs.existsSync(STATE_PATH)) {
    return { lastProcessedBlock: 0, markets: {} };
  }

  const raw = fs.readFileSync(STATE_PATH, 'utf8');
  const parsed = JSON.parse(raw) as BotState;
  return {
    lastProcessedBlock: parsed.lastProcessedBlock ?? 0,
    markets: parsed.markets ?? {},
  };
}

export function saveState(next: BotState) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(next, null, 2));
}

