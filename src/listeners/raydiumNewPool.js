// src/listeners/raydiumNewPool.js
// Emits `cb({ poolAddress })` once, the moment a fresh Raydium pool gets its very first BuyExactIn.
// No USD / TVL logic here – that belongs to a higher layer.

import { PublicKey } from "@solana/web3.js";
import Bottleneck from "bottleneck";

const RAYDIUM_AMM_PROGRAM_ID = new PublicKey(
  "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj",
);

/**
 * @param {import('@solana/web3.js').Connection} connection
 * @param {(payload: { poolAddress: string }) => void} cb
 * @returns {number} onLogs subscription id
 */
export default function watchRaydiumNewPools(connection, cb) {
  const seenPools = new Set();
  const limiter = new Bottleneck({ maxConcurrent: 1, minTime: 300 });

  return connection.onLogs(
    RAYDIUM_AMM_PROGRAM_ID,
    ({ logs }) => {
      if (!logs?.length) return;

      let hit = false;
      let pool = undefined;
      for (const l of logs) {
        if (!hit && l.includes("Instruction: BuyExactIn")) hit = true;
        if (!pool && l.includes("amm_info_pubkey:")) pool = l.split("amm_info_pubkey:")[1].trim();
        if (hit && pool) break;
      }
      if (!hit || !pool || seenPools.has(pool)) return;
      seenPools.add(pool);

      limiter.schedule(() => cb({ poolAddress: pool }));
    },
    "confirmed",
  );
}
