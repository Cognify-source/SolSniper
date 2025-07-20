// src/tests/swapExactIn.test.js – ESM‑friendly mock
import { jest } from "@jest/globals";
import { Keypair, PublicKey } from "@solana/web3.js";

// 1️⃣  Mock spl‑token so that ATA helper returns a valid PublicKey
await jest.unstable_mockModule("@solana/spl-token", () => ({
  getAssociatedTokenAddressSync: () => new PublicKey("So11111111111111111111111111111111111111112"),
}));

// 2️⃣  Import subject *after* mocks are registered
const { default: swapExactIn } = await import("../core/swapExactIn.js");

class MockConnection {
  calls = [];
  async getRaydiumAmmKeys() {
    return [
      {
        pubkey: new PublicKey("So11111111111111111111111111111111111111112"),
        isSigner: false,
        isWritable: false,
      },
    ];
  }
  async getLatestBlockhash() {
    return {
      blockhash: "4Nd1m87Jph9VrNCfYpq6pED9wExTcwJKZye5dcPS1sKy",
      lastValidBlockHeight: 123,
    };
  }
  async sendRawTransaction() {
    this.calls.push("send");
    return "mockSig";
  }
  async confirmTransaction() {
    this.calls.push("confirm");
    return { value: { err: null } };
  }
}

test("swapExactIn builds & sends tx, returns signature", async () => {
  const conn = new MockConnection();
  const payer = Keypair.generate();

  const sig = await swapExactIn(conn, payer, {
    poolAddress: "So11111111111111111111111111111111111111112",
    amountSol: 0.1,
  });

  expect(sig).toBe("mockSig");
  expect(conn.calls).toEqual(["send", "confirm"]);
});
