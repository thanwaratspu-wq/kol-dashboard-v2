const express = require('express');
const store = require('../store');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const AD_STATUSES = ['ยังไม่ยิง', 'ยิงแล้ว'];

// GET /api/ads — รายการโพสต์ที่ยิงแอด + สรุปภาพรวม (ตามสิทธิ์ทีม + ตัวกรอง)
router.get('/', async (req, res, next) => {
    try {
        const scopeTeamId = req.user.role === 'admin' ? null : req.user.team_id;
        const { brand, status, from, to } = req.query;
        const data = await store.ads.list({
            scopeTeamId,
            brand: brand || undefined,
            status: status || undefined,
            from: from || undefined,
            to: to || undefined
        });
        res.json({ status: 'success', data });
    } catch (err) { next(err); }
});

// PUT /api/ads/:subId — อัปเดตข้อมูลแอดของโพสต์ (สถานะ/ค่าแอด/Reach/วันเริ่ม-จบ)
router.put('/:subId', async (req, res, next) => {
    try {
        const ctx = await store.ads.subContext(req.params.subId);
        if (!ctx) return res.status(404).json({ status: 'error', message: 'ไม่พบโพสต์' });
        // ตรวจสิทธิ์: admin ได้ทุกทีม, member เฉพาะทีมตัวเอง
        if (req.user.role !== 'admin' && ctx.team_id !== req.user.team_id) {
            return res.status(403).json({ status: 'error', message: 'ไม่มีสิทธิ์แก้ไขของทีมอื่น' });
        }

        const { ad_status, ad_spend, ad_reach, ad_start, ad_end, ad_note } = req.body;
        if (ad_status !== undefined && !AD_STATUSES.includes(ad_status)) {
            return res.status(400).json({ status: 'error', message: 'สถานะไม่ถูกต้อง' });
        }
        const fields = {};
        if (ad_status !== undefined) fields.ad_status = ad_status;
        if (ad_spend !== undefined) fields.ad_spend = Number(ad_spend) || 0;
        if (ad_reach !== undefined) fields.ad_reach = Number(ad_reach) || 0;
        if (ad_start !== undefined) fields.ad_start = ad_start || null;
        if (ad_end !== undefined) fields.ad_end = ad_end || null;
        if (ad_note !== undefined) fields.ad_note = (ad_note && String(ad_note).trim()) ? String(ad_note).trim() : null;

        const data = await store.submissions.update(req.params.subId, null, fields);
        if (!data) return res.status(404).json({ status: 'error', message: 'ไม่พบโพสต์' });

        // บันทึกประวัติ (เงียบไว้ถ้า log พลาด)
        try {
            await store.activity.log({
                user_id: req.user.id, team_id: ctx.team_id ?? req.user.team_id, action: 'ad',
                project_id: ctx.project_id, project_name: ctx.project_name,
                summary: `อัปเดตแอด: ${ctx.account_name}` + (ad_status ? ` (${ad_status})` : '')
            });
        } catch { /* เงียบไว้ */ }

        res.json({ status: 'success', data });
    } catch (err) { next(err); }
});

module.exports = router;
