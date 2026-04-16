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
  if (!config.escrowContractId) {
    throw new EscrowLockError("ESCROW_CONTRACT_ID is not configured");
  }
  if (!config.platformSecretKey) {
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
