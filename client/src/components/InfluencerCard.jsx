import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import Icon from './Icon.jsx';
import UsageForm from './UsageForm.jsx';
import { fmtDate } from '../utils/date.js';

const fmtMoney = n => '฿' + (Number(n) || 0).toLocaleString('th-TH');
const fmtNum = n => {
    const v = Number(n) || 0;
    if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
    if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
    return String(v);
};

// การ์ดโปรไฟล์ Influencer แบบ popup — เด้งขึ้นมาเมื่อคลิกชื่อ
export default function InfluencerCard({ kolId, onClose }) {
    const [kol, setKol] = useState(null);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState(null);

    function load() {
        api(`/kols/${kolId}/usages`)
            .then(res => setKol(res.data))
            .catch(err => setError(err.message));
    }
    useEffect(() => { load(); }, [kolId]);

    const usages = kol?.usages || [];
    const totalSpent = usages.reduce((s, u) => s + (Number(u.fee) || 0), 0);
    const totalViews = usages.reduce((s, u) => s + (Number(u.views) || 0), 0);

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="inf-card" onClick={e => e.stopPropagation()}>
                <button className="inf-close" onClick={onClose}>×</button>

                {error && <div className="alert-error" style={{ margin: 20 }}>{error}</div>}
                {!kol && !error && <div className="empty" style={{ padding: 40 }}>กำลังโหลด...</div>}

                {kol && (
                    <>
                        {/* ส่วนหัวโปรไฟล์ */}
                        <div className="inf-header">
                            <div className="inf-avatar">
                                {kol.avatar ? <img src={kol.avatar} alt="" /> : (kol.name || '?')[0]}
                            </div>
                            <div className="inf-ident">
                                <h3 className="inf-name">{kol.name}</h3>
                                <div className="inf-username">{kol.username || ''}</div>
                                <div className="inf-chips">
                                    {kol.platform && <span className="inf-chip">{kol.platform}</span>}
                                    {kol.category && <span className="inf-chip">{kol.category}</span>}
                                    <span className="inf-chip">{fmtNum(kol.followers)} ผู้ติดตาม</span>
                                </div>
                            </div>
                        </div>

                        {/* สถิติ */}
                        <div className="inf-stats">
                            <div className="inf-stat">
                                <div className="inf-stat-val">{fmtMoney(totalSpent)}</div>
                                <div className="inf-stat-lbl">งบที่จ้างรวม</div>
                            </div>
                            <div className="inf-stat">
                                <div className="inf-stat-val">{usages.length}</div>
                                <div className="inf-stat-lbl">แคมเปญ</div>
                            </div>
                            <div className="inf-stat">
                                <div className="inf-stat-val">{fmtNum(totalViews)}</div>
                                <div className="inf-stat-lbl">ยอดวิวรวม</div>
                            </div>
                            <div className="inf-stat">
                                <div className="inf-stat-val">{kol.engagement_rate != null ? kol.engagement_rate + '%' : '—'}</div>
                                <div className="inf-stat-lbl">Engagement</div>
                            </div>
                        </div>

                        {/* ผลงานที่ผ่านมา */}
                        <div className="inf-body">
                            <div className="inf-section-title">ผลงานที่ผ่านมา ({usages.length})</div>
                            {usages.length === 0 ? (
                                <div className="empty" style={{ padding: '24px 0' }}>ยังไม่มีผลงาน</div>
                            ) : (
                                <div className="inf-works">
                                    {usages.map(u => {
                                        const eng = u.views ? (((Number(u.likes) + Number(u.comments) + Number(u.shares)) / u.views) * 100) : 0;
                                        return (
                                            <div className="inf-work" key={u.link_id}>
                                                <div className="inf-work-main">
                                                    {u.post_link ? (
                                                        <a className="inf-work-link" href={u.post_link} target="_blank" rel="noreferrer">
                                                            <Icon name="eye" size={14} /> ดูผลงาน
                                                            {u.posted_date && <span className="inf-work-date">· {fmtDate(u.posted_date)}</span>}
                                                        </a>
                                                    ) : (
                                                        <span className="inf-work-nolink">ยังไม่มีลิงก์ผลงาน</span>
                                                    )}
                                                    <div className="inf-work-stats">
                                                        <span title="ยอดวิว">👁 {u.views ? fmtNum(u.views) : '—'}</span>
                                                        <span title="ไลก์">❤️ {fmtNum(u.likes)}</span>
                                                        <span title="คอมเมนต์">💬 {fmtNum(u.comments)}</span>
                                                        <span title="แชร์">🔁 {fmtNum(u.shares)}</span>
                                                        {u.views > 0 && <span className="inf-eng" title="Engagement rate">ER {eng.toFixed(1)}%</span>}
                                                    </div>
                                                    <div className="inf-work-foot">
                                                        <span>💰 {fmtMoney(u.fee)}</span>
                                                        <span className="inf-work-status">{u.status || 'Pending'}</span>
                                                    </div>
                                                </div>
                                                <div className="inf-work-actions">
                                                    <button className="icon-btn" title="แก้ข้อมูล" onClick={() => setEditing(u)}>
                                                        <Icon name="edit" size={15} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {editing && (
                    <UsageForm usage={editing} onClose={() => setEditing(null)}
                        onSaved={() => { setEditing(null); load(); }} />
                )}
            </div>
        </div>
    );
}
