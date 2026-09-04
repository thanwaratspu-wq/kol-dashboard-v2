import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import MessageBox, { unreadCount } from './MessageBox.jsx';

const POLL_MS = 45000;   // ตาข่ายรองของรายการห้อง (ตัวห้องเองมี SSE อยู่แล้ว)

// เวลาสั้น ๆ ข้างชื่อห้อง
const shortWhen = at => {
    const d = new Date(at); if (isNaN(d)) return '';
    const t = new Date();
    if (d.toDateString() === t.toDateString()) {
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    return `${d.getDate()}/${d.getMonth() + 1}`;
};

/**
 * กล่องแชทลอยมุมขวาล่าง แบบ Messenger
 *
 * ใช้ได้ 2 แบบ:
 *   1) ห้องเดียว — ส่ง base/streamPath/side/title มา (หน้าเอเจนซี่ หรือกดจากรายชื่อในหน้าแคมเปญ)
 *   2) รายการห้อง — ส่ง mode="list" + projectId แล้วเลือกห้องเอเจนซี่ของแคมเปญนั้น
 */
export default function ChatDock({ mode, projectId, base, streamPath, side, title, subtitle, openOnMount = false, onClose }) {
    const isList = mode === 'list';
    const [open, setOpen] = useState(openOnMount);
    const [unread, setUnread] = useState(0);
    const [rooms, setRooms] = useState([]);
    const [picked, setPicked] = useState(null);   // ห้องที่เลือกจากรายการ

    // ---------- แบบรายการห้อง ----------
    const loadRooms = useCallback(async () => {
        if (!isList) return;
        try {
            const res = await api('/projects/chats/all');
            // แสดงเฉพาะเอเจนซี่ของแคมเปญที่เปิดอยู่
            const mine = (res.data || []).filter(r => String(r.project_id) === String(projectId));
            setRooms(mine);
            setUnread(mine.reduce((n, r) => n + r.unread, 0));
        } catch { /* โหลดไม่ได้ก็ไม่ต้องรบกวน */ }
    }, [isList, projectId]);

    // ---------- แบบห้องเดียว ----------
    const loadOneUnread = useCallback(async () => {
        if (isList || !base) return;
        try {
            const res = await api(base);
            setUnread(unreadCount(res.data, side));
        } catch { /* เงียบไว้ */ }
    }, [isList, base, side]);

    // รายการห้อง: อัปเดตเรื่อย ๆ และทุกครั้งที่เปิด/ปิด/กลับจากห้อง
    useEffect(() => {
        if (!isList) return;
        loadRooms();
        const t = setInterval(loadRooms, POLL_MS);
        return () => clearInterval(t);
    }, [isList, loadRooms, picked, open]);

    // ห้องเดียว: ตอนยุบอยู่ยังต้องรู้ว่ามีข้อความใหม่ไหม
    useEffect(() => {
        if (isList || open) return;
        loadOneUnread();
        if (!streamPath || typeof EventSource === 'undefined') return;
        const es = new EventSource(`/api${streamPath}`);
        es.addEventListener('message', loadOneUnread);
        return () => es.close();
    }, [isList, open, streamPath, loadOneUnread]);

    // รายการห้อง: เกาะสายทุกห้องไว้ เพื่อให้ตัวเลขบนปุ่มขึ้นทันทีไม่ว่าเอเจนซี่เจ้าไหนส่งมา
    useEffect(() => {
        if (!isList || typeof EventSource === 'undefined' || rooms.length === 0) return;
        const list = rooms.map(r => {
            const es = new EventSource(`/api/agency/${r.token}/stream`);
            es.addEventListener('message', loadRooms);
            return es;
        });
        return () => list.forEach(es => es.close());
    }, [isList, rooms.length, loadRooms]);   // eslint-disable-line react-hooks/exhaustive-deps

    // ให้ที่อื่นสั่งเปิดห้องได้ (เช่นปุ่ม 💬 ในรายชื่อเอเจนซี่หน้าแคมเปญ)
    // ใช้ event บน window แทนการเดินสาย props ข้ามหลายชั้น — มีกล่องเดียวในแอปอยู่แล้ว
    useEffect(() => {
        if (!isList) return;
        function onOpen(e) {
            const r = e.detail;
            if (!r || !r.token) return;
            setPicked(r);
            setOpen(true);
        }
        window.addEventListener('kol:open-chat', onOpen);
        return () => window.removeEventListener('kol:open-chat', onOpen);
    }, [isList]);

    function close() {
        setOpen(false);
        setPicked(null);
        if (isList) loadRooms(); else loadOneUnread();
        if (onClose) onClose();
    }

    // ห้องที่กำลังเปิดอยู่จริง ๆ
    const room = isList
        ? (picked && {
            base: `/projects/${picked.project_id}/agency-links/${picked.token}/messages`,
            streamPath: `/agency/${picked.token}/stream`,
            side: 'team',
            title: picked.agency_name,
            subtitle: picked.project_name
        })
        : { base, streamPath, side, title, subtitle };

    return (
        <div className="chatdock">
            {open ? (
                <div className="chatdock-panel">
                    <div className="chatdock-bar">
                        {isList && picked && (
                            <button type="button" className="chatdock-back" onClick={() => setPicked(null)}
                                title="กลับไปรายการ" aria-label="กลับไปรายการห้อง">‹</button>
                        )}
                        <div className="chatdock-name">
                            {room ? room.title : 'ข้อความ'}
                            <span className="chatdock-sub">{room ? room.subtitle : `เอเจนซี่ในแคมเปญนี้ ${rooms.length} เจ้า`}</span>
                        </div>
                        <button type="button" onClick={close} title="ย่อลง" aria-label="ย่อกล่องข้อความ">─</button>
                    </div>

                    {room ? (
                        <MessageBox
                            key={room.base}
                            base={room.base} streamPath={room.streamPath} side={room.side}
                            title={room.title} subtitle={room.subtitle}
                            onUnread={() => (isList ? loadRooms() : setUnread(0))}
                        />
                    ) : (
                        <div className="chatdock-list">
                            {rooms.length === 0 ? (
                                <div className="chatdock-none">แคมเปญนี้ยังไม่มีลิงก์เอเจนซี่</div>
                            ) : rooms.map(r => (
                                <button type="button" className="chatdock-room" key={r.token} onClick={() => setPicked(r)}>
                                    <span className="chatdock-room-top">
                                        <span className="chatdock-room-name">{r.agency_name}</span>
                                        {r.last && <span className="chatdock-room-when">{shortWhen(r.last.at)}</span>}
                                        {r.unread > 0 && <span className="chatdock-room-n">{r.unread}</span>}
                                    </span>
                                    <span className="chatdock-room-last">
                                        {r.last
                                            ? `${r.last.from === 'team' ? 'เรา: ' : ''}${r.last.text}`
                                            : 'ยังไม่มีข้อความ'}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <button type="button" className="chatdock-launch" onClick={() => setOpen(true)}>
                    <span className="chatdock-launch-ico">💬</span>
                    <span className="chatdock-launch-txt">{isList ? 'ข้อความ' : title}</span>
                    {unread > 0 && <span className="chatdock-launch-n">{unread}</span>}
                </button>
            )}
        </div>
    );
}
