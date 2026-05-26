const db = require('../lib/db'); // นำเข้า module เชื่อม Database (PostgreSQL) — ใช้ db.query() สำหรับทุก SQL
const jwt = require('jsonwebtoken'); // นำเข้า module สร้าง/ถอดรหัส JWT Token — ใช้ jwt.sign() สร้าง, jwt.verify() ตรวจ
const express = require('express'); // นำเข้า Express framework — ใช้สร้าง Router จัดการ HTTP request
const router = express.Router(); // สร้าง Router instance — เหมือนกล่องรวม route ทั้งหมด แล้วค่อย export ไปใช้ใน server.js

// ============================================================
// Middleware: authtoken — ด่านแรก เช็คว่า login แล้วหรือยัง
// Logic: Header มี "Bearer xxx" → แกะ token → verify → ถ้าถูกใส่ข้อมูล user เข้า req → ปล่อยผ่าน
// ============================================================

const authtoken = (req, res, next) => { // รับ req, res, next — next คือฟังก์ชัน "ปล่อยผ่านไปทำงานต่อ"
    const authheader = req.headers['authorization']; // ดึง Header "Authorization" จาก request — ค่าจะเป็น "Bearer eyJhbGci..."
    const token = authheader && authheader.split(' ')[1]; // แยกคำที่ 2 หลังช่องว่าง → ได้ token จริงๆ (ตัด "Bearer " ออก)

    if (!token) return res.status(401).json({ success: false, message: 'Unauthorization' }); // ไม่มี token เลย → 401 บอก "ยังไม่ได้ login"

    jwt.verify(token, 'secret_key', (err, user) => { // ถอดรหัส token ด้วย secret_key ตัวเดียวกับตอนสร้าง
        if (err) return res.status(401).json({ success: false, message: 'Invalid token' }); // token ผิด/หมดอายุ → 401
        req.user = user; // ✅ token ถูกต้อง → ยัดข้อมูล { id, role } เข้า req.user เพื่อให้ route ข้างหลังใช้ต่อ
        next(); // ปล่อยผ่านไป route handler ตัวถัดไป
    });
};

// ============================================================
// Middleware: checkRole — ด่านที่สอง เช็คว่า Role ตรงไหม (RBAC)
// Logic: รับ role ที่อนุญาต → เทียบกับ role ใน token → ตรง=ผ่าน, ไม่ตรง=403
// ============================================================

const checkRole = (role) => { // รับ role ที่ต้องการ (เช่น 'candidate', 'judge') — return middleware function
    return (req, res, next) => { // middleware function จริงๆ ที่ Express เรียก
        if (req.user && req.user.role === role) { // เทียบ role จาก token (req.user.role) กับ role ที่กำหนด
            next(); // ✅ ตรงกัน → ปล่อยผ่าน
        } else {
            res.status(403).json({ success: false, message: 'Forbidden' }); // ❌ ไม่ตรง → 403 "ห้ามเข้า" (เช่น judge พยายามเข้า route ของ candidate)
        }
    }
};

// ============================================================
// Candidate Module: config, tasks, my-submission, my-result
// ============================================================

// --- GET /api/config ---
// Logic: ดึงสถานะห้องสอบ (เปิด/ปิด + เวลาเริ่ม/จบ) → Frontend เอาไปทำ Countdown Timer
router.get('/config', authtoken, async (req, res) => { // authtoken เท่านั้น ไม่มี checkRole → ทุก role ดูได้
    try {
        const { rows } = await db.query('SELECT status, start_time, end_time FROM sessions WHERE id=1'); // ดึงแถวเดียว (session มีแค่ 1 แถว)
        if (!rows.length) return res.status(404).json({ success: false, message: 'Not Found' }); // ไม่เจอ session → 404
        res.json({ success: true, data: rows[0], meta: {} }); // ✅ ส่งกลับ { status, start_time, end_time }
    } catch (err) {
        res.status(500).json({ success: false, message: 'SERVER ERROR' }); // DB พัง → 500
    }
});

// --- GET /api/tasks ---
// Logic: Candidate เปิดหน้า Dashboard → เรียก API นี้เพื่ออ่านโจทย์
router.get('/tasks', authtoken, checkRole('candidate'), async (req, res) => { // เฉพาะ candidate เท่านั้น
    try {
        const { rows } = await db.query('SELECT * FROM tasks LIMIT 1'); // ดึงโจทย์แค่ 1 ข้อ (โจทย์มีแค่อันเดียว)
        if (!rows.length) return res.status(404).json({ success: false, message: 'Task not found' }); // ไม่มีโจทย์ → 404
        res.json({ success: true, data: rows[0], meta: {} }); // ✅ ส่ง { id, title, description, created_at }
    } catch (err) {
        res.status(500).json({ success: false, message: 'SERVER ERROR' });
    }
});

