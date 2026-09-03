// ตัวจัดรูปแบบวันที่ใช้ร่วมกันทั้งระบบ
// ฐานข้อมูลเก็บเป็น ISO (YYYY-MM-DD) แต่หน้าจอแสดงเป็น วัน/เดือน/ปี ตามที่คนไทยอ่าน

// '2026-08-27' → '27/08/2026'
export function fmtDate(d, fallback = '—') {
    if (!d) return fallback;
    const s = String(d).slice(0, 10);           // ตัดส่วนเวลาทิ้ง เผื่อค่าเป็น ISO เต็ม
    const [y, m, day] = s.split('-');
    if (!y || !m || !day) return String(d);     // รูปแบบไม่ตรง คืนค่าเดิมดีกว่าทำข้อมูลหาย
    return `${day}/${m}/${y}`;
}

// แบบสั้น ปี 2 หลัก สำหรับตารางที่พื้นที่แคบ: '2026-08-27' → '27/08/26'
export function fmtDateShort(d, fallback = '—') {
    if (!d) return fallback;
    const s = String(d).slice(0, 10);
    const [y, m, day] = s.split('-');
    if (!y || !m || !day) return String(d);
    return `${day}/${m}/${y.slice(2)}`;
}

// ช่วงวันที่: '27/08/2026 – 30/08/2026' (ถ้ามีด้านเดียวก็แสดงด้านนั้น)
export function fmtRange(from, to, sep = ' – ') {
    const a = from ? fmtDate(from) : null;
    const b = to ? fmtDate(to) : null;
    if (a && b) return `${a}${sep}${b}`;
    return a || b || '—';
}
