import { useState } from 'react';
import Icon from './Icon.jsx';
import { api } from '../api/client.js';



/**
 * โมดัลกรอกผลงานคอนเทนต์ (Views/Engagement) — กรอกมือ หรือกด "ดึงจาก TikTok"
 * props:
 *   sub          = submission
 *   group        = ad_group ที่ KOL คนนี้สังกัด (เอา Content Format ที่บรีฟไว้มาแสดง)
 *   fetchUrl     = endpoint สำหรับดึงจาก TikTok (เช่น `/ads/${sub.id}/fetch-tiktok` หรือ team route)
 *   onSave(payload) = async ผู้เรียกยิง API เอง
 *   onClose()
 */
export default function PerfModal({ sub, group, fetchUrl, onSave, onClose }) {
    // Content Format ยึดจากตอนตั้งแคมเปญ ไม่ให้เลือกซ้ำตรงนี้
    // ของเก่าที่เคยเลือกไว้เองก่อนเปลี่ยนวิธี ยังแสดงเป็น fallback
    const briefFormat = group?.content_format || sub.content_format || null;
    const [f, setF] = useState({
        views: sub.views || '', likes: sub.likes || '', comments: sub.comments || '',
        saves: sub.saves || '', shares: sub.shares || ''
    });
    const [saving, setSaving] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [msg, setMsg] = useState('');
    const up = (k, v) => setF(s => ({ ...s, [k]: v }));
    const num = v => Number(String(v).replace(/[^\d]/g, '')) || 0;

    const engagement = num(f.likes) + num(f.comments) + num(f.saves) + num(f.shares);
    const er = num(f.views) > 0 ? ((engagement / num(f.views)) * 100).toFixed(2) : '0';

    async function fetchTikTok() {
        setFetching(true); setMsg('');
        try {
            const res = await api(fetchUrl, { method: 'POST' });
            const d = res.data || {};
            setF(s => ({
                ...s,
                views: d.views ?? s.views, likes: d.likes ?? s.likes, comments: d.comments ?? s.comments,
                saves: d.saves ?? s.saves, shares: d.shares ?? s.shares
            }));
            setMsg('✓ ดึงข้อมูลจาก TikTok สำเร็จ');
        } catch (err) {
            setMsg('⚠️ ' + (err.message || 'ดึงจาก TikTok ไม่สำเร็จ — ตรวจสอบการตั้งค่า TikTok API'));
        } finally { setFetching(false); }
    }

    async function save() {
        setSaving(true);
        try {
            await onSave({
                views: num(f.views), likes: num(f.likes), comments: num(f.comments),
                saves: num(f.saves), shares: num(f.shares)
            });
            onClose();
        } catch (err) { alert(err.message); }
        finally { setSaving(false); }
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="draft-head">
                    <div className="draft-name">📊 ผลงานคอนเทนต์ · {sub.account_name} <span className="muted">· {sub.platform || '—'}</span></div>
                </div>
                <button type="button" className="perf-fetch-btn" onClick={fetchTikTok} disabled={fetching}>
                    <Icon name="target" size={15} /> {fetching ? 'กำลังดึง...' : 'ดึงจาก TikTok อัตโนมัติ'}
                </button>
                {msg && <div className="perf-msg">{msg}</div>}

                <div className="field-row">
                    <div className="field"><label>Views (ยอดวิว)</label><input inputMode="numeric" value={f.views} onChange={e => up('views', e.target.value.replace(/\D/g, ''))} placeholder="0" /></div>
                    <div className="field"><label>Content Format</label>
                        <div className="perf-readonly" title="ตั้งไว้ตอนสร้างแคมเปญ — แก้ได้ที่หน้าแก้ไขแคมเปญ">
                            {briefFormat || <span className="muted">ยังไม่ได้ระบุตอนตั้งแคมเปญ</span>}
                        </div>
                    </div>
                </div>
                <div className="field-row">
                    <div className="field"><label>Likes</label><input inputMode="numeric" value={f.likes} onChange={e => up('likes', e.target.value.replace(/\D/g, ''))} placeholder="0" /></div>
                    <div className="field"><label>Comments</label><input inputMode="numeric" value={f.comments} onChange={e => up('comments', e.target.value.replace(/\D/g, ''))} placeholder="0" /></div>
                </div>
                <div className="field-row">
                    <div className="field"><label>Saves</label><input inputMode="numeric" value={f.saves} onChange={e => up('saves', e.target.value.replace(/\D/g, ''))} placeholder="0" /></div>
                    <div className="field"><label>Shares</label><input inputMode="numeric" value={f.shares} onChange={e => up('shares', e.target.value.replace(/\D/g, ''))} placeholder="0" /></div>
                </div>
                <div className="perf-er">Engagement รวม: <b>{engagement.toLocaleString()}</b> · Engagement Rate: <b>{er}%</b></div>

                <div className="modal-actions">
                    <button type="button" className="btn-ghost" onClick={onClose}>ปิด</button>
                    <button type="button" className="btn-primary" onClick={save} disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
                </div>
            </div>
        </div>
    );
}
