import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import Icon from '../components/Icon.jsx';

const BRANDS = ["Jula's Herb", "Jula's Herb Lab", 'Jdent', 'Jarvit', 'Beauterry', 'Jernis', 'Dermiq', 'Minimii', 'Any Skin'];
const fmt = n => (Number(n) || 0).toLocaleString('th-TH');

export default function Budget() {
    const navigate = useNavigate();
    const [brand, setBrand] = useState('');
    const [rows, setRows] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const q = new URLSearchParams();
        if (brand) q.set('brand', brand);
        api(`/stats/reports?${q.toString()}`)
            .then(res => setRows(res.data))
            .catch(err => setError(err.message));
    }, [brand]);

    return (
        <div>
            <header className="page-head">
                <h1>Campaign Reports</h1>
                <p className="page-sub">เลือกแคมเปญเพื่อดูรายงาน</p>
            </header>

            {/* ฟิลเตอร์ตามแบรนด์ (dropdown) */}
            <div className="brand-filter">
                <span className="brand-filter-label">▼ แบรนด์:</span>
                <select className="campaign-select" value={brand} onChange={e => setBrand(e.target.value)}>
                    <option value="">ทุกแบรนด์</option>
                    {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
            </div>

            {error && <div className="alert-error">{error}</div>}

            <h3 className="report-section-title">Select Campaign to Report</h3>

            {!rows ? (
                <div className="panel"><p className="empty">กำลังโหลด...</p></div>
            ) : rows.length === 0 ? (
                <div className="panel">
                    <div className="empty-illus">
                        <div className="empty-illus-icon"><Icon name="bars" size={28} /></div>
                        <div className="empty-illus-title">ยังไม่มีแคมเปญให้รายงาน</div>
                        <p className="empty-illus-sub">{brand ? `ยังไม่มีแคมเปญของแบรนด์ ${brand}` : 'เมื่อมีแคมเปญในระบบ จะแสดงการ์ดรายงานที่นี่'}</p>
                    </div>
                </div>
            ) : (
                <div className="report-grid">
                    {rows.map(r => (
                        <div className="report-card" key={r.id}>
                            <div className="report-card-head">
                                <h3 className="report-card-name">{r.name}</h3>
                                <span className={`report-status st-${r.status}`}>{r.status}</span>
                            </div>
                            <div className="report-card-dates">{r.start_date || '—'} - {r.end_date || '—'}</div>

                            <div className="report-metrics">
                                <div className="rm">
                                    <div className="rm-label">KOLS</div>
                                    <div className="rm-val pink">{fmt(r.kols)}</div>
                                </div>
                                <div className="rm">
                                    <div className="rm-label">BUDGET</div>
                                    <div className="rm-val blue">{fmt(r.budget)}</div>
                                </div>
                                <div className="rm">
                                    <div className="rm-label">USED</div>
                                    <div className="rm-val red">{fmt(r.used)}</div>
                                </div>
                                <div className="rm">
                                    <div className="rm-label">POST RATE</div>
                                    <div className="rm-val green">{r.post_rate}%</div>
                                </div>
                            </div>

                            <button className="report-view-btn" onClick={() => navigate(`/reports/${r.id}`)}>
                                <Icon name="bars" size={15} /> View Report
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
