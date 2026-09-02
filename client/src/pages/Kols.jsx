import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import Icon from '../components/Icon.jsx';
import ProductChips from '../components/ProductChips.jsx';

const splitCodes = v => (v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : []);

const BRANDS = ["Jula's Herb", 'Code Lab', 'Jdent', 'Jarvit', 'Beauterry', 'Jernis', 'Dermiq', 'Minimii', 'Any Skin'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const N = n => (Number(n) || 0).toLocaleString('th-TH');
function fmtD(d) {
    if (!d) return '-';
    const [y, m, day] = d.split('-');
    return `${Number(day)}/${Number(m)}/${y.slice(2)}`;
}

export default function Kols() {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [brand, setBrand] = useState('');
    const [platform, setPlatform] = useState('');
    const [year, setYear] = useState('');
    const [month, setMonth] = useState('');
    const [product, setProduct] = useState('');

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
    // เอาเฉพาะแพลตฟอร์มที่มีข้อมูลจริง จะได้ไม่ขึ้นปุ่มที่กดแล้วว่างเปล่า
    const platforms = useMemo(() => [...new Set(rows.map(r => r.platform).filter(Boolean))].sort(), [rows]);

    const shown = rows.filter(r =>
        (!brand || r.brand === brand) &&
        (!platform || r.platform === platform) &&
        (!year || String(r.year) === String(year)) &&
        (!month || r.month === month) &&
        (!product || r.product === product));

    const total = shown.length;
    const budget = shown.reduce((a, r) => a + r.cost, 0);

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
            <div className="brand-filter">
                <span className="brand-filter-label">Platform:</span>
                <button className={'brand-chip' + (platform === '' ? ' active' : '')} onClick={() => setPlatform('')}>All Platforms</button>
                {platforms.map(p => (
                    <button key={p} className={'brand-chip' + (platform === p ? ' active' : '')} onClick={() => setPlatform(p)}>{p}</button>
                ))}
            </div>

            {/* ตาราง */}
            <div className="panel no-pad">
                <div className="ka-table-scroll">
                    <table className="data-table ka-table">
                        <thead>
                            <tr>
                                <th>Month</th><th>Product</th><th>KOL Name</th><th>Link</th><th>Concept</th>
                                <th>Platform</th><th>Project Owner</th><th>Agency</th><th className="num">COST</th>
                                <th>วันที่ลงงาน</th><th>วันที่เริ่ม Gen</th><th>Days</th><th>Day Left</th>
                                <th>Post Link</th><th>Gencode</th><th>ID POST</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!data ? (
                                <tr><td colSpan="16" className="empty">กำลังโหลด...</td></tr>
                            ) : shown.length === 0 ? (
                                <tr><td colSpan="16" className="empty">ยังไม่มี KOL ที่คัดเลือกในเงื่อนไขที่เลือก</td></tr>
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
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
