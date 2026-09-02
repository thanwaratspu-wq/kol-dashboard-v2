import { useState } from 'react';
import { api } from '../api/client.js';
import Icon from './Icon.jsx';

const MIN_LEN = 8;

// โมดัลเปลี่ยนรหัสผ่านของตัวเอง — ต้องยืนยันรหัสเดิมก่อนเสมอ
export default function ChangePasswordModal({ onClose }) {
    const [f, setF] = useState({ current: '', next: '', confirm: '' });
    const [show, setShow] = useState(false);   // สลับซ่อน/แสดงรหัส กันพิมพ์ผิดโดยไม่รู้ตัว
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);
    const up = (k, v) => { setF(s => ({ ...s, [k]: v })); setError(''); };

    // ตรวจฝั่งหน้าเว็บก่อน เพื่อบอกปัญหาได้ทันทีโดยไม่ต้องรอ server
    const tooShort = f.next.length > 0 && f.next.length < MIN_LEN;
    const mismatch = f.confirm.length > 0 && f.next !== f.confirm;
    const sameAsOld = f.next.length > 0 && f.next === f.current;
    const canSubmit = f.current && f.next.length >= MIN_LEN && f.next === f.confirm && !sameAsOld && !saving;

    async function submit(e) {
        e.preventDefault();
        if (!canSubmit) return;
        setSaving(true); setError('');
        try {
            await api('/auth/password', {
                method: 'PUT',
                body: { current_password: f.current, new_password: f.next }
            });
            setDone(true);
        } catch (err) {
            setError(err.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
        } finally {
            setSaving(false);
        }
    }

    if (done) {
        return (
            <div className="modal-backdrop" onClick={onClose}>
                <div className="modal" onClick={e => e.stopPropagation()}>
                    <div className="draft-head">
                        <div className="draft-name">✅ เปลี่ยนรหัสผ่านเรียบร้อย</div>
                    </div>
                    <p className="dash-section-sub" style={{ marginBottom: 18 }}>
                        ครั้งต่อไปให้ใช้รหัสผ่านใหม่เข้าสู่ระบบ · ตอนนี้ยังใช้งานต่อได้เลยไม่ต้องล็อกอินใหม่
                    </p>
                    <button type="button" className="btn-primary" onClick={onClose}>เสร็จสิ้น</button>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="draft-head">
                    <div className="draft-name">🔑 เปลี่ยนรหัสผ่าน</div>
                </div>

                {error && <div className="alert-error">{error}</div>}

                <form onSubmit={submit}>
                    <div className="field">
                        <label>รหัสผ่านเดิม</label>
                        <input type={show ? 'text' : 'password'} value={f.current} autoComplete="current-password"
                            onChange={e => up('current', e.target.value)} autoFocus />
                    </div>

                    <div className="field">
                        <label>รหัสผ่านใหม่</label>
                        <input type={show ? 'text' : 'password'} value={f.next} autoComplete="new-password"
                            onChange={e => up('next', e.target.value)} />
                        {tooShort
                            ? <span className="cpw-hint bad">ต้องยาวอย่างน้อย {MIN_LEN} ตัวอักษร (ตอนนี้ {f.next.length})</span>
                            : sameAsOld
                                ? <span className="cpw-hint bad">ต้องไม่ซ้ำกับรหัสผ่านเดิม</span>
                                : <span className="cpw-hint">อย่างน้อย {MIN_LEN} ตัวอักษร</span>}
                    </div>

                    <div className="field">
                        <label>ยืนยันรหัสผ่านใหม่</label>
                        <input type={show ? 'text' : 'password'} value={f.confirm} autoComplete="new-password"
                            onChange={e => up('confirm', e.target.value)} />
                        {mismatch && <span className="cpw-hint bad">กรอกไม่ตรงกับรหัสผ่านใหม่</span>}
                    </div>

                    <label className="cpw-show">
                        <input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} />
                        <span>แสดงรหัสผ่าน</span>
                    </label>

                    <div className="modal-actions">
                        <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>ยกเลิก</button>
                        <button type="submit" className="btn-primary" disabled={!canSubmit}>
                            <Icon name="check" size={16} /> {saving ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
