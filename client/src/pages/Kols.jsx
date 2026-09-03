import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import Icon from '../components/Icon.jsx';
import ProductChips from '../components/ProductChips.jsx';

const splitCodes = v => (v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : []);

const BRANDS = ["Jula's Herb", 'Code Lab', 'Jdent', 'Jarvit', 'Beauterry', 'Jernis', 'Dermiq', 'Minimii', 'Any Skin'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const N = n => (Number(n) || 0).toLocaleString('th-TH');
function fmtD(d) {
    if (!d) return '-';
    const [y, m, day] = d.split('-');
    return `${Number(day)}/${Number(m)}/${y.slice(2)}`;
}

// เกณฑ์ตัดสินผ่าน/ไม่ผ่าน — ต้องตรงกับ GOOD_CPM / GOOD_CPE ฝั่ง server (jsonStore.js)
const GOOD_CPM = 28;
const GOOD_CPE = 1.5;

// ป้ายบอกว่า KOL คนนี้คุ้มค่าไหม — เขียว = ผ่านทั้ง CPM และ CPE, แดง = มีตัวใดตัวหนึ่งเกินเกณฑ์
// ยังไม่กรอกผลงานคอนเทนต์ = ยังตัดสินไม่ได้ ขึ้นเป็นสีเทา (ไม่ใช่ "ไม่ผ่าน")
function PerfBadge({ row }) {
    if (!row.performance) {
        return (
            <span className="perf-pill none" title={`ยังตัดสินไม่ได้ เพราะยังไม่ได้กรอกผลงานคอนเทนต์
(View / Like / Comment / Save / Share)

กรอกได้ที่ปุ่ม 📊 ในหน้า On Process ของแคมเปญ`}>Not rated</span>
        );
    }
    const cpmOk = row.cpm > 0 && row.cpm <= GOOD_CPM;
    const cpeOk = row.cpe > 0 && row.cpe <= GOOD_CPE;
    const mark = ok => (ok ? '✓ ผ่าน' : '✕ เกินเกณฑ์');
    const tip = [
        `CPM ฿${N(row.cpm)} (เกณฑ์ ไม่เกิน ${GOOD_CPM})  ${mark(cpmOk)}`,
        `CPE ฿${N(row.cpe)} (เกณฑ์ ไม่เกิน ${GOOD_CPE})  ${mark(cpeOk)}`,
        '',
        `ต้นทุนรวม ฿${N(row.total_cost)} = ค่าตัว ฿${N(row.cost)} + ค่ายิงแอด ฿${N(row.ad_spend)}`,
        `ยอดวิว ${N(row.views)} · Engagement ${N(row.engagement)} (ER ${row.er}%)`
    ].join('\n');
    return cpmOk && cpeOk
        ? <span className="perf-pill good" title={tip}>✓ Pass</span>
        : <span className="perf-pill bad" title={tip}>✕ Fail</span>;
}

// ช่อง Gencode / ID Post — ข้อความยาวจนถูกตัดท้าย เลยมีปุ่มคัดลอกค่าเต็มให้
function CopyCell({ value }) {
    const [done, setDone] = useState(false);
    if (!value) return <td className="ka-code">—</td>;
    async function copy() {
        try {
            await navigator.clipboard.writeText(value);
        } catch {
            // navigator.clipboard ใช้ได้เฉพาะ https กับ localhost
            // คนที่เปิดผ่าน Wi-Fi ออฟฟิศ (http://192.168.x.x) จะตกมาทางนี้
            const ta = document.createElement('textarea');
            ta.value = value;
            ta.style.cssText = 'position:fixed;top:-999px;opacity:0';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch { /* คัดลอกไม่ได้จริง ๆ */ }
            ta.remove();
        }
        setDone(true);
        setTimeout(() => setDone(false), 1400);
    }
    return (
        <td className="ka-code">
            <div className="ka-copy-wrap">
                <span className="ka-copy-txt" title={value}>{value}</span>
                <button type="button" className={'ka-copy' + (done ? ' done' : '')} onClick={copy}
                    title={done ? 'คัดลอกแล้ว' : 'คัดลอก ' + value}>
                    {done ? <Icon name="check" size={12} /> : <Icon name="copy" size={12} />}
                </button>
            </div>
        </td>
    );
}

export default function Kols() {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [brand, setBrand] = useState('');
    const [platform, setPlatform] = useState('');
    const [year, setYear] = useState('');
    const [month, setMonth] = useState('');
    const [product, setProduct] = useState('');
    // การเรียงลำดับตาราง — ทีละอย่าง ไม่ซ้อนกัน เริ่มต้นเรียงตามเดือนใหม่สุดก่อน
    const [sort, setSort] = useState('month-desc'); // month-desc | month-asc | perf-best | perf-worst
    const [search, setSearch] = useState('');

    function load() {
        api('/kols/analytics').then(res => setData(res.data)).catch(err => setError(err.message));
    }
    useEffect(() => { load(); }, []);

    const rows = data?.rows || [];
    const years = useMemo(() => {
        const ys = [...new Set(rows.map(r => r.year).filter(Boolean))];
        if (!ys.length) ys.push(new Date().getFullYear());
        return ys.sort((a, b) => b - a);
    }, [rows]);
    const products = useMemo(() => [...new Set(rows.map(r => r.product).filter(Boolean))].sort(), [rows]);
    // เอาเฉพาะแพลตฟอร์มที่มีข้อมูลจริง จะได้ไม่ขึ้นปุ่มที่กดแล้วว่างเปล่า
    const platforms = useMemo(() => [...new Set(rows.map(r => r.platform).filter(Boolean))].sort(), [rows]);

    // ค้นหาทีเดียวครอบหลายช่อง — พิมพ์ชื่อ KOL, รหัสสินค้า, เอเจนซี่, เจ้าของ,
    // คอนเซ็ปต์, Gencode หรือ ID Post ก็เจอ (ไม่สนตัวพิมพ์เล็ก-ใหญ่)
    const matchSearch = r => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return [r.kol_name, r.product, r.agency, r.owner, r.project_name, r.gencode, r.id_post, r.platform, r.brand]
            .some(v => String(v ?? '').toLowerCase().includes(q));
    };

    const shown = rows.filter(r =>
        (!brand || r.brand === brand) &&
        (!platform || r.platform === platform) &&
        (!year || String(r.year) === String(year)) &&
        (!month || r.month === month) &&
        (!product || r.product === product) &&
        matchSearch(r));

    // คีย์เวลา = ปี*100 + เดือน เทียบข้ามปีได้ถูก (ธ.ค. 25 ต้องมาก่อน ม.ค. 26 ไม่ใช่ดูแค่ชื่อเดือน)
    const timeKey = r => (r.year && r.month ? Number(r.year) * 100 + (MONTHS.indexOf(r.month) + 1) : 0);
    // "ยังไม่ประเมิน" ให้อยู่ท้ายสุดเสมอ เพราะไม่ใช่ผลที่วัดได้ ไม่ควรไปแทรกกลาง
    const RANK = { Good: 0, Improve: 1 };
    const rankOf = r => (!r.performance ? 2 : (sort === 'perf-best' ? RANK[r.performance] : 1 - RANK[r.performance]));

    // เรียงตามเดือน — แถวที่ไม่มีเดือนไปท้ายสุดเสมอ ไม่ว่าจะเรียงขึ้นหรือลง
    function byMonth(a, b, asc) {
        const ka = timeKey(a), kb = timeKey(b);
        if (!ka && !kb) return 0;
        if (!ka) return 1;
        if (!kb) return -1;
        if (ka !== kb) return asc ? ka - kb : kb - ka;
        // เดือนเดียวกัน เรียงต่อด้วยวันที่ลงงาน (ใหม่สุดก่อน) คนที่ยังไม่ลงงานอยู่ท้าย
        return (b.post_date || '').localeCompare(a.post_date || '');
    }

    const sorted = [...shown].sort((a, b) => {
        if (!sort.startsWith('perf-')) return byMonth(a, b, sort === 'month-asc');
        const d = rankOf(a) - rankOf(b);
        if (d) return d;
        // กลุ่มเดียวกัน เรียงต่อด้วย CPM (ถูกกว่า = คุ้มกว่า) คนที่ยังไม่มี CPM ไปท้ายกลุ่ม
        const ca = a.cpm > 0 ? a.cpm : null, cb = b.cpm > 0 ? b.cpm : null;
        if (ca == null && cb != null) return 1;
        if (cb == null && ca != null) return -1;
        if (ca != null && cb != null && ca !== cb) return sort === 'perf-best' ? ca - cb : cb - ca;
        return byMonth(a, b, false);
    });

    const sortByMonth = () => setSort(v => (v === 'month-desc' ? 'month-asc' : 'month-desc'));
    const sortByPerf = () => setSort(v => (v === 'perf-best' ? 'perf-worst' : v === 'perf-worst' ? 'month-desc' : 'perf-best'));

    const total = shown.length;
    const budget = shown.reduce((a, r) => a + r.cost, 0);

    return (
        <div>
            <header className="page-head with-action">
                <div>
                    <h1>KOL Analytics</h1>
                    <p className="page-sub">Influencer Performance &amp; Demographics</p>
                </div>
                <div className="ka-top-filters">
                    <div className="ka-search">
                        <Icon name="search" size={15} />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="ค้นหา KOL / สินค้า / เอเจนซี่ / Gencode..." />
                        {search && (
                            <button type="button" className="ka-search-x" onClick={() => setSearch('')} title="ล้างคำค้นหา">✕</button>
                        )}
                    </div>
                    <select value={product} onChange={e => setProduct(e.target.value)}>
                        <option value="">All Products</option>
                        {products.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
            </header>

            {error && <div className="alert-error">{error}</div>}

            {/* การ์ดสรุป */}
            <div className="ka-summary">
                <div className="ka-sum-card">
                    <div className="ka-sum-ico"><Icon name="users" size={22} /></div>
                    <div><div className="ka-sum-k">TOTAL KOLS</div><div className="ka-sum-v">{total}</div></div>
                </div>
                <div className="ka-sum-card">
                    <div className="ka-sum-ico blue"><Icon name="wallet" size={22} /></div>
                    <div><div className="ka-sum-k">BUDGET</div><div className="ka-sum-v">{N(budget)}</div></div>
                </div>
                <div className="ka-sum-card">
                    <div className="ka-sum-ico amber"><Icon name="bars" size={22} /></div>
                    <div><div className="ka-sum-k">AVG. ENGAGEMENT RATE</div><div className="ka-sum-v">{(data?.summary.avg_engagement || 0).toFixed(2)}%</div></div>
                </div>
            </div>

            {/* Year + Month + Brand */}
            <div className="ka-filter-row">
                <label className="ka-year">Year:
                    <select value={year} onChange={e => setYear(e.target.value)}>
                        <option value="">ทุกปี</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </label>
                <label className="ka-year">Month:
                    <select value={month} onChange={e => setMonth(e.target.value)}>
                        <option value="">ทุกเดือน</option>
                        {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </label>
            </div>
            <div className="brand-filter">
                <span className="brand-filter-label">Brand:</span>
                <button className={'brand-chip' + (brand === '' ? ' active' : '')} onClick={() => setBrand('')}>All Brands</button>
                {BRANDS.map(b => (
                    <button key={b} className={'brand-chip' + (brand === b ? ' active' : '')} onClick={() => setBrand(b)}>{b}</button>
                ))}
            </div>
            <div className="brand-filter">
                <span className="brand-filter-label">Platform:</span>
                <button className={'brand-chip' + (platform === '' ? ' active' : '')} onClick={() => setPlatform('')}>All Platforms</button>
                {platforms.map(p => (
                    <button key={p} className={'brand-chip' + (platform === p ? ' active' : '')} onClick={() => setPlatform(p)}>{p}</button>
                ))}
            </div>

            {/* ตาราง */}
            <div className="panel no-pad">
                <div className="ka-table-scroll">
                    <table className="data-table ka-table">
                        <thead>
                            <tr>
                                <th className="ka-sort-th">
                                    <button type="button" className={'ka-sort' + (sort.startsWith('month-') ? ' on' : '')} onClick={sortByMonth}
                                        title={sort === 'month-desc' ? 'เรียง: เดือนใหม่สุดขึ้นก่อน — กดอีกครั้งเพื่อสลับเป็นเดือนเก่าสุดขึ้นก่อน'
                                            : sort === 'month-asc' ? 'เรียง: เดือนเก่าสุดขึ้นก่อน — กดอีกครั้งเพื่อสลับกลับ'
                                                : 'กดเพื่อเรียงตามเดือน'}>
                                        Month
                                        <span className="ka-sort-ico">{sort === 'month-desc' ? '▼' : sort === 'month-asc' ? '▲' : '⇅'}</span>
                                    </button>
                                </th><th>Product</th><th>KOL Name</th><th>Link</th><th>ชื่อ Project</th>
                                <th>Platform</th><th>Project Owner</th><th>Agency</th><th className="num">COST</th>
                                <th className="num">CPM</th><th className="num">CPE</th><th className="ka-sort-th">
                                    <button type="button" className={'ka-sort' + (sort.startsWith('perf-') ? ' on' : '')} onClick={sortByPerf}
                                        title={sort === 'perf-best' ? 'เรียง: ผ่านเกณฑ์ขึ้นก่อน — กดอีกครั้งเพื่อสลับเป็นไม่ผ่านขึ้นก่อน'
                                            : sort === 'perf-worst' ? 'เรียง: ไม่ผ่านเกณฑ์ขึ้นก่อน — กดอีกครั้งเพื่อกลับไปเรียงตามเดือน'
                                                : 'กดเพื่อเรียงตาม Performance'}>
                                        Performance
                                        <span className="ka-sort-ico">{sort === 'perf-best' ? '▲' : sort === 'perf-worst' ? '▼' : '⇅'}</span>
                                    </button>
                                </th>
                                <th>วันที่ลงงาน</th><th>วันที่เริ่ม Gen</th><th>Days</th><th>Day Left</th>
                                <th>Post Link</th><th>Gencode</th><th>ID POST</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!data ? (
                                <tr><td colSpan="19" className="empty">กำลังโหลด...</td></tr>
                            ) : shown.length === 0 ? (
                                <tr><td colSpan="19" className="empty">
                                    {search.trim()
                                        ? `ไม่พบ "${search.trim()}" — ลองพิมพ์สั้นลง หรือเช็คตัวกรองอื่นที่เลือกอยู่`
                                        : 'ยังไม่มี KOL ที่คัดเลือกในเงื่อนไขที่เลือก'}
                                </td></tr>
                            ) : sorted.map(r => (
                                <tr key={r.sub_id}>
                                    <td>{r.month || '—'}</td>
                                    <td><ProductChips products={splitCodes(r.product)} collapseAt={3} /></td>
                                    <td><strong>{r.kol_name}</strong></td>
                                    <td>{r.link_account ? <a href={r.link_account} target="_blank" rel="noreferrer" className="ka-link"><Icon name="eye" size={13} /></a> : '—'}</td>
                                    <td className="ka-project" title={r.project_name || ''}>{r.project_name || '—'}</td>
                                    <td>{r.platform || '—'}</td>
                                    <td className="muted">{r.owner || '—'}</td>
                                    <td className="muted">{r.agency || '—'}</td>
                                    <td className="num">{N(r.cost)}</td>
                                    <td className="num">{r.cpm ? '฿' + N(r.cpm) : '—'}</td>
                                    <td className="num">{r.cpe ? '฿' + N(r.cpe) : '—'}</td>
                                    <td><PerfBadge row={r} /></td>
                                    <td>{fmtD(r.post_date)}</td>
                                    <td>{fmtD(r.gen_date)}</td>
                                    <td>{r.days ? `${r.days} Days` : '—'}</td>
                                    <td>{r.day_left == null ? '—' : r.day_left < 0 ? <span className="ka-expired">Expired</span> : `${r.day_left} Days`}</td>
                                    <td>{r.post_url ? <a href={r.post_url} target="_blank" rel="noreferrer" className="ka-view">View</a> : '#'}</td>
                                    <CopyCell value={r.gencode} />
                                    <CopyCell value={r.id_post} />
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
