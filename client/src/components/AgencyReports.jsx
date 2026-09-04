import { useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { api, uploadFile, openFile } from '../api/client.js';
import { fmtDate } from '../utils/date.js';

// ขนาดไฟล์อ่านง่าย
const fmtSize = n => {
    const b = Number(n) || 0;
    if (b >= 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + ' MB';
    if (b >= 1024) return Math.round(b / 1024) + ' KB';
    return b + ' B';
};

/**
 * กล่องให้เอเจนซี่ส่ง Report — อัปไฟล์ หรือวางลิงก์ (Google Slides/Drive)
 * props:
 *   token   = agency link token
 *   reports = รายการที่ส่งไปแล้ว (จาก GET /agency/:token)
 *   onReload() = ให้หน้าแม่โหลดข้อมูลใหม่หลังส่ง/ลบ
 */
export default function AgencyReports({ token, reports = [], onReload }) {
    const inputRef = useRef(null);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const [drag, setDrag] = useState(false);
    const [linkMode, setLinkMode] = useState(false);
    const [url, setUrl] = useState('');
    const [note, setNote] = useState('');

    async function sendFile(file) {
        if (!file) return;
        setErr(''); setBusy(true);
        try {
            await uploadFile(`/agency/${token}/reports`, file);
            onReload();
        } catch (e) { setErr(e.message); }
        finally { setBusy(false); if (inputRef.current) inputRef.current.value = ''; }
    }

    async function sendLink(e) {
        e.preventDefault();
        setErr(''); setBusy(true);
        try {
            await api(`/agency/${token}/reports`, { method: 'POST', body: { url: url.trim(), note: note.trim() } });
            setUrl(''); setNote(''); setLinkMode(false);
            onReload();
        } catch (e2) { setErr(e2.message); }
        finally { setBusy(false); }
    }

    async function remove(r) {
        // ลบไฟล์กู้คืนไม่ได้ ถามก่อนเสมอ
        if (!window.confirm(`ลบ "${r.original}" ออกจากรายการ Report?\nลบแล้วกู้คืนไม่ได้`)) return;
        setErr(''); setBusy(true);
        try {
            await api(`/agency/${token}/reports/${r.id}`, { method: 'DELETE' });
            onReload();
        } catch (e) { setErr(e.message); }
        finally { setBusy(false); }
    }

    async function open(r) {
        if (r.kind === 'link') { window.open(r.url, '_blank', 'noopener'); return; }
        try { await openFile(`/agency/${token}/reports/${r.id}/file`); }
        catch (e) { setErr(e.message); }
    }

    function onDrop(e) {
        e.preventDefault(); setDrag(false);
        const f = e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) sendFile(f);
    }

    return (
        <div className="ag-report">
            <div className="ag-report-head">
                <h3>📊 ส่ง Report</h3>
                <span className="ag-report-sub">สรุปผลแคมเปญ ส่งเป็นไฟล์หรือวางลิงก์ก็ได้ · ส่งได้หลายครั้ง</span>
            </div>

            {err && <div className="alert-error">{err}</div>}

            {linkMode ? (
                <form className="ag-report-linkform" onSubmit={sendLink}>
                    <div className="field">
                        <label>ลิงก์ Report</label>
                        <input type="url" value={url} onChange={e => setUrl(e.target.value)}
                            placeholder="https://docs.google.com/..." required autoFocus />
                    </div>
                    <div className="field">
                        <label>ชื่อเรียก (ไม่ใส่ก็ได้)</label>
                        <input value={note} onChange={e => setNote(e.target.value)} placeholder="เช่น สรุปแคมเปญ Aug" />
                    </div>
                    <div className="ag-report-linkbtns">
                        <button type="button" className="btn-ghost" onClick={() => { setLinkMode(false); setErr(''); }}>ยกเลิก</button>
                        <button type="submit" className="btn-primary" disabled={busy || !url.trim()}>
                            {busy ? 'กำลังส่ง...' : 'ส่งลิงก์'}
                        </button>
                    </div>
                </form>
            ) : (
                <>
                    <div className={'ag-report-drop' + (drag ? ' over' : '') + (busy ? ' busy' : '')}
                        onDragOver={e => { e.preventDefault(); setDrag(true); }}
                        onDragLeave={() => setDrag(false)}
                        onDrop={onDrop}
                        onClick={() => !busy && inputRef.current.click()}>
                        <Icon name="upload" size={20} />
                        <span>{busy ? 'กำลังอัปโหลด...' : 'คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางตรงนี้'}</span>
                        <small>PDF · รูป · PowerPoint · Excel · Word · CSV (ไม่เกิน 25MB)</small>
                    </div>
                    <button type="button" className="ag-report-linkbtn" onClick={() => setLinkMode(true)} disabled={busy}>
                        🔗 หรือวางลิงก์แทน (Google Slides / Drive)
                    </button>
                </>
            )}

            <input ref={inputRef} type="file" hidden
                accept=".pdf,.png,.jpg,.jpeg,.webp,.ppt,.pptx,.xls,.xlsx,.doc,.docx,.csv"
                onChange={e => sendFile(e.target.files[0])} />

            <div className="ag-report-list">
                {reports.length === 0 ? (
                    <div className="ag-report-empty">ยังไม่ได้ส่ง Report</div>
                ) : reports.map(r => (
                    <div className="ag-report-item" key={r.id}>
                        <button type="button" className="ag-report-open" onClick={() => open(r)}
                            title={r.kind === 'link' ? r.url : 'เปิดไฟล์'}>
                            <span className="ag-report-ico">{r.kind === 'link' ? '🔗' : '📄'}</span>
                            <span className="ag-report-name">{r.original}</span>
                        </button>
                        <span className="ag-report-meta">
                            {r.kind === 'file' && <>{fmtSize(r.size)} · </>}
                            {fmtDate(String(r.uploaded_at).slice(0, 10))}
                        </span>
                        <button type="button" className="ag-report-del" onClick={() => remove(r)}
                            disabled={busy} title="ลบออกจากรายการ">🗑</button>
                    </div>
                ))}
            </div>
        </div>
    );
}
