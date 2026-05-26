import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout, getUser, fetchAuth } from '../main';

function Manager() {
    const [summary, setSummary] = useState({});
    const [ranking, setRanking] = useState([]);
    const [status, setStatus] = useState({});
    const navigate = useNavigate();

    useEffect(() => {
        fetchAuth('/statistics/summary').then(res => res.success && setSummary(res.data));
        fetchAuth('/statistics/ranking').then(res => res.success && setRanking(res.data));
        fetchAuth('/statistics/status').then(res => res.success && setStatus(res.data));
    }, []);

    const handleExport = async () => {
        const res = await fetchAuth('/report');
        if (res.success) {
            const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'report.json';
            a.click();
        }
    };

    return (
        <>
            <nav className="navbar navbar-expand-lg sticky-top manager shadow-sm" aria-label="Manager navigation">
                <div className="container">
                    <h2 className='fw-bold'>WS TH2026</h2>
                    <button className="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#nav" aria-label="Toggle navigation">
                        <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="nav">
                        <ul className='navbar-nav ms-auto'>
                            <li className='nav-item me-2 d-flex align-items-center'>
                                <span className='fw-bold text-dark'>Manager : {getUser()}</span>
                            </li>
                            <li className='nav-item'>
                                <button className="btn btn-outline-danger w-100" onClick={() => logout(navigate)}>Logout</button>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>

            <main className='container mt-2'>
                <h1 className='fw-bold fs-4'>Dashboard Manager</h1>

                {/* Summary Cards */}
                <section className="row mb-3" aria-label="Summary statistics">
                    {[
                        { label: 'Total', value: summary.total_submissions, color: 'primary' },
                        { label: 'Avg Score', value: summary.avg_score, color: 'info' },
                        { label: 'Max Score', value: summary.max_score, color: 'success' },
                        { label: 'Min Score', value: summary.min_score, color: 'warning' }
                    ].map((c, i) => (
                        <div className="col-6 col-md-3 mb-2" key={i}>
                            <div className={`card text-white bg-${c.color} shadow`}>
                                <div className="card-body text-center">
                                    <p className='mb-1 fw-bold'>{c.label}</p>
                                    <p className='fs-2 fw-bold mb-0'>{c.value ?? '-'}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </section>

                {/* Pass/Fail */}
                <section className="row mb-3" aria-label="Pass fail summary">
                    <div className="col-6">
                        <div className="card bg-success text-white shadow">
                            <div className="card-body text-center">
                                <p className='mb-1 fw-bold'>Pass (≥50)</p>
                                <p className='fs-2 fw-bold mb-0'>{status.pass ?? 0}</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-6">
                        <div className="card bg-danger text-white shadow">
                            <div className="card-body text-center">
                                <p className='mb-1 fw-bold'>Fail (&lt;50)</p>
                                <p className='fs-2 fw-bold mb-0'>{status.fail ?? 0}</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Ranking + Export */}
                <section aria-label="Ranking table">
                    <div className="d-flex justify-content-between align-items-center">
                        <h2 className='fw-bold fs-5'>Ranking</h2>
                        <button className="btn btn-outline-primary btn-sm" onClick={handleExport}>📥 Export</button>
                    </div>
                    <div className="card shadow mb-3">
                        <div className="card-body table-responsive">
                            <table className='table table-hover'>
                                <thead>
                                    <tr>
                                        <th scope="col">#</th>
                                        <th scope="col">Candidate</th>
                                        <th scope="col">Score</th>
                                        <th scope="col">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ranking.length > 0 ? ranking.map((r, i) => (
                                        <tr key={r.id}>
                                            <td>{i + 1}</td>
                                            <td>{r.username}</td>
                                            <td>{r.score}</td>
                                            <td>
                                                <span className={`badge bg-${r.score >= 50 ? 'success' : 'danger'}`}>
                                                    {r.score >= 50 ? 'Pass' : 'Fail'}
                                                </span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="4" className="text-center text-muted">No Data</td></tr>
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

export default Manager;
