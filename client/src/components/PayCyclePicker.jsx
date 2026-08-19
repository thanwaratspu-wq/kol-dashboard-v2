import { useState, useRef, useEffect } from 'react';
import Icon from './Icon.jsx';

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const pad = n => String(n).padStart(2, '0');

// เลือกเดือน + รอบจ่าย (15/25) ในตัวเดียว
// value: '' = ทุกรอบ | 'YYYY-MM' = ทั้งเดือน | 'YYYY-MM-15' / 'YYYY-MM-25' = รอบเจาะจง
export default function PayCyclePicker({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const parts = value ? value.split('-').map(Number) : null;
    const selY = parts ? parts[0] : null;
    const selM = parts ? parts[1] : null;      // 1-12
    const selD = parts && parts.length === 3 ? parts[2] : null; // 15/25 หรือ null(ทั้งเดือน)
    const [viewYear, setViewYear] = useState(selY || new Date().getFullYear());

    useEffect(() => {
        function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
        if (open) document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    let label = 'ทุกรอบจ่าย';
    if (selY && selM) {
        label = `${TH_MONTHS[selM - 1]} ${selY}`;
        if (selD) label += ` · วันที่ ${selD}`;
    }

    const pickMonth = i => { onChange(`${viewYear}-${pad(i + 1)}`); setOpen(false); };
    const pickCycle = (i, d) => { onChange(`${viewYear}-${pad(i + 1)}-${pad(d)}`); setOpen(false); };

    return (
        <div className="cp" ref={ref}>
            <button type="button" className="dp-trigger"
                onClick={() => { setViewYear(selY || new Date().getFullYear()); setOpen(o => !o); }}>
                <Icon name="calendar" size={15} /> {label}
            </button>
            {open && (
                <div className="cp-pop">
                    <div className="mp-year">
                        <button type="button" onClick={() => setViewYear(v => v - 1)}><Icon name="back" size={15} /></button>
                        <span>{viewYear}</span>
                        <button type="button" onClick={() => setViewYear(v => v + 1)}><Icon name="chevron" size={15} /></button>
                    </div>
                    <div className="cp-grid">
                        {TH_MONTHS.map((mm, i) => {
                            const isMonthSel = selY === viewYear && selM === i + 1;
                            return (
                                <div className="cp-cell" key={i}>
                                    <button type="button"
                                        className={'cp-month' + (isMonthSel && !selD ? ' sel' : '')}
                                        onClick={() => pickMonth(i)}>{mm}</button>
                                    <div className="cp-days">
                                        <button type="button"
                                            className={'cp-day' + (isMonthSel && selD === 15 ? ' sel' : '')}
                                            onClick={() => pickCycle(i, 15)}>15</button>
                                        <button type="button"
                                            className={'cp-day' + (isMonthSel && selD === 25 ? ' sel' : '')}
                                            onClick={() => pickCycle(i, 25)}>25</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="dp-foot">
                        <button type="button" className="dp-link" onClick={() => { onChange(''); setOpen(false); }}>ทุกรอบจ่าย (ล้าง)</button>
                    </div>
                </div>
            )}
        </div>
    );
}
