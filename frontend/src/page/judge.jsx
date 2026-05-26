import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout, getUser, fetchAuth } from '../main';

function Judge() {
    const [session, setSession] = useState(false);
    const [status, setStatus] = useState('close');
    const [subs, setSubs] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchAuth('/config').then(res => {
            if (res.success) {
                setSession(res.data.status === 'start');
                setStatus(res.data.status);
            }
        });
        loadSubs();
    }, []);

    const loadSubs = () => {
        fetchAuth('/submissions').then(res => res.success && setSubs(res.data));
    };

    const togglesession = (e) => {
        const open = e.target.checked;
        setSession(open);
        fetchAuth(open ? '/session/start' : '/session/close', { method: 'PUT' })
            .then(res => res.success ? setStatus(res.data.status) : setSession(!open))
            .catch(() => setSession(!open));
    };

    const handleRecheck = async (id) => {
        const res = await fetchAuth(`/submissions/${id}/recheck`, { method: 'POST' });
        res.success ? loadSubs() : alert(res.message);
    };

    const handleConfirm = async (userId) => {
        const res = await fetchAuth(`/results/${userId}/confirm`, { method: 'PUT' });
        res.success ? loadSubs() : alert(res.message);
    };

    return (
        <>
            <nav className="navbar navbar-expand-lg sticky-top judge shadow-sm" aria-label="Judge navigation">
                <div className="container">
                    <h2 className='fw-bold'>WS TH2026</h2>
                    <button className="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#nav" aria-label="Toggle navigation">
                        <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="nav">
                        <ul className='navbar-nav ms-auto'>
                            <li className='nav-item me-2 d-flex align-items-center'>
                                <span className='fw-bold text-dark'>Judge : {getUser()}</span>
                            </li>
                            <li className='nav-item'>
                                <button className="btn btn-outline-danger w-100" onClick={() => logout(navigate)}>Logout</button>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>

            <main className='container mt-2'>
                <h1 className='fw-bold fs-4'>Judge Panel</h1>
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <p className='fs-5 mb-0'>Session : <span className={session ? 'text-success fw-bold' : 'text-danger fw-bold'}>{status}</span></p>
                    <div className="form-check form-switch">
                        <input type="checkbox" className="form-check-input" id='flexsession'
                            checked={session} onChange={togglesession} role="switch" aria-label="Toggle session" />
                        <label htmlFor="flexsession" className="form-check-label fw-bold">เปิด/ปิด</label>
                    </div>
                </div>

                <section aria-label="Submissions table">
                    <div className="card shadow">
                        <div className="card-body table-responsive">
                            <table className='table table-hover'>
                                <thead>
                                    <tr>
                                        <th scope="col">ID</th>
                                        <th scope="col">Candidate</th>
                                        <th scope="col">Frontend</th>
                                        <th scope="col">Backend</th>
                                        <th scope="col">Score</th>
                                        <th scope="col">Status</th>
                                        <th scope="col">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subs.length > 0 ? subs.map((item) => (
                                        <tr key={item.id}>
                                            <td>{item.user_id}</td>
                                            <td>{item.username}</td>
                                            <td>{item.frontend_url || '-'}</td>
                                            <td>{item.backend_url || '-'}</td>
                                            <td>{item.score || 0}</td>
                                            <td>
                                                <span className={`badge bg-${item.status === 'confirmed' ? 'success' : item.status === 'checked' ? 'primary' : 'warning'}`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td>
                                                <button className="btn btn-sm btn-primary me-1" onClick={() => handleRecheck(item.id)}>Recheck</button>
                                                <button className="btn btn-sm btn-success" onClick={() => handleConfirm(item.user_id)}
                                                    disabled={item.status === 'confirmed'}>
                                                    {item.status === 'confirmed' ? '✅' : 'Confirm'}
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="7" className="text-center text-muted">No Data</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </main>
        </>
    );
}

export default Judge;