// --- GET /api/my-submission ---
// Logic: Candidate ดูงานที่ตัวเองส่งไปแล้ว → เอา URL เดิมมาแสดงในฟอร์ม
router.get('/my-submission', authtoken, checkRole('candidate'), async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT * FROM submissions WHERE user_id=$1', // WHERE user_id=$1 → Data Isolation: ดึงเฉพาะของตัวเอง
            [req.user.id] // $1 = id จาก token → cand01 ดูของ cand02 ไม่ได้
        );
        if (!rows.length) return res.status(404).json({ success: false, message: 'No submission found' }); // ยังไม่เคยส่ง → 404
        res.json({ success: true, data: rows[0], meta: {} }); // ✅ ส่ง { id, user_id, frontend_url, backend_url, status, score, submitted_at }
    } catch (err) {
        res.status(500).json({ success: false, message: 'SERVER ERROR' });
    }
});

// --- POST /api/my-submission ---
// Logic: Candidate กดส่งงาน "ครั้งแรก" → ต้องผ่าน 3 ด่าน: session เปิด? ส่งซ้ำไหม? URL ครบไหม?
router.post('/my-submission', authtoken, checkRole('candidate'), async (req, res) => {
    try {
        // ด่าน 1: Session Lifecycle — ห้องสอบต้องเปิดอยู่
        const session = await db.query('SELECT status FROM sessions WHERE id=1'); // ดึงสถานะห้องสอบ
        if (!session.rows.length || session.rows[0].status !== 'start') { // ถ้าไม่ใช่ 'start' (ปิดอยู่ หรือยังไม่เริ่ม)
            return res.status(403).json({ success: false, message: 'Session is not open' }); // → 403 ส่งไม่ได้
        }

        // ด่าน 2: Single Active Submission — เช็คว่าเคยส่งไปแล้วหรือยัง
        const existing = await db.query('SELECT id FROM submissions WHERE user_id=$1', [req.user.id]); // หา submission ของ user นี้
        if (existing.rows.length) { // ถ้าเจอ = เคยส่งแล้ว
            return res.status(403).json({ success: false, message: 'Submission already exists. Use PUT to update.' }); // → 403 บอกให้ใช้ PUT แทน
        }

        // ด่าน 3: Validation — ต้องส่ง URL มาครบทั้ง 2 ตัว
        const { frontend_url, backend_url } = req.body; // แกะ JSON body { frontend_url: "...", backend_url: "..." }
        if (!frontend_url || !backend_url) { // ขาดตัวใดตัวหนึ่ง
            return res.status(400).json({ success: false, message: 'frontend_url and backend_url are required' }); // → 400 Bad Request
        }

        const { rows } = await db.query(
            'INSERT INTO submissions (user_id, frontend_url, backend_url) VALUES ($1, $2, $3) RETURNING *', // INSERT แถวใหม่ + RETURNING * คืนข้อมูลที่เพิ่งสร้าง
            [req.user.id, frontend_url, backend_url] // $1=user_id จาก token, $2=frontend_url, $3=backend_url
        );
        res.status(201).json({ success: true, data: rows[0], meta: {} }); // ✅ POST สำเร็จ → ต้องตอบ 201 (Created) ตามกติกา
    } catch (err) {
        res.status(500).json({ success: false, message: 'SERVER ERROR' });
    }
});

