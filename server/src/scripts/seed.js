/**
 * สร้างข้อมูลตัวอย่างให้ Dashboard เห็นตัวเลขจริง
 * - ทีม, ผู้ใช้, KOL หลายแพลตฟอร์ม, Project หลายแบรนด์ (มี fee + views + วันที่)
 * รัน: npm run seed   (ถ้ามี admin อยู่แล้วจะข้าม)
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const store = require('../store');

const BRANDS = ["Jula's Herb", 'Jdent', 'Jarvit', 'Beauterry', 'Jernis', 'Dermiq'];

(async () => {
    try {
        const username = process.env.ADMIN_USERNAME || 'admin';
        const fullName = process.env.ADMIN_FULLNAME || 'System Admin';

        // ไม่มีรหัสสำรองแบบตายตัวแล้ว — บังคับให้ตั้งเองใน server/.env ก่อน seed
        // ไม่งั้นทุกคนที่โคลน repo นี้จะรู้รหัส admin ทันที
        const password = process.env.ADMIN_PASSWORD;
        const memberPassword = process.env.MEMBER_PASSWORD;
        if (!password || !memberPassword) {
            console.error('❌ ยังไม่ได้ตั้งรหัสผ่านใน server/.env');
            console.error('   ต้องมีทั้ง ADMIN_PASSWORD และ MEMBER_PASSWORD ก่อนรัน seed');
            console.error('   ตั้งเป็นรหัสของตัวเอง อย่าใช้ค่าตัวอย่างจาก .env.example');
            process.exit(1);
        }

        if (await store.users.findByUsername(username)) {
            console.log(`ℹ️  ผู้ใช้ "${username}" มีอยู่แล้ว — ข้าม seed`);
            process.exit(0);
        }

        // ทีม
        const adminTeam = await store.teams.create({ name: 'Admin Team', description: 'ทีมผู้ดูแลระบบ' });
        const teamA = await store.teams.create({ name: 'Team A', description: 'ทีมการตลาด A' });
        const teamB = await store.teams.create({ name: 'Team B', description: 'ทีมการตลาด B' });

        // ผู้ใช้
        const hash = await bcrypt.hash(password, 10);
        await store.users.create({ username, password_hash: hash, full_name: fullName, role: 'admin', team_id: adminTeam.id });
        const m1 = await bcrypt.hash(memberPassword, 10);
        await store.users.create({ username: 'member1', password_hash: m1, full_name: 'สมาชิก ทีม A', role: 'member', team_id: teamA.id });
        const m2 = await bcrypt.hash(memberPassword, 10);
        await store.users.create({ username: 'member2', password_hash: m2, full_name: 'สมาชิก ทีม B', role: 'member', team_id: teamB.id });

        // KOL ส่วนกลาง (หลายแพลตฟอร์ม)
        const kolDefs = [
            { kol_code: 'K001', name: 'น้องเอ', username: '@nong_a', platform: 'TikTok', followers: 120000, engagement_rate: 5.2, category: 'Beauty' },
            { kol_code: 'K002', name: 'พี่บี', username: '@pee_b', platform: 'Instagram', followers: 340000, engagement_rate: 3.8, category: 'Lifestyle' },
            { kol_code: 'K003', name: 'ซีดารา', username: '@c_dara', platform: 'Facebook', followers: 890000, engagement_rate: 2.1, category: 'Food' },
            { kol_code: 'K004', name: 'ดีดี้', username: '@dede', platform: 'Lemon8', followers: 75000, engagement_rate: 6.4, category: 'Beauty' },
            { kol_code: 'K005', name: 'อีฟ', username: '@eve', platform: 'TikTok', followers: 210000, engagement_rate: 4.7, category: 'Fashion' },
            { kol_code: 'K006', name: 'เอฟจี', username: '@fg', platform: 'Instagram', followers: 155000, engagement_rate: 4.1, category: 'Health' },
            { kol_code: 'K007', name: 'จีจี้', username: '@gigi', platform: 'Lemon8', followers: 98000, engagement_rate: 5.9, category: 'Skincare' },
            { kol_code: 'K008', name: 'เฮชเอช', username: '@hh', platform: 'Facebook', followers: 450000, engagement_rate: 1.9, category: 'Food' }
        ];
        const kols = [];
        for (const d of kolDefs) kols.push(await store.kols.create(d));
        const K = i => kols[i - 1].id; // K(1)..K(8)

        // Project (campaign) หลายแบรนด์ พร้อม fee + views + วันที่ (ก.ค. 2026)
        const projDefs = [
            { team: teamA, by: 2, name: "Jula's Herb – Summer Glow", brand: "Jula's Herb", budget: 200000, start_date: '2026-07-03', status: 'Active',
              kols: [{ id: K(1), fee: 30000, views: 250000 }, { id: K(5), fee: 45000, views: 410000 }, { id: K(4), fee: 15000, views: 90000 }] },
            { team: teamA, by: 2, name: 'Jdent – White Smile', brand: 'Jdent', budget: 150000, start_date: '2026-07-10', status: 'Active',
              kols: [{ id: K(3), fee: 60000, views: 800000 }, { id: K(2), fee: 40000, views: 300000 }] },
            { team: teamB, by: 3, name: 'Beauterry – Aura Launch', brand: 'Beauterry', budget: 300000, start_date: '2026-07-15', status: 'Active',
              kols: [{ id: K(7), fee: 20000, views: 150000 }, { id: K(6), fee: 35000, views: 220000 }, { id: K(1), fee: 30000, views: 260000 }] },
            { team: teamB, by: 3, name: 'Dermiq – Clear Skin', brand: 'Dermiq', budget: 120000, start_date: '2026-07-20', status: 'Draft',
              kols: [{ id: K(8), fee: 50000, views: 500000 }] },
            { team: teamA, by: 2, name: 'Jarvit – Energy Boost', brand: 'Jarvit', budget: 90000, start_date: '2026-06-25', status: 'Completed',
              kols: [{ id: K(5), fee: 40000, views: 380000 }] }
        ];

        for (const pd of projDefs) {
            const proj = await store.projects.create({
                team_id: pd.team.id, created_by: pd.by, name: pd.name, brand: pd.brand,
                budget: pd.budget, start_date: pd.start_date, status: pd.status
            });
            for (const k of pd.kols) {
                await store.projectKols.add({ project_id: proj.id, kol_id: k.id, fee: k.fee, views: k.views, status: 'Confirmed' });
            }
        }

        console.log('✅ seed เสร็จสิ้น (ข้อมูลตัวอย่างครบทุกแบรนด์/แพลตฟอร์ม)');
        process.exit(0);
    } catch (err) {
        console.error('❌ seed ล้มเหลว:', err.message);
        process.exit(1);
    }
})();
