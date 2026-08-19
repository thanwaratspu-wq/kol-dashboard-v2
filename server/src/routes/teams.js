const express = require('express');
const store = require('../store');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/teams — รายชื่อทีมทั้งหมด (ทุกคนดูได้)
router.get('/', async (req, res, next) => {
    try {
        const data = await store.teams.listWithMemberCount();
        res.json({ status: 'success', data });
    } catch (err) { next(err); }
});

// POST /api/teams — สร้างทีม (admin เท่านั้น)
router.post('/', requireRole('admin'), async (req, res, next) => {
    try {
        const { name, description } = req.body;
        if (!name) return res.status(400).json({ status: 'error', message: 'กรุณาระบุชื่อทีม' });
        const data = await store.teams.create({ name, description });
        res.status(201).json({ status: 'success', data });
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ status: 'error', message: err.message });
        next(err);
    }
});

// PUT /api/teams/:id — แก้ไขทีม (admin เท่านั้น)
router.put('/:id', requireRole('admin'), async (req, res, next) => {
    try {
        const { name, description } = req.body;
        const data = await store.teams.update(req.params.id, { name, description });
        if (!data) return res.status(404).json({ status: 'error', message: 'ไม่พบทีม' });
        res.json({ status: 'success', data });
    } catch (err) { next(err); }
});

// DELETE /api/teams/:id — ลบทีม (admin เท่านั้น)
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
    try {
        const ok = await store.teams.remove(req.params.id);
        if (!ok) return res.status(404).json({ status: 'error', message: 'ไม่พบทีม' });
        res.json({ status: 'success', message: 'ลบทีมแล้ว' });
    } catch (err) { next(err); }
});

module.exports = router;
