import { Pool } from 'pg';

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  ssl: isProduction ? { rejectUnauthorized: true } : false,
});

// Log pool errors instead of crashing
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err.message);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  pool.end().catch(() => {});
});

export { pool };
