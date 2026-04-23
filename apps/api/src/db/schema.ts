import pg from 'pg';
const { Pool } = pg;
import { config } from '../config.js';

let pool: pg.Pool | null = null;

function getPool(): pg.Pool | null {
  if (!config.databaseUrl) {
    return null;
  }
  if (!pool) {
    pool = new Pool({ 
      connectionString: config.databaseUrl,
      ssl: config.databaseUrl.includes('neon.tech') ? { rejectUnauthorized: true } : undefined
    });
    pool.on('error', (err: Error) => {
      console.error('PostgreSQL error:', err.message);
    });
  }
  return pool;
}

export const poolProxy = {
  query: (text: string, params?: any[]) => getPool()?.query(text, params) ?? Promise.resolve({ rows: [], rowCount: 0 } as any),
};

export async function query(text: string, params?: any[]) {
  const pool = getPool();
  if (!pool) return { rows: [], rowCount: 0 } as any;
  return pool.query(text, params);
}

export async function getOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const pool = getPool();
  if (!pool) return null;
  const result = await pool.query(text, params);
  return result.rows[0] || null;
}

export async function getMany<T = any>(text: string, params?: any[]): Promise<T[]> {
  const pool = getPool();
  if (!pool) return [];
  const result = await pool.query(text, params);
  return result.rows;
}

export async function execute(text: string, params?: any[]) {
  const pool = getPool();
  if (!pool) return { rows: [], rowCount: 0 } as any;
  return pool.query(text, params);
}

export default { query, getOne, getMany, execute };
