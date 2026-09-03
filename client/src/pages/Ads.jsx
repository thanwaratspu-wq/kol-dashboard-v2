import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';
import Icon from '../components/Icon.jsx';
import Avatar from '../components/Avatar.jsx';
import { productLabel, asTargetArray } from '../data/products.js';
import { ProductSummary } from '../components/ProductChips.jsx';
import { fmtDate } from '../utils/date.js';

const BRANDS = ["Jula's Herb", 'Code Lab', 'Jdent', 'Jarvit', 'Beauterry', 'Jernis', 'Dermiq', 'Minimii', 'Any Skin'];
const STATUSES = ['ยังไม่ยิง', 'ยิงแล้ว'];

const fmtMoney = n => '฿' + (Number(n) || 0).toLocaleString('th-TH');
const fmtNum = n => {
    const v = Number(n) || 0;
    if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
    if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
    return String(v);
};
// จำนวนวันระหว่าง 2 วันที่ (to - from) เป็นจำนวนวัน (คืน null ถ้าข้อมูลไม่ครบ)
function daysBetween(from, to) {
    if (!from || !to) return null;
    const a = new Date(from + 'T00:00:00');
    const b = new Date(to + 'T00:00:00');
    if (isNaN(a) || isNaN(b)) return null;
    return Math.round((b - a) / 86400000);
}
function currentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
function monthToRange(m) {
    if (!m) return { from: '', to: '' };
    const [y, mo] = m.split('-').map(Number);
    const last = new Date(y, mo, 0).getDate();
    const pad = n => String(n).padStart(2, '0');
    return { from: `${y}-${pad(mo)}-01`, to: `${y}-${pad(mo)}-${pad(last)}` };
}

// โค้ด + ปุ่มคัดลอก (Gencode / ID Post)
function CopyCode({ value }) {
    const [copied, setCopied] = useState(false);
    if (!value) return <span className="muted">—</span>;
    const copy = () => {
        navigator.clipboard?.writeText(String(value))
            .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400); })
            .catch(() => {});
    };
    return (
        <span className="ads-code-wrap">
            <span className="ads-code" title={value}>{value}</span>
            <button type="button" className={'ads-copy' + (copied ? ' done' : '')} onClick={copy} title={copied ? 'คัดลอกแล้ว' : 'คัดลอก'}>
                {copied ? <Icon name="check" size={13} /> : <Icon name="copy" size={13} />}
            </button>
        </span>
    );
}

