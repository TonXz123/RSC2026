import { useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { api } from '../main';

function Login() {
    const [username, setUsername] = useState(''); // ชื่อชัด
    const [password, setPassword] = useState(''); // ชื่อชัด
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const formLogin = async (e) => {
        e.preventDefault();
        setError('');
        // Validation ฝั่ง Frontend
        if (!username || !password) return setError('กรุณากรอก Username และ Password');
        try {
            const res = await fetch(api + '/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const { success, data, message } = await res.json();
            if (!success) return setError(message);
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.role);
            localStorage.setItem('username', data.username);
            navigate('/' + data.role);
        } catch {
            setError('Cannot connect to server');
        }
    }

    return (
        <main className="d-flex justify-content-center align-items-center vh-100 w-100" role="main">
            <div className="card shadow w-100" style={{ maxWidth: "400px" }}>
                <div className="card-body">
                    <h1 className='text-center fs-4 fw-bold'>Login</h1>
                    <form onSubmit={formLogin} noValidate>
                        <div className="mb-3">
                            <label htmlFor='username' className='form-label fw-bold'>Username</label>
                            <input type="text" id='username' placeholder='username'
                                value={username} onChange={e => setUsername(e.target.value)}
                                className={`form-control ${error && !username ? 'is-invalid' : ''}`}
                                required aria-required="true" />
                            {error && !username && <div className="invalid-feedback">กรุณากรอก Username</div>}
                        </div>
                        <div className="mb-3">
                            <label htmlFor='password' className='form-label fw-bold'>Password</label>
                            <input type="password" id='password' placeholder='password'
                                value={password} onChange={e => setPassword(e.target.value)}
                                className={`form-control ${error && !password ? 'is-invalid' : ''}`}
                                required aria-required="true" />
                            {error && !password && <div className="invalid-feedback">กรุณากรอก Password</div>}
                        </div>
                        {error && username && password && <div className="alert alert-danger" role="alert">{error}</div>}
                        <button className="btn btn-success w-100" type="submit">Login</button>
                    </form>
                </div>
            </div>
        </main>
    )
}

export default Login;