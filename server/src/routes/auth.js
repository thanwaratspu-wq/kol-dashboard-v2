const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const store = require('../store');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login — เข้าสู่ระบบ คืน JWT token
router.post('/login', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ status: 'error', message: 'กรุณากรอก username และ password' });
        }

        const user = await store.users.findByUsername(username);
        if (!user || !user.is_active) {
            return res.status(401).json({ status: 'error', message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ status: 'error', message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, team_id: user.team_id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            status: 'success',
            token,
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role,
                team_id: user.team_id,
                team_name: user.team_name
            }
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/auth/me — ดูข้อมูลผู้ใช้ปัจจุบันจาก token
router.get('/me', authenticate, async (req, res, next) => {
    try {
        const user = await store.users.findById(req.user.id);
        if (!user) return res.status(404).json({ status: 'error', message: 'ไม่พบผู้ใช้' });
        const { password_hash, ...safe } = user;
        res.json({ status: 'success', user: safe });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