// แถวตาราง: อัปเดตข้อมูลแอดของโพสต์ 1 อัน (บันทึกเมื่อออกจากช่อง)
function AdRow({ row, onSaved }) {
    const [adStatus, setAdStatus] = useState(row.ad_status || 'ยังไม่ยิง');
    const [end, setEnd] = useState(row.ad_end || '');
    const [note, setNote] = useState(row.ad_note || '');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // ยิง PUT (route อัปเดตเฉพาะ field ที่ส่งมา จึงแยกบันทึกสถานะ/ตัวเลขได้โดยไม่ทับกัน)
    async function put(body) {
        setSaving(true); setSaved(false);
        try {
            await api(`/ads/${row.sub_id}`, { method: 'PUT', body });
            setSaved(true); onSaved();
            setTimeout(() => setSaved(false), 1600);
        } catch (err) { alert(err.message); }
        finally { setSaving(false); }
    }

    // บันทึกหมายเหตุ (เช่น Gencode ใช้ไม่ได้ / ยิงแอดไม่ได้) — เฉพาะเมื่อมีการเปลี่ยน
    const saveNote = () => { if (note !== (row.ad_note || '')) put({ ad_note: note || null }); };

    // สลับสถานะ — เมื่อกด "ยิงแล้ว" ให้ลงวันยิงแอด (ad_end) เป็นวันนี้อัตโนมัติ, ยกเลิกให้ล้างวันที่
    function toggleStatus() {
        const next = adStatus === 'ยิงแล้ว' ? 'ยังไม่ยิง' : 'ยิงแล้ว';
        setAdStatus(next);
        if (next === 'ยิงแล้ว') {
            const d = new Date(); // วันที่ปัจจุบันตามเครื่องผู้ใช้ (local)
            const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            setEnd(today);
            put({ ad_status: next, ad_end: today });
        } else {
            setEnd('');
            put({ ad_status: next, ad_end: null });
        }
    }

    // ยิงแอดช้าไปกี่วันหลังวันลงคลิป (นับจาก Post Date → วันยิงแอด)
    const lateDays = (adStatus === 'ยิงแล้ว' && row.post_date && end) ? daysBetween(row.post_date, end) : null;

    return (
        <div className="ads-row">
            <div className="ads-name">
                <Avatar name={row.account_name || '?'} size={36} />
                <div className="ads-name-meta">
                    <span className="ads-acc">{row.account_name}</span>
                    <span className="ads-plat">{row.platform || '—'}</span>
                </div>
            </div>
            <div className="ads-cell ads-camp">
                <span className="ads-camp-name">{row.project_name || '—'}</span>
                {row.brand && <span className="tag">{row.brand}</span>}
            </div>
            <div className="ads-cell ads-prod">
                <ProductSummary value={row.product} max={2} />
            </div>
            <div className="ads-cell ads-prod">
                {asTargetArray(row.target).length > 0
                    ? asTargetArray(row.target).map(t => <span className="proc-ads-tgt" key={t} title={t}>🎯 {t}</span>)
                    : <span className="muted">—</span>}
            </div>
            <div className="ads-cell">
                {row.content_type ? <span className="proc-ctype-chip">{row.content_type}</span> : <span className="muted">—</span>}
            </div>
            <div className="ads-cell ads-post">
                {row.post_url
                    ? <a href={row.post_url} target="_blank" rel="noreferrer" title="เปิดโพสต์"><Icon name="eye" size={16} /></a>
                    : <span className="muted">—</span>}
            </div>
            <div className="ads-cell">
                <CopyCode value={row.gencode} />
            </div>
            <div className="ads-cell">
                {row.id_post ? <span className="ads-code" title={row.id_post}>{row.id_post}</span> : <span className="muted">—</span>}
            </div>
            <div className="ads-cell">
                {row.post_date ? <span className="ads-postdate">{fmtDate(row.post_date)}</span> : <span className="muted">—</span>}
            </div>
            <div className="ads-cell">
                <button type="button" className={'ads-status ' + (adStatus === 'ยิงแล้ว' ? 'done' : 'pending')} onClick={toggleStatus} disabled={saving}>
                    {adStatus === 'ยิงแล้ว' ? '✓ ยิงแล้ว' : 'ยังไม่ยิง'}
                </button>
                {/* ย้ายตัวบอกสถานะการบันทึกมาจากช่อง CPM ที่เอาออกไป */}
                {saving ? <span className="proc-status">…</span> : saved ? <span className="proc-status ok">✓</span> : null}
            </div>
            {/* แก้เองไม่ได้ — ระบบลงวันที่ให้ตอนกดปุ่มสถานะเป็น "ยิงแล้ว" และล้างให้เมื่อกดกลับเป็น "ยังไม่ยิง" */}
            <div className="ads-cell">
                {end
                    ? <span className="ads-postdate" title="ลงอัตโนมัติจากวันที่กดยิงแอด">{fmtDate(end)}</span>
                    : <span className="muted" title="กดปุ่มสถานะเป็น 'ยิงแล้ว' แล้ววันที่จะขึ้นเอง">—</span>}
            </div>
            <div className="ads-cell ads-late">
                {lateDays === null
                    ? <span className="muted">—</span>
                    : lateDays <= 0
                        ? <span className="late-chip ontime" title="ยิงแอดในวันเดียวกับที่ลงคลิป">ตรงเวลา</span>
                        : <span className={'late-chip ' + (lateDays <= 3 ? 'warn' : 'bad')} title={`ยิงแอดช้ากว่าวันลงคลิป ${lateDays} วัน`}>ช้า {lateDays} วัน</span>}
            </div>
            <div className="ads-cell ads-note">
                <input value={note} onChange={e => setNote(e.target.value)} onBlur={saveNote}
                    placeholder="เช่น Gencode ใช้ไม่ได้ / ยิงไม่ได้" title={note || 'หมายเหตุจากทีมยิงแอด'} />
            </div>
        </div>
    );
}

