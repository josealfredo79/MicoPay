import { query, getOne, getMany } from '../db/schema.js';

export interface CashRequest {
  request_id: string;
  merchant_address: string;
  merchant_name: string;
  amount_mxn: number;
  amount_usdc: string;
  htlc_secret: string | null;
  htlc_secret_hash: string;
  htlc_tx_hash: string;
  status: 'pending' | 'accepted' | 'completed' | 'expired';
  created_at: string;
  expires_at: string;
  qr_payload: string;
  payer_address: string;
}

export async function initCashRequestsTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS cash_requests (
      request_id VARCHAR(50) PRIMARY KEY,
      merchant_address VARCHAR(56) NOT NULL,
      merchant_name VARCHAR(255) NOT NULL,
      amount_mxn INTEGER NOT NULL,
      amount_usdc VARCHAR(20) NOT NULL,
      htlc_secret VARCHAR(64),
      htlc_secret_hash VARCHAR(64) NOT NULL,
      htlc_tx_hash VARCHAR(64) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      qr_payload TEXT NOT NULL,
      payer_address VARCHAR(56) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await query(`
    ALTER TABLE cash_requests ADD COLUMN IF NOT EXISTS htlc_secret VARCHAR(64)
  `).catch(() => {});

  await query(`
    ALTER TABLE cash_requests ADD COLUMN IF NOT EXISTS htlc_secret_hash VARCHAR(64)
  `).catch(() => {});

  await query(`
    CREATE INDEX IF NOT EXISTS idx_cash_requests_status ON cash_requests(status)
  `);
  
  await query(`
    CREATE INDEX IF NOT EXISTS idx_cash_requests_merchant ON cash_requests(merchant_address)
  `);
  
  await query(`
    CREATE INDEX IF NOT EXISTS idx_cash_requests_created ON cash_requests(created_at DESC)
  `);
}

export async function createCashRequest(request: CashRequest): Promise<CashRequest> {
  await query(
    `INSERT INTO cash_requests 
     (request_id, merchant_address, merchant_name, amount_mxn, amount_usdc, 
      htlc_secret, htlc_secret_hash, htlc_tx_hash, status, created_at, expires_at, qr_payload, payer_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      request.request_id,
      request.merchant_address,
      request.merchant_name,
      request.amount_mxn,
      request.amount_usdc,
      request.htlc_secret ?? null,
      request.htlc_secret_hash,
      request.htlc_tx_hash,
      request.status,
      request.created_at,
      request.expires_at,
      request.qr_payload,
      request.payer_address,
    ]
  );
  return request;
}

export async function getCashRequest(requestId: string): Promise<CashRequest | null> {
  return getOne<CashRequest>(
    'SELECT * FROM cash_requests WHERE request_id = $1',
    [requestId]
  );
}

export async function updateCashRequestStatus(
  requestId: string,
  status: CashRequest['status']
): Promise<boolean> {
  const result = await query(
    'UPDATE cash_requests SET status = $1, updated_at = NOW() WHERE request_id = $2',
    [status, requestId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getCashRequestsByMerchant(
  merchantAddress: string,
  limit = 50
): Promise<CashRequest[]> {
  return getMany<CashRequest>(
    'SELECT * FROM cash_requests WHERE merchant_address = $1 ORDER BY created_at DESC LIMIT $2',
    [merchantAddress, limit]
  );
}

export async function getCashRequestsByPayer(
  payerAddress: string,
  limit = 50
): Promise<CashRequest[]> {
  return getMany<CashRequest>(
    'SELECT * FROM cash_requests WHERE payer_address = $1 ORDER BY created_at DESC LIMIT $2',
    [payerAddress, limit]
  );
}

export async function getPendingCashRequests(limit = 100): Promise<CashRequest[]> {
  return getMany<CashRequest>(
    `SELECT * FROM cash_requests 
     WHERE status = 'pending' AND expires_at > NOW() 
     ORDER BY created_at ASC LIMIT $1`,
    [limit]
  );
}

export async function getExpiredCashRequests(): Promise<CashRequest[]> {
  return getMany<CashRequest>(
    `SELECT * FROM cash_requests 
     WHERE status = 'pending' AND expires_at <= NOW()`
  );
}

export async function getSecretByRequestId(requestId: string): Promise<string | null> {
  const row = await getOne<{ htlc_secret: string }>(
    'SELECT htlc_secret FROM cash_requests WHERE request_id = $1',
    [requestId]
  );
  return row?.htlc_secret ?? null;
}
