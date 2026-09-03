require('dotenv').config();
const express = require('express');
const cors = require('cors');
const store = require('./store');
const { authenticate } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', service: 'KOL Dashboard v2 API', timestamp: new Date().toISOString() });
});

// สรุปตัวเลขภาพรวมสำหรับหน้า Dashboard (ตามสิทธิ์ทีม)
app.get('/api/stats/overview', authenticate, async (req, res, next) => {
    try {
        const scope = req.user.role === 'admin' ? null : req.user.team_id;
        const [total_kols, total_projects, total_teams,
               kols_by_platform, projects_by_status, members_by_team] = await Promise.all([
            store.kols.count(),
            store.projects.count(scope),
            store.meta.teamCount(),
            store.kols.platformCounts(),
            store.projects.statusCounts(scope),
            store.teams.memberCounts()
        ]);
        res.json({
            status: 'success',
            data: {
                total_kols, total_projects, total_teams,
                kols_by_platform, projects_by_status, members_by_team
            }
        });
    } catch (err) { next(err); }
});

// สรุปข้อมูลหน้า Dashboard Overview ตามตัวกรอง (แบรนด์/วันที่/campaign)
app.get('/api/stats/dashboard', authenticate, async (req, res, next) => {
    try {
        const scopeTeamId = req.user.role === 'admin' ? null : req.user.team_id;
        const { brand, from, to, project_id } = req.query;
        const data = await store.dashboard.overview({
            scopeTeamId,
            brand: brand || undefined,
            from: from || undefined,
            to: to || undefined,
            projectId: project_id || undefined
        });
        res.json({ status: 'success', data });
    } catch (err) { next(err); }
});

// สรุปงบประมาณ ตามตัวกรอง (เดือน/แบรนด์) + เคารพสิทธิ์ทีม
app.get('/api/stats/budget', authenticate, async (req, res, next) => {
    try {
        const scopeTeamId = req.user.role === 'admin' ? null : req.user.team_id;
        const { brand, from, to } = req.query;
        const data = await store.budget.overview({
            scopeTeamId, brand: brand || undefined, from: from || undefined, to: to || undefined
        });
        res.json({ status: 'success', data });
    } catch (err) { next(err); }
});

// เทรนด์งบรายเดือน
app.get('/api/stats/budget/trend', authenticate, async (req, res, next) => {
    try {
        const scopeTeamId = req.user.role === 'admin' ? null : req.user.team_id;
        const { brand, year } = req.query;
        const data = await store.budget.trend({
            scopeTeamId, brand: brand || undefined, year: year || String(new Date().getFullYear())
        });
        res.json({ status: 'success', data });
    } catch (err) { next(err); }
});

// รายงานแคมเปญ (Campaign Reports) — KOLS/BUDGET/USED/POST RATE ต่อแคมเปญ
app.get('/api/stats/reports', authenticate, async (req, res, next) => {
    try {
        const scopeTeamId = req.user.role === 'admin' ? null : req.user.team_id;
        const { brand } = req.query;
        const data = await store.reports.campaigns({ scopeTeamId, brand: brand || undefined });
        res.json({ status: 'success', data });
    } catch (err) { next(err); }
});

// รายงานเชิงลึกของ 1 แคมเปญ (Report Analysis)
app.get('/api/stats/reports/:id', authenticate, async (req, res, next) => {
    try {
        const scopeTeamId = req.user.role === 'admin' ? null : req.user.team_id;
        const data = await store.reports.detail(req.params.id, scopeTeamId);
        if (!data) return res.status(404).json({ status: 'error', message: 'ไม่พบแคมเปญ' });
        res.json({ status: 'success', data });
    } catch (err) { next(err); }
});

// routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/users', require('./routes/users'));
app.use('/api/kols', require('./routes/kols'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/activity', require('./routes/activity'));
app.use('/api/ads', require('./routes/ads'));
app.use('/api/rate-requests', require('./routes/rateRequests'));
app.use('/api/agency', require('./routes/agency')); // สาธารณะ (Agency ใช้ลิงก์)

// error handler
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.message);
    // err.status = ข้อผิดพลาดที่ตั้งใจให้เกิด (เช่น 409 ข้อมูลถูกล็อก) ไม่ใช่บั๊กของระบบ
    res.status(err.status || 500).json({ status: 'error', message: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
    console.log('🚀 KOL Dashboard v2 API');
    console.log(`✅ Server running: http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
});

module.exports = app;
