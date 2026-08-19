# Implementation Plan — KOL Central Dashboard v2

> Dashboard กลางสำหรับหลายทีม — สร้างใหม่ทั้งหมด ไม่ต่อยอดจาก `index.html` เดิม
> ทุกทีมเห็นข้อมูลชุดเดียวกัน • มี Login + Role • Deploy ขึ้นเว็บ

---

## 1. การตัดสินใจหลัก (Locked Decisions)

| หัวข้อ | สรุป |
|--------|------|
| การมองเห็นข้อมูล | ทุกทีมเห็น **ชุดเดียวกันทั้งหมด** (ไม่แยกข้อมูลรายทีม) |
| สิทธิ์การใช้งาน | มี **Login + Role** (`admin` = แก้ไขได้ / `viewer` = ดูอย่างเดียว) |
| การใช้งาน | **Deploy ขึ้นเซิร์ฟเวอร์** ให้หลายทีมเข้าผ่านเว็บ |
| ฐานข้อมูล | **เริ่มใหม่** — ตอนนี้ใช้ **ไฟล์ JSON ชั่วคราว** (`DATA_DRIVER=json`) รอสลับเป็น PostgreSQL `kol_v2` เมื่อนายหญิงสั่ง |
| Role | `admin` (แก้ไขทุกอย่าง) / `member` (สร้าง-จัดการ Project ของทีมตัวเอง) |
| Project | **แต่ละทีมสร้าง Project ของตัวเองได้** — member เห็นเฉพาะทีมตัวเอง, admin เห็นหมด; KOL ส่วนกลางใช้ร่วมกัน |
| Frontend | **React + Vite** |
| Backend | **Node.js + Express** (API ใหม่ แยกจากของเดิม) |
| ที่ตั้ง | โฟลเดอร์ใหม่ `dashboard-v2/` ใน repo เดิม — ไม่แตะโค้ด/ข้อมูลเก่า |

---

## 2. โครงสร้างโฟลเดอร์

```
dashboard-v2/
├── implementation_plan.md      # ไฟล์นี้
├── README.md
├── client/                     # React + Vite (Frontend)
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api/                # เรียก API (axios) + แนบ token
│       ├── auth/               # AuthContext, login state, route guard
│       ├── components/         # UI ย่อย (Card, Table, Chart, Sidebar)
│       ├── pages/              # Login, Dashboard, KOLs, Campaigns, Users
│       └── styles/
└── server/                     # Express (Backend API)
    ├── package.json
    └── src/
        ├── index.js            # entry point
        ├── config/db.js        # เชื่อม PostgreSQL
        ├── middleware/auth.js  # ตรวจ JWT + เช็ค role
        ├── models/schema.sql   # schema DB ใหม่
        ├── scripts/seed.js     # สร้าง admin คนแรก
        └── routes/
            ├── auth.js         # POST /login
            ├── users.js        # จัดการผู้ใช้ (admin เท่านั้น)
            ├── kols.js         # CRUD KOL
            └── campaigns.js    # CRUD แคมเปญ
```

---

## 3. Database Schema ใหม่ (ร่าง)

- `users` — id, username, password_hash (bcrypt), full_name, role (`admin`/`viewer`), team_name, is_active, created_at
- `kols` — ข้อมูล KOL (โครงคล้ายเดิมแต่ปรับให้สะอาด)
- `campaigns` — ข้อมูลแคมเปญ
- `kol_campaigns` — เชื่อม KOL ↔ แคมเปญ (many-to-many)

> เริ่มจาก `users` + โครง KOL/แคมเปญขั้นต่ำก่อน แล้วค่อยเพิ่มคอลัมน์ตามต้องการ

---

## 4. ความปลอดภัย (ต้องมีก่อน Deploy)

- รหัสผ่านเก็บแบบ hash ด้วย **bcrypt** (ไม่เก็บ plain text)
- Login คืน **JWT token** → frontend เก็บไว้แนบทุก request
- Middleware ตรวจ token ทุก API + เช็ค role ก่อนให้แก้ไข
- ย้าย secret/DB credential ไปเป็น environment variables ทั้งหมด

---

## 5. แผนการทำเป็นเฟส

