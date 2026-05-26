-- ==========================================
-- 1. DROP TABLES (ลบตารางเก่าทิ้งก่อน เพื่อให้รันไฟล์นี้ซ้ำกี่รอบก็ได้เวลาซ้อม)
-- ==========================================
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ==========================================
-- 2. CREATE TABLES (สร้างโครงสร้างตารางหลักทั้ง 4 ตาราง)
-- ==========================================

-- ตารางที่ 1: ผู้ใช้งาน (Users) รองรับ Candidate, Judge และ Manager 
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL 
);

-- ตารางที่ 2: จัดการเวลาสอบ (Sessions) สำหรับเปิด-ปิดการสอบ 
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    status VARCHAR(20) DEFAULT 'closed', 
    start_time TIMESTAMP,
    end_time TIMESTAMP
);

-- ตารางที่ 3: เก็บข้อมูลโจทย์ (Tasks) ให้ผู้สอบเข้ามาอ่าน 
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ตารางที่ 4: เก็บผลงาน (Submissions) เชื่อมโยงกับผู้สอบ 
CREATE TABLE submissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    frontend_url VARCHAR(255),
    backend_url VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending', 
    score INTEGER DEFAULT 0,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. INSERT SEED DATA (เพิ่มข้อมูลจำลองสำหรับทดสอบระบบ)
-- ==========================================

-- เพิ่มข้อมูล Users: รหัสผ่านใช้ 'password123' สำหรับทุกคนเพื่อให้ทดสอบง่าย
INSERT INTO users (username, password, role) VALUES
('cand01', 'password123', 'candidate'),
('cand02', 'password123', 'candidate'),
('judge01', 'password123', 'judge'),
('manager01', 'password123', 'manager');

-- เพิ่มข้อมูล Session: ตั้งค่าเริ่มต้นให้เป็น 'closed' (ปิดสอบ)
INSERT INTO sessions (status) VALUES ('closed');

-- เพิ่มข้อมูลโจทย์ (Tasks) 
INSERT INTO tasks (title, description) VALUES
('Test Submission Management System', 'Please build a full-stack web application. Submit your Frontend URL and Backend API URL before the session countdown ends.');