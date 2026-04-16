import { config } from '../config.js';

export interface WatchedSwap {
  swapId: string;
  secretHash: string;
  amount: string;
  timeoutMinutes: number;
  createdAt: number;
  expiresAt: number;
  status: 'watching' | 'claimed' | 'expired' | 'refunded';
  chain: 'stellar' | 'ethereum' | 'solana' | 'bitcoin' | 'unknown';
  counterparty?: string;
  htlcTxHash?: string;
  claimTxHash?: string;
}

export interface RelayerConfig {
  pollIntervalMs: number;
  maxWatchedSwaps: number;
  autoExpireAfterMinutes: number;
}

const DEFAULT_CONFIG: RelayerConfig = {
  pollIntervalMs: 30_000,
  maxWatchedSwaps: 1000,
  autoExpireAfterMinutes: 1440,
};

let relayerConfig: RelayerConfig = { ...DEFAULT_CONFIG };
let pollInterval: ReturnType<typeof setInterval> | null = null;
const watchedSwaps = new Map<string, WatchedSwap>();

export function configureRelayer(config: Partial<RelayerConfig>): void {
  relayerConfig = { ...relayerConfig, ...config };
}

export async function watchSwap(params: {
  swapId: string;
  secretHash: string;
  amount: string;
  timeoutMinutes: number;
  chain?: WatchedSwap['chain'];
  counterparty?: string;
  htlcTxHash?: string;
}): Promise<WatchedSwap> {
  if (watchedSwaps.size >= relayerConfig.maxWatchedSwaps) {
    cleanupExpiredSwaps();
    if (watchedSwaps.size >= relayerConfig.maxWatchedSwaps) {
      throw new Error('Relayer at maximum capacity');
    }
  }

  const now = Date.now();
  const swap: WatchedSwap = {
    swapId: params.swapId,
    secretHash: params.secretHash,
    amount: params.amount,
    timeoutMinutes: params.timeoutMinutes,
    createdAt: now,
    expiresAt: now + params.timeoutMinutes * 60_000,
    status: 'watching',
    chain: params.chain ?? 'unknown',
    counterparty: params.counterparty,
    htlcTxHash: params.htlcTxHash,
    claimTxHash: undefined,
  };

  watchedSwaps.set(params.swapId, swap);
  return swap;
}

export async function unwatchSwap(swapId: string): Promise<boolean> {
  return watchedSwaps.delete(swapId);
}

export async function getSwapStatus(swapId: string): Promise<WatchedSwap | null> {
  const swap = watchedSwaps.get(swapId);
  if (!swap) return null;

  if (swap.status === 'watching' && Date.now() > swap.expiresAt) {
    swap.status = 'expired';
  }

  return swap;
}

