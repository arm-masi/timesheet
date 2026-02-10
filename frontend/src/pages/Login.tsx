import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Errore di autenticazione');
    } finally {
      setLoading(false);
    }
  };

  const handleAzureLogin = async () => {
    setError('');
    try {
      const res = await api.get('/auth/azure/login');
      window.location.href = res.data.authorization_url;
    } catch {
      setError('SSO Microsoft non configurato. Usa il login locale.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f4f6f9 0%, #e8f4f5 100%)',
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        width: '420px',
        borderTop: '4px solid #00BCD4',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src="/logo.png" alt="aXcent" style={{ height: '48px', marginBottom: '12px' }} />
          <p style={{ color: '#888', fontSize: '14px' }}>
            Gestione Presenze Aziendali
          </p>
        </div>

        <button onClick={handleAzureLogin} style={azureBtnStyle}>
          Accedi con Microsoft 365
        </button>

        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', gap: '12px' }}>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #e8ecf1' }} />
          <span style={{ color: '#aaa', fontSize: '13px' }}>oppure</span>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #e8ecf1' }} />
        </div>

        <form onSubmit={handleLocalLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={inputStyle}
              required
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              required
            />
          </div>
          {error && <p style={{ color: '#e53e3e', fontSize: '14px', marginBottom: '16px' }}>{error}</p>}
          <button type="submit" disabled={loading} style={loginBtnStyle}>
            {loading ? 'Accesso...' : 'Accedi (Admin Locale)'}
          </button>
        </form>
      </div>
    </div>
  );
}

const azureBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  background: '#0078d4',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '15px',
  cursor: 'pointer',
  fontWeight: 500,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '6px',
  fontSize: '14px',
  color: '#555',
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #ddd',
  borderRadius: '6px',
  fontSize: '14px',
  boxSizing: 'border-box',
};

const loginBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  background: '#00BCD4',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '15px',
  cursor: 'pointer',
  fontWeight: 600,
};
