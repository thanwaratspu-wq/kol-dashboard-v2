import { useState, useRef, useEffect, useCallback } from 'react';

// ปุ่มกรองเล็ก ๆ บนหัวคอลัมน์ (▾) — ใช้ร่วมกันหลายหน้า
// options = [{ value, label, count, dot? }] , value = '' คือไม่กรอง
export default function ColumnFilter({ label, value, options, onPick }) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const btnRef = useRef(null);

    // วางเมนูให้ตรงใต้ปุ่มเสมอ (คำนวณสด ไม่ใช้ค่าที่จำไว้)
    // สำคัญ: body ตั้ง zoom ไว้ (ดู --app-zoom) — getBoundingClientRect คืนพิกัดจริงบนจอ
    // แต่ค่า top/left ที่เราตั้งจะถูกคูณด้วย zoom อีกรอบ จึงต้องหารกลับก่อน
    // ไม่งั้นเมนูจะไปโผล่ไกลกว่าที่ควร และหลุดจอไปเลยถ้าคอลัมน์อยู่ทางขวา
    const place = useCallback(() => {
        const el = btnRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const z = parseFloat(getComputedStyle(document.body).zoom) || 1;
        const vw = window.innerWidth || document.documentElement.clientWidth || 1280;
        const left = Math.max(8, Math.min(r.left, vw - 210));
        setPos({ top: (r.bottom + 6) / z, left: left / z });
    }, []);

    useEffect(() => {
        if (!open) return;
        const onDown = e => { if (!e.target.closest?.('.colf-menu, .colf-btn')) setOpen(false); };
        const onKey = e => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        // เลื่อนตาราง/ย่อขยายจอ → ขยับเมนูตามปุ่ม ไม่ใช่ปิดทิ้ง
        // (กดปุ่มคอลัมน์ขวาสุด เบราว์เซอร์จะเลื่อนกรอบเองเพื่อดึงปุ่มเข้ามา
        //  ถ้าสั่งปิดตอน scroll เมนูจะปิดทันทีที่เปิด)
        window.addEventListener('scroll', place, true);
        window.addEventListener('resize', place);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
            window.removeEventListener('scroll', place, true);
            window.removeEventListener('resize', place);
        };
    }, [open, place]);

    function toggle() {
        if (!open) {
            place();
            // เผื่อเบราว์เซอร์เลื่อนกรอบให้ปุ่มเข้ามาในสายตาหลังได้โฟกัส — วางซ้ำหลังเลื่อนเสร็จ
            requestAnimationFrame(place);
        }
        setOpen(o => !o);
    }

    const current = options.find(o => o.value === value);
    return (
        <span className="colf">
            <button ref={btnRef} type="button" className={'colf-btn' + (value ? ' on' : '')} onClick={toggle}
                title={value ? `กรอง: ${current ? current.label : value}` : `กรองตาม${label}`}
                aria-label={`กรองตาม${label}`} aria-expanded={open}>
                ▾
            </button>
            {open && (
                <div className="colf-menu" style={{ top: pos.top, left: pos.left }} role="menu">
                    {options.map(o => (
                        <button key={o.value || 'all'} type="button" role="menuitem"
                            className={'colf-item' + (value === o.value ? ' on' : '')}
                            onClick={() => { onPick(o.value); setOpen(false); }}>
                            <span className="colf-item-label">
                                {o.dot && <i className={'colf-dot ' + o.dot} />}{o.label}
                            </span>
                            <span className="colf-item-count">{o.count}</span>
                        </button>
                    ))}
                </div>
            )}
        </span>
    );
}
