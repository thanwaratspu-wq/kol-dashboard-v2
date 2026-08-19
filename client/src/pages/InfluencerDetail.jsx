import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, openFile } from '../api/client.js';
import Icon from '../components/Icon.jsx';

const fmtMoney = n => '฿' + (Number(n) || 0).toLocaleString('th-TH');
const fmtNum = n => {
    const v = Number(n) || 0;
    if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
    if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
    return String(v);
};

// modal แก้ข้อมูลการใช้งานในแคมเปญ (งบ/วิว/ลิงก์ผลงาน/วันที่ลงงาน)
function UsageForm({ usage, onClose, onSaved }) {
    const [form, setForm] = useState({
        fee: usage.fee ?? '', views: usage.views ?? '',
        post_link: usage.post_link || '', posted_date: usage.posted_date || '',
        status: usage.status || 'Pending'
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    function up(k, v) { setForm(f => ({ ...f, [k]: v })); }

    async function submit(e) {
        e.preventDefault();
        setError(''); setSaving(true);
        try {
            await api(`/projects/${usage.project_id}/kols/${usage.link_id}`, {
                method: 'PUT',
                body: {
                    fee: Number(form.fee) || 0,
                    views: Number(form.views) || 0,
                    post_link: form.post_link || null,
                    posted_date: form.posted_date || null,
                    status: form.status
                }
            });
            onSaved();
        } catch (err) { setError(err.message); }
        finally { setSaving(false); }
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-head">
                    <h3>แก้ข้อมูลผลงาน — {usage.project_name}</h3>
                    <button type="button" className="modal-x" onClick={onClose}>×</button>
                </div>
                {error && <div className="alert-error">{error}</div>}
                <form onSubmit={submit}>
                    <div className="field-row">
                        <div className="field">
                            <label>งบที่จ้าง (฿)</label>
                            <input type="number" min="0" value={form.fee} onChange={e => up('fee', e.target.value)} />
                        </div>
                        <div className="field">
                            <label>ยอดวิว</label>
                            <input type="number" min="0" value={form.views} onChange={e => up('views', e.target.value)} />
                        </div>
                    </div>
                    <div className="field">
                        <label>ลิงก์ผลงาน (โพสต์)</label>
                        <input type="url" value={form.post_link} onChange={e => up('post_link', e.target.value)}
                            placeholder="https://..." />
                    </div>
                    <div className="field-row">
                        <div className="field">
                            <label>วันที่ลงงาน</label>
                            <input type="date" value={form.posted_date} onChange={e => up('posted_date', e.target.value)} />
                        </div>
                        <div className="field">
                            <label>สถานะ</label>
                            <select value={form.status} onChange={e => up('status', e.target.value)}>
                                <option>Pending</option>
                                <option>Confirmed</option>
                                <option>Posted</option>
                                <option>Paid</option>
                            </select>
                        </div>
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

export default function InfluencerDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [kol, setKol] = useState(null);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState(null);

    function load() {
        api(`/kols/${id}/usages`)
            .then(res => setKol(res.data))
            .catch(err => setError(err.message));
    }
    useEffect(() => { load(); }, [id]);

    if (error) return <div className="alert-error">{error}</div>;
    if (!kol) return <div className="empty">กำลังโหลด...</div>;

    const usages = kol.usages || [];
    const totalSpent = usages.reduce((s, u) => s + (Number(u.fee) || 0), 0);
    const totalViews = usages.reduce((s, u) => s + (Number(u.views) || 0), 0);

    return (
        <div>
            {/* Hero */}
            <div className="pd-hero">
                <button className="pd-back" onClick={() => navigate('/kols')} title="กลับ"><Icon name="back" size={18} /></button>
                <div className="pd-hero-main">
                    <div className="pd-hero-top">
                        {kol.platform && <span className="pd-chip">{kol.platform}</span>}
                        {kol.category && <span className="pd-chip">{kol.category}</span>}
                        <span className="pd-chip">{fmtNum(kol.followers)} ผู้ติดตาม</span>
                    </div>
                    <h1 className="pd-title">{kol.name} <span style={{ fontWeight: 400, opacity: .85, fontSize: 18 }}>{kol.username || ''}</span></h1>
                </div>
            </div>

            {/* การ์ดสรุป */}
            <div className="pd-metrics">
                <div className="pd-metric">
                    <div className="pd-metric-icon budget"><Icon name="coins" size={22} /></div>
                    <div><div className="pd-metric-label">งบที่จ้างรวม</div><div className="pd-metric-value">{fmtMoney(totalSpent)}</div></div>
                </div>
                <div className="pd-metric">
                    <div className="pd-metric-icon kol"><Icon name="folder" size={20} /></div>
                    <div><div className="pd-metric-label">จำนวนแคมเปญ</div><div className="pd-metric-value">{usages.length}</div></div>
                </div>
                <div className="pd-metric">
                    <div className="pd-metric-icon date"><Icon name="eye" size={20} /></div>
                    <div><div className="pd-metric-label">ยอดวิวรวม</div><div className="pd-metric-value">{fmtNum(totalViews)}</div></div>
                </div>
                <div className="pd-metric">
                    <div className="pd-metric-icon owner"><Icon name="bars" size={20} /></div>
                    <div><div className="pd-metric-label">Engagement</div><div className="pd-metric-value">{kol.engagement_rate != null ? kol.engagement_rate + '%' : '—'}</div></div>
                </div>
            </div>

            {/* ประวัติผลงานในแต่ละแคมเปญ */}
            <div className="section-head"><h3>ผลงานในแคมเปญ ({usages.length})</h3></div>
            <div className="panel no-pad">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>แคมเปญ</th><th>ทีม</th><th className="num">งบที่จ้าง</th>
                            <th className="num">ยอดวิว</th><th>วันที่ลงงาน</th><th>ลิงก์ผลงาน</th>
                            <th>สถานะ</th><th className="actions"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {usages.length === 0 ? (
                            <tr><td colSpan="8" className="empty">ยังไม่เคยถูกใช้ในแคมเปญ</td></tr>
                        ) : usages.map(u => (
                            <tr key={u.link_id}>
                                <td>
                                    <a className="link-name" onClick={() => navigate(`/projects/${u.project_id}`)} style={{ cursor: 'pointer' }}>
                                        <strong>{u.project_name}</strong>
                                    </a>
                                    {u.brand && <div className="muted" style={{ fontSize: 12 }}>{u.brand}</div>}
                                </td>
                                <td className="muted">{u.team_name || '—'}</td>
                                <td className="num" style={{ color: 'var(--mint-dark)', fontWeight: 700 }}>{fmtMoney(u.fee)}</td>
                                <td className="num">{u.views ? fmtNum(u.views) : '—'}</td>
                                <td className="muted">{u.posted_date || '—'}</td>
                                <td>
                                    {u.post_link ? (
                                        <a className="work-link" href={u.post_link} target="_blank" rel="noreferrer">
                                            <Icon name="eye" size={12} /> เปิดผลงาน
                                        </a>
                                    ) : <span className="muted">—</span>}
                                </td>
                                <td><span className="tag">{u.status || 'Pending'}</span></td>
                                <td className="actions">
                                    <button className="icon-btn" title="แก้ข้อมูล" onClick={() => setEditing(u)}><Icon name="edit" size={16} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {editing && (
                <UsageForm usage={editing} onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); load(); }} />
            )}
        </div>
    );
}
