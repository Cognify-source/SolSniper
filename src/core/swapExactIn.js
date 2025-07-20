// src/core/swapExactIn.js
import { PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import bs58 from "bs58";

const RAYDIUM_AMM = new PublicKey("LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj");

/**
 * Skickar en Raydium BuyExactIn‑swap (v0‑tx, max 1 instr).
 *
 * @param {import('@solana/web3.js').Connection} connection
 * @param {import('@solana/web3.js').Signer} payer – Keypair eller Versioned-wallet signer
 * @param {{ poolAddress: string, amountSol: number, slippageBps?: number }} p
 * @returns {Promise<string>} tx‑signature
 */
export default async function swapExactIn(connection, payer, { poolAddress, amountSol, slippageBps = 200 }) {
  const pool = new PublicKey(poolAddress);
  const solMint = new PublicKey("So11111111111111111111111111111111111111112");

  // — accounts (minimal) —
  const userSolAta = getAssociatedTokenAddressSync(solMint, payer.publicKey, true);

  // Raydium program expects: [amm, authority, openOrders, ...] – fetch via RPC call
  const ixAccounts = await connection.getRaydiumAmmKeys(pool); // Custom RPC ext.

  const dataLayout = Buffer.alloc(10);
  dataLayout.writeUInt8(9, 0); // 9 = BuyExactIn
  dataLayout.writeBigUInt64LE(BigInt(Math.round(amountSol * 1e9)), 1); // in lamports

  const ix = {
    programId: RAYDIUM_AMM,
    keys: [
      { pubkey: pool, isSigner: false, isWritable: true },
      ...ixAccounts, // keep order from RPC helper
      { pubkey: userSolAta, isSigner: false, isWritable: true },
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
    ],
    data: dataLayout,
  };

  const block = await connection.getLatestBlockhash();
  const msg = new TransactionMessage({ payerKey: payer.publicKey, recentBlockhash: block.blockhash, instructions: [ix] }).compileToV0Message();
  const tx = new VersionedTransaction(msg);
  tx.sign([payer]);

  const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: true, maxRetries: 3 });
  await connection.confirmTransaction({ signature: sig, ...block }, "confirmed");
  return sig;
}
