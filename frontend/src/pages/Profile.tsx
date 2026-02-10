import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Profile() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isLocal = user?.auth_provider === 'local';

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('Le password non coincidono');
      return;
    }
    if (newPassword.length < 6) {
      setError('La password deve essere di almeno 6 caratteri');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setMessage('Password cambiata con successo');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Errore cambio password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ color: '#1a365d', marginBottom: '24px' }}>Profilo Utente</h2>

      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px 0' }}>Informazioni</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Nome</label>
            <div style={valueStyle}>{user?.full_name}</div>
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <div style={valueStyle}>{user?.email}</div>
          </div>
          <div>
            <label style={labelStyle}>Ruolo</label>
            <div style={valueStyle}>{user?.role === 'admin' ? 'Amministratore' : 'Dipendente'}</div>
          </div>
          <div>
            <label style={labelStyle}>Autenticazione</label>
            <div style={valueStyle}>{user?.auth_provider === 'azure_ad' ? 'Microsoft 365' : 'Locale'}</div>
          </div>
        </div>
      </div>

      {isLocal && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 16px 0' }}>Cambia Password</h3>
          <form onSubmit={handleChangePassword} style={{ maxWidth: '400px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Password attuale</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={inputStyle} required />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Nuova password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={inputStyle} required />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Conferma nuova password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={inputStyle} required />
            </div>
            {error && <p style={{ color: '#e53e3e', marginBottom: '12px' }}>{error}</p>}
            {message && <p style={{ color: '#38a169', marginBottom: '12px' }}>{message}</p>}
            <button type="submit" disabled={loading} style={btnStyle}>
              {loading ? 'Salvataggio...' : 'Cambia Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'white', padding: '24px', borderRadius: '8px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '24px',
};
const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: '4px', fontSize: '13px', color: '#718096', fontWeight: 500,
};
const valueStyle: React.CSSProperties = { fontSize: '15px', color: '#2d3748' };
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0',
  borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box',
};
const btnStyle: React.CSSProperties = {
  padding: '10px 20px', background: '#1a365d', color: 'white',
  border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500,
};
