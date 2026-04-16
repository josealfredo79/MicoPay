import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

function loadEnv() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const envPath = join(__dirname, '..', '.env');
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.substring(0, eqIndex).trim();
      const value = trimmed.substring(eqIndex + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

if (process.env.NODE_ENV !== 'production') {
  loadEnv();
}

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

function validateEnv() {
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    const isTest = process.env.NODE_ENV === 'test';
    if (!isTest) {
      const errors = result.error.issues.map(issue => 
        `  - ${issue.path.join('.')}: ${issue.message}`
      );
      console.error('\n❌ Invalid environment configuration:\n' + errors.join('\n') + '\n');
      console.error('Copy .env.example to .env and fill in the required values.\n');
      process.exit(1);
    }
  }
  
  const env = result.success ? result.data : {
    PORT: 3000,
    NODE_ENV: 'test' as const,
    STELLAR_NETWORK: 'TESTNET' as const,
    STELLAR_RPC_URL: 'https://soroban-testnet.stellar.org',
    PLATFORM_SECRET_KEY: 'S_TEST',
    ESCROW_CONTRACT_ID: 'C_TEST',
    MXNE_CONTRACT_ID: undefined,
    MXNE_ISSUER_ADDRESS: undefined,
    SECRET_ENCRYPTION_KEY: undefined,
    JWT_SECRET: 'test_secret',
    JWT_EXPIRY: '24h',
    MOCK_STELLAR: 'false' as const,
  };
  
  if (env.NODE_ENV === 'production' && env.JWT_SECRET === 'dev_jwt_secret_change_in_production') {
    console.error('\n❌ JWT_SECRET must be changed from default in production!\n');
    process.exit(1);
  }
  
  if (env.NODE_ENV === 'production' && env.STELLAR_NETWORK !== 'PUBLIC') {
    console.warn('\n⚠️  WARNING: Running in production but using TESTNET!\n');
  }
  
  return env;
}

const env = validateEnv();

export const config = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  databaseUrl: env.DATABASE_URL ?? '',
  
  stellarNetwork: env.STELLAR_NETWORK,
  stellarRpcUrl: env.STELLAR_RPC_URL,
  platformSecretKey: env.PLATFORM_SECRET_KEY ?? '',
  platformStellarAddress: env.PLATFORM_STELLAR_ADDRESS ?? '',
  escrowContractId: env.ESCROW_CONTRACT_ID ?? '',
  mxneContractId: env.MXNE_CONTRACT_ID ?? '',
  mxneIssuerAddress: env.MXNE_ISSUER_ADDRESS ?? '',
  
  secretEncryptionKey: env.SECRET_ENCRYPTION_KEY ?? '',
  
  jwtSecret: env.JWT_SECRET,
  jwtExpiry: env.JWT_EXPIRY,
  
  mockStellar: env.MOCK_STELLAR === 'true',
} as const;
