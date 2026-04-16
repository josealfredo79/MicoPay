import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { 
  initCashRequestsTable,
  createCashRequest,
  getCashRequest,
  updateCashRequestStatus,
  getCashRequestsByMerchant,
  getPendingCashRequests,
  type CashRequest
} from "../services/cash-requests.js";

vi.mock("../db/schema.js", () => ({
  query: vi.fn(),
  getOne: vi.fn(),
  getMany: vi.fn(),
}));

const { query, getOne, getMany } = await import("../db/schema.js");

describe("Cash Requests Repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initCashRequestsTable", () => {
    it("should create cash_requests table and indexes", async () => {
      await initCashRequestsTable();
      
      expect(query).toHaveBeenCalledTimes(4);
      expect(query).toHaveBeenNthCalledWith(1, expect.stringContaining("CREATE TABLE IF NOT EXISTS cash_requests"));
      expect(query).toHaveBeenNthCalledWith(2, expect.stringContaining("CREATE INDEX"));
      expect(query).toHaveBeenNthCalledWith(3, expect.stringContaining("CREATE INDEX"));
      expect(query).toHaveBeenNthCalledWith(4, expect.stringContaining("CREATE INDEX"));
    });
  });

  describe("createCashRequest", () => {
    it("should insert a cash request into the database", async () => {
      const mockRequest: CashRequest = {
        request_id: "mcr-12345678",
        merchant_address: "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGKUJI5KOOJ9TXWNTBBS2JN",
        merchant_name: "Test Merchant",
        amount_mxn: 500,
        amount_usdc: "5.0000",
        htlc_secret_hash: "abc123def456",
        htlc_tx_hash: "tx_hash_123",
        status: "pending",
        created_at: "2026-04-16T12:00:00Z",
        expires_at: "2026-04-16T14:00:00Z",
        qr_payload: "micopay://claim?request_id=mcr-12345678",
        payer_address: "GAIKZIUYGD7J26CKDWZEFQBL43HLJKQUTQR3UYS7II7XNM7U6L3EQBZ7",
      };

      await createCashRequest(mockRequest);

      expect(query).toHaveBeenCalledTimes(1);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO cash_requests"),
        [
          mockRequest.request_id,
          mockRequest.merchant_address,
          mockRequest.merchant_name,
          mockRequest.amount_mxn,
          mockRequest.amount_usdc,
          mockRequest.htlc_secret_hash,
          mockRequest.htlc_tx_hash,
          mockRequest.status,
          mockRequest.created_at,
          mockRequest.expires_at,
          mockRequest.qr_payload,
          mockRequest.payer_address,
        ]
      );
    });
  });

  describe("getCashRequest", () => {
    it("should return a cash request by ID", async () => {
      const mockRequest: CashRequest = {
        request_id: "mcr-12345678",
        merchant_address: "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGKUJI5KOOJ9TXWNTBBS2JN",
        merchant_name: "Test Merchant",
        amount_mxn: 500,
        amount_usdc: "5.0000",
        htlc_secret_hash: "abc123def456",
        htlc_tx_hash: "tx_hash_123",
        status: "pending",
        created_at: "2026-04-16T12:00:00Z",
        expires_at: "2026-04-16T14:00:00Z",
        qr_payload: "micopay://claim?request_id=mcr-12345678",
        payer_address: "GAIKZIUYGD7J26CKDWZEFQBL43HLJKQUTQR3UYS7II7XNM7U6L3EQBZ7",
      };

      vi.mocked(getOne).mockResolvedValue(mockRequest);

      const result = await getCashRequest("mcr-12345678");

      expect(result).toEqual(mockRequest);
      expect(getOne).toHaveBeenCalledWith(
        expect.stringContaining("SELECT * FROM cash_requests"),
        ["mcr-12345678"]
      );
    });

    it("should return null when request not found", async () => {
      vi.mocked(getOne).mockResolvedValue(null);

      const result = await getCashRequest("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("updateCashRequestStatus", () => {
    it("should update the status of a cash request", async () => {
      vi.mocked(query).mockResolvedValue({ rowCount: 1 } as any);

      const result = await updateCashRequestStatus("mcr-12345678", "completed");

      expect(result).toBe(true);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE cash_requests SET status"),
        ["completed", "mcr-12345678"]
      );
    });

    it("should return false when request not found", async () => {
      vi.mocked(query).mockResolvedValue({ rowCount: 0 } as any);

      const result = await updateCashRequestStatus("non-existent", "completed");

      expect(result).toBe(false);
    });
  });

  describe("getCashRequestsByMerchant", () => {
    it("should return cash requests for a merchant", async () => {
      const mockRequests: CashRequest[] = [
        {
          request_id: "mcr-1",
          merchant_address: "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGKUJI5KOOJ9TXWNTBBS2JN",
          merchant_name: "Test Merchant",
          amount_mxn: 500,
          amount_usdc: "5.0000",
          htlc_secret_hash: "abc123",
          htlc_tx_hash: "tx1",
          status: "pending",
          created_at: "2026-04-16T12:00:00Z",
          expires_at: "2026-04-16T14:00:00Z",
          qr_payload: "micopay://claim?request_id=mcr-1",
          payer_address: "GPAYER1",
        },
      ];

      vi.mocked(getMany).mockResolvedValue(mockRequests);

      const result = await getCashRequestsByMerchant("GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGKUJI5KOOJ9TXWNTBBS2JN");

      expect(result).toEqual(mockRequests);
      expect(getMany).toHaveBeenCalledWith(
        expect.stringContaining("WHERE merchant_address"),
        expect.arrayContaining(["GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGKUJI5KOOJ9TXWNTBBS2JN"])
      );
    });
  });

  describe("getPendingCashRequests", () => {
    it("should return pending cash requests that haven't expired", async () => {
      const mockRequests: CashRequest[] = [
        {
          request_id: "mcr-1",
          merchant_address: "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGKUJI5KOOJ9TXWNTBBS2JN",
          merchant_name: "Test Merchant",
          amount_mxn: 500,
          amount_usdc: "5.0000",
          htlc_secret_hash: "abc123",
          htlc_tx_hash: "tx1",
          status: "pending",
          created_at: "2026-04-16T12:00:00Z",
          expires_at: "2026-04-16T14:00:00Z",
          qr_payload: "micopay://claim?request_id=mcr-1",
          payer_address: "GPAYER1",
        },
      ];

      vi.mocked(getMany).mockResolvedValue(mockRequests);

      const result = await getPendingCashRequests(10);

      expect(result).toEqual(mockRequests);
      expect(getMany).toHaveBeenCalledWith(
        expect.stringContaining("WHERE status = 'pending'"),
        [10]
      );
    });
  });
});