### Phase 1 — รากฐาน (Backend + Auth)  ✅ เสร็จแล้ว
1. ✅ Scaffold `server/` + ชั้นเก็บข้อมูล store (JSON ชั่วคราว, สลับ PostgreSQL ได้ภายหลัง)
2. ✅ โครงข้อมูล: `teams`, `users`, `kols`, `projects`, `project_kols`
3. ✅ ระบบ Login: `POST /api/auth/login` → JWT (bcrypt)
4. ✅ Middleware ตรวจ token + role (admin/member)
5. ✅ API: teams / users / kols / projects (+ KOL ใน project) พร้อมสิทธิ์รายทีม
6. ✅ Seed admin + ข้อมูลตัวอย่าง — ทดสอบ login/RBAC/สร้าง project ผ่านหมด

### Phase 2 — Frontend Dashboard  ✅ เสร็จแล้ว
1. ✅ Scaffold `client/` (React + Vite) + proxy /api ไป backend
2. ✅ หน้า Login (โทนชมพู-ม่วง) + เก็บ token (localStorage) + route guard
3. ✅ Layout หลัก (Sidebar + ข้อมูลผู้ใช้ + ออกจากระบบ)
4. ✅ หน้า Dashboard ภาพรวม (การ์ดสรุป KOL/Project/ทีม)
5. ✅ หน้า KOL ส่วนกลาง (ตาราง + ค้นหา) และ Projects (การ์ด + สร้าง Project ผ่าน modal)
6. ✅ แสดงข้อมูลตาม Role (admin เห็น Project ทุกทีม / member เห็นเฉพาะทีม)
7. ✅ ทดสอบผ่านเบราว์เซอร์จริงครบ: login → dashboard → สร้าง project → ตาราง KOL (ไม่มี error)

### Phase 2.1 — เพิ่มฟีเจอร์ + ปรับดีไซน์  ✅ เสร็จแล้ว
ดีไซน์:
1. ✅ เปลี่ยนธีมเป็น **เขียวมิ้นสดชื่น**
2. ✅ ไอคอนเมนูเป็น **SVG** (แทน emoji) สวยคมขึ้น
3. ✅ การ์ดสรุปมี **กราฟแท่งเล็ก** (KOL แยกแพลตฟอร์ม / Project แยกสถานะ / สมาชิกต่อทีม)

ฟีเจอร์:
4. ✅ หน้า **ผู้ใช้งาน** (admin) — เพิ่ม/แก้/ลบ, กำหนด role + ทีม
5. ✅ หน้า **ทีม** (admin) — เพิ่ม/แก้/ลบ
6. ✅ **เพิ่ม/แก้/ลบ KOL** ส่วนกลางผ่านหน้าจอ (admin)
7. ✅ หน้า **รายละเอียด Project** + **เพิ่ม/เอา KOL ออกจาก Project**
8. ✅ ทดสอบจริง: สร้าง user, เปิด project detail, เพิ่ม KOL เข้า project — ผ่านหมด

### Phase 2.2 — หน้า Dashboard Overview (ตามแบบที่นายหญิงต้องการ)  ✅ เสร็จแล้ว
1. ✅ เลย์เอาต์ใหม่: หัวข้อ + ตัวกรองวันที่ + dropdown Campaign + ชิปแบรนด์
2. ✅ ตัวกรอง**ทำงานจริงทุกตัว**: แบรนด์ / ช่วงวันที่ / Campaign (Campaign = Project)
3. ✅ การ์ดสรุป 4 ใบ: TOTAL KOLS, TOTAL BUDGET, AVG COST/KOL, PLATFORMS
4. ✅ การ์ดแยกแพลตฟอร์ม 4 ใบ (TikTok/Instagram/Facebook/Lemon8): KOLS COUNT, Views, Engagement, Avg Cost
5. ✅ เพิ่มช่อง `views` ใน project_kols (schema + store + route)
6. ✅ endpoint `/api/stats/dashboard` คำนวณตามตัวกรอง + เคารพสิทธิ์ทีม
7. ✅ seed ข้อมูลตัวอย่างครบ 6 แบรนด์ / 4 แพลตฟอร์ม (มี fee + views + วันที่)
8. ✅ ทดสอบจริง: กรองแบรนด์/วันที่/ทีม ตัวเลขเปลี่ยนถูกต้อง (แก้บั๊ก timezone ช่วงวันที่แล้ว)

