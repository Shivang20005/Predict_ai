const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Use connection string for Supabase
if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL is not defined in environment variables.');
    console.error('👉 Please create a .env file in the backend directory and add your Supabase connection string.');
    console.error('Example: DATABASE_URL=postgresql://postgres.your-project:password@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require');
}

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
