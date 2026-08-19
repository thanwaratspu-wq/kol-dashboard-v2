import { useState, useRef, useEffect } from 'react';
import Icon from './Icon.jsx';

const WD = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

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

    useEffect(() => {
        function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
        if (open) document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    function openCal() {
        if (sel) { setViewY(sel[0]); setViewM(sel[1] - 1); }
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
            <button type="button" className="dp-trigger" disabled={disabled} onClick={openCal}>
                <Icon name="calendar" size={15} /> {value || placeholder}
            </button>
            {open && !disabled && (
                <div className="dp-pop">
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
