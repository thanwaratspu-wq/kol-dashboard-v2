import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import Icon from '../components/Icon.jsx';
import ProductChips from '../components/ProductChips.jsx';

const splitCodes = v => (v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : []);

const BRANDS = ["Jula's Herb", "Jula's Herb Lab", 'Jdent', 'Jarvit', 'Beauterry', 'Jernis', 'Dermiq', 'Minimii', 'Any Skin'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const N = n => (Number(n) || 0).toLocaleString('th-TH');
function fmtD(d) {
    if (!d) return '-';
    const [y, m, day] = d.split('-');
    return `${Number(day)}/${Number(m)}/${y.slice(2)}`;
}
const SUB_PLATFORMS = ['TikTok', 'Instagram', 'Facebook', 'Lemon8', 'YouTube', 'X'];

// modal แก้ไขข้อมูล KOL 1 แถว
function EditKolModal({ row, onClose, onSaved }) {
    const [f, setF] = useState({
        account_name: row.kol_name || '', platform: row.platform || 'TikTok', product: row.product || '',
        concept: row.concept || '', agency: row.agency || '', budget: row.cost ?? '',
        post_date: row.post_date || '', gen_date: row.gen_date || '', code_expire: row.days || 60,
        gencode: row.gencode || '', id_post: row.id_post || '', post_url: row.post_url || '', link_account: row.link_account || ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const up = (k, v) => setF(s => ({ ...s, [k]: v }));

    async function submit(e) {
        e.preventDefault();
        setError(''); setSaving(true);
        try {
            await api(`/projects/${row.project_id}/submissions/${row.sub_id}`, {
                method: 'PUT',
                body: {
                    account_name: f.account_name.trim() || row.kol_name, platform: f.platform,
                    product: f.product || null, concept: f.concept || null, agency: f.agency || null,
                    budget: Number(f.budget) || 0, post_date: f.post_date || null, gen_date: f.gen_date || null,
                    code_expire: Number(f.code_expire) || 60, gencode: f.gencode || null, id_post: f.id_post || null,
                    post_url: f.post_url || null, link_account: f.link_account || null
                }
            });
            onSaved();
        } catch (err) { setError(err.message); }
        finally { setSaving(false); }
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal wide" onClick={e => e.stopPropagation()}>
                <div className="modal-head"><h3>แก้ไขข้อมูล KOL</h3><button className="modal-x" onClick={onClose}>×</button></div>
                {error && <div className="alert-error">{error}</div>}
                <form onSubmit={submit}>
                    <div className="field-row">
                        <div className="field"><label>KOL Name</label><input value={f.account_name} onChange={e => up('account_name', e.target.value)} /></div>
                        <div className="field"><label>Platform</label>
                            <select value={f.platform} onChange={e => up('platform', e.target.value)}>{SUB_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}</select>
                        </div>
                    </div>
                    <div className="field-row">
                        <div className="field"><label>Product</label><input value={f.product} onChange={e => up('product', e.target.value)} placeholder="รหัสสินค้า" /></div>
                        <div className="field"><label>Agency</label><input value={f.agency} onChange={e => up('agency', e.target.value)} /></div>
                    </div>
                    <div className="field"><label>Concept</label><textarea rows="2" value={f.concept} onChange={e => up('concept', e.target.value)} placeholder="คอนเซ็ปต์คอนเทนต์..." /></div>
                    <div className="field-row">
                        <div className="field"><label>COST (฿)</label><input type="number" min="0" value={f.budget} onChange={e => up('budget', e.target.value)} /></div>
                        <div className="field"><label>Days (Code Expire)</label><input type="number" min="0" value={f.code_expire} onChange={e => up('code_expire', e.target.value)} /></div>
                    </div>
                    <div className="field-row">
                        <div className="field"><label>วันที่ลงงาน</label><input type="date" value={f.post_date} onChange={e => up('post_date', e.target.value)} /></div>
                        <div className="field"><label>วันที่เริ่ม Gen</label><input type="date" value={f.gen_date} onChange={e => up('gen_date', e.target.value)} /></div>
                    </div>
                    <div className="field-row">
                        <div className="field"><label>Gencode</label><input value={f.gencode} onChange={e => up('gencode', e.target.value)} /></div>
                        <div className="field"><label>ID POST</label><input value={f.id_post} onChange={e => up('id_post', e.target.value)} /></div>
                    </div>
                    <div className="field-row">
                        <div className="field"><label>Post Link</label><input type="url" value={f.post_url} onChange={e => up('post_url', e.target.value)} placeholder="https://..." /></div>
                        <div className="field"><label>Link Account</label><input type="url" value={f.link_account} onChange={e => up('link_account', e.target.value)} placeholder="https://..." /></div>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn-ghost" onClick={onClose}>ยกเลิก</button>
                        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function Kols() {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [brand, setBrand] = useState('');
    const [year, setYear] = useState('');
    const [month, setMonth] = useState('');
    const [product, setProduct] = useState('');
    const [editRow, setEditRow] = useState(null);

    function load() {
        api('/kols/analytics').then(res => setData(res.data)).catch(err => setError(err.message));
    }
    useEffect(() => { load(); }, []);

    const rows = data?.rows || [];
    const years = useMemo(() => {
        const ys = [...new Set(rows.map(r => r.year).filter(Boolean))];
        if (!ys.length) ys.push(new Date().getFullYear());
        return ys.sort((a, b) => b - a);
    }, [rows]);
    const products = useMemo(() => [...new Set(rows.map(r => r.product).filter(Boolean))].sort(), [rows]);

    const shown = rows.filter(r =>
        (!brand || r.brand === brand) &&
        (!year || String(r.year) === String(year)) &&
        (!month || r.month === month) &&
        (!product || r.product === product));

    const total = shown.length;
    const budget = shown.reduce((a, r) => a + r.cost, 0);

    async function removeRow(r) {
        if (!confirm(`เอา KOL "${r.kol_name}" ออกจากรายงาน?`)) return;
        try { await api(`/projects/${r.project_id}/submissions/${r.sub_id}`, { method: 'PUT', body: { status: 'rejected' } }); load(); }
        catch (err) { alert(err.message); }
    }

    return (
        <div>
            <header className="page-head with-action">
                <div>
                    <h1>KOL Analytics</h1>
                    <p className="page-sub">Influencer Performance &amp; Demographics</p>
                </div>
                <div className="ka-top-filters">
                    <select value={product} onChange={e => setProduct(e.target.value)}>
                        <option value="">All Products</option>
                        {products.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
            </header>

            {error && <div className="alert-error">{error}</div>}

            {/* การ์ดสรุป */}
            <div className="ka-summary">
                <div className="ka-sum-card">
                    <div className="ka-sum-ico"><Icon name="users" size={22} /></div>
                    <div><div className="ka-sum-k">TOTAL KOLS</div><div className="ka-sum-v">{total}</div></div>
                </div>
                <div className="ka-sum-card">
                    <div className="ka-sum-ico blue"><Icon name="wallet" size={22} /></div>
                    <div><div className="ka-sum-k">BUDGET</div><div className="ka-sum-v">{N(budget)}</div></div>
                </div>
                <div className="ka-sum-card">
                    <div className="ka-sum-ico amber"><Icon name="bars" size={22} /></div>
                    <div><div className="ka-sum-k">AVG. ENGAGEMENT RATE</div><div className="ka-sum-v">{(data?.summary.avg_engagement || 0).toFixed(2)}%</div></div>
                </div>
            </div>

            {/* Year + Month + Brand */}
            <div className="ka-filter-row">
                <label className="ka-year">Year:
                    <select value={year} onChange={e => setYear(e.target.value)}>
                        <option value="">ทุกปี</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </label>
                <label className="ka-year">Month:
                    <select value={month} onChange={e => setMonth(e.target.value)}>
                        <option value="">ทุกเดือน</option>
                        {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </label>
            </div>
            <div className="brand-filter">
                <span className="brand-filter-label">Brand:</span>
                <button className={'brand-chip' + (brand === '' ? ' active' : '')} onClick={() => setBrand('')}>All Brands</button>
                {BRANDS.map(b => (
                    <button key={b} className={'brand-chip' + (brand === b ? ' active' : '')} onClick={() => setBrand(b)}>{b}</button>
                ))}
            </div>

            {/* ตาราง */}
            <div className="panel no-pad">
                <div className="ka-table-scroll">
                    <table className="data-table ka-table">
                        <thead>
                            <tr>
                                <th>Month</th><th>Product</th><th>KOL Name</th><th>Link</th><th>Concept</th>
                                <th>Platform</th><th>Owner</th><th>Agency</th><th className="num">COST</th>
                                <th>วันที่ลงงาน</th><th>วันที่เริ่ม Gen</th><th>Days</th><th>Day Left</th>
                                <th>Post Link</th><th>Gencode</th><th>ID POST</th><th className="actions">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!data ? (
                                <tr><td colSpan="17" className="empty">กำลังโหลด...</td></tr>
                            ) : shown.length === 0 ? (
                                <tr><td colSpan="17" className="empty">ยังไม่มี KOL ที่คัดเลือกในเงื่อนไขที่เลือก</td></tr>
                            ) : shown.map(r => (
                                <tr key={r.sub_id}>
                                    <td>{r.month || '—'}</td>
                                    <td><ProductChips products={splitCodes(r.product)} collapseAt={3} /></td>
                                    <td><strong>{r.kol_name}</strong></td>
                                    <td>{r.link_account ? <a href={r.link_account} target="_blank" rel="noreferrer" className="ka-link"><Icon name="eye" size={13} /></a> : '—'}</td>
                                    <td className="ka-concept" title={r.concept || ''}>{r.concept || '—'}</td>
                                    <td>{r.platform || '—'}</td>
                                    <td className="muted">{r.owner || '—'}</td>
                                    <td className="muted">{r.agency || '—'}</td>
                                    <td className="num">{N(r.cost)}</td>
                                    <td>{fmtD(r.post_date)}</td>
                                    <td>{fmtD(r.gen_date)}</td>
                                    <td>{r.days ? `${r.days} Days` : '—'}</td>
                                    <td>{r.day_left == null ? '—' : r.day_left < 0 ? <span className="ka-expired">Expired</span> : `${r.day_left} Days`}</td>
                                    <td>{r.post_url ? <a href={r.post_url} target="_blank" rel="noreferrer" className="ka-view">View</a> : '#'}</td>
                                    <td className="ka-code" title={r.gencode || ''}>{r.gencode || '—'}</td>
                                    <td className="ka-code" title={r.id_post || ''}>{r.id_post || '—'}</td>
                                    <td className="actions">
                                        <span className="row-actions">
                                            <button className="icon-btn" title="แก้ไข" onClick={() => setEditRow(r)}><Icon name="edit" size={14} /></button>
                                            <button className="icon-btn danger" title="เอาออก" onClick={() => removeRow(r)}><Icon name="trash" size={14} /></button>
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {editRow && <EditKolModal row={editRow} onClose={() => setEditRow(null)} onSaved={() => { setEditRow(null); load(); }} />}
        </div>
    );
}
