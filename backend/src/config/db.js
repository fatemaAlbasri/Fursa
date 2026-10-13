const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing. Copy .env.example to .env and fill it in.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Supabase requires SSL; a local PostgreSQL usually doesn't
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error:', err.message);
});

// Use db.query('SELECT ... WHERE id = $1', [id]) everywhere — never build SQL with string concatenation
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
