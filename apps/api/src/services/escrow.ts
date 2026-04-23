import * as StellarSdk from "@stellar/stellar-sdk";
import { config } from "../config.js";

export class EscrowLockError extends Error {
  constructor(message: string, public readonly isRetryable: boolean = false) {
    super(message);
    this.name = "EscrowLockError";
  }
}

const RPC_URL = config.stellarRpcUrl;
const NET = config.stellarNetwork === "PUBLIC" 
  ? StellarSdk.Networks.PUBLIC 
  : StellarSdk.Networks.TESTNET;

export async function lockEscrow(
  amountUsdc: number,
  secretHash: string,
  timeoutMinutes: number,
): Promise<string> {
  console.log("[lockEscrow] Starting with amount:", amountUsdc, "secretHash:", secretHash.slice(0, 16), "...");
  console.log("[lockEscrow] Config - mockStellar:", config.mockStellar, "escrowContractId:", config.escrowContractId ? config.escrowContractId.slice(0, 8) + "..." : "NOT SET");
  
  if (config.mockStellar) {
    const hashPart = secretHash.slice(0, 32);
    const mockTxHash = Buffer.from(hashPart, "hex").toString("hex") + Date.now().toString(16).padStart(12, "0");
    console.log("[Mock] Escrow locked:", mockTxHash);
    return mockTxHash;
  }

  if (!config.escrowContractId) {
    console.error("[lockEscrow] ESCROW_CONTRACT_ID is not configured!");
    throw new EscrowLockError("ESCROW_CONTRACT_ID is not configured");
  }
  if (!config.platformSecretKey) {
    console.error("[lockEscrow] PLATFORM_SECRET_KEY is not configured!");
    throw new EscrowLockError("PLATFORM_SECRET_KEY is not configured");
  }

  const sellerKP = StellarSdk.Keypair.fromSecret(config.platformSecretKey);
  const buyerAddress = sellerKP.publicKey();

  const rpc = new StellarSdk.rpc.Server(RPC_URL);
  const account = await rpc.getAccount(sellerKP.publicKey());
  const contract = new StellarSdk.Contract(config.escrowContractId);

  const amountStroops = BigInt(Math.round(amountUsdc * 10_000_000));
  const platformFee = BigInt(0);

  const args = [
    StellarSdk.Address.fromString(sellerKP.publicKey()).toScVal(),
    StellarSdk.Address.fromString(buyerAddress).toScVal(),
    StellarSdk.nativeToScVal(amountStroops, { type: "i128" }),
    StellarSdk.nativeToScVal(platformFee, { type: "i128" }),
    StellarSdk.xdr.ScVal.scvBytes(Buffer.from(secretHash, "hex")),
    StellarSdk.nativeToScVal(timeoutMinutes, { type: "u32" }),
  ];

  let tx = new StellarSdk.TransactionBuilder(account, { fee: "1000000", networkPassphrase: NET })
    .addOperation(contract.call("lock", ...args))
    .setTimeout(180)
    .build();

  const sim = await rpc.simulateTransaction(tx);
  if (StellarSdk.rpc.Api.isSimulationError(sim)) {
    throw new EscrowLockError(`Escrow simulation failed: ${sim.error}`, true);
  }

  tx = StellarSdk.rpc.assembleTransaction(tx, sim).build();
  tx.sign(sellerKP);

  const result = await rpc.sendTransaction(tx);
  if (result.status === "ERROR") {
    throw new EscrowLockError(`Escrow send failed: ${JSON.stringify(result.errorResult)}`);
  }

  const horizonUrl = `https://horizon-testnet.stellar.org/transactions/${result.hash}`;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, i === 0 ? 1000 : 1500));
    try {
      const res = await fetch(horizonUrl);
      if (res.ok) {
        const data = await res.json() as { successful: boolean };
        if (data.successful) return result.hash;
        throw new EscrowLockError(`Escrow tx failed on-chain: ${result.hash}`);
      }
    } catch (err: unknown) {
      if (err instanceof EscrowLockError) throw err;
    }
  }
  throw new EscrowLockError(`Escrow timeout waiting for confirmation: ${result.hash}`, true);
}

export async function releaseEscrow(
  tradeId: string,
  secret: string,
): Promise<string> {
  if (config.mockStellar) {
    const mockTxHash = "mock_release_" + Buffer.from(tradeId.slice(0, 16), "hex").toString("hex");
    console.log("[Mock] Escrow released:", mockTxHash);
    return mockTxHash;
  }

  if (!config.escrowContractId) {
    throw new EscrowLockError("ESCROW_CONTRACT_ID is not configured");
  }
  if (!config.platformSecretKey) {
    throw new EscrowLockError("PLATFORM_SECRET_KEY is not configured");
  }

  const sellerKP = StellarSdk.Keypair.fromSecret(config.platformSecretKey);

  const rpc = new StellarSdk.rpc.Server(RPC_URL);
  const account = await rpc.getAccount(sellerKP.publicKey());
  const contract = new StellarSdk.Contract(config.escrowContractId);

  const tradeIdBytes = Buffer.from(tradeId, "hex");
  const secretBytes = Buffer.from(secret, "utf8");

  const args = [
    StellarSdk.xdr.ScVal.scvBytes(tradeIdBytes),
    StellarSdk.xdr.ScVal.scvBytes(secretBytes),
  ];

  let tx = new StellarSdk.TransactionBuilder(account, { fee: "1000000", networkPassphrase: NET })
    .addOperation(contract.call("release", ...args))
    .setTimeout(180)
    .build();

  const sim = await rpc.simulateTransaction(tx);
  if (StellarSdk.rpc.Api.isSimulationError(sim)) {
    throw new EscrowLockError(`Escrow release simulation failed: ${sim.error}`, true);
  }

  tx = StellarSdk.rpc.assembleTransaction(tx, sim).build();
  tx.sign(sellerKP);

  const result = await rpc.sendTransaction(tx);
  if (result.status === "ERROR") {
    throw new EscrowLockError(`Escrow release failed: ${JSON.stringify(result.errorResult)}`);
  }

  const horizonUrl = `https://horizon-testnet.stellar.org/transactions/${result.hash}`;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, i === 0 ? 1000 : 1500));
    try {
      const res = await fetch(horizonUrl);
      if (res.ok) {
        const data = await res.json() as { successful: boolean };
        if (data.successful) return result.hash;
        throw new EscrowLockError(`Release tx failed on-chain: ${result.hash}`);
      }
    } catch (err: unknown) {
      if (err instanceof EscrowLockError) throw err;
    }
  }
  throw new EscrowLockError(`Release timeout waiting for confirmation: ${result.hash}`, true);
}

