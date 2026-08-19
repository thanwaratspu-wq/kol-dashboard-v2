import { useState } from 'react';
import { api } from '../api/client.js';

// modal แก้ข้อมูลการใช้งาน Influencer ในแคมเปญ (งบ/วิว/ลิงก์ผลงาน/วันที่ลงงาน/สถานะ)
export default function UsageForm({ usage, onClose, onSaved }) {
    const [form, setForm] = useState({
        fee: usage.fee ?? '', views: usage.views ?? '',
        likes: usage.likes ?? '', comments: usage.comments ?? '', shares: usage.shares ?? '',
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
                    likes: Number(form.likes) || 0,
                    comments: Number(form.comments) || 0,
                    shares: Number(form.shares) || 0,
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
                    <div className="field-row">
                        <div className="field">
                            <label>ไลก์</label>
                            <input type="number" min="0" value={form.likes} onChange={e => up('likes', e.target.value)} />
                        </div>
                        <div className="field">
                            <label>คอมเมนต์</label>
                            <input type="number" min="0" value={form.comments} onChange={e => up('comments', e.target.value)} />
                        </div>
                        <div className="field">
                            <label>แชร์</label>
                            <input type="number" min="0" value={form.shares} onChange={e => up('shares', e.target.value)} />
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
