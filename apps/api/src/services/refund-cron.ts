import { config } from "../config.js";
import { createHash } from "crypto";
import { refundEscrow, EscrowLockError } from "./escrow.js";
import { getExpiredCashRequests, updateCashRequestStatus, type CashRequest } from "./cash-requests.js";
import { query } from "../db/schema.js";

const REFUND_BATCH_SIZE = 10;
const POLL_INTERVAL_MS = 60_000;

let isRunning = false;
let intervalId: ReturnType<typeof setInterval> | null = null;

async function processExpiredRequests(): Promise<{
  processed: number;
  refunded: number;
  failed: number;
  errors: string[];
}> {
  const result = { processed: 0, refunded: 0, failed: 0, errors: [] as string[] };

  try {
    const expired = await getExpiredCashRequests();
    result.processed = expired.length;

    if (expired.length === 0) {
      return result;
    }

    for (const req of expired.slice(0, REFUND_BATCH_SIZE)) {
      try {
        const tradeId = computeTradeId(req);
        const txHash = await refundEscrow(tradeId);

        await updateCashRequestStatus(req.request_id, "expired");
        await clearSensitiveData(req.request_id);

        result.refunded++;
        console.log(`[RefundCron] Refunded ${req.request_id}: ${txHash}`);
      } catch (err) {
        result.failed++;
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`${req.request_id}: ${msg}`);
        console.error(`[RefundCron] Failed ${req.request_id}: ${msg}`);

        if (err instanceof EscrowLockError && !err.isRetryable) {
          await updateCashRequestStatus(req.request_id, "expired");
          await clearSensitiveData(req.request_id);
        }
      }
    }
  } catch (err) {
    console.error("[RefundCron] Poll error:", err);
  }

  return result;
}

function computeTradeId(req: CashRequest): string {
  const secretHashBytes = Buffer.from(req.htlc_secret_hash, "hex");
  return createHash("sha256").update(secretHashBytes).digest("hex");
}

async function clearSensitiveData(requestId: string): Promise<void> {
  try {
    await query(
      "UPDATE cash_requests SET htlc_secret = NULL, htlc_secret_hash = NULL WHERE request_id = $1",
      [requestId]
    );
  } catch {
    // Best effort
  }
}

export async function startRefundCron(): Promise<void> {
  if (intervalId !== null) {
    console.warn("[RefundCron] Already running");
    return;
  }

  if (config.mockStellar) {
    console.log("[RefundCron] Skipping (mockStellar mode)");
    return;
  }

  console.log(`[RefundCron] Starting (poll every ${POLL_INTERVAL_MS / 1000}s)`);

  await processExpiredRequests();

  intervalId = setInterval(async () => {
    if (isRunning) {
      console.log("[RefundCron] Previous run still in progress, skipping");
      return;
    }
    isRunning = true;
    try {
      await processExpiredRequests();
    } finally {
      isRunning = false;
    }
  }, POLL_INTERVAL_MS);
}

export function stopRefundCron(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[RefundCron] Stopped");
  }
}

export function getRefundCronStatus(): { running: boolean; nextPollMs: number } {
  return {
    running: intervalId !== null,
    nextPollMs: isRunning ? -1 : POLL_INTERVAL_MS,
  };
}