import { useState } from 'react';
import { productLabel } from '../data/products.js';

// สรุปรายการสินค้าสำหรับช่องตาราง — โชว์ "รหัสสินค้า" คั่นคอมมาแบบข้อความ (ประหยัดพื้นที่สุด) ถ้าเยอะจะพับ + ปุ่มดูเพิ่ม
// รับค่าเป็นสตริงคั่นคอมมา หรืออาเรย์ของรหัสสินค้า
export function ProductSummary({ value, max = 3 }) {
    const [open, setOpen] = useState(false);
    const codes = Array.isArray(value)
        ? value
        : (value ? String(value).split(',').map(s => s.trim()).filter(Boolean) : []);
    if (codes.length === 0) return <span className="muted">—</span>;
    const collapsed = !open && codes.length > max;
    const shown = collapsed ? codes.slice(0, max) : codes;
    return (
        <span className="prod-codes" title={codes.map(c => productLabel(c)).join('\n')}>
            {shown.join(', ')}
            {codes.length > max && (
                <button type="button" className="prod-codes-more" onClick={() => setOpen(o => !o)}>
                    {collapsed ? `+${codes.length - max}` : 'ย่อ'}
                </button>
            )}
        </span>
    );
}

// ชิปสินค้าแบบกะทัดรัด — โชว์เฉพาะรหัสสินค้า (ชื่อเต็มอยู่ใน tooltip) เรียงต่อกันแนวนอน
// ถ้าสินค้าเยอะเกิน collapseAt จะพับเก็บเหลือ N อันแรก + ปุ่ม "ดูทั้งหมด" กันการ์ดยาวเกินไป
export default function ProductChips({ products = [], collapseAt = 12 }) {
    const [open, setOpen] = useState(false);
    if (!products || products.length === 0) return <span className="muted">—</span>;

    const collapsed = !open && products.length > collapseAt;
    const shown = collapsed ? products.slice(0, collapseAt) : products;

    return (
        <div className="prodchip-wrap">
            {shown.map(code => (
                <span className="prodchip" key={code} title={productLabel(code)}>{code}</span>
            ))}
            {products.length > collapseAt && (
                <button type="button" className="prodchip-more" onClick={() => setOpen(o => !o)}>
                    {collapsed ? `+${products.length - collapseAt} เพิ่มเติม` : '▲ ย่อ'}
                </button>
            )}
        </div>
    );
}
