import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import Icon from './Icon.jsx';

const TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const fmtMoney = n => '฿' + (Number(n) || 0).toLocaleString('th-TH');
const fmtNum = n => {
    const v = Number(n) || 0;
    if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
    if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
    return String(v);
};

// popup เปรียบเทียบงบประมาณรายเดือน + ความคุ้มค่า (CPM/CPE/ยอดวิว)
export default function BudgetTrendModal({ brand, onClose }) {
    const [year, setYear] = useState(new Date().getFullYear());
    const [trend, setTrend] = useState([]);

    useEffect(() => {
        const q = new URLSearchParams({ year: String(year) });
        if (brand) q.set('brand', brand);
        api(`/stats/budget/trend?${q.toString()}`)
            .then(res => setTrend(res.data))
            .catch(() => setTrend([]));
    }, [year, brand]);

    const maxSpent = Math.max(1, ...trend.map(t => t.spent));
    const active = trend.filter(t => t.spent > 0 || t.views > 0);
    const bestCpm = Math.min(...active.filter(t => t.cpm > 0).map(t => t.cpm), Infinity);

    // เปลี่ยนแปลง % เทียบเดือนก่อนหน้าที่มีการใช้จ่าย
    function changeVsPrev(monthIdx) {
        for (let j = monthIdx - 1; j >= 0; j--) {
            if (trend[j] && trend[j].spent > 0) {
                const prev = trend[j].spent, cur = trend[monthIdx].spent;
                return prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;
            }
        }
        return null;
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal wide" onClick={e => e.stopPropagation()}>
                <div className="modal-head">
                    <h3>เปรียบเทียบงบประมาณรายเดือน{brand ? ` · ${brand}` : ''}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="year-switch">
                            <button className="icon-btn" onClick={() => setYear(y => y - 1)}><Icon name="back" size={14} /></button>
                            <span>{year}</span>
                            <button className="icon-btn" onClick={() => setYear(y => y + 1)}><Icon name="chevron" size={14} /></button>
                        </div>
                        <button className="modal-x" onClick={onClose}>×</button>
                    </div>
                </div>

                {/* กราฟงบที่ใช้รายเดือน */}
                <div className="trend-chart" style={{ marginBottom: 6 }}>
                    {trend.map(t => (
                        <div className="trend-col" key={t.month}
                            title={`${TH[t.month - 1]} — ใช้ ${fmtMoney(t.spent)} · CPM ${fmtMoney(t.cpm)} · CPE ${fmtMoney(t.cpe)}`}>
                            <div className="trend-bar-wrap">
                                <div className="trend-bar-spent-solo" style={{ height: `${Math.round((t.spent / maxSpent) * 100)}%` }} />
                            </div>
                            <span className="trend-label">{TH[t.month - 1]}</span>
                        </div>
                    ))}
                </div>
                <div className="trend-legend"><span><i className="lg-spent" /> งบที่ใช้ไปรายเดือน</span></div>

                {/* ตารางเปรียบเทียบ + ความคุ้มค่า */}
                <div className="panel no-pad" style={{ marginTop: 16, boxShadow: 'none', border: '1px solid var(--border)' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>เดือน</th><th className="num">ใช้ไป</th><th className="num">เทียบเดือนก่อน</th>
                                <th className="num">CPM</th><th className="num">CPE</th><th className="num">ยอดวิว</th>
                            </tr>
                        </thead>
                        <tbody>
                            {active.length === 0 ? (
                                <tr><td colSpan="6" className="empty">ไม่มีข้อมูลในปี {year}</td></tr>
                            ) : active.map(t => {
                                const ch = changeVsPrev(t.month - 1);
                                const isBest = t.cpm > 0 && t.cpm === bestCpm;
                                return (
                                    <tr key={t.month}>
                                        <td><strong>{TH[t.month - 1]} {year}</strong></td>
                                        <td className="num" style={{ fontWeight: 700, color: 'var(--mint-dark)' }}>{fmtMoney(t.spent)}</td>
                                        <td className="num">
                                            {ch == null ? <span className="muted">—</span>
                                                : <span className={ch > 0 ? 'chg-up' : ch < 0 ? 'chg-down' : 'muted'}>
                                                    {ch > 0 ? '▲' : ch < 0 ? '▼' : ''} {Math.abs(ch)}%
                                                </span>}
                                        </td>
                                        <td className="num">
                                            {fmtMoney(t.cpm)} {isBest && <span className="best-tag">คุ้มสุด</span>}
                                        </td>
                                        <td className="num">{fmtMoney(t.cpe)}</td>
                                        <td className="num">{fmtNum(t.views)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <p className="trend-note">▲ ใช้งบเพิ่มขึ้น · ▼ ลดลง (เทียบเดือนก่อนหน้า) · CPM/CPE ยิ่งต่ำยิ่งคุ้ม</p>
            </div>
        </div>
    );
}
