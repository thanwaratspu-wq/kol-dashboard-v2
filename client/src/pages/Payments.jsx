import { useEffect, useRef, useState } from 'react';
import { api, uploadFile, openFile } from '../api/client.js';
import Icon from '../components/Icon.jsx';
import DatePicker from '../components/DatePicker.jsx';
import Avatar from '../components/Avatar.jsx';
import PayCyclePicker from '../components/PayCyclePicker.jsx';
import { fmtDate } from '../utils/date.js';

const STATUS_OPTIONS = ['รอทำจ่าย', 'ทำจ่ายแล้ว'];
const PAID = 'ทำจ่ายแล้ว';
const statusClass = s => (s === PAID ? 'pay-done' : 'pay-wait');

// ช่องอัปโหลด/ดูไฟล์ (ใบเสนอราคา หรือ ใบแจ้งหนี้)
function FileSlot({ label, projectId, type, meta, onUploaded }) {
    const inputRef = useRef(null);
    const [busy, setBusy] = useState(false);

    async function handleFile(e) {
        const file = e.target.files[0];
        if (!file) return;
        setBusy(true);
        try {
            const res = await uploadFile(`/payments/${projectId}/upload/${type}`, file);
            onUploaded(res.data);
        } catch (err) { alert(err.message); }
        finally { setBusy(false); e.target.value = ''; }
    }

    async function view() {
        try { await openFile(`/payments/${projectId}/file/${type}`); }
        catch (err) { alert(err.message); }
    }

    return (
        <div className="file-slot">
            <div className="file-slot-label">{label}</div>
            {meta ? (
                <div className="file-has">
                    <button className="file-view" onClick={view} title="เปิดดูไฟล์">
                        <Icon name="file" size={15} /> <span className="file-name">{meta.original}</span>
                    </button>
                    <button className="icon-btn" title="เปลี่ยนไฟล์" onClick={() => inputRef.current.click()} disabled={busy}>
                        <Icon name="upload" size={15} />
                    </button>
                </div>
            ) : (
                <button className="file-upload-btn" onClick={() => inputRef.current.click()} disabled={busy}>
                    <Icon name="upload" size={15} /> {busy ? 'กำลังอัปโหลด...' : 'อัปโหลด'}
                </button>
            )}
            <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" hidden onChange={handleFile} />
        </div>
    );
}

