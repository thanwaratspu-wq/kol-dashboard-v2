/**
 * เลือกชั้นเก็บข้อมูลตามค่า DATA_DRIVER ใน .env
 *   - 'json'     = ไฟล์ JSON บนเครื่อง (ค่าเริ่มต้น ใช้ระหว่างยังไม่ขึ้น PostgreSQL)
 *   - 'postgres' = PostgreSQL (จะเพิ่มภายหลังเมื่อพร้อม)
 *
 * ทุก route เรียกผ่าน store ตัวนี้ตัวเดียว เวลาสลับ driver จะไม่ต้องแก้ route
 */
const driver = (process.env.DATA_DRIVER || 'json').toLowerCase();

let store;
if (driver === 'postgres' || driver === 'pg') {
    // TODO: เพิ่ม ./pgStore.js เมื่อขึ้น PostgreSQL
    store = require('./pgStore');
    console.log('🗄️  Data driver: PostgreSQL');
} else {
    store = require('./jsonStore');
    console.log('🗄️  Data driver: JSON file (data/db.json)');
}

module.exports = store;