// --- PUT /api/my-submission ---
// Logic: Candidate กดแก้ไข URL → ต้องผ่าน 2 ด่าน: session เปิด? URL ครบไหม?
router.put('/my-submission', authtoken, checkRole('candidate'), async (req, res) => {
    try {
        // ด่าน 1: State Blocking — session ปิดแล้วห้ามแก้
        const session = await db.query('SELECT status FROM sessions WHERE id=1'); // ดึงสถานะห้องสอบ
        if (!session.rows.length || session.rows[0].status !== 'start') { // ถ้าไม่ใช่ 'start'
            return res.status(403).json({ success: false, message: 'Session is not open' }); // → 403 แก้ไม่ได้
        }

        // ด่าน 2: Validation — ต้องส่ง URL มาครบทั้ง 2 ตัว
        const { frontend_url, backend_url } = req.body; // แกะ JSON body
        if (!frontend_url || !backend_url) {
            return res.status(400).json({ success: false, message: 'frontend_url and backend_url are required' }); // → 400
        }

        const { rows } = await db.query(
            'UPDATE submissions SET frontend_url=$1, backend_url=$2, submitted_at=CURRENT_TIMESTAMP WHERE user_id=$3 RETURNING *', // UPDATE + บันทึกเวลาแก้ใหม่
            [frontend_url, backend_url, req.user.id] // $1=frontend_url ใหม่, $2=backend_url ใหม่, $3=user_id จาก token
        );
        if (!rows.length) return res.status(404).json({ success: false, message: 'No submission found to update' }); // ไม่มี submission → 404
        res.json({ success: true, data: rows[0], meta: {} }); // ✅ PUT สำเร็จ → ตอบ 200 (ไม่ใช่ 201 เพราะไม่ได้สร้างใหม่)
    } catch (err) {
        res.status(500).json({ success: false, message: 'SERVER ERROR' });
    }
});

// --- GET /api/my-result ---
// Logic: Candidate ดูผลคะแนนล่าสุดของตัวเอง → แสดงในการ์ด Latest Result
router.get('/my-result', authtoken, checkRole('candidate'), async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT score, status, submitted_at FROM submissions WHERE user_id=$1', // ดึงเฉพาะ 3 field ที่ต้องแสดง
            [req.user.id] // Data Isolation: เฉพาะของตัวเอง
        );
        if (!rows.length) return res.status(404).json({ success: false, message: 'No result found' }); // ยังไม่มีผล → 404
        res.json({ success: true, data: rows[0], meta: {} }); // ✅ ส่ง { score, status, submitted_at }
    } catch (err) {
        res.status(500).json({ success: false, message: 'SERVER ERROR' });
    }
});

// ============================================================
// Judge Module: candidates, submissions, session/start, session/close
// ============================================================

// --- GET /api/candidates ---
// Logic: Judge เปิดหน้า Dashboard → ดูรายชื่อ Candidate ทั้งหมดในตาราง
router.get('/candidates', authtoken, checkRole('judge'), async (req, res) => { // เฉพาะ judge เท่านั้น
    try {
        const { rows } = await db.query('SELECT * FROM users WHERE role=$1', ['candidate']); // กรองเฉพาะ role=candidate
        res.json({ success: true, data: rows, meta: {} }); // ✅ ส่ง array ของ candidate ทั้งหมด (data เป็น [] ไม่ใช่ {})
    } catch (err) {
        res.status(500).json({ success: false, message: 'SERVER ERROR' });
    }
});

// --- GET /api/submissions ---
// Logic: Judge ดู submission ทั้งหมดพร้อมชื่อ Candidate (JOIN users เพื่อเอา username)
router.get('/submissions', authtoken, checkRole('judge'), async (req, res) => {
    try {
        const { rows } = await db.query('SELECT s.*, u.username FROM submissions s JOIN users u ON s.user_id = u.id'); // JOIN เพื่อเอา username มาด้วย
        res.json({ success: true, data: rows, meta: {} }); // ✅ ส่ง array ของ submission + username
    } catch (err) {
        res.status(500).json({ success: false, message: 'SERVER ERROR' });
    }
});

// --- PUT /api/session/start ---
// Logic: Judge กดปุ่ม "เปิดสอบ" → อัปเดต session เป็น 'start' + ตั้งเวลา 3 ชั่วโมง
router.put('/session/start', authtoken, checkRole('judge'), async (req, res) => { // PUT ไม่ใช่ POST เพราะเป็นการ "อัปเดต" session ไม่ใช่สร้างใหม่
    try {
        const sql = `
            UPDATE sessions 
            SET status=$1, 
                start_time=CURRENT_TIMESTAMP, 
                end_time=CURRENT_TIMESTAMP + INTERVAL '3 hours' 
            WHERE id=$2
        `; // status='start', เวลาเริ่ม=ตอนนี้, เวลาจบ=ตอนนี้+3ชม.
        await db.query(sql, ['start', 1]); // $1='start', $2=1 (session มีแค่ id=1)
        res.json({ success: true, data: { status: 'start' }, meta: {} }); // ✅ ตอบ 200 + สถานะใหม่
    } catch (err) {
        res.status(500).json({ success: false, message: 'SERVER ERROR' });
    }
});