> แบรนด์: Jula's Herb, Jdent, Jarvit, Beauterry, JNIS, Dermiq (ตามระบบเดิม js/config.js)

### Phase 2.3 — ฟอร์มสร้างแคมเปญ (ตามแบบที่นายหญิงต้องการ)  ✅ เสร็จแล้ว
1. ✅ ฟอร์มใหม่: ชื่อแคมเปญ, Brand (dropdown), Objective, Product (หลายตัว + เพิ่มเอง),
   Owner (dropdown รายชื่อผู้ใช้), Budget (THB), Period เริ่ม-จบ
2. ✅ เพิ่มฟิลด์ใน projects: `objective`, `products[]`, `owner` (schema + store + route)
3. ✅ endpoint `/api/users/options` (รายชื่อสำหรับ dropdown Owner — ทุก role เรียกได้)
4. ✅ หน้ารายละเอียด Project แสดง Brand/Owner/ช่วงเวลา/Objective/Products
5. ✅ ทดสอบจริงผ่าน UI: สร้าง "JNIS – Vitamin Boost" ครบทุกฟิลด์ (ภาษาไทยถูกต้อง)

### Phase 2.4 — แถบ "รอบทำจ่ายเอเจนซี่" (admin เท่านั้น)  ✅ เสร็จแล้ว
1. ✅ เมนูใหม่ "รอบทำจ่าย" (โชว์เฉพาะ admin + route guard admin)
2. ✅ แสดง Project ทุกอันเป็นการ์ด พร้อมช่อง: ชื่อเอเจนซี่, รอบวันที่ทำจ่าย, สถานะการจ่าย
3. ✅ อัปโหลด **ใบเสนอราคา** + **ใบแจ้งหนี้** (PDF/รูป, สูงสุด 15MB) — ใช้ multer
4. ✅ สถานะ: ยังไม่เริ่ม / รอเอกสาร / รอตรวจสอบ / รอทำจ่าย / จ่ายแล้ว
5. ✅ ข้อมูล + ไฟล์ เห็น/แก้ได้เฉพาะ admin (member โดน 403 ทั้ง API และ route)
6. ✅ ไฟล์เก็บที่ server/uploads/ (gitignored) + ดาวน์โหลดผ่าน endpoint ที่ตรวจสิทธิ์
7. ✅ ทดสอบจริง: list/update/upload/download ผ่านหมด, RBAC ถูกต้อง

> เพิ่ม dependency: multer (จัดการไฟล์อัปโหลด)

### Phase 2.5 — จัดหน้า Overview เต็มเฟรม + Widget เชิงลึก  ✅ เสร็จแล้ว
1. ✅ ปลดล็อกความกว้าง (เดิมจำกัด 1200px) → เต็มเฟรม, การ์ด 4 คอลัมน์บนจอกว้าง (responsive 2/1 คอลัมน์)
2. ✅ Widget: **งบที่ใช้ vs ตั้งไว้** (แถบความคืบหน้า) + **CPM/CPE** + ยอดวิวรวม
3. ✅ Widget: **เปรียบเทียบงบตามแบรนด์** (กราฟแท่งแนวนอน + จำนวน KOL)
4. ✅ Widget: **Top KOLs** (ตารางจัดอันดับตามยอดวิว)
5. ✅ คำนวณทั้งหมดจากข้อมูลจริง เคารพตัวกรอง (แบรนด์/วันที่/campaign) + สิทธิ์ทีม
6. ✅ ทดสอบจริง: ทุก widget แสดงผลถูกต้อง (งบ 32%, CPM ฿109, Top KOLs, งบ 5 แบรนด์)

### Phase 2.6 — ฟอร์มแคมเปญ: รายละเอียด + บรีฟ  ✅ เสร็จแล้ว
1. ✅ เปลี่ยน label "Objective" → "รายละเอียดแคมเปญ" (ฟอร์ม + หน้ารายละเอียด)
2. ✅ เพิ่มช่อง "บรีฟแคมเปญ": ลิงก์บรีฟ (URL) + อัปโหลดไฟล์บรีฟ (PDF/รูป/Word/PPT สูงสุด 20MB)
3. ✅ เพิ่มฟิลด์ projects: `brief_link`, `brief_file` (schema + store)
4. ✅ endpoint upload/download ไฟล์บรีฟ (สิทธิ์: เจ้าของทีม + admin)
5. ✅ หน้ารายละเอียด Project แสดงลิงก์บรีฟ + ปุ่มเปิดไฟล์บรีฟ
6. ✅ ทดสอบจริง: สร้างแคมเปญ+ลิงก์บรีฟ, อัปโหลด/ดาวน์โหลดไฟล์บรีฟ ผ่านหมด

