-- ============================================================
-- KOL Central Dashboard v2 — Database Schema (kol_v2)
-- ============================================================
-- แนวคิด:
--   • kols       = ข้อมูล KOL "ส่วนกลาง" ทุกทีมเห็นเหมือนกัน
--   • teams      = ทีมต่าง ๆ
--   • users      = ผู้ใช้ (สังกัดทีม + มี role)
--   • projects   = แต่ละทีมสร้าง Project ของตัวเอง
--   • project_kols = KOL ที่ถูกหยิบเข้ามาใน Project (พร้อมข้อมูลเฉพาะงาน)
-- ============================================================

-- ---------- teams ----------
CREATE TABLE IF NOT EXISTS teams (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------- users ----------
-- role: 'admin'  = ดูแลระบบทั้งหมด, จัดการ user/team, แก้ KOL ส่วนกลาง
--       'member' = สร้าง/แก้ Project ของทีมตัวเอง, ดู KOL ส่วนกลาง
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255),
    role          VARCHAR(20) NOT NULL DEFAULT 'member'
                  CHECK (role IN ('admin', 'member')),
    team_id       INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_team ON users(team_id);

-- ---------- kols (ส่วนกลาง) ----------
CREATE TABLE IF NOT EXISTS kols (
    id              SERIAL PRIMARY KEY,
    kol_code        VARCHAR(255) UNIQUE,
    name            VARCHAR(255) NOT NULL,
    username        VARCHAR(255),
    platform        VARCHAR(100),
    avatar          TEXT,
    followers       BIGINT DEFAULT 0,
    engagement_rate NUMERIC(6,2),
    category        VARCHAR(100),
    tags            TEXT[],
    contact_info    JSONB,
    extra_data      JSONB,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_kols_name ON kols(name);
CREATE INDEX IF NOT EXISTS idx_kols_platform ON kols(platform);
CREATE INDEX IF NOT EXISTS idx_kols_category ON kols(category);

-- ---------- projects (ของแต่ละทีม) ----------
CREATE TABLE IF NOT EXISTS projects (
    id          SERIAL PRIMARY KEY,
    team_id     INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name        VARCHAR(500) NOT NULL,
    brand       VARCHAR(255),
    objective   TEXT,
    product     VARCHAR(255),
    products    TEXT[],
    owner       VARCHAR(255),
    brief_link  TEXT,
    brief_file  JSONB,
    budget      NUMERIC(15,2) DEFAULT 0,
    start_date  DATE,
    end_date    DATE,
    status      VARCHAR(50) DEFAULT 'Draft'
                CHECK (status IN ('Draft', 'Active', 'Completed', 'Cancelled')),
    description TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_projects_team ON projects(team_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- ---------- project_kols (KOL ในแต่ละ Project) ----------
CREATE TABLE IF NOT EXISTS project_kols (
    id          SERIAL PRIMARY KEY,
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    kol_id      INTEGER NOT NULL REFERENCES kols(id) ON DELETE CASCADE,
    fee         NUMERIC(15,2) DEFAULT 0,
    views       BIGINT DEFAULT 0,
    likes       BIGINT DEFAULT 0,
    comments    BIGINT DEFAULT 0,
    shares      BIGINT DEFAULT 0,
    post_link   TEXT,
    posted_date DATE,
    status      VARCHAR(50) DEFAULT 'Pending',
    notes       TEXT,
    added_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (project_id, kol_id)
);
CREATE INDEX IF NOT EXISTS idx_project_kols_project ON project_kols(project_id);
CREATE INDEX IF NOT EXISTS idx_project_kols_kol ON project_kols(kol_id);

-- ---------- trigger: อัปเดต updated_at อัตโนมัติ ----------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_teams_updated ON teams;
CREATE TRIGGER trg_teams_updated BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated ON users;
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_kols_updated ON kols;
CREATE TRIGGER trg_kols_updated BEFORE UPDATE ON kols
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_projects_updated ON projects;
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