// --- PUT /api/session/close ---
// Logic: Judge กดปุ่ม "ปิดสอบ" → Candidate ส่ง/แก้งานไม่ได้อีก (POST/PUT my-submission จะโดน 403)
router.put('/session/close', authtoken, checkRole('judge'), async (req, res) => {
    try {
        await db.query('UPDATE sessions SET status=$1 WHERE id=$2', ['close', 1]); // แค่เปลี่ยน status เป็น 'close'
        res.json({ success: true, data: { status: 'close' }, meta: {} }); // ✅ ตอบ 200 + สถานะใหม่
    } catch (err) {
        res.status(500).json({ success: false, message: 'SERVER ERROR' });
    }
});

// --- POST /api/submissions/:id/recheck ---
// Logic: Judge กดปุ่ม "recheck" → สมมติให้ Auto-grader ให้คะแนนใหม่ (random 0-100 จำลอง)
// จริงๆ ระบบ grader จะตรวจ URL แล้วให้คะแนน แต่ตอนนี้จำลองด้วย random
router.post('/submissions/:id/recheck', authtoken, checkRole('judge'), async (req, res) => { // :id คือ submission_id ที่จะ recheck
    try {
        const { id } = req.params; // ดึง submission id จาก URL เช่น /submissions/3/recheck → id=3
        const score = Math.floor(Math.random() * 101); // จำลองคะแนนจาก Auto-grader (0-100)
        const { rows } = await db.query(
            'UPDATE submissions SET score=$1, status=$2 WHERE id=$3 RETURNING *', // อัปเดตคะแนน + เปลี่ยน status เป็น 'checked'
            [score, 'checked', id] // $1=คะแนนใหม่, $2='checked', $3=submission_id
        );
        if (!rows.length) return res.status(404).json({ success: false, message: 'Submission not found' }); // ไม่เจอ submission → 404
        res.status(201).json({ success: true, data: rows[0], meta: {} }); // ✅ POST → ตอบ 201 + ข้อมูลที่อัปเดตแล้ว
    } catch (err) {
        res.status(500).json({ success: false, message: 'SERVER ERROR' });
    }
});

// --- PUT /api/results/:candidate_id/confirm ---
// Logic: Judge กดปุ่ม "confirm" → ล็อคคะแนนของ Candidate คนนั้น (เปลี่ยน status เป็น 'confirmed')
router.put('/results/:candidate_id/confirm', authtoken, checkRole('judge'), async (req, res) => { // :candidate_id คือ user_id ของ candidate
    try {
        const { candidate_id } = req.params; // ดึง candidate_id จาก URL เช่น /results/1/confirm → candidate_id=1
        const { rows } = await db.query(
            'UPDATE submissions SET status=$1 WHERE user_id=$2 RETURNING *', // เปลี่ยน status เป็น 'confirmed' → ล็อคคะแนน
            ['confirmed', candidate_id] // $1='confirmed', $2=user_id ของ candidate
        );
        if (!rows.length) return res.status(404).json({ success: false, message: 'No submission found for this candidate' }); // ไม่เจอ → 404
        res.json({ success: true, data: rows[0], meta: {} }); // ✅ PUT → ตอบ 200 + ข้อมูลที่ล็อคแล้ว
    } catch (err) {
        res.status(500).json({ success: false, message: 'SERVER ERROR' });
    }
});

// ============================================================
// Manager Module: statistics/summary, statistics/ranking, statistics/status, report
// กติกา: Manager เป็น READ-ONLY → มีแค่ GET เท่านั้น ห้าม POST/PUT/DELETE
// ============================================================

