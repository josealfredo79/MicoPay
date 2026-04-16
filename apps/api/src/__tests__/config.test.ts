import { describe, it, expect } from "vitest";
import { z } from "zod";

describe("Config Validation Schema", () => {
  const envSchema = z.object({
    PORT: z.string().default('3000').transform(Number),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.string().optional(),
    
    STELLAR_NETWORK: z.enum(['TESTNET', 'PUBLIC']).default('TESTNET'),
    STELLAR_RPC_URL: z.string().url().default('https://soroban-testnet.stellar.org'),
    
    PLATFORM_SECRET_KEY: z.string().optional(),
    PLATFORM_STELLAR_ADDRESS: z.string().startsWith('G').optional(),
    
    ESCROW_CONTRACT_ID: z.string().optional(),
    MXNE_CONTRACT_ID: z.string().optional(),
    MXNE_ISSUER_ADDRESS: z.string().optional(),
    
    SECRET_ENCRYPTION_KEY: z.string().optional(),
    
    JWT_SECRET: z.string().min(1).default('dev_jwt_secret_change_in_production'),
    JWT_EXPIRY: z.string().default('24h'),
    
    MOCK_STELLAR: z.enum(['true', 'false']).default('false'),
  });

  it("should validate required env vars in production", () => {
    const result = envSchema.safeParse({
      NODE_ENV: "production",
      PLATFORM_SECRET_KEY: "S_REAL_KEY",
      ESCROW_CONTRACT_ID: "C_REAL_CONTRACT",
      JWT_SECRET: "real_jwt_secret",
    });
    
    expect(result.success).toBe(true);
  });

  it("should validate JWT_SECRET length in production", () => {
    const result = envSchema.safeParse({
      NODE_ENV: "production",
      PLATFORM_SECRET_KEY: "S_REAL_KEY",
      ESCROW_CONTRACT_ID: "C_REAL_CONTRACT",
      JWT_SECRET: "dev_jwt_secret_change_in_production",
    });
    
    expect(result.success).toBe(true);
  });

  it("should accept test environment with minimal vars", () => {
    const result = envSchema.safeParse({
      NODE_ENV: "test",
    });
    
    expect(result.success).toBe(true);
    expect(result.data?.PORT).toBe(3000);
    expect(result.data?.STELLAR_NETWORK).toBe("TESTNET");
  });

  it("should transform MOCK_STELLAR to boolean behavior", () => {
    const trueResult = envSchema.safeParse({ MOCK_STELLAR: "true" });
    const falseResult = envSchema.safeParse({ MOCK_STELLAR: "false" });
    
    expect(trueResult.data?.MOCK_STELLAR).toBe("true");
    expect(falseResult.data?.MOCK_STELLAR).toBe("false");
  });

  it("should validate STELLAR_NETWORK enum", () => {
    const testnetResult = envSchema.safeParse({ STELLAR_NETWORK: "TESTNET" });
    const publicResult = envSchema.safeParse({ STELLAR_NETWORK: "PUBLIC" });
    const invalidResult = envSchema.safeParse({ STELLAR_NETWORK: "INVALID" });
    
    expect(testnetResult.success).toBe(true);
    expect(publicResult.success).toBe(true);
    expect(invalidResult.success).toBe(false);
  });

  it("should provide sensible defaults", () => {
    const result = envSchema.safeParse({});
    
    expect(result.success).toBe(true);
    expect(result.data?.PORT).toBe(3000);
    expect(result.data?.NODE_ENV).toBe("development");
    expect(result.data?.STELLAR_RPC_URL).toBe("https://soroban-testnet.stellar.org");
    expect(result.data?.JWT_SECRET).toBe("dev_jwt_secret_change_in_production");
  });
});
