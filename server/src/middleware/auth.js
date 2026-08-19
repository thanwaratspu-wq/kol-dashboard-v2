const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// ตรวจ JWT token จาก header "Authorization: Bearer <token>"
// ถ้าถูกต้อง → แนบ req.user = { id, username, role, team_id }
function authenticate(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ status: 'error', message: 'ไม่พบ token กรุณาเข้าสู่ระบบ' });
    }

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({ status: 'error', message: 'Token ไม่ถูกต้องหรือหมดอายุ' });
    }
}

// จำกัดเฉพาะบาง role (เช่น requireRole('admin'))
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ status: 'error', message: 'ไม่มีสิทธิ์ทำรายการนี้' });
        }
        next();
    };
}

module.exports = { authenticate, requireRole };