// การ์ดสรุป (คลิกเพื่อเปิดฟอร์ม) — สไตล์เดียวกับหน้า Projects
function PaymentSummaryCard({ row, onOpen }) {
    const cls = statusClass(row.status);
    return (
        <div className="pcard" onClick={onOpen}>
            <div className={`pcard-accent payacc-${cls}`} />
            <div className="pcard-body">
                <div className="pcard-head">
                    <span className={`status ${cls}`}>{row.status || 'รอทำจ่าย'}</span>
                    {row.team_name && <span className="team-chip">{row.team_name}</span>}
                </div>
                {row.brand && <span className="pcard-brand">{row.brand}</span>}
                <h3 className="pcard-name">{row.project_name}</h3>
                <div className="pcard-sub">
                    <span>🏢 {row.agency_name || <span className="muted">ยังไม่ระบุเอเจนซี่</span>}</span>
                    {row.payment_date && <span>📅 รอบจ่าย {fmtDate(row.payment_date)}</span>}
                </div>
                <div className="pcard-foot">
                    <div>
                        <div className="pcard-budget-val">฿{Number(row.budget).toLocaleString('th-TH')}</div>
                        <div className="pcard-budget-lbl">ค่าใช้จ่าย</div>
                    </div>
                    <div className="pay-docs">
                        <span className={row.quotation ? 'doc-ok' : 'doc-no'}>📄 เสนอราคา</span>
                        <span className={row.invoice ? 'doc-ok' : 'doc-no'}>📄 แจ้งหนี้</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ฟอร์มกรอกข้อมูล (เปิดเป็น popup เมื่อคลิกการ์ด)
function PaymentDetailModal({ row, onClose, onChange }) {
    const [agency, setAgency] = useState(row.agency_name || '');
    const [payDate, setPayDate] = useState(row.payment_date || '');
    const [status, setStatus] = useState(row.status || 'รอทำจ่าย');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const dirty = agency !== (row.agency_name || '') || payDate !== (row.payment_date || '') || status !== (row.status || 'รอทำจ่าย');

    async function save() {
        setSaving(true); setSaved(false);
        try {
            await api(`/payments/${row.project_id}`, {
                method: 'PUT',
                body: { agency_name: agency || null, payment_date: payDate || null, status }
            });
            onChange({ ...row, agency_name: agency, payment_date: payDate, status });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err) { alert(err.message); }
        finally { setSaving(false); }
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal wide" onClick={e => e.stopPropagation()}>
                <div className="modal-head">
                    <div className="pay-head-left">
                        <Avatar name={row.brand || row.project_name} size={44} icon={<Icon name="wallet" size={20} />} />
                        <div>
                            <div className="pay-project">{row.project_name}</div>
                            <div className="pay-sub">
                                {row.brand && <span className="cat-chip">{row.brand}</span>}
                                {row.team_name && <span className="muted"> · {row.team_name}</span>}
                                <span className="muted"> · งบ {Number(row.budget).toLocaleString('th-TH')} ฿</span>
                            </div>
                        </div>
                    </div>
                    <button className="modal-x" onClick={onClose}>×</button>
                </div>

                <div className="pay-fields">
                    <div className="field">
                        <label>ชื่อเอเจนซี่</label>
                        <input value={agency} onChange={e => setAgency(e.target.value)} placeholder="ชื่อเอเจนซี่..." autoFocus />
                    </div>
                    <div className="field">
                        <label>รอบวันที่ทำจ่าย</label>
                        <DatePicker value={payDate} onChange={setPayDate} />
                    </div>
                    <div className="field">
                        <label>สถานะการจ่าย</label>
                        <select value={status} onChange={e => setStatus(e.target.value)}>
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                <div className="pay-files">
                    <FileSlot label="ใบเสนอราคา" projectId={row.project_id} type="quotation" meta={row.quotation}
                        onUploaded={data => onChange({ ...row, quotation: data.quotation })} />
                    <FileSlot label="ใบแจ้งหนี้" projectId={row.project_id} type="invoice" meta={row.invoice}
                        onUploaded={data => onChange({ ...row, invoice: data.invoice })} />
                </div>

                <div className="modal-actions">
                    {saved && <span className="saved-note">✓ บันทึกแล้ว</span>}
                    <button className="btn-ghost" onClick={onClose}>ปิด</button>
                    <button className="btn-primary" onClick={save} disabled={!dirty || saving}>
                        {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                </div>
            </div>
        </div>
    );
}

const BRANDS = ["Jula's Herb", 'Code Lab', 'Jdent', 'Jarvit', 'Beauterry', 'Jernis', 'Dermiq', 'Minimii', 'Any Skin'];

export default function Payments() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [brand, setBrand] = useState('');
    const [cycle, setCycle] = useState(''); // '' | 'YYYY-MM' | 'YYYY-MM-15/25'
    const [openId, setOpenId] = useState(null);

    useEffect(() => {
        api('/payments')
            .then(res => setRows(res.data))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    function updateRow(updated) {
        setRows(prev => prev.map(r => r.project_id === updated.project_id ? updated : r));
    }

    // กรองตามแบรนด์ + รอบจ่าย (ทั้งเดือน = YYYY-MM, เจาะจงรอบ = YYYY-MM-15/25)
    const shown = rows.filter(r => {
        if (brand && r.brand !== brand) return false;
        if (cycle) {
            if (!r.payment_date) return false;
            if (cycle.length === 10 ? r.payment_date !== cycle : !r.payment_date.startsWith(cycle)) return false;
        }
        return true;
    });
    const totalBudget = shown.reduce((s, r) => s + (Number(r.budget) || 0), 0);
    const countOf = b => rows.filter(r => r.brand === b).length;

    // แยกกลุ่ม: ยังไม่จ่าย vs จ่ายแล้ว
    const pending = shown.filter(r => r.status !== PAID);
    const paid = shown.filter(r => r.status === PAID);

    return (
        <div>
            <header className="page-head">
                <h1>รอบทำจ่ายเอเจนซี่</h1>
                <p className="page-sub">ติดตามเอกสารและรอบการทำจ่ายของแต่ละ Project (เฉพาะผู้ดูแลระบบ)</p>
            </header>

            {/* ฟิลเตอร์ รอบจ่าย (เลือกเดือน + วันที่ 15/25 ในตัวเดียว) */}
            <div className="toolbar" style={{ flexWrap: 'wrap' }}>
                <label className="bud-month">
                    รอบจ่าย:
                    <PayCyclePicker value={cycle} onChange={setCycle} />
                </label>
            </div>

            {/* ฟิลเตอร์ แบรนด์ */}
            <div className="brand-filter">
                <span className="brand-filter-label">▼ แบรนด์:</span>
                <button className={'brand-chip' + (brand === '' ? ' active' : '')} onClick={() => setBrand('')}>
                    ทุกแบรนด์ ({rows.length})
                </button>
                {BRANDS.map(b => (
                    <button key={b} className={'brand-chip' + (brand === b ? ' active' : '')} onClick={() => setBrand(b)}>
                        {b} ({countOf(b)})
                    </button>
                ))}
            </div>

            {/* สรุปยอด */}
            <div className="pay-summary">
                <span>แสดง <strong>{shown.length}</strong> รายการ</span>
                <span>ค่าใช้จ่ายรวม <strong>฿{totalBudget.toLocaleString('th-TH')}</strong></span>
            </div>

            {error && <div className="alert-error">{error}</div>}

            {loading ? (
                <div className="panel"><p className="empty">กำลังโหลด...</p></div>
            ) : shown.length === 0 ? (
                <div className="panel empty-state">
                    <div className="empty-emoji">💸</div>
                    <p>ไม่มีรายการตามตัวกรองที่เลือก</p>
                </div>
            ) : (
                <>
                    {pending.length > 0 && (
                        <>
                            <div className="pay-section-head">
                                <Icon name="wallet" size={17} /> รอดำเนินการ <span className="pay-section-count">{pending.length}</span>
                            </div>
                            <div className="card-grid">
                                {pending.map(r => <PaymentSummaryCard key={r.project_id} row={r} onOpen={() => setOpenId(r.project_id)} />)}
                            </div>
                        </>
                    )}
                    {paid.length > 0 && (
                        <div className="pay-paid-section">
                            <div className="pay-section-head done">
                                ✓ ทำจ่ายแล้ว <span className="pay-section-count done">{paid.length}</span>
                            </div>
                            <div className="card-grid">
                                {paid.map(r => <PaymentSummaryCard key={r.project_id} row={r} onOpen={() => setOpenId(r.project_id)} />)}
                            </div>
                        </div>
                    )}
                </>
            )}

            {openId != null && (
                <PaymentDetailModal
                    row={rows.find(r => r.project_id === openId)}
                    onClose={() => setOpenId(null)}
                    onChange={updateRow}
                />
            )}
        </div>
    );
}
