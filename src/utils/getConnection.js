// src/utils/getConnection.js
// Return a ready‑to‑use Solana Connection built from .env

import "dotenv/config"; // loads variables from .env automatically
import { Connection, clusterApiUrl } from "@solana/web3.js";

const DEFAULT_CLUSTER = "mainnet-beta";
const ENDPOINT = (process.env.RPC_ENDPOINT || clusterApiUrl(DEFAULT_CLUSTER)).trim();

/**
 * @param {import('@solana/web3.js').Commitment} commitment – e.g. 'confirmed'
 * @returns {Connection}
 */
export default function getConnection(commitment = "confirmed") {
  return new Connection(ENDPOINT, commitment);
}
