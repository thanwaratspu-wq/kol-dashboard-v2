import { useState } from 'react';
import { api } from '../api/client.js';
import { productsByBrand, productLabel } from '../data/products.js';

const BRANDS = ["Jula's Herb", 'Code Lab', 'Jdent', 'Jarvit', 'Beauterry', 'Jernis', 'Dermiq', 'Minimii', 'Any Skin'];
const PLATFORMS = ['TikTok', 'Instagram', 'Facebook', 'Lemon8', 'X', 'YouTube'];

// ฟอร์มสอบถาม Rate Card จากเอเจนซี่/KOL
export default function RateCardForm({ onClose, onSaved }) {
    const [f, setF] = useState({ kol_name: '', link_account: '', brand: '', products: [], platforms: [], scope: '', budget: '', no_budget: false, brief_link: '', brief_note: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const up = (k, v) => setF(s => ({ ...s, [k]: v }));
    const toggleProduct = c => setF(s => ({ ...s, products: s.products.includes(c) ? s.products.filter(x => x !== c) : [...s.products, c] }));
    const togglePlatform = p => setF(s => ({ ...s, platforms: s.platforms.includes(p) ? s.platforms.filter(x => x !== p) : [...s.platforms, p] }));

    async function submit(e) {
        e.preventDefault();
        if (!f.kol_name.trim()) { setError('กรุณาระบุชื่อ KOL ที่ต้องการทราบเรท'); return; }
        setError(''); setSaving(true);
        try {
            await api('/rate-requests', {
                method: 'POST',
                body: {
                    kol_name: f.kol_name.trim(), link_account: f.link_account || null, brand: f.brand || null, products: f.products, platforms: f.platforms,
                    scope: f.scope || null, budget: f.no_budget ? null : (Number(f.budget) || 0), no_budget: f.no_budget,
                    brief_link: f.brief_link || null, brief_note: f.brief_note || null
                }
            });
            onSaved && onSaved();
        } catch (err) { setError(err.message); }
        finally { setSaving(false); }
    }

    const availProducts = productsByBrand(f.brand);

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-head"><h3>สอบถาม Rate Card</h3><button className="modal-x" onClick={onClose}>×</button></div>
                {error && <div className="alert-error">{error}</div>}
                <form onSubmit={submit}>
                    <div className="field">
                        <label>ชื่อ KOL ที่ต้องการทราบเรท *</label>
                        <input value={f.kol_name} onChange={e => up('kol_name', e.target.value)} placeholder="เช่น @username หรือชื่อ KOL (หลายคนคั่นด้วย ,)" required autoFocus />
                    </div>
                    <div className="field">
                        <label>ลิงก์ Account</label>
                        <input type="url" value={f.link_account} onChange={e => up('link_account', e.target.value)} placeholder="ลิงก์โปรไฟล์ KOL (https://...)" />
                    </div>
                    <div className="field">
                        <label>แบรนด์</label>
                        <select value={f.brand} onChange={e => { up('brand', e.target.value); up('products', []); }}>
                            <option value="">เลือกแบรนด์</option>
                            {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                    <div className="field">
                        <label>สินค้า</label>
                        {f.products.length > 0 && (
                            <div className="chip-list" style={{ marginBottom: 8 }}>
                                {f.products.map(c => <span className="chip-item" key={c}>{productLabel(c)}<button type="button" onClick={() => toggleProduct(c)}>×</button></span>)}
                            </div>
                        )}
                        <select value="" disabled={!f.brand} onChange={e => {
                            if (e.target.value === '__ALL__') {
                                const allSel = availProducts.length > 0 && availProducts.every(p => f.products.includes(p.code));
                                up('products', allSel ? [] : availProducts.map(p => p.code));
                            } else if (e.target.value) toggleProduct(e.target.value);
                            e.target.value = '';
                        }}>
                            <option value="">{f.brand ? '+ เลือกสินค้า...' : '— เลือกแบรนด์ก่อน —'}</option>
                            {f.brand && availProducts.length > 0 && (
                                <option value="__ALL__">{availProducts.every(p => f.products.includes(p.code)) ? '✓ ทุกสินค้า (เลือกครบแล้ว)' : '☑ เลือกทุกสินค้า'}</option>
                            )}
                            {availProducts.filter(p => !f.products.includes(p.code)).map(p => <option key={p.code} value={p.code}>{p.code} - {p.name}</option>)}
                        </select>
                    </div>
                    <div className="field">
                        <label>ช่องทางที่ต้องการให้ KOL ลงงาน</label>
                        <div className="rc-chips">
                            {PLATFORMS.map(p => (
                                <button type="button" key={p} className={'rc-chip' + (f.platforms.includes(p) ? ' on' : '')} onClick={() => togglePlatform(p)}>{p}</button>
                            ))}
                        </div>
                    </div>
                    <div className="field">
                        <label>Scope งานที่ต้องการให้ KOL ทำ</label>
                        <textarea rows={3} value={f.scope} onChange={e => up('scope', e.target.value)} placeholder="เช่น รีวิว 1 คลิป + ภาพ 3 รูป ลง TikTok, ติด #แบรนด์..." />
                    </div>
                    <div className="field">
                        <label>Budget ที่กำหนด</label>
                        <div className="rc-budget">
                            <input type="number" min="0" value={f.budget} disabled={f.no_budget} onChange={e => up('budget', e.target.value)} placeholder={f.no_budget ? 'ไม่กำหนดบัดเจท' : 'งบที่กำหนด (บาท)'} />
                            <label className="rc-check"><input type="checkbox" checked={f.no_budget} onChange={e => up('no_budget', e.target.checked)} /> ไม่กำหนดบัดเจท</label>
                        </div>
                    </div>
                    <div className="field">
                        <label>บรีฟ / ตัวอย่างงานที่ต้องการ</label>
                        <input type="url" value={f.brief_link} onChange={e => up('brief_link', e.target.value)} placeholder="ลิงก์บรีฟ/ตัวอย่างงาน (https://...)" style={{ marginBottom: 8 }} />
                        <textarea rows={2} value={f.brief_note} onChange={e => up('brief_note', e.target.value)} placeholder="รายละเอียด/ตัวอย่างงานเพิ่มเติม..." />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn-ghost" onClick={onClose}>ยกเลิก</button>
                        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'กำลังส่ง...' : 'ส่งคำขอ Rate Card'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