export default function Ads() {
    const [month, setMonth] = useState(currentMonth());
    const [allTime, setAllTime] = useState(true);
    const [brand, setBrand] = useState('');
    const [status, setStatus] = useState('');
    const [data, setData] = useState(null);
    const [error, setError] = useState('');

    const load = useCallback(() => {
        const q = new URLSearchParams();
        if (!allTime && month) {
            const { from, to } = monthToRange(month);
            q.set('from', from); q.set('to', to);
        }
        if (brand) q.set('brand', brand);
        if (status) q.set('status', status);
        api(`/ads?${q.toString()}`)
            .then(res => setData(res.data))
            .catch(err => setError(err.message));
    }, [month, allTime, brand, status]);

    useEffect(() => { load(); }, [load]);

    const s = data?.summary;
    // เรียง: ยังไม่ยิง อยู่บน, ยิงแล้ว ลงไปอยู่ล่าง (ของเดิมในกลุ่มเดียวกันคงลำดับตาม data)
    const rows = [...(data?.rows || [])].sort((a, b) => (a.ad_status === 'ยิงแล้ว' ? 1 : 0) - (b.ad_status === 'ยิงแล้ว' ? 1 : 0));
    // ค่า insight เพิ่มเติม (คำนวณจากข้อมูลที่มี)
    const topBrand = s && s.by_brand && s.by_brand.length ? s.by_brand[0] : null;
    const donePct = s && s.total_posts ? Math.round((s.done_count / s.total_posts) * 100) : 0;
    const maxBrandSpend = s && s.by_brand ? Math.max(1, ...s.by_brand.map(b => b.spend)) : 1;

    return (
        <div>
            <header className="page-head">
                <div>
                    <h1>ADS</h1>
                    <p className="page-sub">ติดตามสถานะการยิงแอดของแต่ละโพสต์ และสรุปค่าแอด</p>
                </div>
            </header>

            {/* ตัวกรอง */}
            <div className="toolbar" style={{ flexWrap: 'wrap' }}>
                <label className="bud-month">
                    เดือน:
                    <input type="month" value={month} disabled={allTime} onChange={e => setMonth(e.target.value)} />
                </label>
                <button className={'brand-chip' + (allTime ? ' active' : '')} onClick={() => setAllTime(a => !a)}>
                    {allTime ? '✓ ทุกเดือน' : 'ดูทุกเดือน'}
                </button>
                <span style={{ width: 12 }} />
                <button className={'brand-chip' + (status === '' ? ' active' : '')} onClick={() => setStatus('')}>ทุกสถานะ</button>
                {STATUSES.map(st => (
                    <button key={st} className={'brand-chip' + (status === st ? ' active' : '')} onClick={() => setStatus(st)}>{st}</button>
                ))}
            </div>

            <div className="brand-filter">
                <span className="brand-filter-label">▼ แบรนด์:</span>
                <button className={'brand-chip' + (brand === '' ? ' active' : '')} onClick={() => setBrand('')}>ทุกแบรนด์</button>
                {BRANDS.map(b => (
                    <button key={b} className={'brand-chip' + (brand === b ? ' active' : '')} onClick={() => setBrand(b)}>{b}</button>
                ))}
            </div>

            {error && <div className="alert-error">{error}</div>}

            {/* การ์ดสรุปค่าแอด */}
            <div className="summary-grid">
                <div className="summary-card">
                    <div className="summary-label">ยิงแอดแล้ว</div>
                    <div className="summary-value">{s ? `${s.done_count}/${s.total_posts}` : '—'}</div>
                    <div className="ads-progress"><span style={{ width: `${donePct}%` }} /></div>
                    <div className="summary-sub">{s ? `เหลือยังไม่ยิง ${s.pending_count} โพสต์ · ${donePct}%` : '—'}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-label">Reach / วิว รวม (จากแอด)</div>
                    <div className="summary-value">{s ? fmtNum(s.total_reach) : '—'}</div>
                    <div className="summary-sub">ยอดที่ได้จากการยิงแอด</div>
                </div>
                <div className="summary-card">
                    <div className="summary-label">CPM แอด (ต้นทุน/1,000 วิว)</div>
                    <div className="summary-value">{s ? fmtMoney(s.cpm) : '—'}</div>
                    <div className="summary-sub">ยิ่งต่ำยิ่งคุ้ม</div>
                </div>
                <div className="summary-card">
                    <div className="summary-label">CPE แอด (ต้นทุน/1 engagement)</div>
                    <div className="summary-value">{s ? fmtMoney(s.cpe || 0) : '—'}</div>
                    <div className="summary-sub">ยิ่งต่ำยิ่งคุ้ม</div>
                </div>
            </div>

            {/* ตารางติดตามการยิงแอดรายโพสต์ */}
            <div className="panel">
                <div className="dash-section-head">
                    <h3>ติดตามการยิงแอดรายโพสต์ <span className="dash-section-sub">กรอกข้อมูลแล้วคลิกออกจากช่องเพื่อบันทึก</span></h3>
                </div>
                {!data ? (
                    <p className="empty" style={{ padding: '20px 0' }}>กำลังโหลด...</p>
                ) : rows.length === 0 ? (
                    <div className="empty-illus">
                        <div className="empty-illus-icon"><Icon name="target" size={30} /></div>
                        <div className="empty-illus-title">ยังไม่มีโพสต์ที่ยิงแอด</div>
                        <p className="empty-illus-sub">เมื่อ KOL ลงงานและทีมใส่ลิงก์โพสต์ในแท็บ On Process แล้ว โพสต์จะขึ้นมาที่นี่ให้ติดตามค่าแอดอัตโนมัติ</p>
                    </div>
                ) : (
                    <div className="ads-tbl-scroll">
                        <div className="ads-tbl">
                            <div className="ads-tbl-head">
                                <span>KOL</span><span>แคมเปญ</span><span>PRODUCT</span><span>TARGET</span><span>CONTENT TYPE</span><span>โพสต์</span><span>GENCODE</span><span>ID POST</span><span>Post Date</span><span>สถานะ</span>
                                <span>วันยิงแอด</span><span>ยิงช้า</span><span>หมายเหตุ</span>
                            </div>
                            {rows.map(r => <AdRow key={r.sub_id} row={r} onSaved={load} />)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
