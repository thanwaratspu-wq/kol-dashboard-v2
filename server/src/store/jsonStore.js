/**
 * ที่เก็บข้อมูลชั่วคราวแบบไฟล์ JSON (ใช้ระหว่างยังไม่ขึ้น PostgreSQL)
 * - เก็บทุกอย่างไว้ที่ data/db.json
 * - ออกแบบ interface ให้เหมือน repository เพื่อสลับไป PostgreSQL ภายหลังได้ง่าย
 * - method เป็น async ทั้งหมด (ให้ signature ตรงกับเวอร์ชัน DB จริง)
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

const EMPTY = {
    _seq: { teams: 0, users: 0, kols: 0, projects: 0, project_kols: 0, payments: 0, activity_logs: 0, submissions: 0, rate_requests: 0 },
    teams: [], users: [], kols: [], projects: [], project_kols: [], payments: [], activity_logs: [], submissions: [], rate_requests: []
};

function load() {
    try {
        if (!fs.existsSync(DATA_FILE)) return structuredClone(EMPTY);
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        // เติม key ที่อาจยังไม่มีในไฟล์เดิม (รองรับ schema เพิ่มภายหลัง)
        data._seq = data._seq || {};
        for (const k of Object.keys(EMPTY)) {
            if (k === '_seq') continue;
            if (!data[k]) data[k] = [];
        }
        for (const k of Object.keys(EMPTY._seq)) {
            if (data._seq[k] == null) data._seq[k] = 0;
        }
        return data;
    } catch (err) {
        console.error('⚠️  อ่าน db.json ไม่ได้ ใช้ค่าว่างแทน:', err.message);
        return structuredClone(EMPTY);
    }
}

let db = load();

function persist() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
}

function nextId(coll) {
    db._seq[coll] = (db._seq[coll] || 0) + 1;
    return db._seq[coll];
}

const clone = (v) => (v === undefined ? undefined : structuredClone(v));
const now = () => new Date().toISOString();

// จำลอง error รหัส '23505' (unique violation) ให้ route จัดการเหมือน PostgreSQL
function duplicateError(msg) {
    const e = new Error(msg || 'duplicate key value violates unique constraint');
    e.code = '23505';
    return e;
}

// ============================ teams ============================
const teams = {
    async listWithMemberCount() {
        return db.teams
            .map(t => ({ ...t, member_count: db.users.filter(u => u.team_id === t.id).length }))
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(clone);
    },
    async findById(id) {
        return clone(db.teams.find(t => t.id === Number(id)) || null);
    },
    async create({ name, description }) {
        if (db.teams.some(t => t.name === name)) throw duplicateError('มีชื่อทีมนี้อยู่แล้ว');
        const row = { id: nextId('teams'), name, description: description || null, created_at: now(), updated_at: now() };
        db.teams.push(row); persist();
        return clone(row);
    },
    async update(id, { name, description }) {
        const t = db.teams.find(t => t.id === Number(id));
        if (!t) return null;
        if (name != null) t.name = name;
        if (description != null) t.description = description;
        t.updated_at = now(); persist();
        return clone(t);
    },
    async remove(id) {
        const idx = db.teams.findIndex(t => t.id === Number(id));
        if (idx === -1) return false;
        db.teams.splice(idx, 1);
        // users.team_id -> null (ON DELETE SET NULL)
        db.users.forEach(u => { if (u.team_id === Number(id)) u.team_id = null; });
        // projects ของทีมนี้ถูกลบ (ON DELETE CASCADE) พร้อม project_kols
        const removedProjects = db.projects.filter(p => p.team_id === Number(id)).map(p => p.id);
        db.projects = db.projects.filter(p => p.team_id !== Number(id));
        db.project_kols = db.project_kols.filter(pk => !removedProjects.includes(pk.project_id));
        persist();
        return true;
    }
};

// ============================ users ============================
function attachTeamName(u) {
    const team = db.teams.find(t => t.id === u.team_id);
    return { ...u, team_name: team ? team.name : null };
}

const users = {
    async findByUsername(username) {
        const u = db.users.find(u => u.username === username);
        return u ? clone(attachTeamName(u)) : null;
    },
    async findById(id) {
        const u = db.users.find(u => u.id === Number(id));
        return u ? clone(attachTeamName(u)) : null;
    },
    async listWithTeam() {
        return db.users
            .slice()
            .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
            .map(u => {
                const { password_hash, ...safe } = attachTeamName(u);
                return clone(safe);
            });
    },
    async create({ username, password_hash, full_name, role, team_id }) {
        if (db.users.some(u => u.username === username)) throw duplicateError('มี username นี้อยู่แล้ว');
        const row = {
            id: nextId('users'), username, password_hash,
            full_name: full_name || null, role: role || 'member',
            team_id: team_id || null, is_active: true, created_at: now(), updated_at: now()
        };
        db.users.push(row); persist();
        const { password_hash: _, ...safe } = row;
        return clone(safe);
    },
    async update(id, fields) {
        const u = db.users.find(u => u.id === Number(id));
        if (!u) return null;
        for (const key of ['full_name', 'role', 'team_id', 'is_active', 'password_hash']) {
            if (fields[key] !== undefined && fields[key] !== null) u[key] = fields[key];
        }
        u.updated_at = now(); persist();
        const { password_hash, ...safe } = u;
        return clone(safe);
    },
    async remove(id) {
        const idx = db.users.findIndex(u => u.id === Number(id));
        if (idx === -1) return false;
        db.users.splice(idx, 1); persist();
        return true;
    }
};

// ============================ kols ============================
const kols = {
    async list({ search, platform, category, limit = 100, offset = 0 } = {}) {
        let rows = db.kols.slice();
        if (search) {
            const s = search.toLowerCase();
            rows = rows.filter(k =>
                (k.name || '').toLowerCase().includes(s) ||
                (k.username || '').toLowerCase().includes(s));
        }
        if (platform) rows = rows.filter(k => k.platform === platform);
        if (category) rows = rows.filter(k => k.category === category);
        rows.sort((a, b) => (Number(b.followers) || 0) - (Number(a.followers) || 0));
        return rows.slice(Number(offset), Number(offset) + Number(limit)).map(clone);
    },
    async findById(id) {
        return clone(db.kols.find(k => k.id === Number(id)) || null);
    },
    async create(fields) {
        if (fields.kol_code && db.kols.some(k => k.kol_code === fields.kol_code)) {
            throw duplicateError('มี kol_code นี้อยู่แล้ว');
        }
        const row = {
            id: nextId('kols'),
            kol_code: fields.kol_code || null, name: fields.name,
            username: fields.username || null, platform: fields.platform || null,
            avatar: fields.avatar || null, followers: fields.followers || 0,
            engagement_rate: fields.engagement_rate ?? null, category: fields.category || null,
            tags: fields.tags || null, contact_info: fields.contact_info || null,
            extra_data: fields.extra_data || null, created_at: now(), updated_at: now()
        };
        db.kols.push(row); persist();
        return clone(row);
    },
    async update(id, fields) {
        const k = db.kols.find(k => k.id === Number(id));
        if (!k) return null;
        for (const key of ['kol_code', 'name', 'username', 'platform', 'avatar', 'followers',
            'engagement_rate', 'category', 'tags', 'contact_info', 'extra_data']) {
            if (fields[key] !== undefined && fields[key] !== null) k[key] = fields[key];
        }
        k.updated_at = now(); persist();
        return clone(k);
    },
    async remove(id) {
        const idx = db.kols.findIndex(k => k.id === Number(id));
        if (idx === -1) return false;
        db.kols.splice(idx, 1);
        db.project_kols = db.project_kols.filter(pk => pk.kol_id !== Number(id));
        persist();
        return true;
    },
    async count() { return db.kols.length; },

    // ดึง Influencer ที่ "ถูกใช้ในแคมเปญ" — รวมชื่อซ้ำเป็นรายเดียว + แนบแคมเปญ (ผลงาน) แต่ละอัน
    // scopeTeamId = null (admin เห็นทุกทีม) หรือเลข team_id (member เห็นเฉพาะแคมเปญทีมตัวเอง)
    async usedWithCampaigns(scopeTeamId = null) {
        let projs = db.projects;
        if (scopeTeamId != null) projs = projs.filter(p => p.team_id === Number(scopeTeamId));
        const projById = {};
        projs.forEach(p => { projById[p.id] = p; });
        const projIds = new Set(projs.map(p => p.id));

        const byKol = {};
        db.project_kols
            .filter(pk => projIds.has(pk.project_id))
            .forEach(pk => {
                if (!byKol[pk.kol_id]) byKol[pk.kol_id] = [];
                const p = projById[pk.project_id];
                const team = db.teams.find(t => t.id === p.team_id);
                byKol[pk.kol_id].push({
                    project_id: p.id, project_name: p.name, brand: p.brand,
                    team_name: team ? team.name : null, status: pk.status,
                    fee: pk.fee, views: pk.views, link_id: pk.id
                });
            });

        return Object.entries(byKol).map(([kolId, usages]) => {
            const k = db.kols.find(x => x.id === Number(kolId)) || { id: Number(kolId) };
            return clone({ ...k, usages, campaign_count: usages.length });
        }).sort((a, b) => (Number(b.followers) || 0) - (Number(a.followers) || 0));
    },

    // รายละเอียด Influencer 1 คน + ประวัติการใช้งานในแคมเปญ (งบ/วิว/ลิงก์ผลงาน/วันที่ลงงาน)
    async detailWithUsages(kolId, scopeTeamId = null) {
        const k = db.kols.find(x => x.id === Number(kolId));
        if (!k) return null;
        let projs = db.projects;
        if (scopeTeamId != null) projs = projs.filter(p => p.team_id === Number(scopeTeamId));
        const projById = {};
        projs.forEach(p => { projById[p.id] = p; });
        const projIds = new Set(projs.map(p => p.id));

        const usages = db.project_kols
            .filter(pk => pk.kol_id === Number(kolId) && projIds.has(pk.project_id))
            .map(pk => {
                const p = projById[pk.project_id];
                const team = db.teams.find(t => t.id === p.team_id);
                return {
                    link_id: pk.id, project_id: p.id, project_name: p.name, brand: p.brand,
                    team_name: team ? team.name : null, fee: pk.fee, views: pk.views,
                    likes: pk.likes || 0, comments: pk.comments || 0, shares: pk.shares || 0,
                    post_link: pk.post_link || null, posted_date: pk.posted_date || null,
                    status: pk.status, notes: pk.notes || null
                };
            })
            .sort((a, b) => (b.posted_date || '').localeCompare(a.posted_date || ''));

        return clone({ ...k, usages });
    },

    // จำนวน KOL แยกตามแพลตฟอร์ม (สำหรับกราฟเล็ก)
    async platformCounts() {
        const map = {};
        db.kols.forEach(k => { const p = k.platform || 'อื่นๆ'; map[p] = (map[p] || 0) + 1; });
        return Object.entries(map).map(([label, value]) => ({ label, value }));
    },

    // KOL Analytics — รวม KOL ที่คัดเลือกแล้วจากทุกแคมเปญ (ตามสิทธิ์ทีม)
    async analytics(scopeTeamId = null) {
        const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        let projs = db.projects;
        if (scopeTeamId != null) projs = projs.filter(p => p.team_id === Number(scopeTeamId));
        const projById = {};
        projs.forEach(p => { projById[p.id] = p; });
        const projIds = new Set(projs.map(p => p.id));
        const today = new Date();

        const rows = db.submissions
            .filter(s => s.status === 'confirmed' && projIds.has(s.project_id))
            .map(s => {
                const p = projById[s.project_id];
                const refDate = s.post_date || s.gen_date || (p ? p.start_date : null);
                let month = null, year = null;
                if (refDate) { const [y, m] = refDate.split('-').map(Number); month = MONTHS_EN[m - 1]; year = y; }
                const days = Number(s.code_expire) || 0;
                // วันที่เริ่ม Gen = วันยิงแอด (ad_end จากหน้า Ads) ถ้ามี, ถ้ายังไม่ยิงค่อยใช้ค่าที่กรอกเอง
                const genStart = s.ad_end || s.gen_date || null;
                // Day Left = จำนวนวัน Gencode ที่เหลือ = (วันที่ลงงาน + Days) − วันนี้ (นับจากวันที่ลงงาน)
                let day_left = null;
                if (s.post_date && days) {
                    const expire = new Date(s.post_date + 'T00:00:00').getTime() + days * 86400000;
                    day_left = Math.ceil((expire - today.getTime()) / 86400000);
                }
                return {
                    sub_id: s.id, project_id: s.project_id, project_name: p ? p.name : null,
                    brand: p ? (p.brand || null) : null, month, year,
                    product: s.product || null, kol_name: s.account_name, link_account: s.link_account || null,
                    concept: s.concept || null, platform: s.platform || null,
                    owner: p ? (p.owner || null) : null, agency: s.agency || null,
                    cost: Number(s.budget) || 0,
                    post_date: s.post_date || null, gen_date: genStart, days, day_left,
                    post_url: s.post_url || null, gencode: s.gencode || null, id_post: s.id_post || null
                };
            })
            .sort((a, b) => (b.post_date || '').localeCompare(a.post_date || ''));

        const budget = rows.reduce((a, r) => a + r.cost, 0);
        return clone({ summary: { total_kols: rows.length, budget, avg_engagement: 0 }, rows });
    }
};

// ============================ projects ============================
function enrichProject(p) {
    const team = db.teams.find(t => t.id === p.team_id);
    const creator = db.users.find(u => u.id === p.created_by);
    const editor = db.users.find(u => u.id === p.updated_by);
    const kol_count = db.project_kols.filter(pk => pk.project_id === p.id).length;
    const subs = db.submissions.filter(s => s.project_id === p.id);
    const sub_confirmed = subs.filter(s => s.status === 'confirmed').length;
    return {
        ...p,
        team_name: team ? team.name : null,
        created_by_name: creator ? (creator.full_name || creator.username) : null,
        updated_by_name: editor ? (editor.full_name || editor.username) : null,
        kol_count,
        sub_count: subs.length,
        sub_confirmed
    };
}

const projects = {
    // scopeTeamId = null (admin เห็นหมด) หรือเลข team_id (member เห็นเฉพาะทีมตัวเอง)
    async list(scopeTeamId = null) {
        let rows = db.projects.slice();
        if (scopeTeamId != null) rows = rows.filter(p => p.team_id === Number(scopeTeamId));
        rows.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
        return rows.map(p => clone(enrichProject(p)));
    },
    async findTeamId(id) {
        const p = db.projects.find(p => p.id === Number(id));
        return p ? p.team_id : undefined;
    },
    async findByIdFull(id) {
        const p = db.projects.find(p => p.id === Number(id));
        if (!p) return null;
        const enriched = enrichProject(p);
        const kolsInProject = db.project_kols
            .filter(pk => pk.project_id === p.id)
            .sort((a, b) => (a.added_at || '').localeCompare(b.added_at || ''))
            .map(pk => {
                const kol = db.kols.find(k => k.id === pk.kol_id) || {};
                return { link_id: pk.id, fee: pk.fee, status: pk.status, notes: pk.notes, added_at: pk.added_at, ...kol };
            });
        return clone({ ...enriched, kols: kolsInProject });
    },
    async create(fields) {
        const row = {
            id: nextId('projects'),
            team_id: fields.team_id, created_by: fields.created_by,
            name: fields.name, brand: fields.brand || null,
            objective: fields.objective || null,
            product: fields.product || null,
            products: Array.isArray(fields.products) ? fields.products : [],
            ad_groups: Array.isArray(fields.ad_groups) ? fields.ad_groups : [],
            owner: fields.owner || null,
            brief_link: fields.brief_link || null,
            brief_file: fields.brief_file || null,
            product_briefs: fields.product_briefs || {},   // บรีฟต่อสินค้า { code: { link, file } }
            platform_briefs: fields.platform_briefs || {}, // บรีฟหลักต่อ Platform { platform: { link, file } }
            platform_budgets: fields.platform_budgets || {}, // งบต่อ Platform { platform: number }
            kol_target: fields.kol_target || 0,
            budget: fields.budget || 0, start_date: fields.start_date || null,
            end_date: fields.end_date || null, status: fields.status || 'Draft',
            description: fields.description || null, created_at: now(), updated_at: now()
        };
        db.projects.push(row); persist();
        return clone(row);
    },
    async update(id, fields) {
        const p = db.projects.find(p => p.id === Number(id));
        if (!p) return null;
        for (const key of ['name', 'brand', 'objective', 'product', 'products', 'ad_groups', 'owner', 'brief_link', 'product_briefs', 'platform_briefs', 'platform_budgets', 'kol_target', 'budget', 'start_date', 'end_date', 'status', 'description', 'updated_by']) {
            if (fields[key] !== undefined && fields[key] !== null) p[key] = fields[key];
        }
        p.updated_at = now(); persist();
        return clone(p);
    },
    // บันทึกไฟล์บรีฟของสินค้าหนึ่งตัว (เก็บใน product_briefs[code].file)
    async setProductBriefFile(id, code, meta) {
        const p = db.projects.find(p => p.id === Number(id));
        if (!p) return null;
        if (!p.product_briefs || typeof p.product_briefs !== 'object') p.product_briefs = {};
        const cur = p.product_briefs[code] || {};
        p.product_briefs[code] = { link: cur.link || null, file: meta };
        p.updated_at = now(); persist();
        return clone(p.product_briefs[code]);
    },
    // บันทึกไฟล์บรีฟหลักของ Platform หนึ่งตัว (เก็บใน platform_briefs[platform].file)
    async setPlatformBriefFile(id, platform, meta) {
        const p = db.projects.find(p => p.id === Number(id));
        if (!p) return null;
        if (!p.platform_briefs || typeof p.platform_briefs !== 'object') p.platform_briefs = {};
        const cur = p.platform_briefs[platform] || {};
        p.platform_briefs[platform] = { link: cur.link || null, file: meta };
        p.updated_at = now(); persist();
        return clone(p.platform_briefs[platform]);
    },
    async remove(id) {
        const idx = db.projects.findIndex(p => p.id === Number(id));
        if (idx === -1) return false;
        db.projects.splice(idx, 1);
        db.project_kols = db.project_kols.filter(pk => pk.project_id !== Number(id));
        persist();
        return true;
    },
    // ลิงก์แชร์ให้ Agency (สร้างถ้ายังไม่มี)
    async setShareToken(id, token) {
        const p = db.projects.find(p => p.id === Number(id));
        if (!p) return null;
        if (!p.share_token) { p.share_token = token; persist(); }
        return p.share_token;
    },
    async findByToken(token) {
        const p = db.projects.find(p => p.share_token === token);
        return p ? clone(p) : null;
    },
    // ===== ลิงก์เอเจนซี่แบบแยกต่อเจ้า (แต่ละเจ้าเห็นเฉพาะ KOL ของตัวเอง) =====
    async addAgencyLink(id, name, token, opts = {}) {
        const p = db.projects.find(p => p.id === Number(id));
        if (!p) return null;
        if (!Array.isArray(p.agency_links)) p.agency_links = [];
        const link = {
            token,
            name: (name && String(name).trim()) || `เอเจนซี่ ${p.agency_links.length + 1}`,
            products: Array.isArray(opts.products) ? opts.products : [],   // สินค้าที่รับผิดชอบ
            platforms: Array.isArray(opts.platforms) ? opts.platforms : [], // Platform ที่รับผิดชอบ
            kol_count: Number(opts.kol_count) || 0,                         // จำนวน KOL ที่ต้องส่ง
            created_at: now()
        };
        p.agency_links.push(link);
        persist();
        return clone(link);
    },
    async listAgencyLinks(id) {
        const p = db.projects.find(p => p.id === Number(id));
        return p && Array.isArray(p.agency_links) ? p.agency_links.map(clone) : [];
    },
    async removeAgencyLink(id, token) {
        const p = db.projects.find(p => p.id === Number(id));
        if (!p || !Array.isArray(p.agency_links)) return false;
        const before = p.agency_links.length;
        p.agency_links = p.agency_links.filter(l => l.token !== token);
        persist();
        return p.agency_links.length < before;
    },
    // resolve token → { project, link }; link.scoped=true = ลิงก์แยกต่อเจ้า (กรองเฉพาะของตัวเอง)
    async resolveToken(token) {
        for (const p of db.projects) {
            if (Array.isArray(p.agency_links)) {
                const link = p.agency_links.find(l => l.token === token);
                if (link) return { project: clone(p), link: { token: link.token, name: link.name, products: link.products || [], platforms: link.platforms || [], kol_count: link.kol_count || 0, scoped: true } };
            }
        }
        const p = db.projects.find(p => p.share_token === token);   // ลิงก์รวมเดิม → เห็นทั้งหมด (backward compat)
        if (p) return { project: clone(p), link: { token, name: null, products: [], platforms: [], kol_count: 0, scoped: false } };
        return null;
    },
    // บันทึกไฟล์บรีฟ
    async setBriefFile(id, meta) {
        const p = db.projects.find(p => p.id === Number(id));
        if (!p) return null;
        p.brief_file = meta;
        p.updated_at = now();
        persist();
        return clone(p);
    },
    async count(scopeTeamId = null) {
        if (scopeTeamId == null) return db.projects.length;
        return db.projects.filter(p => p.team_id === Number(scopeTeamId)).length;
    },
    // จำนวน Project แยกตามสถานะ (สำหรับกราฟเล็ก)
    async statusCounts(scopeTeamId = null) {
        let rows = db.projects;
        if (scopeTeamId != null) rows = rows.filter(p => p.team_id === Number(scopeTeamId));
        const order = ['Draft', 'Active', 'Completed', 'Cancelled'];
        const map = {};
        rows.forEach(p => { map[p.status] = (map[p.status] || 0) + 1; });
        return order.map(s => ({ label: s, value: map[s] || 0 }));
    }
};

// ============================ project_kols ============================
const projectKols = {
    async add({ project_id, kol_id, fee, views, likes, comments, shares, post_link, posted_date, status, notes }) {
        const exists = db.project_kols.some(pk => pk.project_id === Number(project_id) && pk.kol_id === Number(kol_id));
        if (exists) throw duplicateError('KOL นี้อยู่ใน Project แล้ว');
        const row = {
            id: nextId('project_kols'), project_id: Number(project_id), kol_id: Number(kol_id),
            fee: fee || 0, views: views || 0, likes: likes || 0, comments: comments || 0, shares: shares || 0,
            post_link: post_link || null, posted_date: posted_date || null,
            status: status || 'Pending', notes: notes || null, added_at: now()
        };
        db.project_kols.push(row); persist();
        return clone(row);
    },
    // แก้ข้อมูลการใช้งาน KOL ในแคมเปญ (งบ/วิว/engagement/ลิงก์ผลงาน/วันที่ลงงาน/สถานะ)
    async update(linkId, projectId, fields) {
        const pk = db.project_kols.find(x => x.id === Number(linkId) && x.project_id === Number(projectId));
        if (!pk) return null;
        for (const key of ['fee', 'views', 'likes', 'comments', 'shares', 'post_link', 'posted_date', 'status', 'notes']) {
            if (fields[key] !== undefined) pk[key] = fields[key];
        }
        persist();
        return clone(pk);
    },
    async remove(linkId, projectId) {
        const idx = db.project_kols.findIndex(pk => pk.id === Number(linkId) && pk.project_id === Number(projectId));
        if (idx === -1) return false;
        db.project_kols.splice(idx, 1); persist();
        return true;
    }
};

// ============================ misc ============================
// จำนวนสมาชิกแต่ละทีม (สำหรับกราฟเล็ก)
teams.memberCounts = async function () {
    return db.teams.map(t => ({
        label: t.name,
        value: db.users.filter(u => u.team_id === t.id).length
    }));
};

// ============================ dashboard (สรุปตามตัวกรอง) ============================
const dashboard = {
    // filters: { scopeTeamId, brand, from, to, projectId }
    async overview(filters = {}) {
        const { scopeTeamId = null, brand, from, to, projectId } = filters;

        // 1) คัดกรอง projects ตามสิทธิ์ + ตัวกรอง (แบรนด์/แคมเปญ) — ไม่กรองด้วยวันที่ตรงนี้ (ไปกรองที่ตัว KOL แทน)
        let projects = db.projects.slice();
        if (scopeTeamId != null) projects = projects.filter(p => p.team_id === Number(scopeTeamId));
        if (brand) projects = projects.filter(p => p.brand === brand);
        if (projectId) projects = projects.filter(p => p.id === Number(projectId));

        const projectIds = new Set(projects.map(p => p.id));
        const projById = {}; projects.forEach(p => { projById[p.id] = p; });

        // 2) KOL ที่คัดเลือกแล้ว (จาก submissions = ข้อมูลจริงที่เอเจนซี่ส่ง/ทีมคัดเลือก)
        //    ช่วงเวลา: กรองตามวันลงงาน (post_date) ถ้ามี — ยังไม่ลงงาน = นับรวม (คอมมิตแล้ว)
        const inRange = s => {
            const d = s.post_date;
            if (!d) return true;
            if (from && d < from) return false;
            if (to && d > to) return false;
            return true;
        };
        const subs = db.submissions.filter(s => s.status === 'confirmed' && projectIds.has(s.project_id) && inRange(s));

        // 3) ตัวเลขรวม
        const totalBudget = projects.reduce((s, p) => s + (Number(p.budget) || 0), 0);   // งบที่วางไว้รวม
        const totalFee = subs.reduce((a, s) => a + (Number(s.budget) || 0), 0);           // ค่าใช้จ่ายจริงของ KOL
        const totalKols = subs.length;
        const avgCostPerKol = totalKols > 0 ? Math.round(totalFee / totalKols) : 0;
        const totalViews = subs.reduce((a, s) => a + (Number(s.ad_reach) || 0), 0);       // ยอดวิว = Reach จากแอด

        // 4) แยกตามแพลตฟอร์ม
        const byPlatform = {};
        subs.forEach(s => {
            const p = s.platform || 'อื่นๆ';
            if (!byPlatform[p]) byPlatform[p] = { platform: p, count: 0, views: 0, feeSum: 0 };
            const b = byPlatform[p];
            b.count += 1; b.views += Number(s.ad_reach) || 0; b.feeSum += Number(s.budget) || 0;
        });
        const platforms = Object.values(byPlatform).map(b => ({
            platform: b.platform, kols_count: b.count, views: b.views,
            engagement: null, avg_cost: b.count ? Math.round(b.feeSum / b.count) : 0
        }));
        const platformSet = new Set(subs.map(s => s.platform).filter(Boolean));

        // 5) ตัวชี้วัดความคุ้มค่า
        const cpm = totalViews > 0 ? Math.round(totalFee / (totalViews / 1000)) : 0;
        const cpe = 0; // ยังไม่มีข้อมูล engagement ราย KOL จาก submissions

        // 6) Top KOLs (เรียงตามยอดวิว/Reach)
        const topKols = [...subs]
            .sort((a, b) => (Number(b.ad_reach) || 0) - (Number(a.ad_reach) || 0))
            .slice(0, 5)
            .map(s => ({
                kol_id: s.id, name: s.account_name, platform: s.platform || null,
                engagement: null, views: Number(s.ad_reach) || 0, fee: Number(s.budget) || 0
            }));

        // 7) สรุปตามแบรนด์ (งบที่วางไว้ + จำนวน KOL ที่คัดเลือก)
        const brandMap = {};
        projects.forEach(p => {
            const b = p.brand || 'อื่นๆ';
            if (!brandMap[b]) brandMap[b] = { brand: b, budget: 0, projectIds: new Set() };
            brandMap[b].budget += Number(p.budget) || 0;
            brandMap[b].projectIds.add(p.id);
        });
        const brandSummary = Object.values(brandMap).map(b => ({
            brand: b.brand, budget: b.budget,
            kols_count: subs.filter(s => b.projectIds.has(s.project_id)).length
        })).sort((a, b) => b.budget - a.budget);

        // 8) รายการ campaign (project) สำหรับ dropdown — ตามสิทธิ์ (ไม่ผูกกับตัวกรองอื่น)
        let campaignScope = db.projects.slice();
        if (scopeTeamId != null) campaignScope = campaignScope.filter(p => p.team_id === Number(scopeTeamId));
        const campaigns = campaignScope
            .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
            .map(p => ({ id: p.id, name: p.name, brand: p.brand }));

        return {
            total_kols: totalKols,
            total_budget: totalBudget,
            total_spent: totalFee,
            total_views: totalViews,
            avg_cost_per_kol: avgCostPerKol,
            cpm, cpe,
            platform_count: platformSet.size,
            platform_list: [...platformSet],
            platforms,
            top_kols: topKols,
            brand_summary: brandSummary,
            campaigns
        };
    }
};

// ============================ payments (รอบทำจ่ายเอเจนซี่ — admin เท่านั้น) ============================
function findPayment(projectId) {
    return db.payments.find(p => p.project_id === Number(projectId));
}
function ensurePayment(projectId) {
    let pay = findPayment(projectId);
    if (!pay) {
        pay = {
            project_id: Number(projectId), agency_name: null, payment_date: null,
            status: 'รอทำจ่าย', quotation: null, invoice: null, notes: null, updated_at: now()
        };
        db.payments.push(pay);
    }
    return pay;
}

const payments = {
    // รวมทุก Project + ข้อมูลการจ่าย (admin เห็นทุกทีม)
    async listWithProjects() {
        return db.projects
            .slice()
            .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
            .map(p => {
                const team = db.teams.find(t => t.id === p.team_id);
                const pay = findPayment(p.id) || {};
                return clone({
                    project_id: p.id,
                    project_name: p.name,
                    brand: p.brand,
                    budget: p.budget,
                    team_name: team ? team.name : null,
                    agency_name: pay.agency_name || null,
                    payment_date: pay.payment_date || null,
                    status: pay.status || 'รอทำจ่าย',
                    quotation: pay.quotation || null,
                    invoice: pay.invoice || null,
                    notes: pay.notes || null,
                    updated_at: pay.updated_at || null
                });
            });
    },
    async get(projectId) {
        return clone(findPayment(projectId) || null);
    },
    // แก้ข้อมูลข้อความ (ชื่อเอเจนซี่ / รอบวันจ่าย / สถานะ / โน้ต)
    async update(projectId, fields) {
        if (!db.projects.some(p => p.id === Number(projectId))) return null;
        const pay = ensurePayment(projectId);
        for (const key of ['agency_name', 'payment_date', 'status', 'notes']) {
            if (fields[key] !== undefined) pay[key] = fields[key];
        }
        pay.updated_at = now();
        persist();
        return clone(pay);
    },
    // บันทึกไฟล์ (type = 'quotation' | 'invoice')
    async setFile(projectId, type, meta) {
        if (!db.projects.some(p => p.id === Number(projectId))) return null;
        const pay = ensurePayment(projectId);
        pay[type] = meta; // { filename, original, size, uploaded_at }
        pay.updated_at = now();
        persist();
        return clone(pay);
    }
};

// ============================ budget (งบที่ใช้ไป + CPM/CPE) ============================
const cpmOf = (spent, views) => (views > 0 ? Math.round(spent / (views / 1000)) : 0);
const cpeOf = (spent, eng) => (eng > 0 ? Math.round(spent / eng) : 0);

// รวม fee/views/engagement ต่อ project (ใช้ร่วมกัน)
function spendMaps() {
    const fee = {}, views = {}, eng = {};
    db.project_kols.forEach(pk => {
        const k = db.kols.find(x => x.id === pk.kol_id);
        fee[pk.project_id] = (fee[pk.project_id] || 0) + (Number(pk.fee) || 0);
        const v = Number(pk.views) || 0;
        views[pk.project_id] = (views[pk.project_id] || 0) + v;
        eng[pk.project_id] = (eng[pk.project_id] || 0) + v * ((Number(k?.engagement_rate) || 0) / 100);
    });
    return { fee, views, eng };
}

const budget = {
    async overview({ scopeTeamId = null, brand, from, to } = {}) {
        let projs = db.projects.slice();
        if (scopeTeamId != null) projs = projs.filter(p => p.team_id === Number(scopeTeamId));
        if (brand) projs = projs.filter(p => p.brand === brand);
        if (from) projs = projs.filter(p => !p.start_date || p.start_date >= from);
        if (to) projs = projs.filter(p => !p.start_date || p.start_date <= to);

        const { fee, views, eng } = spendMaps();

        const rows = projs.map(p => {
            const team = db.teams.find(t => t.id === p.team_id);
            const spent = fee[p.id] || 0, v = views[p.id] || 0, e = eng[p.id] || 0;
            return {
                project_id: p.id, name: p.name, brand: p.brand || 'อื่นๆ',
                team_name: team ? team.name : null, status: p.status, start_date: p.start_date,
                spent, views: v, cpm: cpmOf(spent, v), cpe: cpeOf(spent, e)
            };
        });

        const totalSpent = rows.reduce((s, r) => s + r.spent, 0);
        const totalViews = rows.reduce((s, r) => s + r.views, 0);
        const totalEng = projs.reduce((s, p) => s + (eng[p.id] || 0), 0);

        // สรุปตามแบรนด์
        const bm = {};
        projs.forEach(p => {
            const b = p.brand || 'อื่นๆ';
            if (!bm[b]) bm[b] = { brand: b, spent: 0, views: 0, eng: 0, projects: 0 };
            bm[b].spent += fee[p.id] || 0;
            bm[b].views += views[p.id] || 0;
            bm[b].eng += eng[p.id] || 0;
            bm[b].projects += 1;
        });
        const byBrand = Object.values(bm).map(b => ({
            brand: b.brand, projects: b.projects, spent: b.spent, views: b.views,
            cpm: cpmOf(b.spent, b.views), cpe: cpeOf(b.spent, b.eng)
        })).sort((a, b) => b.spent - a.spent);

        return {
            total_spent: totalSpent,
            total_views: totalViews,
            cpm: cpmOf(totalSpent, totalViews),
            cpe: cpeOf(totalSpent, totalEng),
            by_brand: byBrand,
            by_project: rows.sort((a, b) => b.spent - a.spent)
        };
    },

    // เทรนด์รายเดือน (ใช้ไป + CPM/CPE ต่อเดือน)
    async trend({ scopeTeamId = null, brand, year } = {}) {
        let projs = db.projects.slice();
        if (scopeTeamId != null) projs = projs.filter(p => p.team_id === Number(scopeTeamId));
        if (brand) projs = projs.filter(p => p.brand === brand);

        const { fee, views, eng } = spendMaps();
        const months = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, spent: 0, views: 0, eng: 0 }));
        projs.forEach(p => {
            if (!p.start_date) return;
            const [y, m] = p.start_date.split('-').map(Number);
            if (String(y) !== String(year)) return;
            months[m - 1].spent += fee[p.id] || 0;
            months[m - 1].views += views[p.id] || 0;
            months[m - 1].eng += eng[p.id] || 0;
        });
        return months.map(m => ({
            month: m.month, spent: m.spent, views: m.views,
            cpm: cpmOf(m.spent, m.views), cpe: cpeOf(m.spent, m.eng)
        }));
    }
};

// ============================ activity (บันทึกประวัติใครทำอะไร) ============================
const activity = {
    async log({ user_id, team_id, action, project_id, project_name, summary }) {
        const u = db.users.find(x => x.id === Number(user_id));
        const row = {
            id: nextId('activity_logs'),
            user_id: Number(user_id) || null,
            user_name: u ? (u.full_name || u.username) : 'ไม่ทราบ',
            team_id: team_id ?? null,
            action: action || 'update',
            project_id: project_id ?? null,
            project_name: project_name ?? null,
            summary: summary || '',
            created_at: now()
        };
        db.activity_logs.push(row); persist();
        return clone(row);
    },
    async list({ scopeTeamId = null, user_id, project_id, from, to, limit = 300 } = {}) {
        let rows = db.activity_logs.slice();
        if (scopeTeamId != null) rows = rows.filter(r => r.team_id === Number(scopeTeamId));
        if (user_id) rows = rows.filter(r => r.user_id === Number(user_id));
        if (project_id) rows = rows.filter(r => r.project_id === Number(project_id));
        if (from) rows = rows.filter(r => (r.created_at || '') >= from);
        if (to) rows = rows.filter(r => (r.created_at || '') <= to + 'T23:59:59');
        rows.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
        return rows.slice(0, limit).map(clone);
    },
    // รายชื่อผู้ใช้ที่เคยมีประวัติ (สำหรับ dropdown ฟิลเตอร์)
    async actors(scopeTeamId = null) {
        let rows = db.activity_logs;
        if (scopeTeamId != null) rows = rows.filter(r => r.team_id === Number(scopeTeamId));
        const map = {};
        rows.forEach(r => { if (r.user_id) map[r.user_id] = r.user_name; });
        return Object.entries(map).map(([id, name]) => ({ id: Number(id), name })).sort((a, b) => a.name.localeCompare(b.name));
    }
};

// ============================ submissions (รายชื่อ KOL ที่ Agency ส่งเข้ามา) ============================
const submissions = {
    async listByProject(projectId) {
        return db.submissions
            .filter(s => s.project_id === Number(projectId))
            .sort((a, b) => (b.submitted_at || '').localeCompare(a.submitted_at || ''))
            .map(clone);
    },
    async get(subId) {
        const s = db.submissions.find(x => x.id === Number(subId));
        return s ? clone(s) : null;
    },
    async add({ project_id, account_name, followers, platform, product, budget, agency, link_account, group_key, tier, agency_token, code_expire }) {
        const row = {
            id: nextId('submissions'),
            project_id: Number(project_id),
            account_name, followers: followers || 0, platform: platform || null,
            product: product || null, budget: budget || 0,
            agency: agency || null, link_account: link_account || null,
            group_key: group_key || null, tier: tier || null,
            agency_token: agency_token || null,   // เจ้าของ (ลิงก์เอเจนซี่ที่ส่งเข้ามา)
            status: 'submitted', // submitted | confirmed | rejected
            draft_link: null, draft_link2: null, draft_link3: null, draft_link4: null, draft_link5: null,
            gencode: null, feedback: null, feedback2: null, feedback3: null, feedback4: null, feedback5: null,
            approved: false, draft_status: null,
            post_url: null, post_date: null, id_post: null, code_expire: Number(code_expire) || 60,
            ad_status: 'ยังไม่ยิง', ad_spend: 0, ad_reach: 0, ad_start: null, ad_end: null, ad_note: null,
            team_note: null,   // หมายเหตุจากทีมถึงเอเจนซี่ (เช่น ขอย้ายไปสินค้าอื่น)
            // ผลงานคอนเทนต์ (กรอกมือ หรือดึงจาก TikTok API ภายหลัง)
            views: 0, likes: 0, comments: 0, saves: 0, shares: 0, content_format: null, perf_synced_at: null,
            concept: null, gen_date: null,
            submitted_at: now(), decided_at: null, decided_by: null,
            list_updated_at: now(), work_updated_at: null, draft_updated_at: null  // ใช้ทำแจ้งเตือนแท็บ + per-KOL ดราฟใหม่
        };
        db.submissions.push(row); persist();
        return clone(row);
    },
    // อัปเดตได้ทั้งสถานะคัดเลือก + ข้อมูลดราฟงาน
    async update(subId, projectId, fields, byName) {
        const s = db.submissions.find(x => x.id === Number(subId) && (projectId == null || x.project_id === Number(projectId)));
        if (!s) return null;
        for (const k of ['account_name', 'followers', 'platform', 'product', 'agency', 'budget', 'link_account', 'concept', 'gen_date', 'group_key', 'tier', 'status', 'draft_link', 'draft_link2', 'draft_link3', 'draft_link4', 'draft_link5', 'gencode', 'feedback', 'feedback2', 'feedback3', 'feedback4', 'feedback5', 'approved', 'draft_status', 'post_url', 'post_date', 'id_post', 'code_expire', 'ad_status', 'ad_spend', 'ad_reach', 'ad_start', 'ad_end', 'ad_note', 'team_note', 'views', 'likes', 'comments', 'saves', 'shares', 'content_format', 'perf_synced_at']) {
            if (fields[k] !== undefined) s[k] = fields[k];
        }
        // ปรับ timestamp ตามหมวดของข้อมูลที่แก้ (ใช้ทำแจ้งเตือนแท็บ)
        const LIST_F = ['account_name', 'followers', 'platform', 'product', 'agency', 'budget', 'link_account', 'tier', 'group_key', 'status'];
        const WORK_F = ['draft_link', 'draft_link2', 'draft_link3', 'draft_link4', 'draft_link5', 'draft_status', 'feedback', 'feedback2', 'feedback3', 'feedback4', 'feedback5', 'gencode', 'post_url', 'post_date', 'id_post', 'code_expire', 'approved', 'concept', 'gen_date'];
        const DRAFT_F = ['draft_link', 'draft_link2', 'draft_link3', 'draft_link4', 'draft_link5', 'draft_status', 'feedback', 'feedback2', 'feedback3', 'feedback4', 'feedback5'];
        const keys = Object.keys(fields).filter(k => fields[k] !== undefined); // นับเฉพาะ field ที่ส่งมาจริง
        if (keys.some(k => LIST_F.includes(k))) s.list_updated_at = now();
        if (keys.some(k => WORK_F.includes(k))) s.work_updated_at = now();
        if (keys.some(k => DRAFT_F.includes(k))) s.draft_updated_at = now();
        if (fields.status !== undefined) { s.decided_at = now(); s.decided_by = byName || s.decided_by; }
        persist();
        return clone(s);
    },
    async countPending(projectId) {
        return db.submissions.filter(s => s.project_id === Number(projectId) && s.status === 'submitted').length;
    }
};

// ============================ ads (ติดตามการยิงแอด + สรุปค่าแอด) ============================
const adCpm = (spend, reach) => (reach > 0 ? Math.round(spend / (reach / 1000)) : 0);

const ads = {
    // หา project ของ submission (สำหรับตรวจสิทธิ์ทีม + logging)
    async subContext(subId) {
        const s = db.submissions.find(x => x.id === Number(subId));
        if (!s) return null;
        const p = db.projects.find(pr => pr.id === s.project_id) || null;
        return { submission: clone(s), project_id: s.project_id, team_id: p ? p.team_id : null, project_name: p ? p.name : null, account_name: s.account_name };
    },

    // รายการโพสต์ที่ "มีลิงก์โพสต์แล้ว" + ข้อมูลแอด พร้อมสรุปภาพรวม
    // filters: { scopeTeamId, brand, status, from, to }
    async list({ scopeTeamId = null, brand, status, from, to } = {}) {
        const projById = {};
        db.projects.forEach(p => { projById[p.id] = p; });

        let rows = db.submissions
            .filter(s => s.post_url && String(s.post_url).trim())     // เฉพาะโพสต์ที่มีลิงก์แล้ว
            .map(s => {
                const p = projById[s.project_id];
                const team = p ? db.teams.find(t => t.id === p.team_id) : null;
                const spend = Number(s.ad_spend) || 0;
                const reach = Number(s.ad_reach) || 0;
                // กลุ่มโฆษณาที่ KOL คนนี้สังกัด (ผูก Target/Content Type จาก Project อัตโนมัติ)
                const grp = (p && Array.isArray(p.ad_groups)) ? p.ad_groups.find(g => g.key === s.group_key) : null;
                return {
                    sub_id: s.id,
                    account_name: s.account_name,
                    platform: s.platform || null,
                    product: s.product || (grp && grp.products && grp.products.length ? grp.products.join(', ') : null),
                    target: grp ? (grp.target || null) : null,
                    content_type: grp ? (grp.content_type || null) : null,
                    gencode: s.gencode || null,
                    id_post: s.id_post || null,
                    post_url: s.post_url,
                    post_date: s.post_date || null,
                    project_id: s.project_id,
                    project_name: p ? p.name : null,
                    brand: p ? (p.brand || 'อื่นๆ') : 'อื่นๆ',
                    team_id: p ? p.team_id : null,
                    team_name: team ? team.name : null,
                    ad_status: s.ad_status || 'ยังไม่ยิง',
                    ad_spend: spend,
                    ad_reach: reach,
                    ad_start: s.ad_start || null,
                    ad_end: s.ad_end || null,
                    ad_note: s.ad_note || null,
                    cpm: adCpm(spend, reach)
                };
            });

        if (scopeTeamId != null) rows = rows.filter(r => r.team_id === Number(scopeTeamId));
        if (brand) rows = rows.filter(r => r.brand === brand);
        if (status) rows = rows.filter(r => r.ad_status === status);
        if (from) rows = rows.filter(r => !r.post_date || r.post_date >= from);
        if (to) rows = rows.filter(r => !r.post_date || r.post_date <= to);

        rows.sort((a, b) => (b.post_date || '').localeCompare(a.post_date || ''));

        // สรุปภาพรวม
        const totalSpend = rows.reduce((s, r) => s + r.ad_spend, 0);
        const totalReach = rows.reduce((s, r) => s + r.ad_reach, 0);
        const doneCount = rows.filter(r => r.ad_status === 'ยิงแล้ว').length;

        // สรุปตามแบรนด์
        const bm = {};
        rows.forEach(r => {
            if (!bm[r.brand]) bm[r.brand] = { brand: r.brand, spend: 0, reach: 0, posts: 0 };
            bm[r.brand].spend += r.ad_spend;
            bm[r.brand].reach += r.ad_reach;
            bm[r.brand].posts += 1;
        });
        const byBrand = Object.values(bm)
            .map(b => ({ ...b, cpm: adCpm(b.spend, b.reach) }))
            .sort((a, b) => b.spend - a.spend);

        return {
            summary: {
                total_posts: rows.length,
                done_count: doneCount,
                pending_count: rows.length - doneCount,
                total_spend: totalSpend,
                total_reach: totalReach,
                cpm: adCpm(totalSpend, totalReach),
                by_brand: byBrand
            },
            rows
        };
    }
};

// ============================ reports (Campaign Reports) ============================
const reports = {
    // รายการแคมเปญ + ตัวเลขสรุปสำหรับหน้ารายงาน (KOLS / BUDGET / USED / POST RATE)
    async campaigns({ scopeTeamId = null, brand } = {}) {
        let projs = db.projects.slice();
        if (scopeTeamId != null) projs = projs.filter(p => p.team_id === Number(scopeTeamId));
        if (brand) projs = projs.filter(p => p.brand === brand);

        return projs
            .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
            .map(p => {
                const subs = db.submissions.filter(s => s.project_id === p.id && s.status === 'confirmed');
                const kols = subs.length;
                const used = subs.reduce((sum, s) => sum + (Number(s.budget) || 0), 0);
                const posted = subs.filter(s => s.post_url && String(s.post_url).trim()).length;
                const post_rate = kols > 0 ? Math.round((posted / kols) * 100) : 0;
                const team = db.teams.find(t => t.id === p.team_id);
                return {
                    id: p.id, name: p.name, brand: p.brand || null, status: p.status,
                    start_date: p.start_date || null, end_date: p.end_date || null,
                    team_name: team ? team.name : null,
                    kols, budget: Number(p.budget) || 0, used, post_rate
                };
            });
    },

    // รายงานเชิงลึกของ 1 แคมเปญ (Report Analysis)
    async detail(projectId, scopeTeamId = null) {
        const p = db.projects.find(x => x.id === Number(projectId));
        if (!p) return null;
        if (scopeTeamId != null && p.team_id !== Number(scopeTeamId)) return null;

        const ENG = 0.02; // สมมติ engagement ~2% ของ reach (ใช้คำนวณ CPE เมื่อไม่มีข้อมูล engagement โดยตรง)
        const subs = db.submissions.filter(s => s.project_id === p.id && s.status === 'confirmed');
        const rows = subs.map((s, i) => {
            const cost = Number(s.budget) || 0;
            const reach = Number(s.ad_reach) || 0;
            const cpm = reach > 0 ? Number((cost / (reach / 1000)).toFixed(2)) : 0;
            const cpe = reach > 0 ? Number((cost / (reach * ENG)).toFixed(2)) : 0;
            const posted = !!(s.post_url && String(s.post_url).trim());
            const boosted = s.ad_status === 'ยิงแล้ว';
            const good = reach > 0 && cpm <= 28 && cpe <= 1.5;
            // ผลงานคอนเทนต์
            const views = Number(s.views) || 0;
            const likes = Number(s.likes) || 0, comments = Number(s.comments) || 0, saves = Number(s.saves) || 0, shares = Number(s.shares) || 0;
            const engagement = likes + comments + saves + shares;
            const er = views > 0 ? Number(((engagement / views) * 100).toFixed(2)) : 0;
            return {
                idx: i + 1, name: s.account_name, platform: s.platform || null,
                product: s.product || null, agency: s.agency || null,
                cost, ad_spend: Number(s.ad_spend) || 0, reach,
                link: s.post_url || s.link_account || null,
                cpm, cpe, performance: good ? 'Good' : 'Improve', posted, boosted,
                views, likes, comments, saves, shares, engagement, er, format: s.content_format || null
            };
        });

        const kols = rows.length;
        const kol_cost = rows.reduce((a, r) => a + r.cost, 0);
        const ads_cost = rows.reduce((a, r) => a + r.ad_spend, 0);
        const withReach = rows.filter(r => r.reach > 0);
        const avg_cpm = withReach.length ? Number((withReach.reduce((a, r) => a + r.cpm, 0) / withReach.length).toFixed(2)) : 0;
        const avg_cpe = withReach.length ? Number((withReach.reduce((a, r) => a + r.cpe, 0) / withReach.length).toFixed(2)) : 0;
        const postedCount = rows.filter(r => r.posted).length;

        const platOrder = ['TikTok', 'Instagram', 'Facebook', 'Lemon8'];
        const platforms = platOrder.map(pl => ({ platform: pl, count: rows.filter(r => r.platform === pl).length }));

        const groupBy = (key) => {
            const m = {};
            rows.forEach(r => { const k = r[key] || '—'; (m[k] = m[k] || []).push(r); });
            return m;
        };
        // ===== ผลงานคอนเทนต์ (Views/Engagement) =====
        const total_views = rows.reduce((a, r) => a + r.views, 0);
        const total_engagement = rows.reduce((a, r) => a + r.engagement, 0);
        const measured = rows.filter(r => r.views > 0);
        const avg_views = measured.length ? Math.round(total_views / measured.length) : 0;
        const engagement_rate = total_views > 0 ? Number(((total_engagement / total_views) * 100).toFixed(2)) : 0;
        const pctV = v => (total_views > 0 ? Number(((v / total_views) * 100).toFixed(1)) : 0);
        const erOf = (v, e) => (v > 0 ? Number(((e / v) * 100).toFixed(2)) : 0);

        const pm = groupBy('product');
        const by_product = Object.entries(pm).map(([product, rs]) => {
            const v = rs.reduce((a, r) => a + r.views, 0);
            const e = rs.reduce((a, r) => a + r.engagement, 0);
            const meas = rs.filter(r => r.views > 0).length;
            return {
                product, kols: rs.length, contents: rs.length, budget: rs.reduce((a, r) => a + r.cost, 0),
                posted: rs.filter(r => r.posted).length, total: rs.length, ads: rs.filter(r => r.boosted).length,
                views: v, share: pctV(v), avg_views: meas ? Math.round(v / meas) : 0,
                likes: rs.reduce((a, r) => a + r.likes, 0), engagement: e, er: erOf(v, e)
            };
        }).sort((a, b) => b.views - a.views || b.budget - a.budget);

        // แยกตาม Content Format
        const fm = groupBy('format');
        const by_format = Object.entries(fm).filter(([f]) => f && f !== '—').map(([format, rs]) => {
            const v = rs.reduce((a, r) => a + r.views, 0);
            const e = rs.reduce((a, r) => a + r.engagement, 0);
            const meas = rs.filter(r => r.views > 0).length;
            return {
                format, videos: rs.length, channels: new Set(rs.map(r => r.name)).size,
                views: v, share: pctV(v), avg_views: meas ? Math.round(v / meas) : 0, er: erOf(v, e)
            };
        }).sort((a, b) => b.avg_views - a.avg_views);

        // Top คลิป + Top channel
        const top_videos = [...rows].filter(r => r.views > 0).sort((a, b) => b.views - a.views).slice(0, 10)
            .map(r => ({ name: r.name, product: r.product, format: r.format, views: r.views, likes: r.likes, saves: r.saves, shares: r.shares, link: r.link }));
        const cm = groupBy('name');
        const top_channels = Object.entries(cm).map(([name, rs]) => {
            const v = rs.reduce((a, r) => a + r.views, 0);
            const e = rs.reduce((a, r) => a + r.engagement, 0);
            return { name, videos: rs.length, views: v, er: erOf(v, e), products: [...new Set(rs.map(r => r.product).filter(Boolean))] };
        }).filter(c => c.views > 0).sort((a, b) => b.views - a.views).slice(0, 8);

        // Engagement breakdown + View distribution
        const engagement_breakdown = {
            likes: rows.reduce((a, r) => a + r.likes, 0), comments: rows.reduce((a, r) => a + r.comments, 0),
            saves: rows.reduce((a, r) => a + r.saves, 0), shares: rows.reduce((a, r) => a + r.shares, 0)
        };
        const buckets = [
            { label: '1M+', min: 1000000, max: Infinity }, { label: '500K–999K', min: 500000, max: 999999 },
            { label: '100K–499K', min: 100000, max: 499999 }, { label: 'ต่ำกว่า 100K', min: 1, max: 99999 }
        ];
        const view_distribution = buckets.map(b => {
            const rs = rows.filter(r => r.views >= b.min && r.views <= b.max);
            const v = rs.reduce((a, r) => a + r.views, 0);
            return { label: b.label, videos: rs.length, views: v, share: pctV(v) };
        });

        const am = groupBy('agency');
        const by_agency = Object.entries(am).map(([agency, rs]) => ({
            agency, kols: rs.length, budget: rs.reduce((a, r) => a + r.cost, 0),
            posted: rs.filter(r => r.posted).length, total: rs.length
        }));

        const products = Array.isArray(p.products) ? p.products.map(x => (typeof x === 'string' ? x : x.name)) : [];

        return clone({
            campaign: {
                id: p.id, name: p.name, brand: p.brand || null, budget: Number(p.budget) || 0, used: kol_cost,
                product: products.join(', ') || '—', total_kols: kols,
                start_date: p.start_date || null, end_date: p.end_date || null, status: p.status
            },
            platforms, all_count: kols,
            post_rate: { rate: kols > 0 ? Math.round((postedCount / kols) * 100) : 0, posted: postedCount, total: kols },
            ads_boosted: rows.filter(r => r.boosted).length,
            good_performance: { good: rows.filter(r => r.performance === 'Good').length, total: kols },
            cost: { kol_cost, ads_cost, avg_cpm, avg_cpe, total: kol_cost + ads_cost },
            // ผลงานคอนเทนต์
            performance: {
                total_views, total_engagement, avg_views, engagement_rate,
                measured_count: measured.length, contents: kols
            },
            by_format, top_videos, top_channels, engagement_breakdown, view_distribution,
            by_product, by_agency, kols: rows
        });
    }
};

const meta = {
    async teamCount() { return db.teams.length; },
    reload() { db = load(); }
};

// ============================ rate requests (สอบถาม Rate Card) ============================
const rateRequests = {
    async create(fields) {
        const row = {
            id: nextId('rate_requests'),
            kol_name: fields.kol_name || null,
            link_account: fields.link_account || null,
            brand: fields.brand || null,
            products: Array.isArray(fields.products) ? fields.products : [],
            platforms: Array.isArray(fields.platforms) ? fields.platforms : [],
            scope: fields.scope || null,
            budget: fields.no_budget ? null : (Number(fields.budget) || 0),
            no_budget: !!fields.no_budget,
            brief_link: fields.brief_link || null,
            brief_note: fields.brief_note || null,
            status: 'open',
            created_by: fields.created_by || null,
            team_id: fields.team_id ?? null,
            created_at: now()
        };
        db.rate_requests.push(row); persist();
        return clone(row);
    },
    async list({ scopeTeamId = null } = {}) {
        let rows = db.rate_requests.slice();
        if (scopeTeamId != null) rows = rows.filter(r => r.team_id === Number(scopeTeamId));
        return rows.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).map(clone);
    }
};

module.exports = { teams, users, kols, projects, projectKols, dashboard, payments, budget, activity, submissions, ads, reports, rateRequests, meta, _duplicateError: duplicateError };
