import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
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

// เตรียมรูปก่อนส่ง — รูปจากมือถือ/สกรีนช็อตมักหนักหลายเมกะไบต์
// ทำ 2 ขนาด: รูปเต็ม (ไว้กดขยาย) กับรูปย่อ (ไว้โชว์ในแชท ซึ่งกว้างแค่ ~180px)
// ในแชทจึงโหลดแค่ไม่กี่สิบ KB แทนที่จะเป็นหลายเมกะไบต์
const MAX_EDGE = 1600;    // รูปเต็ม — พอสำหรับอ่านตัวเลขในภาพ Insights
const THUMB_EDGE = 400;   // รูปย่อ — พอสำหรับช่องแชท
const SHRINK_OVER = 700 * 1024;

// WebP เล็กกว่า JPEG ราว 40% ที่คุณภาพเท่ากัน ถ้าเบราว์เซอร์ทำไม่ได้ค่อยถอยไป JPEG
async function encode(bmp, maxEdge, quality) {
    const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
    let blob = await new Promise(r => canvas.toBlob(r, 'image/webp', quality));
    if (!blob) blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality));
    return blob;
}

// คืน { full, thumb } — full อาจเป็นไฟล์เดิมถ้าเล็กอยู่แล้ว, thumb เป็น null ได้
async function prepareImage(file) {
    if (!file) return { full: file, thumb: null };
    if (file.type === 'image/gif') return { full: file, thumb: null };   // ย่อแล้วภาพเคลื่อนไหวหาย
    try {
        const bmp = await createImageBitmap(file);
        const ext = b => (b.type === 'image/webp' ? '.webp' : '.jpg');
        const named = (b, suffix) =>
            new File([b], file.name.replace(/\.[^.]+$/, '') + suffix + ext(b), { type: b.type });

        // รูปย่อ ทำเสมอ เพราะเป็นตัวที่ใช้โชว์ในแชท
        const tb = await encode(bmp, THUMB_EDGE, 0.8);

        // รูปเต็ม ย่อเฉพาะตอนไฟล์ใหญ่จริง ๆ ไม่งั้นใช้ของเดิม
        let full = file;
        if (file.size > SHRINK_OVER || Math.max(bmp.width, bmp.height) > MAX_EDGE) {
            const fb = await encode(bmp, MAX_EDGE, 0.82);
            if (fb && fb.size < file.size) full = named(fb, '');
        }
        bmp.close();
        return { full, thumb: tb ? named(tb, '_thumb') : null };
    } catch {
        return { full: file, thumb: null };   // เบราว์เซอร์ทำไม่ได้ ก็ส่งของเดิมไปตามปกติ
    }
}

// รูปในข้อความ — ถ้าโหลดไม่ขึ้นให้ขึ้นชื่อไฟล์ที่กดเปิดได้แทน
// จะได้ไม่กลายเป็นบับเบิลว่างเปล่าที่ดูไม่ออกว่าเกิดอะไรขึ้น
function ChatImage({ src, fallbackSrc, fullSrc, name, onOpen }) {
    const [failed, setFailed] = useState(false);
    const [url, setUrl] = useState(src);
    useEffect(() => { setUrl(src); setFailed(false); }, [src]);
    // ถ้ารูปในเครื่องใช้ไม่ได้ (เช่นถูกคืนหน่วยความจำไปแล้ว) ให้ลองเส้น server ก่อน
    const onErr = () => {
        if (fallbackSrc && url !== fallbackSrc) setUrl(fallbackSrc);
        else setFailed(true);
    };
    return (
        <button type="button" className="msgbox-img" onClick={() => onOpen(fullSrc || fallbackSrc || url, name)} title={name}>
            {failed
                ? <span className="msgbox-imgfail">🖼 {name} — กดเพื่อเปิดรูป</span>
                : <img src={url} alt={name} onError={onErr} />}
        </button>
    );
}

// รูปขยาย — เด้งทับทั้งหน้าจอ กดที่ว่าง / ปุ่ม ✕ / Esc เพื่อปิด
// ใช้ portal ออกไปที่ body เพราะกล่องแชทมี overflow:hidden กับ animation ครอบอยู่
function Lightbox({ src, name, onClose }) {
    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    return createPortal(
        <div className="lightbox" onClick={onClose} role="dialog" aria-modal="true" aria-label={name}>
            <button type="button" className="lightbox-x" onClick={onClose} aria-label="ปิด">✕</button>
            <img src={src} alt={name} onClick={e => e.stopPropagation()} />
            <span className="lightbox-name">{name}</span>
        </div>,
        document.body
    );
}

