// src/core/enterPosition.js
// Executes 1-3 consecutive BuyExactIn swaps with a delay between each.
// Exported as default for proper ESM compatibility.

import "dotenv/config";
import swapExactIn from "./swapExactIn.js";

const BUY_SOL = Number(process.env.BUY_SOL) || 3;
const BUY_GAP = Number(process.env.BUY_GAP) || 5; // seconds

/**
 * Enter position in a Raydium pool by performing up to three swaps.
 *
 * @param {import('@solana/web3.js').Connection} connection
 * @param {import('@solana/web3.js').Signer} payer
 * @param {string} poolAddress – target Raydium pool
 * @param {{ maxBuys?: number, swapFn?: function }} [opts]
 * @returns {Promise<string[]>} array of tx signatures
 */
export default async function enterPosition(connection, payer, poolAddress, opts = {}) {
  const maxBuys = opts.maxBuys ?? 3;
  const swapFn = opts.swapFn || swapExactIn;
  const swapsToDo = Math.max(1, Math.min(maxBuys, Math.floor(Math.random() * 3) + 1));

  const sigs = [];
  for (let i = 0; i < swapsToDo; i++) {
    const sig = await swapFn(connection, payer, {
      poolAddress,
      amountSol: BUY_SOL,
    });
    sigs.push(sig);

    if (i < swapsToDo - 1) {
      await sleep(BUY_GAP * 1000);
    }
  }

  return sigs;
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}
