// แจ้งเตือนแท็บ "รายชื่อ KOL" / "On Process" — เทียบเวลาอัปเดตล่าสุดกับครั้งที่เปิดดูล่าสุด (เก็บใน localStorage)
// timestamp เป็น ISO string (เทียบด้วย > ได้ตรงๆ)

const maxStr = (a, b) => (a > b ? a : b);

// เวลาล่าสุดของแท็บ "รายชื่อ KOL" (เพิ่ม/แก้ข้อมูล KOL หรือคัดเลือก)
export function listLatest(subs) {
    return (subs || []).reduce((mx, s) =>
        [s.submitted_at, s.list_updated_at, s.decided_at].reduce((m, t) => maxStr(m, t || ''), mx), '');
}

// เวลาล่าสุดของแท็บ "On Process" (อัปเดตดราฟ/งาน ของ KOL ที่คัดเลือกแล้ว)
export function processLatest(subs) {
    return (subs || []).filter(s => s.status === 'confirmed')
        .reduce((mx, s) => maxStr(mx, s.work_updated_at || ''), '');
}

const K = (scope, kind) => `kolseen:${scope}:${kind}`;

// ครั้งแรกที่เปิด project/token นี้ → ถือว่าเห็นทุกอย่างแล้ว (ไม่เด้ง badge ย้อนหลัง)
function ensureInit(scope, subs) {
    if (localStorage.getItem(K(scope, 'init')) === '1') return;
    localStorage.setItem(K(scope, 'list'), listLatest(subs));
    localStorage.setItem(K(scope, 'process'), processLatest(subs));
    localStorage.setItem(K(scope, 'init'), '1');
}

// คืน { listNew, processNew } — มีอัปเดตใหม่ที่ยังไม่ได้เปิดดูไหม
export function tabBadges(scope, subs) {
    ensureInit(scope, subs);
    return {
        listNew: listLatest(subs) > (localStorage.getItem(K(scope, 'list')) || ''),
        processNew: processLatest(subs) > (localStorage.getItem(K(scope, 'process')) || '')
    };
}

// ทำเครื่องหมายว่าเปิดดูแท็บนี้แล้ว (เคลียร์ badge)
export function markSeen(scope, tab, subs) {
    const t = tab === 'process' ? processLatest(subs) : listLatest(subs);
    localStorage.setItem(K(scope, tab === 'process' ? 'process' : 'list'), t);
}

// ===== แจ้งเตือนดราฟใหม่รายคน (per-KOL) =====
const DK = (scope, subId) => `draftseen:${scope}:${subId}`;

// KOL คนนี้มีดราฟอัปเดตใหม่ที่ยังไม่ได้เปิดดูไหม
export function draftIsNew(scope, sub) {
    const du = sub.draft_updated_at || '';
    if (!du) return false;
    return du > (localStorage.getItem(DK(scope, sub.id)) || '');
}

// เปิดดู/บันทึกดราฟของ KOL คนนี้แล้ว → เคลียร์
export function markDraftSeen(scope, sub) {
    localStorage.setItem(DK(scope, sub.id), sub.draft_updated_at || new Date().toISOString());
}

// ครั้งแรกของ scope นี้ → ถือว่าเห็นดราฟปัจจุบันทั้งหมดแล้ว (ไม่เด้งย้อนหลัง)
export function seedDraftsSeen(scope, subs) {
    const k = `draftseen:${scope}:init`;
    if (localStorage.getItem(k) === '1') return;
    (subs || []).forEach(s => { if (s.draft_updated_at) localStorage.setItem(DK(scope, s.id), s.draft_updated_at); });
    localStorage.setItem(k, '1');
}
