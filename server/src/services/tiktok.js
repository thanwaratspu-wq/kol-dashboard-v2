// ================= TikTok API client (โครงสร้างพร้อมเชื่อมต่อ) =================
// ดึงสถิติวิดีโอ (views/likes/comments/shares) จาก TikTok
//
// วิธีเปิดใช้งานจริง (นายหญิงต้องตั้งค่าเอง):
//   1) สมัคร TikTok for Developers → สร้าง App → ได้ TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET
//   2) ใส่ค่าใน server/.env :  TIKTOK_CLIENT_KEY=...  TIKTOK_CLIENT_SECRET=...
//   3) TikTok Display API ดึงสถิติได้เฉพาะวิดีโอของ "creator ที่กด authorize (OAuth)" เท่านั้น
//      → ต้องเก็บ access_token ของ KOL แต่ละคน (ทำ OAuth flow) แล้วส่งเข้ามาที่ fetchVideoStats
//   4) เติม logic เรียก endpoint จริงในฟังก์ชัน callDisplayApi() ด้านล่าง
//
// ตอนนี้ยัง "ไม่ถูกตั้งค่า" → จะโยน error พร้อมข้อความบอกขั้นตอน (UI แสดงให้เห็น)

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY || '';
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET || '';

function isConfigured() { return !!(CLIENT_KEY && CLIENT_SECRET); }

// ดึงสถิติของโพสต์ 1 อัน จาก post URL
// creatorToken = access_token ของ KOL (จาก OAuth) — ต้องมีถึงจะดึงได้
async function fetchVideoStats(postUrl, creatorToken = null) {
    if (!isConfigured()) {
        const e = new Error('ยังไม่ได้ตั้งค่า TikTok API — ใส่ TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET ใน server/.env ก่อน');
        e.code = 'TIKTOK_NOT_CONFIGURED';
        throw e;
    }
    if (!postUrl) {
        const e = new Error('ยังไม่มีลิงก์โพสต์ (post URL) ของ KOL คนนี้');
        e.code = 'NO_POST_URL';
        throw e;
    }
    if (!creatorToken) {
        const e = new Error('ต้องให้ KOL (creator) กด authorize ผ่าน TikTok OAuth ก่อน ถึงจะดึงสถิติได้');
        e.code = 'TIKTOK_NO_TOKEN';
        throw e;
    }
    // TODO: เรียก TikTok Display API จริง — /v2/video/query/ ด้วย creatorToken + video_id ที่ map จาก postUrl
    return callDisplayApi(postUrl, creatorToken);
}

// eslint-disable-next-line no-unused-vars
async function callDisplayApi(postUrl, creatorToken) {
    // ตัวอย่างโครงสร้าง (ยังไม่เปิดใช้):
    // const videoId = extractVideoId(postUrl);
    // const r = await fetch('https://open.tiktokapis.com/v2/video/query/?fields=view_count,like_count,comment_count,share_count', {
    //     method: 'POST', headers: { Authorization: `Bearer ${creatorToken}`, 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ filters: { video_ids: [videoId] } })
    // });
    // const j = await r.json(); const v = j.data.videos[0];
    // return { views: v.view_count, likes: v.like_count, comments: v.comment_count, shares: v.share_count };
    const e = new Error('ยังไม่ได้เชื่อมต่อ TikTok Display API (callDisplayApi) — ดูขั้นตอนใน services/tiktok.js');
    e.code = 'TIKTOK_NOT_IMPLEMENTED';
    throw e;
}

module.exports = { isConfigured, fetchVideoStats };