// --- GET /api/statistics/summary ---
// Logic: นับจำนวนรวม, คะแนนเฉลี่ย, คะแนนสูงสุด → แสดงเป็น Summary Cards
router.get('/statistics/summary', authtoken, checkRole('manager'), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT 
                COUNT(*)::int AS total_submissions,
                COALESCE(AVG(score), 0)::int AS avg_score,
                COALESCE(MAX(score), 0)::int AS max_score,
                COALESCE(MIN(score), 0)::int AS min_score
            FROM submissions
        `); // COUNT=นับทั้งหมด, AVG=เฉลี่ย, MAX=สูงสุด, MIN=ต่ำสุด, COALESCE=ถ้า null ให้เป็น 0
        res.json({ success: true, data: rows[0], meta: {} }); // ✅ ส่ง { total_submissions, avg_score, max_score, min_score }
    } catch (err) {
        res.status(500).json({ success: false, message: 'SERVER ERROR' });
    }
});

// --- GET /api/statistics/ranking ---
// Logic: เรียง Candidate ตามคะแนนสูง→ต่ำ → แสดงเป็นตาราง Leaderboard
router.get('/statistics/ranking', authtoken, checkRole('manager'), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT s.*, u.username 
            FROM submissions s 
            JOIN users u ON s.user_id = u.id 
            ORDER BY s.score DESC
        `); // JOIN เอา username + ORDER BY score DESC เรียงจากมากไปน้อย
        res.json({ success: true, data: rows, meta: {} }); // ✅ ส่ง array เรียงตาม score สูงสุดก่อน
    } catch (err) {
        res.status(500).json({ success: false, message: 'SERVER ERROR' });
    }
});

// --- GET /api/statistics/status ---
// Logic: นับจำนวน Pass กับ Fail → แสดงเป็น Pass/Fail Summary
router.get('/statistics/status', authtoken, checkRole('manager'), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT 
                COUNT(*) FILTER (WHERE score >= 50)::int AS pass,
                COUNT(*) FILTER (WHERE score < 50)::int AS fail
            FROM submissions
        `); // FILTER = นับเฉพาะแถวที่ตรงเงื่อนไข → score>=50=Pass, <50=Fail
        res.json({ success: true, data: rows[0], meta: {} }); // ✅ ส่ง { pass: 3, fail: 1 }
    } catch (err) {
        res.status(500).json({ success: false, message: 'SERVER ERROR' });
    }
});

// --- GET /api/report ---
// Logic: ดึงข้อมูลทั้งหมดสำหรับ export → Frontend เอาไป download เป็น JSON/CSV
router.get('/report', authtoken, checkRole('manager'), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT u.username, s.frontend_url, s.backend_url, s.score, s.status, s.submitted_at
            FROM submissions s 
            JOIN users u ON s.user_id = u.id 
            ORDER BY s.score DESC
        `); // ดึงทุก field ที่ต้องการ export + เรียงตาม score
        res.json({ success: true, data: rows, meta: {} }); // ✅ ส่ง array → Frontend เอาไป export
    } catch (err) {
        res.status(500).json({ success: false, message: 'SERVER ERROR' });
    }
});

// ============================================================
// Authentication Module: /api/login, /api/logout (ล่างสุด)
// ============================================================

// --- POST /api/login ---
// Logic: รับ username+password → หาใน DB → ตรง=สร้าง JWT token ส่งกลับ → ไม่ตรง=401
router.post('/login', async (req, res) => { // ไม่มี authtoken เพราะยังไม่ได้ login!
    const { username, password } = req.body; // แกะ JSON body { username: "cand01", password: "password123" }
    try {
        const { rows } = await db.query('SELECT * FROM users WHERE username=$1 AND password=$2', [username, password]); // เช็ค username+password ตรงกับใน DB ไหม
        if (!rows.length) return res.status(401).json({ success: false, message: 'Invalid username or password' }); // ไม่เจอ → 401

        const { id, role } = rows[0]; // ดึง id กับ role จาก DB (เช่น id=1, role='candidate')
        const token = jwt.sign({ id, role }, 'secret_key', { expiresIn: '6h' }); // สร้าง JWT token → ยัด { id, role } เข้าไป, หมดอายุ 6 ชม.
        res.json({ // ✅ ส่ง token กลับไปเก็บใน localStorage ฝั่ง Frontend
            success: true,
            data: { token, role, username }, // Frontend เอา token ไปใส่ Header, role ไปเช็คเปิดหน้าไหน, username ไปแสดง
            meta: {}
        });

    } catch (err) {
        res.status(500).json({ success: false, message: "SERVER ERROR" });
    }
});

// --- POST /api/logout ---
// Logic: แค่ตอบ success → Frontend ลบ token ออกจาก localStorage เอง (JWT ไม่มี server-side session ให้ลบ)
router.post('/logout', authtoken, async (req, res) => { // มี authtoken เพราะต้อง login อยู่ถึงจะ logout ได้
    res.json({ success: true, data: {}, meta: {} }) // ✅ ตอบ 200 → Frontend จะ localStorage.clear() แล้ว redirect ไปหน้า login
});

// ============================================================

module.exports = router; // export router ออกไปใช้ใน server.js → app.use('/api', router)