const { Pool } = require('pg');
require('dotenv').config();

// Connection pool ไปยัง database หลัก (kol_v2)
const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    ssl: false,
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 30000,
    max: 20
});

pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle PG client:', err.message);
});

async function testConnection() {
    try {
        const result = await pool.query('SELECT NOW()');
        console.log('✅ Database connected:', result.rows[0].now);
        return true;
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
        return false;
    }
}

// helper สั้น ๆ สำหรับ query
function query(text, params) {
    return pool.query(text, params);
}

module.exports = { pool, query, testConnection };
