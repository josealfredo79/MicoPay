# 🍄 MicoPay Protocol

<div align="center">

[![Tests](https://img.shields.io/badge/tests-172%20passing-brightgreen)](apps/api/src/__tests__)
[![Rust](https://img.shields.io/badge/Rust-40%20tests-blue)](contracts)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](tsconfig.json)

**The first API that gives AI agents access to physical cash in Mexico**

_Built for Stellar Hacks: Agents — DoraHacks 2026_

</div>

---

## What is MicoPay?

MicoPay is a **trustless crypto-to-cash infrastructure** that enables AI agents to orchestrate physical cash withdrawals in Mexico. It works as a liquidity bridge:

1. **Agent API** — AI agents can find merchants, verify reputation, and initiate USDC→MXN exchanges via HTTP
2. **Mobile App** — Users receive a secure QR code, show it to a merchant, and receive cash

The core innovation: **the same Soroban HTLC contract** powers both interfaces, and the secret is **never exposed in the QR code** — the merchant scans, the backend releases funds on-chain.

```
User: "I need $500 MXN near Roma Norte"

Agent → POST /cash/request (x402 $0.01)
        ← { claim_url, qr_payload, htlc_tx_hash }

User opens claim_url → sees QR → shows to merchant
Merchant scans QR → POST /cash/scan → funds released on Soroban
```

---

## Why It Matters

Over **60% of Mexico's population** is unbanked. Cash is king. Even when someone has USDC — earned freelancing, received from abroad, or bought on an exchange — converting it to physical pesos requires:

- A bank account (most don't have one)
- KYC verification (days or weeks)
- A physical location to pick up cash

**MicoPay solves this** by enabling anyone with a smartphone and some MXN cash to become a liquidity provider. The HTLC guarantees:

- ✅ Merchant **never gets USDC** without handing over cash
- ✅ User **always gets a refund** if no one shows up
- ✅ No escrow service, no bank, no intermediary

---

## Quick Start

```bash
# Clone and install
git clone https://github.com/ericmt-98/micopay-mvp
cd micopay-mvp && npm install

# Configure (uses mock Stellar in demo mode)
cp apps/api/.env.example apps/api/.env

# Start the API (port 3000)
cd apps/api && MOCK_STELLAR=true npm run dev

# Start the frontend (port 5181)
cd micopay/frontend && npm run dev
```

### Create a Cash Request

```bash
curl -X POST http://localhost:3000/api/v1/cash/request \
  -H "x-payment: demo" \
  -H "Content-Type: application/json" \
  -d '{"merchant_address":"GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGKUJI5KOOJ9TXWNTBBS2JN","amount_mxn":500}'
```

Response:

```json
{
  "request_id": "mcr-abc123",
  "status": "pending",
  "claim_url": "http://localhost:5181/claim/mcr-abc123",
  "qr_payload": "micopay://claim?request_id=mcr-abc123&merchant=GCEZWKCA5...",
  "expires_at": "2026-04-22T20:00:00Z"
}
```

### Merchant Confirms (releases funds)

```bash
curl -X POST http://localhost:3000/api/v1/cash/scan \
  -H "Content-Type: application/json" \
  -d '{"request_id":"mcr-abc123","merchant_stellar_address":"GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGKUJI5KOOJ9TXWNTBBS2JN"}'
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Agent (Claude, GPT, etc.)          │
│         "User needs $500 MXN near Roma Norte"           │
└────────────────────────────┬────────────────────────────┘
                             │ x402 micropayments
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   MicoPay Protocol API                    │
│                         :3000                             │
│  POST /cash/request    →  lock() on Soroban + QR       │
│  POST /cash/scan      →  release() on Soroban          │
│  POST /cash/refund   →  refund() after timeout        │
│  GET  /cash/trade/:id →  query HTLC state             │
└────────────────────────────┬───────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   MicopayEscrow (Soroban)                │
│              CBQINHLR3M7NZAPQY7EJ3TWOE22R57LMFDVEMOK3C3X7ZIBFWHVQQP3A  │
│                                                             │
│  lock()    →  escrows USDC                              │
│  release() →  pays merchant + platform fee               │
│  refund()  →  returns to user after timeout             │
└─────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Cash Operations

| Endpoint | Price | Description |
|---|---|---|
| `GET /api/v1/cash/agents` | $0.001 | Find nearby merchants |
| `GET /api/v1/cash/rate` | free | USDC/MXN exchange rate |
| `POST /api/v1/cash/request` | $0.01 | Create cash request (HTLC lock) |
| `POST /api/v1/cash/scan` | free | Merchant confirms → releases funds |
| `POST /api/v1/cash/release` | free | Release funds with secret |
| `POST /api/v1/cash/refund` | free | Refund after timeout |
| `GET /api/v1/cash/trade/:id` | free | Query HTLC state |
| `GET /api/v1/cash/request/:id` | free | Poll request status |

### Reputation & Discovery

| Endpoint | Price | Description |
|---|---|---|
| `GET /api/v1/reputation/:addr` | $0.0005 | On-chain merchant reputation |
| `GET /api/v1/services` | free | Service catalog |
| `WS /ws` | free | WebSocket notifications |

### Demo

| Endpoint | Description |
|---|---|
| `POST /api/v1/demo/run` | Full 6-step agent demo |
| `POST /api/v1/fund` | Meta-demo: fund the protocol |

---

## Security

- **QR Security**: The HTLC secret is **never exposed in the QR code**. It's stored in the database and used only when the merchant calls `/cash/scan`.
- **Replay Protection**: x402 payments use in-memory + file-based tx hash tracking (5-min TTL)
- **Contract Security**:
  - All privileged functions require `require_auth()`
  - Re-initialization prevented
  - Duplicate lock prevention
  - State machine prevents double-spend/double-release
  - TTL extended on every state change

---

## Contracts (Soroban/Rust)

```bash
cd contracts && cargo test
# micopay-escrow: 17 tests ✓
# atomic-swap:   15 tests ✓
# micopay-badges:  8 tests ✓
# htlc-core:      0 tests ✓
```

### Deployed on Stellar Testnet

| Contract | Address |
|---|---|
| MicopayEscrow | `CBQINHLR3M7NZAPQY7EJ3TWOE22R57LMFDVEMOK3C3X7ZIBFWHVQQP3A` |
| AtomicSwapHTLC A | `CCDOUXIXSFXT2HTJAJGFNUJN6CKCYX2M6AL2BHHPEF6ISNHP2BGLS4KX` |
| AtomicSwapHTLC B | `CBLCGG44QQILWEIVBXDSZSLH7NI7SGJQKXQ7WTKP3W3YSXOBTGMZKSNN` |

---

## Repository Structure

```
micopay-protocol/
├── apps/
│   ├── api/                  # Fastify + x402 API
│   │   └── src/
│   │       ├── routes/       # HTTP endpoints
│   │       ├── services/     # Business logic
│   │       └── middleware/    # x402 auth
│   ├── web/                  # Protocol dashboard
│   ├── merchant-scan/         # Merchant QR scanner app
│   └── agent/                # Agent reference implementation
├── contracts/                # Soroban smart contracts
│   ├── micopay-escrow/      # Main escrow contract
│   ├── atomic-swap/          # Cross-chain HTLC
│   ├── micopay-badges/      # Reputation NFTs
│   └── htlc-core/           # Shared trait
├── micopay/frontend/        # User-facing mobile app
└── skill/SKILL.md           # Agent autodiscovery
```

---

## Running Tests

```bash
# API tests
npm test --workspace=apps/api
# 172 tests passing

# Rust tests
cd contracts && cargo test
# 40 tests passing
```

---

## Roadmap

| Timeline | Feature |
|---|---|
| **Now** | Full MVP with secure QR, merchant scan, auto-refund |
| **1-3 months** | Production merchant onboarding, Telegram bot |
| **3-6 months** | Cross-chain AtomicSwap (ETH/BTC → MXN) |
| **6-12 months** | Mainnet launch, 100+ merchants |
| **12+ months** | Multi-city expansion, DAO governance |

---

## License

MIT

---

Built with: **Soroban** · **Stellar SDK** · **Fastify** · **React** · **x402**
# build trigger
