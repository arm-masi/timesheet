import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { OfficeLocationInfo } from '../types';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [officeLocations, setOfficeLocations] = useState<OfficeLocationInfo[]>([]);
  const [selectedOffice, setSelectedOffice] = useState(user?.office_location || '');
  const [officeLoading, setOfficeLoading] = useState(false);
  const [officeMessage, setOfficeMessage] = useState('');
  const [officeError, setOfficeError] = useState('');

  const isLocal = user?.auth_provider === 'local';

  useEffect(() => {
    api.get('/users/office-locations').then(res => {
      setOfficeLocations(res.data);
    });
  }, []);

  useEffect(() => {
    setSelectedOffice(user?.office_location || '');
  }, [user?.office_location]);

  const handleOfficeChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOffice) return;
    setOfficeLoading(true);
    setOfficeError('');
    setOfficeMessage('');
    try {
      await api.put('/users/me/office-location', { office_location: selectedOffice });
      setOfficeMessage('Sede aggiornata con successo');
      refreshUser();
    } catch (err: any) {
      setOfficeError(err.response?.data?.detail || 'Errore aggiornamento sede');
    } finally {
      setOfficeLoading(false);
    }
  };

  const selectedOfficeInfo = officeLocations.find(o => o.key === selectedOffice);

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
      <h2 style={{ color: 'var(--text-primary)', marginBottom: '24px' }}>Profilo Utente</h2>

      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)' }}>Informazioni</h3>
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

      {/* Office Location */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)' }}>Sede di lavoro</h3>
        <form onSubmit={handleOfficeChange} style={{ maxWidth: '500px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Seleziona la tua sede</label>
            <select
              value={selectedOffice}
              onChange={(e) => setSelectedOffice(e.target.value)}
              style={selectStyle}
              required
            >
              <option value="">-- Seleziona sede --</option>
              {officeLocations.map(loc => (
                <option key={loc.key} value={loc.key}>{loc.label} - {loc.address}</option>
              ))}
            </select>
          </div>
          {selectedOfficeInfo && (
            <div style={patronSaintStyle}>
              <span style={{ fontWeight: 600 }}>Santo Patrono:</span> {selectedOfficeInfo.patron_saint} ({selectedOfficeInfo.patron_saint_date})
              <br />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Questo giorno sarà automaticamente considerato festivo.
              </span>
            </div>
          )}
          {officeError && <p style={{ color: 'var(--badge-error-text)', marginBottom: '12px' }}>{officeError}</p>}
          {officeMessage && <p style={{ color: 'var(--green)', marginBottom: '12px' }}>{officeMessage}</p>}
          <button type="submit" disabled={officeLoading || !selectedOffice} style={btnStyle}>
            {officeLoading ? 'Salvataggio...' : 'Salva Sede'}
          </button>
        </form>
      </div>

      {isLocal && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)' }}>Cambia Password</h3>
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
            {error && <p style={{ color: 'var(--badge-error-text)', marginBottom: '12px' }}>{error}</p>}
            {message && <p style={{ color: 'var(--green)', marginBottom: '12px' }}>{message}</p>}
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
  background: 'var(--bg-card)', padding: '24px', borderRadius: '10px',
  boxShadow: 'var(--shadow)', marginBottom: '24px', border: '1px solid var(--border)',
};
const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500,
};
const valueStyle: React.CSSProperties = { fontSize: '15px', color: 'var(--text-primary)' };
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid var(--input-border)',
  borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box',
};
const selectStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid var(--input-border)',
  borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box',
  background: 'var(--bg-card)', color: 'var(--text-primary)',
};
const patronSaintStyle: React.CSSProperties = {
  padding: '12px 16px', background: 'var(--badge-info-bg)', color: 'var(--badge-info-text)',
  borderRadius: '8px', marginBottom: '16px', fontSize: '14px',
  border: '1px solid var(--badge-info-border)',
};
const btnStyle: React.CSSProperties = {
  padding: '10px 20px', background: 'var(--brand-cyan)', color: 'var(--bg-card)',
  border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600,
};