export async function refundEscrow(
  tradeId: string,
): Promise<string> {
  if (config.mockStellar) {
    const mockTxHash = "mock_refund_" + Buffer.from(tradeId.slice(0, 16), "hex").toString("hex");
    console.log("[Mock] Escrow refunded:", mockTxHash);
    return mockTxHash;
  }

  if (!config.escrowContractId) {
    throw new EscrowLockError("ESCROW_CONTRACT_ID is not configured");
  }
  if (!config.platformSecretKey) {
    throw new EscrowLockError("PLATFORM_SECRET_KEY is not configured");
  }

  const sellerKP = StellarSdk.Keypair.fromSecret(config.platformSecretKey);

  const rpc = new StellarSdk.rpc.Server(RPC_URL);
  const account = await rpc.getAccount(sellerKP.publicKey());
  const contract = new StellarSdk.Contract(config.escrowContractId);

  const tradeIdBytes = Buffer.from(tradeId, "hex");

  const args = [
    StellarSdk.xdr.ScVal.scvBytes(tradeIdBytes),
  ];

  let tx = new StellarSdk.TransactionBuilder(account, { fee: "1000000", networkPassphrase: NET })
    .addOperation(contract.call("refund", ...args))
    .setTimeout(180)
    .build();

  const sim = await rpc.simulateTransaction(tx);
  if (StellarSdk.rpc.Api.isSimulationError(sim)) {
    throw new EscrowLockError(`Escrow refund simulation failed: ${sim.error}`, true);
  }

  tx = StellarSdk.rpc.assembleTransaction(tx, sim).build();
  tx.sign(sellerKP);

  const result = await rpc.sendTransaction(tx);
  if (result.status === "ERROR") {
    throw new EscrowLockError(`Escrow refund failed: ${JSON.stringify(result.errorResult)}`);
  }

  const horizonUrl = `https://horizon-testnet.stellar.org/transactions/${result.hash}`;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, i === 0 ? 1000 : 1500));
    try {
      const res = await fetch(horizonUrl);
      if (res.ok) {
        const data = await res.json() as { successful: boolean };
        if (data.successful) return result.hash;
        throw new EscrowLockError(`Refund tx failed on-chain: ${result.hash}`);
      }
    } catch (err: unknown) {
      if (err instanceof EscrowLockError) throw err;
    }
  }
  throw new EscrowLockError(`Refund timeout waiting for confirmation: ${result.hash}`, true);
}

export async function getTrade(
  tradeId: string,
): Promise<{
  seller: string;
  buyer: string;
  amount: string;
  platform_fee: string;
  status: string;
  timeout_ledger: number;
} | null> {
  if (!config.escrowContractId) {
    return null;
  }
  if (!config.platformSecretKey) {
    return null;
  }

  const rpc = new StellarSdk.rpc.Server(RPC_URL);
  const contract = new StellarSdk.Contract(config.escrowContractId);
  const sellerKP = StellarSdk.Keypair.fromSecret(config.platformSecretKey);
  const account = await rpc.getAccount(sellerKP.publicKey());

  const tradeIdBytes = Buffer.from(tradeId, "hex");

  const simTx = new StellarSdk.TransactionBuilder(account, { fee: "100000", networkPassphrase: NET })
    .addOperation(contract.call("get_trade", StellarSdk.xdr.ScVal.scvBytes(tradeIdBytes)))
    .setTimeout(0)
    .build();

  try {
    const sim = await rpc.simulateTransaction(simTx);
    if (!StellarSdk.rpc.Api.isSimulationSuccess(sim)) {
      return null;
    }

    const resultValue = (sim as unknown as { result: unknown }).result;
    if (!resultValue) {
      return null;
    }

    let val: unknown = resultValue;
    while (typeof val === "object" && val !== null && "value" in val) {
      val = (val as { value: unknown }).value;
    }

    const arr = Array.isArray(val) ? val : [val];
    if (arr.length < 6) {
      return null;
    }

    const getStr = (v: unknown): string => {
      try {
        return (v as Record<string, unknown>)?._value?.toString() ?? "";
      } catch { return ""; }
    };

    return {
      seller: getStr(arr[0]),
      buyer: getStr(arr[1]),
      amount: getStr(arr[2]),
      platform_fee: getStr(arr[3]),
      status: getStr(arr[4]),
      timeout_ledger: parseInt(getStr(arr[5]), 10) || 0,
    };
  } catch {
    return null;
  }
}

export async function getSecretByRequestId(requestId: string): Promise<string | null> {
  const { getSecretByRequestId: getSecret } = await import('./cash-requests.js');
  return getSecret(requestId);
}
