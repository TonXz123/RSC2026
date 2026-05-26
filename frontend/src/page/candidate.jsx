import { fetchAuth, logout, getUser } from '../main';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

function Candidate() {
    const navigate = useNavigate();
    const [task, setTask] = useState({}); // ชื่อชัด: เก็บข้อมูลโจทย์
    const [session, setSession] = useState({}); // ชื่อชัด: เก็บสถานะ session
    const [timeLeft, setTimeLeft] = useState('');

    const [submission, setSubmission] = useState(null);
    const [result, setResult] = useState(null);
    const [frontendUrl, setFrontendUrl] = useState('');
    const [backendUrl, setBackendUrl] = useState('');
    const [msg, setMsg] = useState(''); // ข้อความ feedback (สำเร็จ/error) แสดงใต้ปุ่ม แทน alert()
    const [msgType, setMsgType] = useState(''); // 'success' หรือ 'danger'

    useEffect(() => {
        fetchAuth('/tasks').then(res => res.success && setTask(res.data));
        fetchAuth('/my-submission').then(res => {
            if (res.success) {
                setSubmission(res.data);
                setFrontendUrl(res.data.frontend_url || '');
                setBackendUrl(res.data.backend_url || '');
            }
        });
        fetchAuth('/my-result').then(res => res.success && setResult(res.data));

        const loop = setInterval(() => {
            fetchAuth('/config').then(res => {
                if (res.success) {
                    setSession(res.data);
                    if (res.data.status === 'start' && res.data.end_time) {
                        const dist = new Date(res.data.end_time) - new Date();
                        setTimeLeft(dist > 0 ? new Date(dist).toISOString().substring(11, 19) : '00:00:00');
                    } else setTimeLeft('');
                }
            });
        }, 1000);
        return () => clearInterval(loop);
    }, []);

    // ส่ง/อัปเดต submission + แสดง feedback ใต้ปุ่ม (ไม่ใช้ alert)
    const handleSubmit = async () => {
        setMsg('');
        // Validation ฝั่ง Frontend
        if (!frontendUrl || !backendUrl) {
            setMsg('กรุณากรอก URL ให้ครบทั้ง 2 ช่อง');
            setMsgType('danger');
            return;
        }
        const method = submission ? 'PUT' : 'POST';
        const res = await fetchAuth('/my-submission', {
            method,
            body: JSON.stringify({ frontend_url: frontendUrl, backend_url: backendUrl })
        });
        if (res.success) {
            setSubmission(res.data);
            setMsg('✅ บันทึกสำเร็จ!');
            setMsgType('success');
        } else {
            setMsg(res.message);
            setMsgType('danger');
        }
    };

    return (
        <>
            <nav className="navbar navbar-expand-lg sticky-top candidate shadow-sm" aria-label="Candidate navigation">
                <div className="container">
                    <h2 className='fw-bold'>WS TH2026</h2>
                    <button className="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#nav" aria-label="Toggle navigation">
                        <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="nav">
                        <ul className='navbar-nav ms-auto'>
                            <li className='nav-item me-2 d-flex align-items-center'>
                                <span className='fw-bold text-dark'>Candidate : {getUser()}</span>
                            </li>
                            <li className='nav-item'>
                                <button className="btn btn-outline-danger w-100" onClick={() => logout(navigate)}>Logout</button>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>

            <main className='container mt-2'>
                <h1 className='fw-bold fs-4'>Dashboard Candidate</h1>
                <div className="row">
                    {/* ส่วนที่ 1: สถานะ Session + Countdown */}
                    <section className="col-12 col-md-6 mb-3" aria-label="Session status">
                        <div className="card shadow">
                            <div className="card-body" style={{ minHeight: '180px' }}>
                                <h2 className='text-center fw-bold fs-5'>
                                    Status : <span className={session.status === 'start' ? 'text-success' : 'text-danger'}>
                                        {session.status ? session.status.toUpperCase() : 'Loading...'}
                                    </span>
                                </h2>
                                <p className="text-center text-danger mt-3 fw-bold fs-3">
                                    {timeLeft ? `⏱️ ${timeLeft}` : ''}
                                </p>
                                <p className="text-secondary text-center">
                                    {session.status === 'start' ? '🚀 ระบบเปิดให้สอบแล้ว' : '⏳ รอ Judge เปิดระบบ...'}
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* ส่วนที่ 2: Task Overview */}
                    <section className="col-12 col-md-6 mb-3" aria-label="Task overview">
                        <div className="card shadow">
                            <div className="card-body" style={{ minHeight: '180px' }}>
                                <h2 className='text-center fs-5'>{task.title || 'Loading...'}</h2>
                                <p className="text-secondary text-center">{task.description || 'Loading...'}</p>
                            </div>
                        </div>
                    </section>

                    {/* ส่วนที่ 3: ฟอร์มส่ง URL */}
                    <section className="col-12 mb-3" aria-label="Submit URLs">
                        <h2 className="fw-bold fs-5">Submit URLs</h2>
                        <div className="card shadow">
                            <div className="card-body">
                                <div className="mb-3">
                                    <label htmlFor="frontend_url" className="form-label fw-bold">Frontend URL</label>
                                    <input id="frontend_url"
                                        className={`form-control ${msg && !frontendUrl ? 'is-invalid' : frontendUrl ? 'is-valid' : ''}`}
                                        value={frontendUrl} onChange={e => setFrontendUrl(e.target.value)}
                                        placeholder="http://192.168.1.x:3000"
                                        disabled={session.status !== 'start'}
                                        aria-describedby="frontend_url_help" />
                                    {msg && !frontendUrl && <div className="invalid-feedback">กรุณากรอก Frontend URL</div>}
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="backend_url" className="form-label fw-bold">Backend URL</label>
                                    <input id="backend_url"
                                        className={`form-control ${msg && !backendUrl ? 'is-invalid' : backendUrl ? 'is-valid' : ''}`}
                                        value={backendUrl} onChange={e => setBackendUrl(e.target.value)}
                                        placeholder="http://192.168.1.x:8080"
                                        disabled={session.status !== 'start'}
                                        aria-describedby="backend_url_help" />
                                    {msg && !backendUrl && <div className="invalid-feedback">กรุณากรอก Backend URL</div>}
                                </div>
                                <button className="btn btn-primary w-100" onClick={handleSubmit}
                                    disabled={session.status !== 'start'}>
                                    {submission ? '📝 Update Submission' : '🚀 Submit'}
                                </button>
                                {/* Feedback message แสดงใต้ปุ่ม แทน alert() — ได้คะแนน validation feedback */}
                                {msg && <div className={`alert alert-${msgType} mt-2 mb-0`} role="alert">{msg}</div>}
                            </div>
                        </div>
                    </section>

                    {/* ส่วนที่ 4: ผลคะแนนล่าสุด */}
                    <section className="col-12 mb-3" aria-label="Latest result">
                        <h2 className="fw-bold fs-5">Latest Result</h2>
                        <div className="card shadow">
                            <div className="card-body text-center">
                                {result ? (
                                    <>
                                        <p className='fs-4'>Score: <span className="text-primary fw-bold">{result.score}</span></p>
                                        <p>Status: <span className={result.status === 'confirmed' ? 'text-success' : 'text-warning'}>
                                            {result.status?.toUpperCase()}
                                        </span></p>
                                    </>
                                ) : (
                                    <p className="text-secondary">ยังไม่มีผลคะแนน</p>
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </>
    );
}

export default Candidate;
