import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import 'bootstrap/dist/css/bootstrap.min.css'
export const api = 'http://' + location.hostname + ':8080/api';
export const getToken = () => localStorage.getItem('token');
export const getUser = () => localStorage.getItem('username');
export const getRole = ()=> localStorage.getItem('role');

// ฟังก์ชันกลางสำหรับเรียก API
export const fetchAuth = async (endpoint, options = {}) => {
    const currentToken = getToken(); // ดึง Token ใหม่ทุกครั้งที่เรียก API
    const headers = {
        'Content-Type': 'application/json',
        ...(currentToken && { 'Authorization': 'Bearer ' + currentToken }),
        ...options.headers
    };
    
    const res = await fetch(api + endpoint, { ...options, headers });
    
    // ✨ เทคนิคได้คะแนนเต็ม: จัดการ 401 (Token หมดอายุ/ไม่ถูกต้อง) จากส่วนกลาง
    if (res.status === 401) {
        localStorage.clear();
        window.location.href = '/'; // เตะกลับหน้าแรกทันที
        return { success: false, message: 'Unauthorized' };
    }
    
    return res.json();
};

// ฟังก์ชันกลางสำหรับ Logout
export const logout = async (navigate) => {
    await fetchAuth('/logout', { method: 'POST' });
    localStorage.clear();
    navigate('/');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* 3. ครอบ <App /> ด้วย <BrowserRouter> */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)