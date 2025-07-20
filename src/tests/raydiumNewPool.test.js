// src/tests/raydiumNewPool.test.js – ESM‑style mocks
import { jest } from "@jest/globals";
import { expect, test } from "@jest/globals";

// 1️⃣  Mock Bottleneck (sync schedule)
await jest.unstable_mockModule("bottleneck", () => ({
  default: class {
    schedule(fn) {
      return fn();
    }
  },
}));

// 2️⃣  Import test subject after mocks
const { default: watchRaydiumNewPools } = await import("../listeners/raydiumNewPool.js");

// 3️⃣  Minimal mock Connection with onLogs / emit
class MockConnection {
  handlers = new Map();
  id = 1;
  onLogs(_pid, cb) {
    this.handlers.set(this.id, cb);
    return this.id++;
  }
  removeOnLogsListener() {}
  emit(logs) {
    for (const h of this.handlers.values()) h({ logs });
  }
}

test("fires callback exactly once with poolAddress", () => {
  const conn = new MockConnection();
  const spy = jest.fn();

  watchRaydiumNewPools(conn, spy);

  conn.emit([
    "Program LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj invoke [1]",
    "Instruction: BuyExactIn",
    "amm_info_pubkey: 9abcdEfghijkLmnoPQRSTuvWXyZ1234567890",
  ]);

  expect(spy).toHaveBeenCalledTimes(1);
  expect(spy).toHaveBeenCalledWith({ poolAddress: "9abcdEfghijkLmnoPQRSTuvWXyZ1234567890" });
});
