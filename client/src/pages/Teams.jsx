import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import Icon from '../components/Icon.jsx';
import Avatar from '../components/Avatar.jsx';

function TeamForm({ editing, onClose, onSaved }) {
    const [form, setForm] = useState({ name: editing?.name || '', description: editing?.description || '' });
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const isEdit = !!editing;

    async function submit(e) {
        e.preventDefault();
        setError(''); setSaving(true);
        try {
            if (isEdit) await api(`/teams/${editing.id}`, { method: 'PUT', body: form });
            else await api('/teams', { method: 'POST', body: form });
            onSaved();
        } catch (err) { setError(err.message); }
        finally { setSaving(false); }
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <h3>{isEdit ? 'แก้ไขทีม' : 'เพิ่มทีมใหม่'}</h3>
                {error && <div className="alert-error">{error}</div>}
                <form onSubmit={submit}>
                    <div className="field">
                        <label>ชื่อทีม *</label>
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus />
                    </div>
                    <div className="field">
                        <label>คำอธิบาย</label>
                        <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
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

export default function Teams() {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [modal, setModal] = useState(null);

    function load() {
        setLoading(true);
        api('/teams')
            .then(res => setTeams(res.data))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }
    useEffect(() => { load(); }, []);

    async function handleDelete(t) {
        if (!confirm(`ลบทีม "${t.name}" ? (Project ของทีมนี้จะถูกลบด้วย)`)) return;
        try { await api(`/teams/${t.id}`, { method: 'DELETE' }); load(); }
        catch (err) { alert(err.message); }
    }

    return (
        <div>
            <header className="page-head with-action">
                <div>
                    <h1>ทีม</h1>
                    <p className="page-sub">จัดการทีมที่ใช้งาน Dashboard</p>
                </div>
                <button className="btn-primary" onClick={() => setModal({})}>
                    <Icon name="plus" size={17} /> เพิ่มทีม
                </button>
            </header>

            {error && <div className="alert-error">{error}</div>}

            <div className="panel no-pad">
                <table className="data-table">
                    <thead>
                        <tr><th>ชื่อทีม</th><th>คำอธิบาย</th><th className="num">สมาชิก</th><th className="actions">จัดการ</th></tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="4" className="empty">กำลังโหลด...</td></tr>
                        ) : teams.length === 0 ? (
                            <tr><td colSpan="4" className="empty">ยังไม่มีทีม</td></tr>
                        ) : teams.map(t => (
                            <tr key={t.id}>
                                <td>
                                    <div className="inf-cell">
                                        <Avatar name={t.name} size={40} icon={<Icon name="team" size={20} />} />
                                        <div className="inf-cell-name">{t.name}</div>
                                    </div>
                                </td>
                                <td className="muted">{t.description || '—'}</td>
                                <td className="num"><span className="eng-pill">{t.member_count} คน</span></td>
                                <td className="actions">
                                    <span className="row-actions">
                                        <button className="icon-btn" title="แก้ไข" onClick={() => setModal({ editing: t })}><Icon name="edit" size={16} /></button>
                                        <button className="icon-btn danger" title="ลบ" onClick={() => handleDelete(t)}><Icon name="trash" size={16} /></button>
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modal && <TeamForm editing={modal.editing} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
        </div>
    );
}
