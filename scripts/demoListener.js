import { Connection, clusterApiUrl } from "@solana/web3.js";
import watchRaydiumNewPools from "../src/listeners/raydiumNewPool.js";

const conn = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");

watchRaydiumNewPools(conn, ({ poolAddress }) => {
  console.log("🎯 BuyExactIn hittad:", poolAddress);
});