export async function claimSwap(
  swapId: string,
  secret: string
): Promise<{ success: boolean; txHash?: string; message: string }> {
  const swap = watchedSwaps.get(swapId);
  if (!swap) {
    return { success: false, message: 'Swap not found' };
  }

  if (swap.status !== 'watching') {
    return { success: false, message: `Swap already ${swap.status}` };
  }

  if (Date.now() > swap.expiresAt) {
    swap.status = 'expired';
    return { success: false, message: 'Swap expired' };
  }

  const { createHash } = await import('crypto');
  const hash = createHash('sha256').update(Buffer.from(secret, 'hex')).digest('hex');

  if (hash !== swap.secretHash) {
    return { success: false, message: 'Invalid secret' };
  }

  try {
    let claimTxHash: string;

    switch (swap.chain) {
      case 'stellar':
        claimTxHash = await claimOnStellar(swap, secret);
        break;
      case 'ethereum':
        claimTxHash = await claimOnEthereum(swap, secret);
        break;
      case 'solana':
        claimTxHash = await claimOnSolana(swap, secret);
        break;
      default:
        return { success: false, message: `Claiming on ${swap.chain} not implemented` };
    }

    swap.status = 'claimed';
    swap.claimTxHash = claimTxHash;

    return { success: true, txHash: claimTxHash, message: 'Swap claimed successfully' };
  } catch (error) {
    return {
      success: false,
      message: `Claim failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export async function refundSwap(
  swapId: string
): Promise<{ success: boolean; txHash?: string; message: string }> {
  const swap = watchedSwaps.get(swapId);
  if (!swap) {
    return { success: false, message: 'Swap not found' };
  }

  if (swap.status !== 'watching') {
    return { success: false, message: `Cannot refund: swap is ${swap.status}` };
  }

  if (Date.now() <= swap.expiresAt) {
    return { success: false, message: 'Swap not expired yet' };
  }

  try {
    let refundTxHash: string;

    switch (swap.chain) {
      case 'stellar':
        refundTxHash = await refundOnStellar(swap);
        break;
      default:
        return { success: false, message: `Refunding on ${swap.chain} not implemented` };
    }

    swap.status = 'refunded';

    return { success: true, txHash: refundTxHash, message: 'Swap refunded successfully' };
  } catch (error) {
    return {
      success: false,
      message: `Refund failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function claimOnStellar(swap: WatchedSwap, secret: string): Promise<string> {
  const { Contract, TransactionBuilder, Networks, Keypair, nativeToScVal, rpc: rpcModule } = await import(
    '@stellar/stellar-sdk'
  );

  const rpc = new rpcModule.Server(config.stellarRpcUrl);
  const keypair = Keypair.fromSecret(config.platformSecretKey);

  const account = await rpc.getAccount(keypair.publicKey());
  const contract = new Contract(config.escrowContractId);

  const tx = new TransactionBuilder(account, {
    fee: '1000000',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      contract.call(
        'release',
        nativeToScVal(Buffer.from(secret, 'hex'), { type: 'bytes' })
      )
    )
    .setTimeout(60)
    .build();

  const prepared = await rpc.prepareTransaction(tx);
  prepared.sign(keypair);

  const result = await rpc.sendTransaction(prepared);
  if (result.status === 'ERROR') {
    throw new Error(`Claim failed: ${JSON.stringify(result.errorResult)}`);
  }

  return result.hash;
}

async function claimOnEthereum(swap: WatchedSwap, secret: string): Promise<string> {
  console.log(`[Relayer] Ethereum claim for ${swap.swapId} - NOT IMPLEMENTED`);
  throw new Error('Ethereum relayer not implemented');
}

async function claimOnSolana(swap: WatchedSwap, secret: string): Promise<string> {
  console.log(`[Relayer] Solana claim for ${swap.swapId} - NOT IMPLEMENTED`);
  throw new Error('Solana relayer not implemented');
}

async function refundOnStellar(swap: WatchedSwap): Promise<string> {
  const { Contract, TransactionBuilder, Networks, Keypair, nativeToScVal, rpc: rpcModule } = await import(
    '@stellar/stellar-sdk'
  );

  const rpc = new rpcModule.Server(config.stellarRpcUrl);
  const keypair = Keypair.fromSecret(config.platformSecretKey);

  const account = await rpc.getAccount(keypair.publicKey());
  const contract = new Contract(config.escrowContractId);

  const tx = new TransactionBuilder(account, {
    fee: '1000000',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      contract.call(
        'refund',
        nativeToScVal(Buffer.from(swap.secretHash, 'hex'), { type: 'bytes' })
      )
    )
    .setTimeout(60)
    .build();

  const prepared = await rpc.prepareTransaction(tx);
  prepared.sign(keypair);

  const result = await rpc.sendTransaction(prepared);
  if (result.status === 'ERROR') {
    throw new Error(`Refund failed: ${JSON.stringify(result.errorResult)}`);
  }

  return result.hash;
}

function cleanupExpiredSwaps(): void {
  const now = Date.now();
  for (const [swapId, swap] of watchedSwaps.entries()) {
    if (swap.status === 'watching' && now > swap.expiresAt) {
      swap.status = 'expired';
    }
    if (swap.status === 'expired' && now - swap.expiresAt > 3600_000) {
      watchedSwaps.delete(swapId);
    }
  }
}

export function startRelayer(): void {
  if (pollInterval) return;

  console.log(`[Relayer] Started with ${relayerConfig.pollIntervalMs}ms poll interval`);
  pollInterval = setInterval(() => {
    cleanupExpiredSwaps();
    checkForExpirableSwaps();
  }, relayerConfig.pollIntervalMs);
}

export function stopRelayer(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
    console.log('[Relayer] Stopped');
  }
}

export function resetRelayer(): void {
  watchedSwaps.clear();
  stopRelayer();
}

function checkForExpirableSwaps(): void {
  for (const swap of watchedSwaps.values()) {
    if (swap.status === 'watching' && Date.now() > swap.expiresAt) {
      console.log(`[Relayer] Swap ${swap.swapId} expired`);
    }
  }
}

export function getRelayerStats(): {
  total: number;
  watching: number;
  claimed: number;
  expired: number;
  refunded: number;
} {
  const stats = { total: 0, watching: 0, claimed: 0, expired: 0, refunded: 0 };

  for (const swap of watchedSwaps.values()) {
    stats.total++;
    stats[swap.status]++;
  }

  return stats;
}

export function getWatchedSwaps(): WatchedSwap[] {
  return Array.from(watchedSwaps.values());
}
