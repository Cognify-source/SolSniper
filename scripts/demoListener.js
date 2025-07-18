// scripts/demoListener.js
import getConnection from "../src/utils/getConnection.js";
import watchRaydiumNewPools from "../src/listeners/raydiumNewPool.js";

const connection = getConnection(); // läser RPC_ENDPOINT från .env

watchRaydiumNewPools(connection, ({ poolAddress }) => {
  console.log("🎯 första BuyExactIn:", poolAddress);
});
