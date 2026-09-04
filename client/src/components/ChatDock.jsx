import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import MessageBox, { unreadCount } from './MessageBox.jsx';

/**
 * กล่องแชทลอยมุมขวาล่าง แบบ Messenger — ปกติเป็นปุ่มเล็ก ๆ กดแล้วกล่องเด้งขึ้น
 * props:
 *   base, streamPath, side  → ส่งต่อให้ MessageBox
 *   title                   = ชื่อคนที่คุยด้วย
 *   subtitle
 *   openOnMount             = เปิดกล่องทันทีตอนแสดง (ฝั่งทีมกดจากรายชื่อเอเจนซี่)
 *   onClose()               = ปิดกล่องทิ้งไปเลย (ถ้าไม่ส่งมา จะยุบเหลือปุ่มลอยแทน)
 */
export default function ChatDock({ base, streamPath, side, title, subtitle, openOnMount = false, onClose }) {
    const [open, setOpen] = useState(openOnMount);
    const [unread, setUnread] = useState(0);

    // ตอนกล่องปิดอยู่ ยังต้องรู้ว่ามีข้อความใหม่ไหม เพื่อขึ้นตัวเลขบนปุ่ม
    const refreshUnread = useCallback(async () => {
        try {
            const res = await api(base);
            setUnread(unreadCount(res.data, side));
        } catch { /* อ่านไม่ได้ก็ไม่ต้องรบกวนผู้ใช้ */ }
    }, [base, side]);

    useEffect(() => {
        if (open) return;              // เปิดอยู่ = MessageBox จัดการเอง
        refreshUnread();
        if (!streamPath || typeof EventSource === 'undefined') return;
        const es = new EventSource(`/api${streamPath}`);
        es.addEventListener('message', refreshUnread);
        return () => es.close();
    }, [open, streamPath, refreshUnread]);

    function close() {
        setOpen(false);
        refreshUnread();
        if (onClose) onClose();
    }

    return (
        <div className="chatdock">
            {open ? (
                <div className="chatdock-panel">
                    <div className="chatdock-bar">
                        <div className="chatdock-name">
                            {title}
                            {subtitle && <span className="chatdock-sub">{subtitle}</span>}
                        </div>
                        <button type="button" onClick={close} title="ย่อลง" aria-label="ย่อกล่องข้อความ">─</button>
                    </div>
                    <MessageBox
                        base={base} streamPath={streamPath} side={side}
                        title={title} subtitle={subtitle}
                        onUnread={() => setUnread(0)}
                    />
                </div>
            ) : (
                <button type="button" className="chatdock-launch" onClick={() => setOpen(true)}>
                    <span className="chatdock-launch-ico">💬</span>
                    <span className="chatdock-launch-txt">{title}</span>
                    {unread > 0 && <span className="chatdock-launch-n">{unread}</span>}
                </button>
            )}
        </div>
    );
}
