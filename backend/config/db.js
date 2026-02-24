const { Pool } = require('pg');
require('dotenv').config();

// Use connection string for Supabase
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Test connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Supabase Database connection failed:', err.stack);
        return;
    }
    console.log('✅ Supabase Database connected successfully!');
    release();
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool: pool
};