### Phase 2.7 — แถบงบประมาณ (ฟิลเตอร์เดือน/แบรนด์)  ✅ เสร็จแล้ว
1. ✅ เมนูใหม่ "งบประมาณ" + เปลี่ยน "KOL ส่วนกลาง" → "Influencer / Influencer List"
2. ✅ ฟิลเตอร์**รายเดือน** (เลือกเดือน + ปุ่ม "ดูทุกเดือน") และ**รายแบรนด์** (ชิป)
3. ✅ การ์ดสรุป: งบทั้งหมด / ใช้ไปแล้ว / คงเหลือ / % ใช้ (แถบความคืบหน้า)
4. ✅ ตารางงบตามแบรนด์ + ตารางงบรายแคมเปญ (งบ/ใช้/เหลือ/%)
5. ✅ endpoint `/api/stats/budget` คำนวณจาก fee จริง + เคารพสิทธิ์ทีม
6. ✅ ทดสอบจริง: กรองเดือน/แบรนด์ ตัวเลขปรับถูกต้อง (ก.ค. 1.02M/325K, Jula's 200K/90K)

### Phase 2.8 — เทรนด์งบรายเดือน + แก้ไข Project + เปลี่ยนสถานะ  ✅ เสร็จแล้ว
1. ✅ กราฟเทรนด์งบรายเดือน (12 เดือน, เลือกปีได้) — งบตั้งไว้ vs ใช้จริง + endpoint `/api/stats/budget/trend`
2. ✅ ปุ่ม Export CSV (รายแคมเปญ ตามตัวกรอง) รองรับภาษาไทย (BOM)
3. ✅ แยก `ProjectForm` เป็น component กลาง ใช้ทั้งสร้างและแก้ไข
4. ✅ หน้ารายละเอียด Project: ปุ่ม "แก้ไข" (ฟอร์มเติมข้อมูลเดิม + ช่องสถานะ) + dropdown เปลี่ยนสถานะแบบเร็ว
5. ✅ ทดสอบจริง: เทรนด์แสดง 12 เดือน, เปิดฟอร์มแก้ไขข้อมูลครบ, เปลี่ยนสถานะผ่าน API ได้

### Phase 2.9 — หน้างบ: เน้นงบที่ใช้ไป + CPM/CPE  ✅ เสร็จแล้ว
1. ✅ การ์ดสรุปเหลือ 3: งบที่ใช้ไป + CPM + CPE (เอา งบทั้งหมด/คงเหลือ/% ออก)
2. ✅ ตารางแบรนด์/แคมเปญ เปลี่ยนคอลัมน์เป็น: ใช้ไป / ยอดวิว / CPM / CPE
3. ✅ เทรนด์รายเดือน = แท่ง "งบที่ใช้ไป" + tooltip โชว์ CPM/CPE ต่อเดือน
4. ✅ CPM/CPE คำนวณทุกระดับ (รวม/แบรนด์/แคมเปญ/เดือน) จาก fee + views + engagement
5. ✅ Export CSV ปรับคอลัมน์เป็น ใช้ไป/ยอดวิว/CPM/CPE
6. ✅ ทดสอบจริง: Jul spent 325K CPM฿109 CPE฿3, Jdent คุ้มสุด CPM฿91

### Phase 3 — Deploy
1. เลือก host (Railway / Render)
2. ตั้ง PostgreSQL managed + env vars + HTTPS
3. Build client + serve ผ่าน server

---

## 6. ค้างไว้ / รอนายหญิงสั่ง

- [ ] **PostgreSQL** — รหัสผ่าน user `postgres` บน `72.60.208.102` ใน `.env` เดิมใช้ไม่ได้แล้ว
      (server เข้าถึงได้ แต่ auth ไม่ผ่าน) → เมื่อได้รหัสใหม่ ค่อยสร้าง `pgStore.js` + สลับ `DATA_DRIVER=postgres`
- [ ] **Phase 2 (Frontend React + Vite)** — รอไฟเขียวเริ่ม