/**
 * ห้องแชททีม ↔ เอเจนซี่ — หน้าตาเดียวกันทั้งสองฝั่ง ต่างแค่ว่า "ฉัน" คือใคร
 * props:
 *   base   = path ตั้งต้นของ API เช่น `/agency/${token}/messages`
 *            หรือ `/projects/${id}/agency-links/${token}/messages`
 *   side   = 'team' | 'agency'  — ใช้ตัดสินว่าข้อความไหนเป็นของเรา
 *   imageBase  = เส้นดึงรูปที่ไม่ต้องล็อกอิน เช่น `/agency/${token}/messages`
 *   streamPath = ช่อง SSE ที่ใช้ฟังว่ามีข้อความใหม่ เช่น `/agency/${token}/stream`
 *   title, subtitle
 *   onUnread(n) = แจ้งจำนวนที่ยังไม่ได้อ่านกลับไปให้หน้าแม่ (ไว้ทำป้ายตัวเลข)
 */
export default function MessageBox({ base, imageBase, streamPath, side, title, subtitle, onUnread }) {
    // แท็ก <img> แนบ Authorization header ไม่ได้ เส้นรูปจึงต้องเป็นเส้นที่ไม่ต้องล็อกอิน
    // ใช้เส้นของลิงก์เอเจนซี่ (กันด้วย token เหมือนช่อง SSE) — ฝั่งทีมก็รู้ token นี้อยู่แล้ว
    const imgBase = imageBase || base;
    const [msgs, setMsgs] = useState([]);
    const [text, setText] = useState('');
    const [img, setImg] = useState(null);        // รูปเต็มที่จะส่ง
    const [thumb, setThumb] = useState(null);    // รูปย่อคู่กัน (ไว้โชว์ในแชท)
    const [sending, setSending] = useState(false);
    const [preparing, setPreparing] = useState(false);   // กำลังย่อรูปที่เพิ่งเลือก
    const [err, setErr] = useState('');
    const fileRef = useRef(null);
    const threadRef = useRef(null);
    const stickBottom = useRef(true);
    const loadRef = useRef(null);
    const [editing, setEditing] = useState(null);   // id ข้อความที่กำลังแก้อยู่
    const [editText, setEditText] = useState('');
    const [zoomed, setZoomed] = useState(null);   // รูปที่กำลังเปิดขยายอยู่ { src, name }
    const localImgs = useRef(new Map());   // msgId -> object URL ของไฟล์ในเครื่อง (รูปที่เราเพิ่งส่ง)

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

    // ปิดกล่องแล้วคืนหน่วยความจำของรูปที่ทำ preview ไว้
    useEffect(() => {
        const map = localImgs.current;
        return () => { map.forEach(url => URL.revokeObjectURL(url)); map.clear(); };
    }, []);

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

    // ย่อรูปตั้งแต่ตอนเลือกไฟล์ ระหว่างที่ยังพิมพ์ข้อความอยู่
    // กดส่งจะได้ไม่ต้องรอย่อ (รูปใหญ่ ๆ ใช้เวลาย่อเป็นวินาที)
    async function pickImage(file) {
        if (!file) { setImg(null); setThumb(null); return; }
        setImg(file);           // โชว์ชื่อไฟล์ให้เห็นทันที
        setThumb(null);
        setPreparing(true);
        try {
            const { full, thumb: tb } = await prepareImage(file);
            // ถ้าระหว่างเตรียมรูปผู้ใช้เปลี่ยนไฟล์หรือเอาออกไปแล้ว อย่าไปทับของใหม่
            setImg(prev => (prev === file ? full : prev));
            setThumb(tb);
        } finally { setPreparing(false); }
    }

    function startEdit(m) { setEditing(m.id); setEditText(m.text || ''); }
    function cancelEdit() { setEditing(null); setEditText(''); }

    async function saveEdit(msgId) {
        const t = editText.trim();
        if (!t) return;
        setErr('');
        try {
            await api(`${base}/${msgId}`, { method: 'PATCH', body: { text: t } });
            cancelEdit();
            await load(false);
        } catch (e) { setErr(e.message); }
    }

    async function removeMsg(m) {
        // ลบแล้วกู้ไม่ได้ ถามก่อนเสมอ
        const what = m.text ? `"${m.text.slice(0, 40)}${m.text.length > 40 ? '…' : ''}"` : 'รูปนี้';
        if (!window.confirm(`ลบ ${what} ออกจากแชท?\nอีกฝั่งจะเห็นว่า "ลบข้อความนี้แล้ว"`)) return;
        setErr('');
        try {
            await api(`${base}/${m.id}`, { method: 'DELETE' });
            await load(false);
        } catch (e) { setErr(e.message); }
    }

    async function send(e) {
        e.preventDefault();
        if (!text.trim() && !img) return;
        setErr(''); setSending(true);
        try {
            if (img) {
                const fd = new FormData();
                fd.append('image', img);          // เตรียมไว้แล้วตั้งแต่ตอนเลือกไฟล์
                if (thumb) fd.append('thumb', thumb);
                if (text.trim()) fd.append('text', text.trim());
                const res = await fetch(`/api${base}`, { method: 'POST', headers: authHeader(), body: fd });
                const j = await res.json().catch(() => null);
                if (!res.ok) throw new Error((j && j.message) || 'ส่งไม่สำเร็จ');
                // คนส่งมีไฟล์อยู่ในเครื่องอยู่แล้ว ไม่ต้องรอโหลดกลับมาจาก server
                // ให้แสดงจากไฟล์ในเครื่องเลย รูปจึงขึ้นทันทีที่บับเบิลขึ้น
                if (j && j.data && j.data.id) localImgs.current.set(j.data.id, URL.createObjectURL(thumb || img));
            } else {
                await api(base, { method: 'POST', body: { text: text.trim() } });
            }
            setText(''); setImg(null); setThumb(null);
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

                                {m.deleted_at ? (
                                    <div className="msgbox-bubble gone">ลบข้อความนี้แล้ว</div>
                                ) : editing === m.id ? (
                                    <form className="msgbox-editform" onSubmit={e => { e.preventDefault(); saveEdit(m.id); }}>
                                        <input value={editText} onChange={e => setEditText(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Escape') cancelEdit(); }}
                                            aria-label="แก้ข้อความ" autoFocus />
                                        <button type="submit" title="บันทึก">✓</button>
                                        <button type="button" onClick={cancelEdit} title="ยกเลิก">✕</button>
                                    </form>
                                ) : (
                                    <div className="msgbox-row">
                                        {/* ปุ่มแก้/ลบ ขึ้นเฉพาะข้อความของเราเอง */}
                                        {mine && (
                                            <span className="msgbox-tools">
                                                {m.text && (
                                                    <button type="button" onClick={() => startEdit(m)} title="แก้ข้อความ">✏️</button>
                                                )}
                                                <button type="button" onClick={() => removeMsg(m)} title="ลบข้อความ">🗑</button>
                                            </span>
                                        )}
                                        <div className="msgbox-bubble">
                                            {m.image && (
                                                <ChatImage
                                                    src={localImgs.current.get(m.id) || `/api${imgBase}/${m.id}/thumb`}
                                                    fallbackSrc={`/api${imgBase}/${m.id}/thumb`}
                                                    fullSrc={`/api${imgBase}/${m.id}/image`}
                                                    name={m.image.original}
                                                    onOpen={(src, name) => setZoomed({ src, name })} />
                                            )}
                                            {m.text && <span className="msgbox-text">{m.text}</span>}
                                        </div>
                                    </div>
                                )}

                                <span className="msgbox-stamp">
                                    {hhmm(m.at)}
                                    {m.edited_at && !m.deleted_at && <span className="msgbox-edited"> · แก้ไขแล้ว</span>}
                                </span>
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
                <button type="submit" className="msgbox-send" disabled={sending || preparing || (!text.trim() && !img)}>
                    {preparing ? 'ย่อรูป…' : sending ? 'กำลังส่ง…' : 'ส่ง'}
                </button>
                <input ref={fileRef} type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={e => pickImage(e.target.files[0] || null)} />
            </form>

            {zoomed && <Lightbox src={zoomed.src} name={zoomed.name} onClose={() => setZoomed(null)} />}
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
