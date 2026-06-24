import { useState } from 'react';
import { LogIn } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('Username dan password wajib diisi');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/login', {
        username: username.trim(),
        password: password,
      });

      // Simpan token
      localStorage.setItem('vidflow_token', res.data.access_token);
      localStorage.setItem('vidflow_user', res.data.username);

      // Set default auth header untuk request selanjutnya
      api.defaults.headers.common['Authorization'] = `Bearer ${res.data.access_token}`;

      toast.success('Login berhasil!');
      onLogin();
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Login gagal. Periksa kredensial.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      padding: '20px'
    }}>
      <div className="card glass-panel" style={{
        width: '100%',
        maxWidth: '400px',
        animation: 'fadeIn 0.3s ease-out'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px', height: '64px',
            borderRadius: '16px',
            background: 'rgba(59, 130, 246, 0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <LogIn size={32} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Vidflow Studio</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '0.9rem' }}>
            Login untuk mengakses dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-control"
              placeholder="Masukkan username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
            />
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="Masukkan password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '12px', fontSize: '1rem' }}
          >
            {loading ? 'Loading...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
