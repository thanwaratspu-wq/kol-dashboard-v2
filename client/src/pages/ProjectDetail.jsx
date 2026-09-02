import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, openFile } from '../api/client.js';
import Icon from '../components/Icon.jsx';
import ProjectForm from '../components/ProjectForm.jsx';
import OnProcessTable from '../components/OnProcessTable.jsx';
import ProductChips, { ProductSummary } from '../components/ProductChips.jsx';
import { productLabel, asTargetArray } from '../data/products.js';
import { tabBadges, markSeen, seedDraftsSeen } from '../utils/tabUpdates.js';

const STATUS_LABEL = { Draft: 'ร่าง', Active: 'กำลังทำ', Completed: 'เสร็จสิ้น', Cancelled: 'ยกเลิก' };
const STATUS_ORDER = ['Draft', 'Active', 'Completed', 'Cancelled'];
const LINK_PLATFORMS = ['TikTok', 'Instagram', 'Facebook', 'Lemon8', 'X', 'YouTube'];

function formatFollowers(n) {
    const num = Number(n) || 0;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return String(num);
}

function AddKolModal({ projectId, existingIds, onClose, onAdded }) {
    const [kols, setKols] = useState([]);
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        api(`/kols?limit=200${search ? `&search=${encodeURIComponent(search)}` : ''}`)
            .then(res => setKols(res.data))
            .catch(err => setError(err.message));
    }, [search]);

    async function add(kol) {
        try {
            await api(`/projects/${projectId}/kols`, { method: 'POST', body: { kol_id: kol.id } });
            onAdded();
        } catch (err) { alert(err.message); }
    }

    const available = kols.filter(k => !existingIds.includes(k.id));

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal wide" onClick={e => e.stopPropagation()}>
                <h3>เพิ่ม KOL เข้า Project</h3>
                {error && <div className="alert-error">{error}</div>}
                <div className="search-wrap" style={{ maxWidth: 'none', marginBottom: 14 }}>
                    <Icon name="search" size={17} />
                    <input className="search-input" placeholder="ค้นหา KOL..."
                        value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="pick-list">
                    {available.length === 0 ? (
                        <div className="empty">ไม่มี KOL ให้เพิ่ม (อาจถูกเพิ่มไปหมดแล้ว)</div>
                    ) : available.map(k => (
                        <div className="pick-row" key={k.id}>
                            <div className="pick-info">
                                <div className="pick-name">{k.name}</div>
                                <div className="pick-sub">{k.username || '—'} · {k.platform || '—'} · {formatFollowers(k.followers)} ผู้ติดตาม</div>
                            </div>
                            <button className="btn-primary" onClick={() => add(k)}>
                                <Icon name="plus" size={15} /> เพิ่ม
                            </button>
                        </div>
                    ))}
                </div>
                <div className="modal-actions">
                    <button className="btn-ghost" onClick={onClose}>ปิด</button>
                </div>
            </div>
        </div>
    );
}

const SUB_PLATFORMS = ['TikTok', 'Instagram', 'Facebook', 'Lemon8', 'YouTube', 'X'];

