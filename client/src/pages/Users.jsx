import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import Icon from '../components/Icon.jsx';
import Avatar from '../components/Avatar.jsx';

function UserForm({ editing, teams, onClose, onSaved }) {
    const [form, setForm] = useState({
        username: editing?.username || '',
        password: '',
        full_name: editing?.full_name || '',
        role: editing?.role || 'member',
        team_id: editing?.team_id || ''
    });
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const isEdit = !!editing;

    function update(k, v) { setForm(f => ({ ...f, [k]: v })); }

    async function submit(e) {
        e.preventDefault();
        setError(''); setSaving(true);
        try {
            const body = {
                full_name: form.full_name,
                role: form.role,
                team_id: form.team_id ? Number(form.team_id) : null
            };
            if (form.password) body.password = form.password;
            if (isEdit) {
                await api(`/users/${editing.id}`, { method: 'PUT', body });
            } else {
                await api('/users', { method: 'POST', body: { ...body, username: form.username, password: form.password } });
            }
            onSaved();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <h3>{isEdit ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}</h3>
                {error && <div className="alert-error">{error}</div>}
                <form onSubmit={submit}>
                    <div className="field">
                        <label>Username *</label>
                        <input value={form.username} onChange={e => update('username', e.target.value)}
                            disabled={isEdit} required />
                    </div>
                    <div className="field">
                        <label>ชื่อ-นามสกุล</label>
                        <input value={form.full_name} onChange={e => update('full_name', e.target.value)} />
                    </div>
                    <div className="field">
                        <label>{isEdit ? 'รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)' : 'รหัสผ่าน *'}</label>
                        <input type="password" value={form.password}
                            onChange={e => update('password', e.target.value)} required={!isEdit} />
                    </div>
                    <div className="field-row">
                        <div className="field">
                            <label>สิทธิ์</label>
                            <select value={form.role} onChange={e => update('role', e.target.value)}>
                                <option value="member">สมาชิกทีม</option>
                                <option value="admin">ผู้ดูแลระบบ</option>
                            </select>
                        </div>
                        <div className="field">
                            <label>ทีม</label>
                            <select value={form.team_id} onChange={e => update('team_id', e.target.value)}>
                                <option value="">— ไม่ระบุ —</option>
                                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn-ghost" onClick={onClose}>ยกเลิก</button>
                        <button type="submit" className="btn-primary" disabled={saving}>
                            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function Users() {
    const [users, setUsers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [modal, setModal] = useState(null); // null | {editing?}

    function load() {
        setLoading(true);
        Promise.all([api('/users'), api('/teams')])
            .then(([u, t]) => { setUsers(u.data); setTeams(t.data); })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }
    useEffect(() => { load(); }, []);

    async function handleDelete(u) {
        if (!confirm(`ลบผู้ใช้ "${u.username}" ?`)) return;
        try { await api(`/users/${u.id}`, { method: 'DELETE' }); load(); }
        catch (err) { alert(err.message); }
    }

    function handleSaved() { setModal(null); load(); }

    return (
        <div>
            <header className="page-head with-action">
                <div>
                    <h1>ผู้ใช้งาน</h1>
                    <p className="page-sub">จัดการบัญชีผู้ใช้และสิทธิ์การเข้าถึง</p>
                </div>
                <button className="btn-primary" onClick={() => setModal({})}>
                    <Icon name="plus" size={17} /> เพิ่มผู้ใช้
                </button>
            </header>

            {error && <div className="alert-error">{error}</div>}

            <div className="panel no-pad">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>ผู้ใช้</th><th>สิทธิ์</th><th>ทีม</th><th>สถานะ</th><th className="actions">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" className="empty">กำลังโหลด...</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan="5" className="empty">ยังไม่มีผู้ใช้</td></tr>
                        ) : users.map(u => (
                            <tr key={u.id}>
                                <td>
                                    <div className="inf-cell">
                                        <Avatar name={u.full_name || u.username} size={40} />
                                        <div>
                                            <div className="inf-cell-name">{u.full_name || u.username}</div>
                                            <div className="inf-cell-user">@{u.username}</div>
                                        </div>
                                    </div>
                                </td>
                                <td><span className={`badge badge-${u.role}`}>{u.role === 'admin' ? 'ผู้ดูแลระบบ' : 'สมาชิก'}</span></td>
                                <td>{u.team_name ? <span className="cat-chip">{u.team_name}</span> : <span className="muted">—</span>}</td>
                                <td>{u.is_active ? <span className="badge badge-member">ใช้งาน</span> : <span className="badge badge-off">ปิด</span>}</td>
                                <td className="actions">
                                    <span className="row-actions">
                                        <button className="icon-btn" title="แก้ไข" onClick={() => setModal({ editing: u })}><Icon name="edit" size={16} /></button>
                                        <button className="icon-btn danger" title="ลบ" onClick={() => handleDelete(u)}><Icon name="trash" size={16} /></button>
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modal && <UserForm editing={modal.editing} teams={teams} onClose={() => setModal(null)} onSaved={handleSaved} />}
        </div>
    );
}
