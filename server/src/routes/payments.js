const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const store = require('../store');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// ทุก endpoint ในไฟล์นี้ — admin เท่านั้น (เห็น + แก้ไขได้คนเดียว)
router.use(authenticate, requireRole('admin'));

// ---------- ตั้งค่าที่เก็บไฟล์อัปโหลด ----------
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        // ตั้งชื่อไฟล์แบบไม่ซ้ำ (เดาไม่ได้)
        const ext = path.extname(file.originalname);
        const unique = `${req.params.projectId}_${req.params.type}_${Date.now()}${ext}`;
        cb(null, unique);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
    fileFilter: (req, file, cb) => {
        const ok = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'].includes(path.extname(file.originalname).toLowerCase());
        cb(ok ? null : new Error('รองรับเฉพาะไฟล์ PDF หรือรูปภาพ'), ok);
    }
});

// GET /api/payments — รายการ Project ทั้งหมด + ข้อมูลการจ่าย
router.get('/', async (req, res, next) => {
    try {
        const data = await store.payments.listWithProjects();
        res.json({ status: 'success', data });
    } catch (err) { next(err); }
});

// PUT /api/payments/:projectId — แก้ ชื่อเอเจนซี่ / รอบวันจ่าย / สถานะ / โน้ต
router.put('/:projectId', async (req, res, next) => {
    try {
        const { agency_name, payment_date, status, notes } = req.body;
        const data = await store.payments.update(req.params.projectId, { agency_name, payment_date, status, notes });
        if (!data) return res.status(404).json({ status: 'error', message: 'ไม่พบ Project' });
        res.json({ status: 'success', data });
    } catch (err) { next(err); }
});

// POST /api/payments/:projectId/upload/:type — อัปโหลดไฟล์ (type = quotation | invoice)
router.post('/:projectId/upload/:type', (req, res, next) => {
    const { type } = req.params;
    if (!['quotation', 'invoice'].includes(type)) {
        return res.status(400).json({ status: 'error', message: 'ประเภทไฟล์ไม่ถูกต้อง' });
    }
    upload.single('file')(req, res, async (err) => {
        if (err) return res.status(400).json({ status: 'error', message: err.message });
        if (!req.file) return res.status(400).json({ status: 'error', message: 'ไม่พบไฟล์' });
        try {
            const meta = {
                filename: req.file.filename,
                original: Buffer.from(req.file.originalname, 'latin1').toString('utf8'),
                size: req.file.size,
                uploaded_at: new Date().toISOString()
            };
            const data = await store.payments.setFile(req.params.projectId, type, meta);
            if (!data) return res.status(404).json({ status: 'error', message: 'ไม่พบ Project' });
            res.json({ status: 'success', data });
        } catch (e) { next(e); }
    });
});

// GET /api/payments/:projectId/file/:type — ดาวน์โหลด/เปิดไฟล์
router.get('/:projectId/file/:type', async (req, res, next) => {
    try {
        const pay = await store.payments.get(req.params.projectId);
        const meta = pay && pay[req.params.type];
        if (!meta) return res.status(404).json({ status: 'error', message: 'ไม่พบไฟล์' });
        const filePath = path.join(UPLOAD_DIR, meta.filename);
        if (!fs.existsSync(filePath)) return res.status(404).json({ status: 'error', message: 'ไฟล์หายไป' });
        res.sendFile(filePath);
    } catch (err) { next(err); }
});

module.exports = router;
