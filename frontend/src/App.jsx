import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './page/login'
import Candidate from './page/candidate'
import Judge from './page/judge'
import Manager from './page/manager'
import { getToken, getRole } from './main'

// 🛡️ Guard: หน้าที่ต้องล็อกอิน (ดักคนยังไม่ล็อกอิน หรือคนเข้าผิด Role)
const Guard = ({ role, children }) =>
  !getToken() ? <Navigate to="/" /> : (getRole() !== role ? <Navigate to={'/' + getRole()} /> : children)

// 🔓 Public: หน้าล็อกอิน (ถ้ามี Token อยู่แล้วให้เด้งข้ามไปหน้า Role ตัวเองเลย)
const Public = ({ children }) =>
  getToken() ? <Navigate to={'/' + getRole()} /> : children

function App() {
  return (
    <Routes>
      <Route path="/" element={<Public><Login /></Public>} />
      <Route path="/candidate" element={<Guard role="candidate"><Candidate /></Guard>} />
      <Route path="/judge" element={<Guard role="judge"><Judge /></Guard>} />
      <Route path="/manager" element={<Guard role="manager"><Manager /></Guard>} />
    </Routes>
  )
}

export default App
