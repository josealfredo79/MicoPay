import { query, getOne, getMany } from './schema.js';

export interface X402PaymentRow {
  tx_hash: string;
  payer_address: string;
  amount_usdc: string;
  service: string;
  created_at: Date;
  expires_at: Date;
  used: boolean;
}

export async function initX402Tables(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS x402_payments (
      tx_hash         VARCHAR(64) PRIMARY KEY,
      payer_address   VARCHAR(56) NOT NULL,
      amount_usdc     VARCHAR(32) NOT NULL,
      service         VARCHAR(64) NOT NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at      TIMESTAMPTZ NOT NULL,
      used            BOOLEAN NOT NULL DEFAULT FALSE
    );

    CREATE INDEX IF NOT EXISTS idx_x402_payments_expires ON x402_payments(expires_at);
    CREATE INDEX IF NOT EXISTS idx_x402_payments_payer ON x402_payments(payer_address);
  `);
}

export async function isPaymentUsed(txHash: string): Promise<boolean> {
  const payment = await getOne<Pick<X402PaymentRow, 'tx_hash' | 'used' | 'expires_at'>>(
    'SELECT tx_hash, used, expires_at FROM x402_payments WHERE tx_hash = $1',
    [txHash]
  );

  if (!payment) return false;

  if (new Date() > new Date(payment.expires_at)) {
    return false;
  }

  return payment.used;
}

export async function markPaymentUsed(
  txHash: string,
  payerAddress: string,
  amountUsdc: string,
  service: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await query(`
    INSERT INTO x402_payments (tx_hash, payer_address, amount_usdc, service, expires_at, used)
    VALUES ($1, $2, $3, $4, $5, TRUE)
    ON CONFLICT (tx_hash) DO UPDATE SET used = TRUE
  `, [txHash, payerAddress, amountUsdc, service, expiresAt.toISOString()]);
}

export async function cleanupExpiredPayments(): Promise<number> {
  const result = await query('DELETE FROM x402_payments WHERE expires_at < NOW() AND used = TRUE');
  return result.rowCount ?? 0;
}

export async function getPaymentStats(): Promise<{
  total_payments: number;
  active_payments: number;
  expired_payments: number;
}> {
  const total = await getOne<{ count: string }>('SELECT COUNT(*) as count FROM x402_payments');
  const active = await getOne<{ count: string }>(
    "SELECT COUNT(*) as count FROM x402_payments WHERE expires_at > NOW() AND used = TRUE"
  );
  const expired = await getOne<{ count: string }>(
    "SELECT COUNT(*) as count FROM x402_payments WHERE expires_at < NOW()"
  );

  return {
    total_payments: parseInt(total?.count ?? '0', 10),
    active_payments: parseInt(active?.count ?? '0', 10),
    expired_payments: parseInt(expired?.count ?? '0', 10),
  };
}
