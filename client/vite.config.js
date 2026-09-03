import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ระหว่าง dev: proxy ทุก request /api ไปที่ backend (port 4000)
// ทำให้ frontend เรียก API ได้เหมือน same-origin (ไม่มีปัญหา CORS)
export default defineConfig({
    plugins: [react()],
    server: {
        // host: true = เปิดรับจากเครื่องอื่นในวง LAN ด้วย (ไม่ใช่แค่ localhost)
        // เครื่องอื่นเปิดแค่พอร์ต 5173 พอ — /api ถูก proxy ไป backend ฝั่งเครื่องนี้ให้เอง
        host: true,
        port: 5173,
        strictPort: true,   // ถ้าพอร์ตไม่ว่างให้ error ไปเลย ดีกว่าแอบย้ายไป 5174 แล้วหาไม่เจอ
        proxy: {
            '/api': {
                target: 'http://localhost:4000',
                changeOrigin: true
            }
        }
    }
});
