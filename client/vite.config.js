import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ระหว่าง dev: proxy ทุก request /api ไปที่ backend (port 4000)
// ทำให้ frontend เรียก API ได้เหมือน same-origin (ไม่มีปัญหา CORS)
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:4000',
                changeOrigin: true
            }
        }
    }
});
