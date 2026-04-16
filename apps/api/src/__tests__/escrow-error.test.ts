import { describe, it, expect } from "vitest";

describe("EscrowLockError", () => {
  it("should create non-retryable error by default", async () => {
    const { EscrowLockError } = await import("../services/escrow.js");
    
    const error = new EscrowLockError("Test error");
    
    expect(error.name).toBe("EscrowLockError");
    expect(error.message).toBe("Test error");
    expect(error.isRetryable).toBe(false);
  });

  it("should create retryable error when specified", async () => {
    const { EscrowLockError } = await import("../services/escrow.js");
    
    const error = new EscrowLockError("Temporary failure", true);
    
    expect(error.message).toBe("Temporary failure");
    expect(error.isRetryable).toBe(true);
  });

  it("should be instance of Error", async () => {
    const { EscrowLockError } = await import("../services/escrow.js");
    
    const error = new EscrowLockError("Test");
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(EscrowLockError);
  });
});
