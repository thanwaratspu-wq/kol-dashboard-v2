import { useState, useRef, useEffect } from 'react';
import Icon from './Icon.jsx';

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

// ตัวเลือกเดือนแบบตารางปฏิทิน — value = "YYYY-MM"
export default function MonthPicker({ value, onChange, disabled }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const [selY, selM] = value ? value.split('-').map(Number) : [null, null];
    const [viewYear, setViewYear] = useState(selY || new Date().getFullYear());

    useEffect(() => {
        function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
        if (open) document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    const label = (selY && selM) ? `${TH_MONTHS[selM - 1]} ${selY}` : 'เลือกเดือน';

    function pick(i) {
        onChange(`${viewYear}-${String(i + 1).padStart(2, '0')}`);
        setOpen(false);
    }

    return (
        <div className="mp" ref={ref}>
            <button type="button" className="mp-trigger" disabled={disabled}
                onClick={() => { setViewYear(selY || new Date().getFullYear()); setOpen(o => !o); }}>
                <Icon name="calendar" size={15} /> {label}
                <Icon name="chevron" size={13} className="mp-caret" />
            </button>
            {open && !disabled && (
                <div className="mp-pop">
                    <div className="mp-year">
                        <button type="button" onClick={() => setViewYear(v => v - 1)}><Icon name="back" size={15} /></button>
                        <span>{viewYear}</span>
                        <button type="button" onClick={() => setViewYear(v => v + 1)}><Icon name="chevron" size={15} /></button>
                    </div>
                    <div className="mp-grid">
                        {TH_MONTHS.map((mm, i) => (
                            <button type="button" key={i}
                                className={'mp-cell' + (selY === viewYear && selM === i + 1 ? ' sel' : '')}
                                onClick={() => pick(i)}>
                                {mm}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
