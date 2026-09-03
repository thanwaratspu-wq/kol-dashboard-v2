import { productLabel } from '../data/products.js';

// ช่องเลือกสินค้าแบบหลายตัว — เลือกทีละตัว หรือกด "เลือกทุก Product" ทีเดียว
// เก็บค่าเป็นสตริงคั่นด้วย , (ตรงกับที่ ProductSummary และฝั่ง server ใช้)
export default function ProductMultiSelect({ value, options = [], onChange, placeholder = '— เลือก Product —' }) {
    const selected = value ? String(value).split(',').map(s => s.trim()).filter(Boolean) : [];
    const setSel = arr => onChange([...new Set(arr)].join(','));
    const remove = code => setSel(selected.filter(c => c !== code));
    const allSel = options.length > 0 && options.every(o => selected.includes(o));
    const onSelect = e => {
        const v = e.target.value;
        if (v === '__ALL__') setSel(allSel ? [] : options);
        else if (v) setSel([...selected, v]);
        e.target.value = '';
    };
    return (
        <div className="pms-cell">
            {selected.length > 0 && (
                <div className="pms-cell-chips">
                    {allSel
                        ? <span className="pms-cell-chip all" title="เลือกทุกสินค้า">ทุก Product ({options.length})<button type="button" onClick={() => setSel([])} title="ล้างทั้งหมด">×</button></span>
                        : selected.map(c => <span className="pms-cell-chip" key={c} title={productLabel(c)}>{c}<button type="button" onClick={() => remove(c)} title="เอาออก">×</button></span>)}
                </div>
            )}
            <select value="" onChange={onSelect} disabled={options.length === 0}>
                <option value="">{selected.length ? `+ เพิ่มสินค้า (${selected.length})` : placeholder}</option>
                {options.length > 0 && <option value="__ALL__">{allSel ? '✓ ทุก Product (เลือกครบแล้ว)' : '☑ เลือกทุก Product'}</option>}
                {options.filter(c => !selected.includes(c)).map(c => <option key={c} value={c}>{productLabel(c)}</option>)}
            </select>
        </div>
    );
}
