import { useEffect, useRef, useState, useCallback } from 'react';
import { api, getToken } from '../api/client.js';

// ปกติข้อความใหม่จะเด้งมาทาง SSE ทันที
// รอบถามซ้ำนี้เป็นตาข่ายรองกรณีสายหลุดหรือเบราว์เซอร์ไม่รองรับ จึงตั้งห่าง ๆ พอ
const POLL_MS = 60000;

const hhmm = at => {
    const d = new Date(at);
    return isNaN(d) ? '' : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
// หัวคั่นวัน — วันนี้/เมื่อวาน ไม่ต้องขึ้นวันที่เต็ม
const dayLabel = at => {
    const d = new Date(at); if (isNaN(d)) return '';
    const t = new Date(); const y = new Date(t.getTime() - 86400000);
    const same = (a, b) => a.toDateString() === b.toDateString();
    if (same(d, t)) return 'วันนี้';
    if (same(d, y)) return 'เมื่อวาน';
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

/**
 * ห้องแชททีม ↔ เอเจนซี่ — หน้าตาเดียวกันทั้งสองฝั่ง ต่างแค่ว่า "ฉัน" คือใคร
 * props:
 *   base   = path ตั้งต้นของ API เช่น `/agency/${token}/messages`
 *            หรือ `/projects/${id}/agency-links/${token}/messages`
 *   side   = 'team' | 'agency'  — ใช้ตัดสินว่าข้อความไหนเป็นของเรา
 *   streamPath = ช่อง SSE ที่ใช้ฟังว่ามีข้อความใหม่ เช่น `/agency/${token}/stream`
 *   title, subtitle
 *   onUnread(n) = แจ้งจำนวนที่ยังไม่ได้อ่านกลับไปให้หน้าแม่ (ไว้ทำป้ายตัวเลข)
 */
export default function MessageBox({ base, streamPath, side, title, subtitle, onUnread }) {
    const [msgs, setMsgs] = useState([]);
    const [text, setText] = useState('');
    const [img, setImg] = useState(null);
    const [sending, setSending] = useState(false);
    const [err, setErr] = useState('');
    const fileRef = useRef(null);
    const threadRef = useRef(null);
    const stickBottom = useRef(true);
    const loadRef = useRef(null);

    const load = useCallback(async (markRead) => {
        try {
            const res = await api(base);
            setMsgs(res.data.messages || []);
            if (markRead) {
                await api(`${base}/read`, { method: 'POST' });
                if (onUnread) onUnread(0);
            }
        } catch (e) { setErr(e.message); }
    }, [base, onUnread]);

    // เปิดห้อง = อ่านแล้ว
    useEffect(() => {
        load(true);
        const t = setInterval(() => load(false), POLL_MS);   // ตาข่ายรอง
        return () => clearInterval(t);
    }, [load]);

    useEffect(() => { loadRef.current = load; }, [load]);

    // ฟังสัญญาณ "มีข้อความใหม่" จาก server แล้วดึงทันที — ไม่ต้องรอรอบถาม
    // ผูก effect กับ streamPath อย่างเดียว ไม่เอา load มาเป็น dependency
    // ไม่งั้นทุกครั้งที่หน้าแม่ re-render สายจะถูกปิดแล้วเปิดใหม่ และช่วงที่ปิดอยู่ข้อความจะหลุด
    useEffect(() => {
        if (!streamPath || typeof EventSource === 'undefined') return;
        const es = new EventSource(`/api${streamPath}`);
        es.addEventListener('message', () => loadRef.current && loadRef.current(true));
        // ต่อสายใหม่ทุกครั้ง (รวมตอนหลุดแล้ว EventSource ต่อเอง) ให้ดึงซ่อมด้วย
        // เผื่อมีข้อความเข้ามาระหว่างที่สายขาด
        es.addEventListener('open', () => loadRef.current && loadRef.current(false));
        return () => es.close();
    }, [streamPath]);

    // เลื่อนลงล่างสุดเมื่อมีข้อความใหม่ — แต่ไม่แย่งถ้าคนกำลังอ่านย้อนอยู่
    useEffect(() => {
        const el = threadRef.current;
        if (el && stickBottom.current) el.scrollTop = el.scrollHeight;
    }, [msgs]);

    function onScroll() {
        const el = threadRef.current;
        if (!el) return;
        stickBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    }

    async function send(e) {
        e.preventDefault();
        if (!text.trim() && !img) return;
        setErr(''); setSending(true);
        try {
            if (img) {
                const fd = new FormData();
                fd.append('image', img);
                if (text.trim()) fd.append('text', text.trim());
                const res = await fetch(`/api${base}`, { method: 'POST', headers: authHeader(), body: fd });
                const j = await res.json().catch(() => null);
                if (!res.ok) throw new Error((j && j.message) || 'ส่งไม่สำเร็จ');
            } else {
                await api(base, { method: 'POST', body: { text: text.trim() } });
            }
            setText(''); setImg(null);
            if (fileRef.current) fileRef.current.value = '';
            stickBottom.current = true;
            await load(true);
        } catch (e2) { setErr(e2.message); }
        finally { setSending(false); }
    }

    return (
        <div className="msgbox">
            <div className="msgbox-head">
                <div className="msgbox-title">{title}{subtitle && <span className="msgbox-sub">{subtitle}</span>}</div>
            </div>

            {err && <div className="alert-error">{err}</div>}

            <div className="msgbox-thread" ref={threadRef} onScroll={onScroll}>
                {msgs.length === 0 ? (
                    <div className="msgbox-empty">ยังไม่มีข้อความ — พิมพ์ทักได้เลย</div>
                ) : msgs.map((m, i) => {
                    const mine = m.from === side;
                    const newDay = i === 0 || dayLabel(msgs[i - 1].at) !== dayLabel(m.at);
                    return (
                        <div key={m.id}>
                            {newDay && <div className="msgbox-day"><span>{dayLabel(m.at)}</span></div>}
                            <div className={'msgbox-msg' + (mine ? ' mine' : '')}>
                                <span className="msgbox-who">{mine ? 'เรา' : m.by}</span>
                                <div className="msgbox-bubble">
                                    {m.image && (
                                        <a className="msgbox-img" href={`/api${base}/${m.id}/image`} target="_blank" rel="noreferrer">
                                            <img src={`/api${base}/${m.id}/image`} alt={m.image.original} />
                                        </a>
                                    )}
                                    {m.text && <span className="msgbox-text">{m.text}</span>}
                                </div>
                                <span className="msgbox-stamp">{hhmm(m.at)}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {img && (
                <div className="msgbox-pending">
                    🖼 {img.name}
                    <button type="button" onClick={() => { setImg(null); if (fileRef.current) fileRef.current.value = ''; }}
                        title="เอารูปออก">✕</button>
                </div>
            )}

            <form className="msgbox-composer" onSubmit={send}>
                <input value={text} onChange={e => setText(e.target.value)}
                    placeholder="พิมพ์ข้อความ…" aria-label="ข้อความ" />
                <button type="button" className="msgbox-clip" onClick={() => fileRef.current.click()}
                    title="แนบรูป" aria-label="แนบรูป">📎</button>
                <button type="submit" className="msgbox-send" disabled={sending || (!text.trim() && !img)}>
                    {sending ? 'กำลังส่ง…' : 'ส่ง'}
                </button>
                <input ref={fileRef} type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={e => setImg(e.target.files[0] || null)} />
            </form>
        </div>
    );
}

// ฝั่งทีมต้องแนบ token, ฝั่งเอเจนซี่ไม่มี token ก็ไม่ต้องแนบ
function authHeader() {
    const t = getToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
}

// จำนวนข้อความจากอีกฝั่งที่ยังไม่ได้อ่าน — ใช้ทำป้ายตัวเลข
export function unreadCount(data, side) {
    if (!data) return 0;
    const readAt = side === 'team' ? data.team_read_at : data.agency_read_at;
    const t = readAt ? new Date(readAt).getTime() : 0;
    return (data.messages || []).filter(m => m.from !== side && new Date(m.at).getTime() > t).length;
}
