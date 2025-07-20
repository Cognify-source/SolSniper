// src/tests/enterPosition.test.js – ESM dynamic import after setting env
import { test, expect, jest } from "@jest/globals";
import { Keypair } from "@solana/web3.js";

// Set quick test env before loading module
process.env.BUY_GAP = "1";
process.env.BUY_SOL = "3";

// Import module under test after env is set to pick up correct BUY_GAP
const { default: enterPosition } = await import("../core/enterPosition.js");

jest.useFakeTimers();

test("enterPosition uses injected swapFn and calls it correct number of times", async () => {
  // Force 3 swaps
  jest.spyOn(Math, "random").mockReturnValue(0.9);

  const mockSwap = jest.fn().mockResolvedValue("sig");
  const conn = {};
  const payer = Keypair.generate();

  // Start the enterPosition promise but don't await yet
  const promise = enterPosition(conn, payer, "Pool111111111111111111111111111111111111", {
    maxBuys: 3,
    swapFn: mockSwap,
  });

  // Advance all timers to resolve the sleep delays
  await jest.runAllTimersAsync();

  // Now await the promise
  const sigs = await promise;

  expect(mockSwap).toHaveBeenCalledTimes(3);
  expect(sigs).toEqual(["sig", "sig", "sig"]);

  Math.random.mockRestore();
});

// Clean up fake timers after tests to prevent open handle issues
afterAll(() => {
  jest.useRealTimers();
});
