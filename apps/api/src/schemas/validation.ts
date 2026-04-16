import { z } from 'zod';

export const stellarAddressSchema = z.string().regex(/^G[A-Z2-7]{55}$/, 'Invalid Stellar address');

export const cashRequestSchema = z.object({
  merchant_address: stellarAddressSchema,
  amount_mxn: z.number().min(50).max(50000),
  user_lat: z.number().min(-90).max(90).optional(),
  user_lng: z.number().min(-180).max(180).optional(),
});

export const cashAgentsQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).default(19.4195),
  lng: z.coerce.number().min(-180).max(180).default(-99.1627),
  amount: z.coerce.number().min(50).max(50000).default(500),
  limit: z.coerce.number().min(1).max(20).default(5),
  radius: z.coerce.number().min(1).max(100).default(50),
});

export const bazaarIntentSchema = z.object({
  offered_chain: z.enum(['ethereum', 'stellar', 'solana', 'bitcoin', 'physical']),
  offered_symbol: z.string().min(1).max(16),
  offered_amount: z.string(),
  wanted_chain: z.enum(['ethereum', 'stellar', 'solana', 'bitcoin', 'physical']),
  wanted_symbol: z.string().min(1).max(16),
  wanted_amount: z.string(),
  min_rate: z.number().min(0).max(1).optional(),
});

export const bazaarQuoteSchema = z.object({
  intent_id: z.string().min(1),
  rate: z.number().positive(),
  valid_for_minutes: z.number().min(1).max(60).default(5),
});

export const bazaarAcceptSchema = z.object({
  intent_id: z.string().min(1),
  quote_id: z.string().min(1).optional(),
  secret_hash: z.string().length(64).optional(),
  amount_usdc: z.number().positive().optional(),
});

export const swapRequestSchema = z.object({
  counterparty: stellarAddressSchema.optional(),
  offered_chain: z.enum(['ethereum', 'stellar', 'solana', 'bitcoin', 'physical']),
  offered_symbol: z.string().min(1).max(16),
  offered_amount: z.string(),
  wanted_chain: z.enum(['ethereum', 'stellar', 'solana', 'bitcoin', 'physical']),
  wanted_symbol: z.string().min(1).max(16),
  wanted_amount: z.string(),
  timeout_minutes: z.number().min(5).max(1440).default(60),
});

export const merchantRegistrationSchema = z.object({
  stellar_address: stellarAddressSchema,
  name: z.string().min(1).max(255),
  type: z.enum(['farmacia', 'tienda', 'papeleria', 'consultorio', 'abarrotes', 'otro']),
  address: z.string().min(1).max(500),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  max_trade_mxn: z.number().positive(),
  min_trade_mxn: z.number().positive(),
});

export const merchantUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: z.enum(['farmacia', 'tienda', 'papeleria', 'consultorio', 'abarrotes', 'otro']).optional(),
  address: z.string().min(1).max(500).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  available_mxn: z.number().min(0).optional(),
  max_trade_mxn: z.number().positive().optional(),
  min_trade_mxn: z.number().positive().optional(),
  online: z.boolean().optional(),
  avg_time_minutes: z.number().min(0).max(120).optional(),
});

export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new ValidationError(errors);
  }
  return result.data;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
