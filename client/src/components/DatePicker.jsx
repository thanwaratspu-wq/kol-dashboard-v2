import { useState, useRef, useEffect, useCallback } from 'react';
import Icon from './Icon.jsx';
import { fmtDate } from '../utils/date.js';

const WD = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

const pad = n => String(n).padStart(2, '0');
const toISO = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

// ปฏิทินเลือกวัน — value = "YYYY-MM-DD"
export default function DatePicker({ value, onChange, disabled, placeholder = 'เลือกวันที่' }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const today = new Date();
    const sel = value ? value.split('-').map(Number) : null; // [y,m,d]
    const [viewY, setViewY] = useState(sel ? sel[0] : today.getFullYear());
    const [viewM, setViewM] = useState(sel ? sel[1] - 1 : today.getMonth());

    // ปฏิทินใช้ position:fixed เพราะบางที่ (เช่นตาราง On Process) อยู่ในกรอบที่เลื่อนแนวนอน
    // ถ้าใช้ absolute ปฏิทินจะโดนกรอบตัดหายไปครึ่งหนึ่ง
    // body ตั้ง zoom ไว้ ค่าที่เราตั้งจะถูกคูณ zoom อีกรอบ จึงต้องหารกลับก่อน
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const place = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const z = parseFloat(getComputedStyle(document.body).zoom) || 1;
        const vw = window.innerWidth || document.documentElement.clientWidth || 1280;
        const vh = window.innerHeight || document.documentElement.clientHeight || 800;
        const W = 280, H = 330;
        const left = Math.max(8, Math.min(r.left, vw - W - 8));
        // ถ้าพื้นที่ด้านล่างไม่พอ ให้เปิดขึ้นด้านบนแทน
        const top = (r.bottom + H + 8 > vh && r.top - H - 8 > 0) ? r.top - H - 6 : r.bottom + 6;
        setPos({ top: top / z, left: left / z });
    }, []);

    useEffect(() => {
        if (!open) return;
        function onDoc(e) { if (ref.current && !ref.current.contains(e.target) && !e.target.closest?.('.dp-pop')) setOpen(false); }
        const onKey = e => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
        window.addEventListener('scroll', place, true);
        window.addEventListener('resize', place);
        return () => {
            document.removeEventListener('mousedown', onDoc);
            document.removeEventListener('keydown', onKey);
            window.removeEventListener('scroll', place, true);
            window.removeEventListener('resize', place);
        };
    }, [open, place]);

    function openCal() {
        if (sel) { setViewY(sel[0]); setViewM(sel[1] - 1); }
        if (!open) { place(); requestAnimationFrame(place); }
        setOpen(o => !o);
    }
    function move(delta) {
        let m = viewM + delta, y = viewY;
        if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
        setViewM(m); setViewY(y);
    }
    function pick(y, m, d) { onChange(toISO(y, m, d)); setOpen(false); }

    // สร้างตาราง 6 สัปดาห์
    const startWD = new Date(viewY, viewM, 1).getDay();
    const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
    const daysPrev = new Date(viewY, viewM, 0).getDate();
    const cells = [];
    for (let i = 0; i < startWD; i++) {
        const d = daysPrev - startWD + 1 + i;
        const m = viewM - 1 < 0 ? 11 : viewM - 1, y = viewM - 1 < 0 ? viewY - 1 : viewY;
        cells.push({ d, y, m, other: true });
    }
    for (let d = 1; d <= daysInMonth; d++) cells.push({ d, y: viewY, m: viewM, other: false });
    let nd = 1;
    while (cells.length < 42) {
        const m = viewM + 1 > 11 ? 0 : viewM + 1, y = viewM + 1 > 11 ? viewY + 1 : viewY;
        cells.push({ d: nd++, y, m, other: true });
    }

    const isSel = c => sel && sel[0] === c.y && sel[1] - 1 === c.m && sel[2] === c.d;
    const isToday = c => today.getFullYear() === c.y && today.getMonth() === c.m && today.getDate() === c.d;

    return (
        <div className="dp" ref={ref}>
            <button type="button" className={'dp-trigger' + (value ? '' : ' empty')} disabled={disabled} onClick={openCal}>
                <Icon name="calendar" size={15} /> {value ? fmtDate(value) : placeholder}
            </button>
            {value && !disabled && (
                <button type="button" className="dp-clear" title="ล้างวันที่"
                    onClick={e => { e.stopPropagation(); onChange(''); setOpen(false); }}>✕</button>
            )}
            {open && !disabled && (
                <div className="dp-pop" style={{ top: pos.top, left: pos.left }}>
                    <div className="dp-head">
                        <span className="dp-title">{MONTHS[viewM]} {viewY}</span>
                        <div className="dp-nav">
                            <button type="button" onClick={() => move(-1)} title="เดือนก่อน"><Icon name="chevron" size={15} className="dp-up" /></button>
                            <button type="button" onClick={() => move(1)} title="เดือนถัดไป"><Icon name="chevron" size={15} className="dp-down" /></button>
                        </div>
                    </div>
                    <div className="dp-grid dp-wd">
                        {WD.map(w => <span key={w} className="dp-wdcell">{w}</span>)}
                    </div>
                    <div className="dp-grid">
                        {cells.map((c, i) => (
                            <button type="button" key={i}
                                className={'dp-cell' + (c.other ? ' other' : '') + (isSel(c) ? ' sel' : '') + (isToday(c) ? ' today' : '')}
                                onClick={() => pick(c.y, c.m, c.d)}>
                                {c.d}
                            </button>
                        ))}
                    </div>
                    <div className="dp-foot">
                        <button type="button" className="dp-link" onClick={() => { onChange(''); setOpen(false); }}>Clear</button>
                        <button type="button" className="dp-link" onClick={() => { const t = new Date(); pick(t.getFullYear(), t.getMonth(), t.getDate()); }}>Today</button>
                    </div>
                </div>
            )}
        </div>
    );
}
