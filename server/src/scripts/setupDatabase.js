/**
 * สร้าง database `kol_v2` (ถ้ายังไม่มี) แล้วสร้างตารางตาม schema.sql
 * รัน: npm run setup-db
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const DB_NAME = process.env.DB_NAME || 'kol_v2';
const baseConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    ssl: false
};

async function ensureDatabase() {
    // ต่อเข้า database กลาง 'postgres' เพื่อสร้าง kol_v2
    const admin = new Client({ ...baseConfig, database: 'postgres' });
    await admin.connect();
    const exists = await admin.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [DB_NAME]);
    if (exists.rowCount === 0) {
        await admin.query(`CREATE DATABASE ${DB_NAME}`);
        console.log(`✅ สร้าง database "${DB_NAME}" แล้ว`);
    } else {
        console.log(`ℹ️  database "${DB_NAME}" มีอยู่แล้ว — ข้ามการสร้าง`);
    }
    await admin.end();
}

async function runSchema() {
    const client = new Client({ ...baseConfig, database: DB_NAME });
    await client.connect();
    const schema = fs.readFileSync(path.join(__dirname, '..', 'models', 'schema.sql'), 'utf8');
    await client.query(schema);
    console.log('✅ สร้างตารางตาม schema.sql เรียบร้อย');
    await client.end();
}

(async () => {
    try {
        console.log(`🔧 ตั้งค่า database "${DB_NAME}" ...`);
        await ensureDatabase();
        await runSchema();
        console.log('🎉 เสร็จสิ้น! ต่อไปรัน: npm run seed');
        process.exit(0);
    } catch (err) {
        console.error('❌ ล้มเหลว:', err.message);
        process.exit(1);
    }
})();
