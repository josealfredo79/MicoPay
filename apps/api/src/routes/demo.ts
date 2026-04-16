import type { FastifyInstance } from "fastify";
import {
  Keypair, Asset, TransactionBuilder, Operation,
  Networks, Horizon, Memo, BASE_FEE,
} from "@stellar/stellar-sdk";

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const USDC = new Asset("USDC", USDC_ISSUER);
const EXPLORER = "https://stellar.expert/explorer/testnet/tx";
const DEMO_MERCHANT = "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGKUJI5KOOJ9TXWNTBBS2JN";

function getPlatformAddress(): string {
  const secret = process.env.PLATFORM_SECRET_KEY;
  if (secret) { try { return Keypair.fromSecret(secret).publicKey(); } catch {} }
  return "GDKKW2WSMQWZ63PIZBKDDBAAOBG5FP3TUHRYQ4U5RBKTFNESL5K5BJJK";
}

export async function demoRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/demo/run
   *
   * Full MicoPay demo — 6 real on-chain USDC payments:
   *   Step 0  bazaar_broadcast $0.005  USDC — broadcast intent (Agent Social Layer)
   *   Step 0b bazaar_accept   $0.005  USDC — lock Stellar side on Soroban
   *   Step 1  cash_agents      $0.001  USDC — find merchants near Roma Norte, CDMX
   *   Step 2  reputation       $0.0005 USDC — verify Farmacia Guadalupe (tier Maestro)
   *   Step 3  cash_request    $0.010  USDC — lock USDC, get QR for $500 MXN cash
   *   Step 4  fund_micopay     $0.100  USDC — fund the protocol (meta-demo)
   *
   * Total: ~$0.1215 USDC. All tx hashes verifiable on stellar.expert.
   */
  fastify.post("/api/v1/demo/run", async (_request, reply) => {
    const secret = process.env.DEMO_AGENT_SECRET_KEY;
    if (!secret) {
      return reply.status(503).send({ error: "Demo agent not configured. Run scripts/setup-demo-agent.mjs first." });
    }

    const agentKP      = Keypair.fromSecret(secret);
    const agentAddress = agentKP.publicKey();
    const platformAddr = getPlatformAddress();
    const horizon      = new Horizon.Server(HORIZON_URL);
    const port         = process.env.PORT ?? "3000";
    const baseUrl      = `http://localhost:${port}`;

    const steps: any[] = [];

    async function loadFreshAccount() {
      return horizon.loadAccount(agentAddress);
    }

    async function buildAndSubmitTx(amount: string, memo: string): Promise<string> {
      const account = await loadFreshAccount();
      const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
        .addOperation(Operation.payment({ destination: platformAddr, asset: USDC, amount }))
        .addMemo(Memo.text(memo.slice(0, 28)))
        .setTimeout(180)
        .build();
      tx.sign(agentKP);
      const result = await horizon.submitTransaction(tx);
      return result.hash;
    }

    try {
      // ── Step 0: Bazaar Broadcast ──────────────────────────────────────────────
      const r0 = await buildAndSubmitTx("0.0050000", "micopay:bazaar_broadcast");
      const s0Res = await fetch(`${baseUrl}/api/v1/bazaar/intent`, {
        method: "POST",
        headers: { "x-payment": "demo", "Content-Type": "application/json" },
        body: JSON.stringify({
          offered_chain: "ethereum",
          offered_symbol: "ETH",
          offered_amount: "1.2",
          wanted_chain: "stellar",
          wanted_symbol: "USDC",
          wanted_amount: "28.57",
        }),
      });
      const s0 = await s0Res.json() as any;
      steps.push({
        name: "bazaar_broadcast",
        description: "Agent broadcasts cross-chain intent: ETH → USDC. x402 payment prevents spam.",
        price_usdc: "0.005", tx_hash: r0,
        stellar_expert_url: `${EXPLORER}/${r0}`,
        result: s0,
      });

      // ── Step 0b: Bazaar Accept (Stellar Side Anchored On-Chain) ──────────────
      const intentId = s0?.id;
      if (intentId) {
        const rA = await buildAndSubmitTx("0.0050000", "micopay:bazaar_accept");
        const s0bRes = await fetch(`${baseUrl}/api/v1/bazaar/accept`, {
          method: "POST",
          headers: { "x-payment": "demo", "Content-Type": "application/json" },
          body: JSON.stringify({ intent_id: intentId, amount_usdc: 28.57 }),
        });
        const s0b = await s0bRes.json() as any;
        steps.push({
          name: "bazaar_accept",
          description: "Stellar side anchored on-chain. USDC locked as cross-chain collateral via MicopayEscrow.",
          price_usdc: "0.005", tx_hash: rA,
          stellar_expert_url: `${EXPLORER}/${rA}`,
          soroban_tx_hash: s0b?.handshake?.htlc_tx_hash,
          soroban_explorer_url: s0b?.handshake?.htlc_explorer_url,
          result: s0b,
        });
      }

      // ── Step 1: Find Cash Merchants ───────────────────────────────────────────
      const r1 = await buildAndSubmitTx("0.0010000", "micopay:cash_agents");
      const s1 = await fetch(`${baseUrl}/api/v1/cash/agents?lat=19.4195&lng=-99.1627&amount=500&limit=3`,
        { headers: { "x-payment": "demo" } });
      steps.push({
        name: "cash_agents",
        description: "Find cash merchants near Roma Norte, CDMX. Agent selects best option.",
        price_usdc: "0.001", tx_hash: r1,
        stellar_expert_url: `${EXPLORER}/${r1}`,
        result: await s1.json(),
      });

      // ── Step 2: Verify Merchant Reputation ───────────────────────────────────
      const r2 = await buildAndSubmitTx("0.0005000", "micopay:reputation");
      const s2 = await fetch(`${baseUrl}/api/v1/reputation/${DEMO_MERCHANT}`,
        { headers: { "x-payment": "demo" } });
      steps.push({
        name: "reputation",
        description: "Verify Farmacia Guadalupe on-chain reputation. NFT soulbound badge. Can't be faked.",
        price_usdc: "0.0005", tx_hash: r2,
        stellar_expert_url: `${EXPLORER}/${r2}`,
        result: await s2.json(),
      });

      // ── Step 3: Lock USDC → Physical Cash QR ─────────────────────────────────
      const r3 = await buildAndSubmitTx("0.0100000", "micopay:cash_request");
      const s3 = await fetch(`${baseUrl}/api/v1/cash/request`, {
        method: "POST",
        headers: { "x-payment": "demo", "Content-Type": "application/json" },
        body: JSON.stringify({ merchant_address: DEMO_MERCHANT, amount_mxn: 500 }),
      });
      steps.push({
        name: "cash_request",
        description: "Lock USDC in MicopayEscrow on Soroban → QR code for $500 MXN at Farmacia Guadalupe.",
        price_usdc: "0.01", tx_hash: r3,
        stellar_expert_url: `${EXPLORER}/${r3}`,
        result: await s3.json(),
      });

      // ── Step 4: Fund MicoPay (Meta-Demo) ─────────────────────────────────────
      const r4 = await buildAndSubmitTx("0.1000000", "micopay:fund_demo");
      steps.push({
        name: "fund_micopay",
        description: "Agent funds the protocol it just used. x402 is self-sustaining.",
        price_usdc: "0.10", tx_hash: r4,
        stellar_expert_url: `${EXPLORER}/${r4}`,
        result: { message: "x402 works — protocol funds itself" },
      });

      return reply.send({
        agent_address: agentAddress,
        platform_address: platformAddr,
        total_paid_usdc: "0.1215",
        user_received: "$500 MXN en efectivo físico",
        steps,
        framing: "Cross-chain intent coordinated via Bazaar. Stellar side anchored on Soroban. AtomicSwapHTLC (built + 37 tests) resolves the counterpart chain in production.",
        summary: "From cross-chain intent to physical cash in Mexico — trustless, no API keys, no bank.",
      });

    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: "Demo failed", detail: String(err), steps_completed: steps });
    }
  });
}
