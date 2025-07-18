// src/listeners/raydiumNewPool.js
// Listen for the *first* BuyExactIn on brand‑new Raydium pools and emit { poolAddress, tvlUsd }
// Usage:
// import watchRaydiumNewPools from "./listeners/raydiumNewPool.js";
// const id = watchRaydiumNewPools(connection, ({ poolAddress, tvlUsd }) => { … });

import { PublicKey } from "@solana/web3.js";
import Bottleneck from "bottleneck";
import getPoolInfo from "../utils/getPoolInfo.js"; // -> returns { baseMint, quoteMint, baseReserve, quoteReserve, baseDecimals, quoteDecimals }
import getUsdPrice from "../utils/getUsdPrice.js"; // -> returns number (USD)

const RAYDIUM_AMM_PROGRAM_ID = new PublicKey(
  "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj",
);

/**
 * Subscribes to Raydium program logs and triggers `cb` once per pool
 * when its *first* BuyExactIn instruction hits the chain.
 *
 * @param {import('@solana/web3.js').Connection} connection – Solana RPC connection
 * @param {(payload: { poolAddress: string, tvlUsd: number }) => void} cb – callback
 * @returns {number} onLogs subscription id (pass to `connection.removeOnLogsListener` to cancel)
 */
export default function watchRaydiumNewPools(connection, cb) {
  const seenPools = new Set(); // guard: only fire for a pool once

  // Gentle RPC‑throttle so we don’t spam `getAccountInfo` + price lookups
  const limiter = new Bottleneck({ maxConcurrent: 1, minTime: 300 });

  const subId = connection.onLogs(
    RAYDIUM_AMM_PROGRAM_ID,
    async (logInfo) => {
      const { logs } = logInfo;
      if (!logs?.length) return;

      // Fast scan: look for instruction + amm_info_pubkey
      let isBuyExactIn = false;
      let poolAddress;

      for (const line of logs) {
        if (!isBuyExactIn && line.includes("Instruction: BuyExactIn")) {
          isBuyExactIn = true;
        }
        if (!poolAddress && line.includes("amm_info_pubkey:")) {
          poolAddress = line.split("amm_info_pubkey:")[1]?.trim();
        }
        // early exit if both found
        if (isBuyExactIn && poolAddress) break;
      }

      if (!isBuyExactIn || !poolAddress || seenPools.has(poolAddress)) return;
      seenPools.add(poolAddress);

      // TVL is I/O heavy → throttle via Bottleneck
      limiter.schedule(async () => {
        const tvlUsd = await estimateTvlUsd(connection, poolAddress);
        cb({ poolAddress, tvlUsd });
      });
    },
    "confirmed",
  );

  return subId;
}

/**
 * Quick‑n‑dirty TVL estimator (USD) for a Raydium pool
 *
 * @param {import('@solana/web3.js').Connection} connection
 * @param {string} poolAddress
 * @returns {Promise<number>} total liquidity in USD (base + quote)
 */
async function estimateTvlUsd(connection, poolAddress) {
  try {
    const info = await getPoolInfo(connection, new PublicKey(poolAddress));
    const [baseUsd, quoteUsd] = await Promise.all([
      reserveToUsd(info.baseReserve, info.baseDecimals, info.baseMint),
      reserveToUsd(info.quoteReserve, info.quoteDecimals, info.quoteMint),
    ]);
    return baseUsd + quoteUsd;
  } catch (err) {
    console.warn("[estimateTvlUsd] fallback", err);
    return 0;
  }
}

async function reserveToUsd(reserve, decimals, mint) {
  const amount = Number(reserve) / 10 ** decimals;
  const price = await getUsdPrice(mint); // pulls latest Pyth price
  return amount * price;
}
