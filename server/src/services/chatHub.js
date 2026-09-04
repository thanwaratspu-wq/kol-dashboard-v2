// ================= ตัวกระจายสัญญาณข้อความใหม่ (Server-Sent Events) =================
// ใช้บอกทุกคนที่เปิดห้องแชทค้างไว้ว่า "มีข้อความใหม่แล้ว" ทันทีที่มีคนส่ง
// ไม่ต้องรอรอบถามซ้ำ
//
// สัญญาณที่ส่งไปมีแค่คำว่า "มีของใหม่" ไม่มีตัวเนื้อข้อความ —
// ฝั่งหน้าเว็บได้สัญญาณแล้วค่อยไปดึงข้อความผ่าน endpoint ปกติที่ตรวจสิทธิ์อยู่แล้ว
// ทำแบบนี้เพราะ EventSource ของเบราว์เซอร์แนบ header ไม่ได้ ถ้าให้ช่องนี้ส่งเนื้อหา
// ก็ต้องเอา token ไปแปะใน URL ซึ่งไม่ควรทำ

const rooms = new Map();   // token -> Set<res>
const HEARTBEAT_MS = 25000;

// เปิดช่องค้างไว้ให้ผู้ที่เข้าห้อง token นี้
function subscribe(token, req, res) {
    res.set({
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'   // กัน reverse proxy บางตัวอมข้อมูลไว้ไม่ยอมส่งต่อ
    });
    res.flushHeaders?.();
    res.write(': connected\n\n');

    if (!rooms.has(token)) rooms.set(token, new Set());
    rooms.get(token).add(res);

    // เต้นหัวใจกันตัวกลางตัดสายเพราะคิดว่าเงียบไปแล้ว
    const beat = setInterval(() => {
        try { res.write(': ping\n\n'); } catch { close(); }
    }, HEARTBEAT_MS);

    function close() {
        clearInterval(beat);
        const set = rooms.get(token);
        if (set) {
            set.delete(res);
            if (set.size === 0) rooms.delete(token);
        }
        try { res.end(); } catch { /* ปิดไปแล้วก็ไม่เป็นไร */ }
    }

    req.on('close', close);
    req.on('error', close);
}

// บอกทุกคนในห้องว่ามีข้อความใหม่
function broadcast(token) {
    const set = rooms.get(token);
    if (!set || set.size === 0) return 0;
    let sent = 0;
    for (const res of [...set]) {
        try { res.write('event: message\ndata: 1\n\n'); sent++; }
        catch { set.delete(res); }
    }
    return sent;
}

// จำนวนคนที่เปิดค้างอยู่ (ใช้ตอนตรวจสอบ)
function count(token) {
    return token ? (rooms.get(token)?.size || 0) : rooms.size;
}

module.exports = { subscribe, broadcast, count };
