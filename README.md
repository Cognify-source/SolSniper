# Solana "Micro‑Scalp" Sniping Bot — Design Brief

> **Mål:** Bygg en bot som automatiskt snipar *nya Raydium‑pooler med minst 4 000 USD i likviditet* (TVL) genom att:
> 1. Köpa små poster (≈ 3 SOL vardera) i högst **tre** raka swap‑transaktioner,
> 2. Vänta cirka **20 sekunder**,
> 3. Sälja i högst **två** transaktioner och sikta på ungefär **10 % vinst** per cykel.
>
> **Inga** aggregator‑ eller multi‑hop‑rutter får användas.

---

\## 1. Handlingslogik

| Fas           | Aktion                                                                                                                                                                | Parametrar               |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| **Discovery** | Prenumerera på *nya* Raydium‑pooler (program‑id `LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj`). Filtrera på `LP_MIN_USD (≥ 4 000)` och första `BuyExactIn`‑händelser. | `LP_MIN_USD=4_000`       |
| **Entry**     | Skicka **1–3** köp à `BUY_SOL` (default 3 SOL) med slippage ≤ `SLIPPAGE` (2 %).                                                                                       | `BUY_GAP=5 s` mellan tx. |
| **Hold**      | Vänta `HOLD_DELAY=20 s`.                                                                                                                                              | —                        |
| **Exit**      | Sälj i **1–2** tx (dela upp om > `EXIT_SIZE`).                                                                                                                        |  `EXIT_SIZE=5 SOL`.      |

---

\## 2. Pool‑kvalitet & Rug‑filters

| Kontroll             | Metod                                                     | Default                     |
| -------------------- | --------------------------------------------------------- | --------------------------- |
| **Likviditet (USD)** | Pyth‑pris × (base+quote tokens).                          | `LP_MIN_USD ≥ 4 000`        |
| **Verifiering**      | Pool‑creator matchar intern whitelist / Raydium‑verified. | `REQUIRE_VERIFY=1`          |
| **Mint‑authority**   | Avslås om mint eller freeze authority ≠ `null`.           | `MINT_AUTH_REQUIRED_NULL=1` |
| **Liquidity‑lock**   | LP‑token owner är ett lock‑konto ≥ `LOCK_MIN_SECS`.       | `LOCK_MIN_SECS=86 400`      |
| **Honeypot‑sim**     | Testswap i devnet‑fork; fail ⇒ hoppa.                     | `HONEYPOT_SIM=1`            |
| **Blacklist**        | Avslås om token/pool i `BLACKLIST.json`.                  | Alltid aktiv                |

---

\## 3. RPC‑hygien

* Endpoint: Chainstack (Basic‑Auth) eller annan archival‑RPC.
* Throttle: Bottleneck `maxConcurrent=5`, `minTime=300 ms`.
* v0‑tx: lägg till `maxSupportedTransactionVersion=0`.

---

\## 4. Transaktions‑format (giltigt köp)

* Toppinstruktion: Raydium AMM `programId = LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj` & `BuyExactIn`.
* `innerInstructions`: 0–2 (token‑konto‑init + två `transferChecked`).
* Ingen Jupiter (`programId` ≠ `JUP4Fb…`).

---

\## 5. Risk & safeguards (runtime)

1. **Slippage guard**: avbryt om `priceImpact > SLIPPAGE`.
2. **TVL guard**: hoppa pooler med TVL > `TVL_MAX_SOL` (standard 300 SOL).
3. **Mempool back‑off**: pausa om ≥ 2 andra buys < 3 s.
4. **Stop‑loss**: exit om PnL < −5 % efter `STOP_LOSS_SECS` (60 s).

---

\## 6. Konfiguration (.env)

```env
CHAINSTACK_USER=<user>
CHAINSTACK_PASS=<pass>
BUY_SOL=3
BUY_GAP=5
HOLD_DELAY=20
EXIT_SIZE=5
LP_MIN_USD=4000
TVL_MAX_SOL=300
SLIPPAGE=2
REQUIRE_VERIFY=1
MINT_AUTH_REQUIRED_NULL=1
LOCK_MIN_SECS=86400
HONEYPOT_SIM=1
STOP_LOSS_SECS=60
```

---

\## 7. Kodskiss (pseudologik)

```python
while True:
    pool = await detect_new_pool()
    if not quality_gate(pool):
        continue

    for _ in range(random.randint(1,3)):
        swap_exact_in(BUY_SOL)
        sleep(BUY_GAP)

    sleep(HOLD_DELAY)
    exit_position(max_tx=2)
```

---

\## 8. Resultatvalidering

* Entry‑batch ≤ 3 tx, varje `innerInstructions` ≤ 2.
* Exit‑batch ≤ 2 tx.
* PnL ≥ 8 % (mål 10 %).
* Inga rug‑flags utlösta.

---

\## 9. Implementation

### 9.1 GitHub‑repo & Codespaces

1. **Skapa ett nytt GitHub‑repo** (t.ex. `solana-sniperbot`).
2. Lägg in denna README / design‑brief i `README.md`.
3. Skapa en **`.devcontainer/`**‑mapp med:

   * `devcontainer.json` – Node 18 image + Yarn/NPM, Python (för Pyth‑sim), Solana CLI.
   * `Dockerfile` (om extra system‑paket krävs).
4. Aktivera **GitHub Codespaces** → "New with Codespace" för snabb IDE‑miljö.
5. Version‑kontrollera **`env.example`** (inte riktiga nycklar) och `BLACKLIST.json`.
6. Lägg till **CI‑workflow** (`.github/workflows/test.yml`) som kör lint + Jest på push.

### 9.2 Stack

* **Node .js / JavaScript** (ESM)

  * `@solana/web3.js` v2 (RPC)
  * `bottleneck` (rate‑limit)
  * `dotenv` (konfiguration)
  * `jest` (tests)
* **Optional:** `ts-node` om du vill skriva i TypeScript.

### 9.3 Rekommenderad mapp‑layout

```
/             # repo‑rot
├─ src/
│  ├─ listeners/      # log‑subscribers
│  ├─ core/           # execution, price impact, PnL calc
│  ├─ utils/          # helpers (Pyth price, rug‑filters)
│  └─ index.js        # entrypoint
├─ .devcontainer/
├─ .github/workflows/
├─ .env.example
└─ README.md
```

Testa allt först i **Codespace‑devnet** innan du pushar mainnet‑nycklar lokalt.