// modal เพิ่ม KOL เข้าลิสต์เอง (ฝั่งทีม)
function AddSubmissionModal({ projectId, products = [], onClose, onAdded }) {
    const [f, setF] = useState({ account_name: '', platform: 'TikTok', product: '', agency: '', budget: '', link_account: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const up = (k, v) => setF(s => ({ ...s, [k]: v }));

    async function submit(e) {
        e.preventDefault();
        setError(''); setSaving(true);
        try {
            await api(`/projects/${projectId}/submissions`, {
                method: 'POST',
                body: { ...f, budget: Number(f.budget) || 0 }
            });
            onAdded();
        } catch (err) { setError(err.message); }
        finally { setSaving(false); }
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-head"><h3>เพิ่ม KOL เข้า Project</h3><button className="modal-x" onClick={onClose}>×</button></div>
                {error && <div className="alert-error">{error}</div>}
                <form onSubmit={submit}>
                    <div className="field">
                        <label>ชื่อ Account *</label>
                        <input value={f.account_name} onChange={e => up('account_name', e.target.value)} placeholder="เช่น @username" required autoFocus />
                    </div>
                    <div className="field-row">
                        <div className="field">
                            <label>Platform</label>
                            <select value={f.platform} onChange={e => up('platform', e.target.value)}>
                                {SUB_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="field">
                            <label>Product</label>
                            {products.length > 0 ? (
                                <select value={f.product} onChange={e => up('product', e.target.value)}>
                                    <option value="">— เลือก —</option>
                                    {products.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            ) : <input value={f.product} onChange={e => up('product', e.target.value)} placeholder="สินค้า" />}
                        </div>
                    </div>
                    <div className="field-row">
                        <div className="field">
                            <label>Agency</label>
                            <input value={f.agency} onChange={e => up('agency', e.target.value)} placeholder="ชื่อเอเจนซี่" />
                        </div>
                        <div className="field">
                            <label>Budget (฿)</label>
                            <input type="number" min="0" value={f.budget} onChange={e => up('budget', e.target.value)} placeholder="งบค่าตัว" />
                        </div>
                    </div>
                    <div className="field">
                        <label>Link Account</label>
                        <input type="url" value={f.link_account} onChange={e => up('link_account', e.target.value)} placeholder="https://..." />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn-ghost" onClick={onClose}>ยกเลิก</button>
                        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'กำลังบันทึก...' : 'เพิ่ม KOL'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ชิปสินค้าในแถบลิงก์เอเจนซี่ — พับเก็บเวลาสินค้าเยอะ กันแถบยาว
function ScopeProducts({ codes, limit = 6 }) {
    const [open, setOpen] = useState(false);
    if (!codes || codes.length === 0) return null;
    const collapsed = !open && codes.length > limit;
    const shown = collapsed ? codes.slice(0, limit) : codes;
    return (
        <>
            {shown.map(c => <span className="alp-sv-chip prod" key={c} title={productLabel(c)}>{c}</span>)}
            {codes.length > limit && (
                <button type="button" className="alp-sv-more" onClick={() => setOpen(o => !o)}>
                    {collapsed ? `+${codes.length - limit} สินค้า` : '▲ ย่อ'}
                </button>
            )}
        </>
    );
}

// แถบลิงก์เอเจนซี่ 1 อัน — ย่อเป็นบรรทัดเดียว (ชื่อ + สรุปขอบเขต + ปุ่ม) กด ▾ เพื่อดู URL + สินค้าเต็ม
function AgencyLinkRow({ l, url, copied, onCopy, onDelete }) {
    const [open, setOpen] = useState(false);
    const prods = l.products || [];
    const plats = l.platforms || [];
    return (
        <div className="alp-item">
            <div className="alp-item-top">
                <button type="button" className="alp-toggle" onClick={() => setOpen(o => !o)} title={open ? 'ย่อ' : 'ดูรายละเอียด'}>{open ? '▾' : '▸'}</button>
                <span className="alp-name"><Icon name="users" size={14} /> {l.name}</span>
                <div className="alp-summary">
                    {l.kol_count > 0 && <span className="alp-sv-chip kol">⭐ {l.kol_count} KOL</span>}
                    <span className="alp-sv-chip prod">{prods.length ? `${prods.length} สินค้า` : 'ทุกสินค้า'}</span>
                    {plats.length ? plats.map(p => <span className="alp-sv-chip plat" key={p}>{p}</span>) : <span className="alp-sv-chip plat">ทุก Platform</span>}
                </div>
                <button className="btn-ghost" onClick={onCopy}>{copied ? '✓ คัดลอกแล้ว' : 'คัดลอก'}</button>
                <a className="btn-ghost" href={url} target="_blank" rel="noreferrer">เปิดดู</a>
                <button className="alp-del" title="ลบลิงก์" onClick={onDelete}><Icon name="trash" size={15} /></button>
            </div>
            {open && (
                <div className="alp-detail">
                    <input className="alp-url" readOnly value={url} onFocus={e => e.target.select()} />
                    {prods.length > 0 && (
                        <div className="alp-scope-view">
                            <span className="alp-sv-lbl">สินค้า:</span>
                            <ScopeProducts codes={prods} limit={12} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function ProjectDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [error, setError] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [showAddSub, setShowAddSub] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [showDelConfirm, setShowDelConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [submissions, setSubmissions] = useState([]);
    const [agencyLinks, setAgencyLinks] = useState([]);
    const [showLinks, setShowLinks] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [newLinkName, setNewLinkName] = useState('');
    const [newLinkProducts, setNewLinkProducts] = useState([]);
    const [newLinkPlatforms, setNewLinkPlatforms] = useState([]);
    const [newLinkKol, setNewLinkKol] = useState('');
    const [copiedToken, setCopiedToken] = useState('');
    const [subTab, setSubTab] = useState('list'); // list | process
    const [badges, setBadges] = useState({ listNew: false, processNew: false });
    const [subsLoaded, setSubsLoaded] = useState(false);

    function load() {
        api(`/projects/${id}`)
            .then(res => setProject(res.data))
            .catch(err => setError(err.message));
        loadSubs();
    }
    function loadSubs() {
        api(`/projects/${id}/submissions`).then(res => { setSubmissions(res.data); setSubsLoaded(true); }).catch(() => {});
    }
    useEffect(() => { load(); loadLinks(); }, [id]);

    // แจ้งเตือนแท็บ: เปิดแท็บไหนอยู่ = เห็นแล้ว, แท็บอื่นเด้ง badge ถ้ามีอัปเดตใหม่ (รอโหลดข้อมูลก่อนค่อย seed)
    useEffect(() => {
        if (!subsLoaded) return;
        seedDraftsSeen(id, submissions);
        markSeen(id, subTab, submissions);
        setBadges(tabBadges(id, submissions));
    }, [submissions, subTab, id, subsLoaded]);

    // โหลดข้อมูลซ้ำเป็นระยะ เพื่อให้เห็นอัปเดตจากฝั่ง Agency แบบไม่ต้องรีเฟรช
    useEffect(() => {
        const t = setInterval(loadSubs, 20000);
        return () => clearInterval(t);
    }, [id]);

    // ===== ลิงก์เอเจนซี่แบบแยกต่อเจ้า =====
    function loadLinks() {
        api(`/projects/${id}/agency-links`).then(res => setAgencyLinks(res.data)).catch(() => {});
    }
    async function createLink() {
        try {
            await api(`/projects/${id}/agency-links`, {
                method: 'POST',
                body: { name: newLinkName.trim() || null, products: newLinkProducts, platforms: newLinkPlatforms, kol_count: Number(newLinkKol) || 0 }
            });
            setNewLinkName(''); setNewLinkProducts([]); setNewLinkPlatforms([]); setNewLinkKol('');
            setShowCreate(false);
            loadLinks();
        } catch (err) { alert(err.message); }
    }
    // สินค้าของ Platform ที่เลือก (ตามที่เจ้าของโปรเจคผูกไว้ในกลุ่มโฆษณา) — ถ้ายังไม่เลือก Platform = ว่าง
    const productsForPlatforms = plats => {
        if (!plats.length) return [];
        const set = new Set();
        (project?.ad_groups || []).forEach(g => { if (plats.includes(g.platform)) (g.products || []).forEach(c => set.add(c)); });
        return [...set];
    };
    const toggleNewProduct = code => setNewLinkProducts(a => a.includes(code) ? a.filter(x => x !== code) : [...a, code]);
    const toggleNewPlatform = p => {
        const next = newLinkPlatforms.includes(p) ? newLinkPlatforms.filter(x => x !== p) : [...newLinkPlatforms, p];
        setNewLinkPlatforms(next);
        // เอาสินค้าที่ไม่อยู่ใน Platform ที่เหลือออก
        const valid = new Set(productsForPlatforms(next));
        setNewLinkProducts(prods => prods.filter(c => valid.has(c)));
    };
    async function deleteLink(token) {
        if (!confirm('ลบลิงก์นี้? (รายชื่อ KOL ที่ส่งผ่านลิงก์นี้จะยังอยู่ แต่ลิงก์จะเปิดไม่ได้อีก)')) return;
        try { await api(`/projects/${id}/agency-links/${token}`, { method: 'DELETE' }); loadLinks(); }
        catch (err) { alert(err.message); }
    }
    const linkUrl = token => `${window.location.origin}/agency/${token}`;
    function copyLink(token) {
        navigator.clipboard.writeText(linkUrl(token)).then(() => { setCopiedToken(token); setTimeout(() => setCopiedToken(''), 2000); });
    }
    async function decideSub(subId, status) {
        try { await api(`/projects/${id}/submissions/${subId}`, { method: 'PUT', body: { status } }); loadSubs(); }
        catch (err) { alert(err.message); }
    }
    // อัปเดต submission (ใช้กับ On Process — บันทึกโพสต์/ดราฟ/feedback ฝั่งทีม)
    const putSubmission = (subId, payload) => api(`/projects/${id}/submissions/${subId}`, { method: 'PUT', body: payload });

    // เปลี่ยนสถานะแคมเปญแบบเร็ว
    async function changeStatus(status) {
        try { await api(`/projects/${id}`, { method: 'PUT', body: { status } }); load(); }
        catch (err) { alert(err.message); }
    }

    async function removeKol(linkId) {
        if (!confirm('เอา KOL นี้ออกจาก Project?')) return;
        try { await api(`/projects/${id}/kols/${linkId}`, { method: 'DELETE' }); load(); }
        catch (err) { alert(err.message); }
    }

    // ลบทั้งโปรเจค (ยืนยันผ่านหน้าต่างยืนยัน/ยกเลิก)
    async function deleteProject() {
        setDeleting(true);
        try {
            await api(`/projects/${id}`, { method: 'DELETE' });
            navigate('/projects');
        } catch (err) { alert(err.message); setDeleting(false); }
    }

    if (error) return <div className="alert-error">{error}</div>;
    if (!project) return <div className="empty">กำลังโหลด...</div>;

    const kols = project.kols || [];
    // สินค้าที่เลือกได้ = เฉพาะสินค้าของ Platform ที่รับผิดชอบ (เลือก Platform ก่อน)
    const availProducts = productsForPlatforms(newLinkPlatforms);
    // Platform ที่โปรเจคนี้มี (ให้เลือกได้เฉพาะที่เจ้าของโปรเจคตั้งไว้)
    const projectPlatforms = [...new Set((project.ad_groups || []).map(g => g.platform).filter(Boolean))];

    // แถวในตารางรายชื่อ KOL (action ต่างกันตามกลุ่ม)
    const subRow = (s) => (
        <tr key={s.id}>
            <td><strong>{s.account_name}</strong></td>
            <td>{s.platform ? <span className="tag">{s.platform}</span> : '—'}</td>
            <td className="muted"><ProductSummary value={s.product} /></td>
            <td className="muted">{s.agency || '—'}</td>
            <td className="num">฿{Number(s.budget).toLocaleString('th-TH')}</td>
            <td>{s.link_account ? <a className="work-link" href={s.link_account} target="_blank" rel="noreferrer"><Icon name="eye" size={12} /> เปิด</a> : '—'}</td>
            <td>
                <input className="sub-note-input" defaultValue={s.team_note || ''} placeholder="📝 เช่น ย้ายไปสินค้าอื่น"
                    onBlur={e => { const v = e.target.value.trim(); if (v !== (s.team_note || '')) putSubmission(s.id, { team_note: v || null }).then(loadSubs); }} />
            </td>
            <td className="actions">
                {s.status === 'confirmed' ? (
                    <button className="btn-ghost" onClick={() => decideSub(s.id, 'submitted')}>ยกเลิก</button>
                ) : s.status === 'rejected' ? (
                    <button className="btn-ghost" onClick={() => decideSub(s.id, 'submitted')}>↩ คืนกลับ</button>
                ) : (
                    <div className="sub-decide">
                        <button className="btn-primary" style={{ padding: '6px 12px' }} onClick={() => decideSub(s.id, 'confirmed')}>✓ เลือก</button>
                        <button className="btn-reject" onClick={() => decideSub(s.id, 'rejected')}>✕ ไม่เลือก</button>
                    </div>
                )}
            </td>
            <td className="tbl-spacer"></td>
        </tr>
    );

    // บล็อกสถานะ 1 อัน (คืน null ถ้าไม่มีรายการ)
    const statusBlock = (dotClass, title, rows, actionLabel, extraCls = '') => {
        if (rows.length === 0) return null;
        return (
            <div className={'sub-group ' + extraCls} key={title}>
                <div className="sub-group-head">
                    <span className={'sub-group-dot ' + dotClass} />
                    <span className="sub-group-title">{title}</span>
                    <span className="sub-group-count">{rows.length}</span>
                </div>
                <div className={'panel no-pad ' + extraCls}>
                    <table className="data-table tight">
                        <thead><tr>
                            <th>ชื่อ Account</th><th>Platform</th><th>Product</th><th>Agency</th>
                            <th className="num">Budget</th><th>ลิงก์</th><th>หมายเหตุ</th><th className="actions">{actionLabel}</th>
                            <th className="tbl-spacer" aria-hidden="true"></th>
                        </tr></thead>
                        <tbody>{rows.map(subRow)}</tbody>
                    </table>
                </div>
            </div>
        );
    };
    // ทั้ง 3 สถานะของชุด subs ที่ให้มา (รอคัดเลือก / คัดเลือกแล้ว / ไม่เลือก)
    const statusBlocks = (list) => {
        const pend = list.filter(s => s.status !== 'confirmed' && s.status !== 'rejected');
        const conf = list.filter(s => s.status === 'confirmed');
        const rej = list.filter(s => s.status === 'rejected');
        return <>
            {statusBlock('pending', 'รอคัดเลือก', pend, 'คัดเลือก')}
            {statusBlock('confirmed', 'คัดเลือกแล้ว', conf, 'จัดการ', 'grp-confirmed')}
            {statusBlock('rejected', 'ไม่เลือก', rej, 'จัดการ', 'grp-rejected')}
        </>;
    };
    // แถบหัวกลุ่มสินค้า (ฝั่งทีม)
    const teamGroupBar = (g, gi, gsubs) => {
        const conf = gsubs.filter(s => s.status === 'confirmed').length;
        return (
            <div className="grp-bar grp-bar-stack">
                <div className="grp-bar-row">
                    <span className="grp-no">กลุ่มที่ {gi + 1}</span>
                    <div className="grp-chips"><ProductSummary value={g.products || []} max={4} /></div>
                    {g.concept && <span className="grp-concept">📝 Concept: {g.concept}</span>}
                </div>
                <span className="grp-count grp-count-under">{conf}/{g.kol_count || gsubs.length} คัดเลือก</span>
            </div>
        );
    };

    // สรุปสถานะงาน On Process (นับจาก KOL ที่คัดเลือกแล้ว) — funnel: รอส่งดราฟ → รอตรวจ → Approve → ลงงาน
    const procStats = () => {
        const conf = submissions.filter(s => s.status === 'confirmed');
        const isPosted = s => s.post_url && String(s.post_url).trim();
        const hasDraft = s => [s.draft_link, s.draft_link2, s.draft_link3, s.draft_link4, s.draft_link5].some(l => l && String(l).trim());
        let todo = 0, review = 0, approved = 0, posted = 0;
        conf.forEach(s => {
            if (isPosted(s)) posted++;
            else if (s.draft_status === 'approve') approved++;
            else if (hasDraft(s)) review++;
            else todo++;
        });
        return { todo, review, approved, posted };
    };

    return (
        <div>
            {/* Hero banner */}
            <div className="pd-hero">
                <button className="pd-back" onClick={() => navigate('/projects')} title="กลับ"><Icon name="back" size={18} /></button>
                <div className="pd-hero-main">
                    <div className="pd-hero-top">
                        <span className={`status status-${project.status}`}>{STATUS_LABEL[project.status] || project.status}</span>
                        {project.team_name && <span className="pd-chip">{project.team_name}</span>}
                        {project.brand && <span className="pd-chip"><Icon name="tag" size={12} /> {project.brand}</span>}
                    </div>
                    <h1 className="pd-title">{project.name}</h1>
                    <div className="pd-hero-by">
                        {project.created_by_name && <span>👤 สร้างโดย {project.created_by_name}</span>}
                        {project.updated_by_name && <span> · ✎ แก้ไขล่าสุดโดย {project.updated_by_name}</span>}
                    </div>
                </div>
                <div className="pd-hero-actions">
                    <label className="quick-status">
                        สถานะ:
                        <select value={project.status} onChange={e => changeStatus(e.target.value)}>
                            {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                        </select>
                    </label>
                    <button className="pd-edit-btn" onClick={() => setShowEdit(true)}>
                        <Icon name="edit" size={15} /> แก้ไข
                    </button>
                    <button className="pd-del-btn" onClick={() => setShowDelConfirm(true)} title="ลบโปรเจคนี้">
                        <Icon name="trash" size={15} /> ลบ
                    </button>
                </div>
            </div>

            {/* การ์ดตัวเลขสำคัญ */}
            <div className="pd-metrics">
                <div className="pd-metric">
                    <div className="pd-metric-icon budget"><Icon name="coins" size={22} /></div>
                    <div><div className="pd-metric-label">งบประมาณ</div><div className="pd-metric-value">฿{Number(project.budget).toLocaleString('th-TH')}</div></div>
                </div>
                <div className="pd-metric">
                    <div className="pd-metric-icon kol"><Icon name="star" size={22} /></div>
                    <div><div className="pd-metric-label">จำนวน KOL (คัดเลือกแล้ว)</div><div className="pd-metric-value">{submissions.filter(s => s.status === 'confirmed').length}{project.kol_target ? <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted)' }}> / {project.kol_target}</span> : ''}</div></div>
                </div>
                <div className="pd-metric">
                    <div className="pd-metric-icon date"><Icon name="calendar" size={20} /></div>
                    <div><div className="pd-metric-label">ช่วงเวลา</div><div className="pd-metric-value sm">{project.start_date || '—'} → {project.end_date || '—'}</div></div>
                </div>
                <div className="pd-metric">
                    <div className="pd-metric-icon owner"><Icon name="users" size={20} /></div>
                    <div><div className="pd-metric-label">Project Owner</div><div className="pd-metric-value sm">{project.owner || '—'}</div></div>
                </div>
            </div>

            {/* รายละเอียด / บรีฟ / สินค้า */}
            {(project.objective || project.brief_link || project.brief_file || project.products?.length > 0 || project.ad_groups?.length > 0) && (
                <div className="panel pd-details">
                    {project.objective && (
                        <div className="pd-block">
                            <div className="pd-block-title"><Icon name="file" size={15} /> รายละเอียดแคมเปญ</div>
                            <p className="pd-block-text">{project.objective}</p>
                        </div>
                    )}
                    {(() => {
                        const pfb = Object.entries(project.platform_briefs || {}).filter(([, b]) => b && (b.link || b.file));
                        if (pfb.length === 0) return null;
                        return (
                            <div className="pd-block">
                                <div className="pd-block-title"><Icon name="file" size={15} /> บรีฟหลักต่อ Platform</div>
                                <div className="pd-pf-briefs">
                                    {pfb.map(([pf, b]) => (
                                        <div className="pd-pf-brief" key={pf}>
                                            <span className="pd-pf-brief-name">📱 {pf}</span>
                                            {b.link && <a className="brief-link" href={b.link} target="_blank" rel="noreferrer"><Icon name="eye" size={14} /> เปิดลิงก์บรีฟ</a>}
                                            {b.file && (
                                                <button type="button" className="file-view" style={{ flex: 'none' }}
                                                    onClick={() => openFile(`/projects/${id}/platform-brief/${encodeURIComponent(pf)}/file`).catch(e => alert(e.message))}>
                                                    <Icon name="file" size={14} /> <span className="file-name">{b.file.original}</span>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}
                    {(() => {
                        const pb = Object.entries(project.platform_budgets || {}).filter(([, v]) => Number(v) > 0);
                        if (pb.length === 0) return null;
                        return (
                            <div className="pd-block">
                                <div className="pd-block-title"><Icon name="coins" size={15} /> งบต่อ Platform</div>
                                <div className="pd-pf-budgets">
                                    {pb.map(([pf, v]) => (
                                        <span className="pd-pf-budget" key={pf}>📱 {pf} <b>฿{Number(v).toLocaleString('th-TH')}</b></span>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}
                    {(project.ad_groups?.length > 0 || project.products?.length > 0) && (
                        <div className="pd-block">
                            <div className="pd-block-title"><Icon name="tag" size={15} /> สินค้า &amp; กลุ่มโฆษณา</div>
                            {project.ad_groups?.length > 0 ? (
                                <div className="adg-cards">
                                    {project.ad_groups.map((g, i) => (
                                        <div className="adg-card" key={i}>
                                            <div className="adg-card-head">
                                                <span className="adg-badge">กลุ่มที่ {i + 1}</span>
                                                {(() => { const gp = g.platform || (g.allocations && g.allocations[0] && g.allocations[0].platform) || null; return gp ? <span className="adg-plat">📱 {gp}</span> : null; })()}
                                                {g.concept && <span className="adg-concept">📝 Concept: {g.concept}</span>}
                                                {g.kol_count > 0 && <span className="adg-kol">⭐ {g.kol_count} KOL</span>}
                                                {Number(g.budget) > 0 && <span className="adg-budget">💰 ฿{Number(g.budget).toLocaleString('th-TH')}</span>}
                                            </div>
                                            <div className="adg-fields">
                                                <div className="adg-field">
                                                    <span className="adg-label">สินค้า <span className="adg-count">({(g.products || []).length})</span></span>
                                                    <div className="adg-val">
                                                        <ProductChips products={g.products || []} />
                                                    </div>
                                                </div>
                                                <div className="adg-field">
                                                    <span className="adg-label">กลุ่มเป้าหมาย (Target)</span>
                                                    <div className="adg-val">
                                                        {asTargetArray(g.target).length > 0
                                                            ? asTargetArray(g.target).map(t => <span className="chip-target" key={t}>🎯 {t}</span>)
                                                            : <span className="muted">ไม่ระบุ</span>}
                                                    </div>
                                                </div>
                                                <div className="adg-field">
                                                    <span className="adg-label">ประเภทคอนเทนต์</span>
                                                    <div className="adg-val">{g.content_type ? <span className="chip-ctype">{g.content_type}</span> : <span className="muted">—</span>}</div>
                                                </div>
                                                {g.brief && (
                                                    <div className="adg-field">
                                                        <span className="adg-label">บรีฟกลุ่มนี้</span>
                                                        <div className="adg-val"><a className="brief-link" href={g.brief} target="_blank" rel="noreferrer"><Icon name="eye" size={14} /> เปิดบรีฟ</a></div>
                                                    </div>
                                                )}
                                                {(g.allocations || []).length > 0 && (
                                                    <div className="adg-field">
                                                        <span className="adg-label">แพลตฟอร์ม / Tier / จำนวน</span>
                                                        <div className="adg-val">
                                                            {g.allocations.map((a, ai) => (
                                                                <span className="adg-alloc" key={ai}><b>{a.platform}</b> · {a.tier} · {a.kols} คน</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="chip-list">
                                    {project.products.map(p => {
                                        const name = typeof p === 'string' ? p : p.name;
                                        const target = typeof p === 'string' ? '' : p.target;
                                        return <span className="chip-item" key={name} style={{ padding: '4px 11px' }}>{productLabel(name)}{target && <span className="chip-target">🎯 {target}</span>}</span>;
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ===== KOL ใน Project (จาก Agency + เพิ่มเอง) ===== */}
            <div className="section-head">
                <h3>KOL ใน Project</h3>
                <div className="row-actions">
                    <button className="btn-ghost" onClick={() => setShowLinks(v => !v)}>
                        <Icon name="upload" size={16} /> ลิงก์ให้ Agency{agencyLinks.length > 0 && ` (${agencyLinks.length})`}
                    </button>
                    <button className="btn-primary" onClick={() => setShowAddSub(true)}>
                        <Icon name="plus" size={17} /> เพิ่ม KOL
                    </button>
                </div>
            </div>

            {showLinks && (
                <div className="agency-links-panel">
                    <div className="alp-head">
                        <span>ลิงก์แยกต่อเอเจนซี่ <span className="dash-section-sub">แต่ละเจ้าเห็นเฉพาะ KOL ที่ตัวเองส่ง</span></span>
                    </div>
                    {agencyLinks.length === 0
                        ? <p className="empty" style={{ padding: '10px 0' }}>ยังไม่มีลิงก์ — ตั้งชื่อเอเจนซี่แล้วกด "สร้างลิงก์" ด้านล่าง</p>
                        : (
                            <div className="alp-list">
                                {agencyLinks.map(l => (
                                    <AgencyLinkRow
                                        key={l.token}
                                        l={l}
                                        url={linkUrl(l.token)}
                                        copied={copiedToken === l.token}
                                        onCopy={() => copyLink(l.token)}
                                        onDelete={() => deleteLink(l.token)}
                                    />
                                ))}
                            </div>
                        )}
                    {/* ปุ่มเปิดฟอร์มเพิ่มเอเจนซี่ (ซ่อนฟอร์มไว้ก่อน) */}
                    {!showCreate && (
                        <button type="button" className="alp-add-agency" onClick={() => setShowCreate(true)}>
                            <Icon name="plus" size={16} /> เพิ่มเอเจนซี่
                        </button>
                    )}
                    {/* ฟอร์มสร้างลิงก์ + กำหนดขอบเขตงานของเอเจนซี่ */}
                    {showCreate && (
                    <div className="alp-create">
                        <div className="alp-create-row">
                            <input value={newLinkName} onChange={e => setNewLinkName(e.target.value)} placeholder="ชื่อเอเจนซี่ (เช่น Agency A)"
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); createLink(); } }} />
                            <input type="number" min="0" className="alp-kol-input" value={newLinkKol} onChange={e => setNewLinkKol(e.target.value)} placeholder="จำนวน KOL" />
                        </div>
                        <div className="alp-create-scope">
                            <div className="alp-sc-col">
                                <span className="alp-sc-lbl">1. Platform ที่รับผิดชอบ</span>
                                {newLinkPlatforms.length > 0 && (
                                    <div className="alp-chips">
                                        {newLinkPlatforms.map(p => <span className="chip-item" key={p}>{p}<button type="button" onClick={() => toggleNewPlatform(p)}>×</button></span>)}
                                    </div>
                                )}
                                <select value="" disabled={projectPlatforms.length === 0}
                                    onChange={e => {
                                        if (e.target.value === '__ALL__') {
                                            const allSel = projectPlatforms.every(p => newLinkPlatforms.includes(p));
                                            if (allSel) { setNewLinkPlatforms([]); setNewLinkProducts([]); }
                                            else setNewLinkPlatforms([...projectPlatforms]);
                                        } else if (e.target.value) toggleNewPlatform(e.target.value);
                                        e.target.value = '';
                                    }}>
                                    <option value="">{projectPlatforms.length ? '+ เพิ่ม Platform' : '— โปรเจคยังไม่มี Platform —'}</option>
                                    {projectPlatforms.length > 0 && (
                                        <option value="__ALL__">{projectPlatforms.every(p => newLinkPlatforms.includes(p)) ? '✓ ทุก Platform (เลือกครบแล้ว)' : '☑ ทุก Platform'}</option>
                                    )}
                                    {projectPlatforms.filter(p => !newLinkPlatforms.includes(p)).map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div className="alp-sc-col">
                                <span className="alp-sc-lbl">2. สินค้าที่รับผิดชอบ {newLinkProducts.length > 0 && <span className="adg-count">({newLinkProducts.length})</span>}</span>
                                {newLinkProducts.length > 0 && (
                                    <div className="prodchip-wrap alp-chips">
                                        {newLinkProducts.map(c => (
                                            <span className="prodchip removable" key={c} title={productLabel(c)}>
                                                {c}<button type="button" onClick={() => toggleNewProduct(c)} title="เอาออก">×</button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <select value="" disabled={newLinkPlatforms.length === 0 || availProducts.length === 0}
                                    onChange={e => {
                                        if (e.target.value === '__ALL__') {
                                            const allSel = availProducts.every(c => newLinkProducts.includes(c));
                                            setNewLinkProducts(allSel ? [] : [...availProducts]);
                                        } else if (e.target.value) toggleNewProduct(e.target.value);
                                        e.target.value = '';
                                    }}>
                                    <option value="">{newLinkPlatforms.length === 0 ? '— เลือก Platform ก่อน —' : (availProducts.length ? '+ เพิ่มสินค้า' : '— Platform นี้ยังไม่มีสินค้า —')}</option>
                                    {availProducts.length > 0 && (
                                        <option value="__ALL__">{availProducts.every(c => newLinkProducts.includes(c)) ? '✓ ทุกสินค้า (เลือกครบแล้ว)' : '☑ ทุกสินค้า'}</option>
                                    )}
                                    {availProducts.filter(c => !newLinkProducts.includes(c)).map(c => <option key={c} value={c}>{productLabel(c)}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="alp-create-actions">
                            <button type="button" className="btn-ghost" onClick={() => { setShowCreate(false); setNewLinkName(''); setNewLinkProducts([]); setNewLinkPlatforms([]); setNewLinkKol(''); }}>ยกเลิก</button>
                            <button className="btn-primary alp-create-btn" onClick={createLink}><Icon name="plus" size={15} /> สร้างลิงก์</button>
                        </div>
                    </div>
                    )}
                </div>
            )}

            {/* แท็บ: รายชื่อ KOL / On Process */}
            <div className="agency-tabs">
                <button className={subTab === 'list' ? 'active' : ''} onClick={() => setSubTab('list')}>
                    รายชื่อ KOL <span className="agency-tab-count">{submissions.length}</span>
                    {badges.listNew && <span className="tab-new-dot" title="มีอัปเดตใหม่" />}
                </button>
                <button className={subTab === 'process' ? 'active' : ''} onClick={() => setSubTab('process')}>
                    On Process {submissions.filter(s => s.status === 'confirmed').length > 0 && <span className="agency-tab-count">{submissions.filter(s => s.status === 'confirmed').length}</span>}
                    {badges.processNew && <span className="tab-new-dot" title="มีอัปเดตใหม่" />}
                </button>
            </div>

            {subTab === 'list' && (
                submissions.length === 0 ? (
                    <div className="panel"><p className="empty" style={{ padding: '10px 0' }}>ยังไม่มีรายชื่อจาก Agency — กด "สร้างลิงก์ให้ Agency" แล้วส่งลิงก์ให้เอเจนซี่กรอก</p></div>
                ) : (project.ad_groups?.length > 0 ? (
                    /* แบ่งตามกลุ่มสินค้า */
                    <>
                        {project.ad_groups.map((g, gi) => {
                            const gsubs = submissions.filter(s => s.group_key === g.key);
                            return (
                                <div className="kol-group-card" key={g.key || gi}>
                                    {teamGroupBar(g, gi, gsubs)}
                                    {gsubs.length === 0
                                        ? <div className="proc-group-empty">ยังไม่มีรายชื่อในกลุ่มนี้</div>
                                        : statusBlocks(gsubs)}
                                </div>
                            );
                        })}
                        {(() => {
                            const gkeys = new Set(project.ad_groups.map(g => g.key));
                            const ung = submissions.filter(s => !s.group_key || !gkeys.has(s.group_key));
                            if (ung.length === 0) return null;
                            return (
                                <div className="kol-group-card">
                                    <div className="grp-bar"><span className="grp-no muted-bar">ไม่ระบุกลุ่ม</span><span className="grp-count">{ung.length} คน</span></div>
                                    {statusBlocks(ung)}
                                </div>
                            );
                        })()}
                    </>
                ) : (
                    /* ไม่มีกลุ่มสินค้า → รวมทั้งหมด */
                    statusBlocks(submissions)
                ))
            )}

            {subTab === 'process' && (() => {
                const st = procStats();
                return (
                    <>
                        <div className="proc-stat-grid">
                            <div className="proc-stat-card todo"><span className="proc-stat-num">{st.todo}</span><span className="proc-stat-lbl">รอส่งดราฟ</span></div>
                            <div className="proc-stat-card review"><span className="proc-stat-num">{st.review}</span><span className="proc-stat-lbl">รอตรวจดราฟ</span></div>
                            <div className="proc-stat-card approved"><span className="proc-stat-num">{st.approved}</span><span className="proc-stat-lbl">ดราฟ Approve แล้ว</span></div>
                            <div className="proc-stat-card posted"><span className="proc-stat-num">{st.posted}</span><span className="proc-stat-lbl">ลงงานแล้ว</span></div>
                        </div>
                        <div className="panel">
                            <OnProcessTable subs={submissions} groups={project.ad_groups || []} showAds scope={id} putSubmission={putSubmission} reload={loadSubs} />
                        </div>
                    </>
                );
            })()}

            {showAddSub && (
                <AddSubmissionModal
                    projectId={id}
                    products={(project.products || []).map(p => (typeof p === 'string' ? p : p.name))}
                    onClose={() => setShowAddSub(false)}
                    onAdded={() => { setShowAddSub(false); loadSubs(); }}
                />
            )}

            {showEdit && (
                <ProjectForm
                    editing={project}
                    onClose={() => setShowEdit(false)}
                    onSaved={() => { setShowEdit(false); load(); }}
                />
            )}

            {showDelConfirm && (
                <div className="modal-backdrop" onClick={() => !deleting && setShowDelConfirm(false)}>
                    <div className="modal confirm-modal" onClick={e => e.stopPropagation()}>
                        <div className="confirm-icon danger"><Icon name="trash" size={26} /></div>
                        <h3 className="confirm-title">ลบโปรเจคนี้?</h3>
                        <p className="confirm-text">
                            ต้องการลบ <strong>"{project.name}"</strong> ใช่หรือไม่<br />
                            การลบเป็นการลบถาวร กู้คืนไม่ได้
                        </p>
                        <div className="confirm-actions">
                            <button className="btn-ghost" onClick={() => setShowDelConfirm(false)} disabled={deleting}>ยกเลิก</button>
                            <button className="btn-danger" onClick={deleteProject} disabled={deleting}>
                                {deleting ? 'กำลังลบ...' : 'ยืนยันการลบ'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
