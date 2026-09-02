# KOL Central Dashboard v2

Dashboard กลางสำหรับหลายทีม — สร้างใหม่ ไม่ต่อยอดจากของเดิม

## สถานะปัจจุบัน
- ✅ **Phase 1: Backend + Auth** (เสร็จ) — API + Login/Role + Project แยกตามทีม
- ⏳ **Phase 2: Frontend** (React + Vite) — ยังไม่เริ่ม
- ⏳ **Phase 3: Deploy**

## ที่เก็บข้อมูล (Data Driver)
ตอนนี้ยังไม่ขึ้น PostgreSQL — ใช้ **ไฟล์ JSON** ชั่วคราว (`server/data/db.json`)
สลับได้ที่ `server/.env` → `DATA_DRIVER=json` หรือ `postgres`
ทุก route เรียกผ่าน `src/store/` เวลาสลับไป PostgreSQL จะไม่ต้องแก้ route

## โครงสร้าง
```
dashboard-v2/
├── server/                 # Backend (Node.js + Express)
│   ├── src/
│   │   ├── index.js        # entry + /api/health, /api/stats/overview
│   │   ├── middleware/auth.js   # ตรวจ JWT + role
│   │   ├── routes/         # auth, teams, users, kols, projects
│   │   ├── store/          # ชั้นเก็บข้อมูล (jsonStore ตอนนี้ / pgStore ภายหลัง)
│   │   ├── models/schema.sql    # schema สำหรับ PostgreSQL (ใช้ตอนขึ้น DB)
│   │   └── scripts/        # setupDatabase.js, seed.js
│   └── data/db.json        # ข้อมูล dev (gitignored)
└── client/                 # Frontend (React + Vite) — Phase 2
```

## วิธีรัน (Backend)
```bash
cd server
npm install
npm run seed     # สร้าง admin + ข้อมูลตัวอย่าง (ครั้งแรก)
npm run dev      # เปิด server ที่ http://localhost:4000
```

## บัญชีเริ่มต้น (หลัง seed)
| role   | username | password                              | ทีม        |
|--------|----------|---------------------------------------|------------|
| admin  | admin    | ตั้งเองที่ `ADMIN_PASSWORD` ใน `server/.env` | Admin Team |
| member | member1  | ตั้งเองตอน seed                          | Team A     |

> ⚠️ ก่อน seed ให้ตั้ง `ADMIN_PASSWORD` และ `JWT_SECRET` ใน `server/.env` เป็นค่าของตัวเอง
> อย่าใช้ค่าตัวอย่างจาก `.env.example` และเปลี่ยนรหัสผ่านทุกบัญชีก่อนเปิดใช้งานจริง

## API หลัก
| Method | Path | สิทธิ์ | หน้าที่ |
|--------|------|--------|---------|
| POST | `/api/auth/login` | ทุกคน | เข้าสู่ระบบ → JWT |
| GET  | `/api/auth/me` | ล็อกอิน | ข้อมูลตัวเอง |
| GET  | `/api/stats/overview` | ล็อกอิน | ตัวเลขสรุป |
| GET/POST/PUT/DELETE | `/api/teams` | ดู=ทุกคน / แก้=admin | จัดการทีม |
| GET/POST/PUT/DELETE | `/api/users` | admin | จัดการผู้ใช้ |
| GET | `/api/kols` | ล็อกอิน | KOL ส่วนกลาง (ทุกทีมเห็นเหมือนกัน) |
| POST/PUT/DELETE | `/api/kols` | admin | จัดการ KOL ส่วนกลาง |
| GET/POST/PUT/DELETE | `/api/projects` | member=ทีมตัวเอง / admin=ทั้งหมด | Project ของแต่ละทีม |
| POST/DELETE | `/api/projects/:id/kols` | เจ้าของทีม/admin | เพิ่ม-ลบ KOL ใน Project |

## แนวคิดข้อมูล
- **kols** = ข้อมูล KOL ส่วนกลาง ทุกทีมเห็นเหมือนกัน
- **teams / users** = ทีม + ผู้ใช้ (สังกัดทีม, role `admin`/`member`)
- **projects** = แต่ละทีมสร้าง Project ของตัวเอง (member เห็นเฉพาะของทีม, admin เห็นหมด)
- **project_kols** = KOL ที่หยิบเข้ามาในแต่ละ Project
