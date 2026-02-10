import { useState, useEffect } from 'react';
import api from '../services/api';
import { Justification } from '../types';

export default function AdminJustifications() {
  const [justifications, setJustifications] = useState<Justification[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('in_attesa');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchJustifications = async () => {
    try {
      const params = statusFilter ? `?status_filter=${statusFilter}` : '';
      const res = await api.get(`/justifications/admin/all${params}`);
      setJustifications(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Errore caricamento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJustifications(); }, [statusFilter]);

  const handleReview = async (id: string, status: 'approvato' | 'rifiutato') => {
    setActionLoading(id);
    setError('');
    try {
      await api.put(`/justifications/admin/${id}/review`, { status });
      fetchJustifications();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Errore revisione');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div>Caricamento...</div>;

  return (
    <div>
      <h2 style={{ color: '#1a365d', marginBottom: '24px' }}>Gestione Giustificativi</h2>

      <div style={cardStyle}>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Filtra per stato</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
            <option value="">Tutti</option>
            <option value="in_attesa">In Attesa</option>
            <option value="approvato">Approvati</option>
            <option value="rifiutato">Rifiutati</option>
          </select>
        </div>

        {error && <p style={{ color: '#e53e3e', marginBottom: '12px' }}>{error}</p>}

        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Dipendente</th>
              <th style={thStyle}>Data</th>
              <th style={thStyle}>Tipo</th>
              <th style={thStyle}>Motivazione</th>
              <th style={thStyle}>Stato</th>
              <th style={thStyle}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {justifications.length === 0 && (
              <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#a0aec0' }}>Nessun giustificativo</td></tr>
            )}
            {justifications.map((j) => (
              <tr key={j.id}>
                <td style={tdStyle}>{j.user_name || '-'}</td>
                <td style={tdStyle}>{new Date(j.date + 'T00:00:00').toLocaleDateString('it-IT')}</td>
                <td style={tdStyle}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '13px',
                    background: j.type === 'ferie' ? '#ebf8ff' : '#faf5ff',
                    color: j.type === 'ferie' ? '#2b6cb0' : '#6b46c1',
                  }}>
                    {j.type === 'ferie' ? 'Ferie' : 'Permesso'}
                  </span>
                </td>
                <td style={tdStyle}>{j.reason || '-'}</td>
                <td style={tdStyle}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '13px', fontWeight: 500,
                    background: statusBg(j.status), color: statusFg(j.status),
                  }}>
                    {statusLabel(j.status)}
                  </span>
                </td>
                <td style={tdStyle}>
                  {j.status === 'in_attesa' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleReview(j.id, 'approvato')}
                        disabled={actionLoading === j.id}
                        style={approveBtnStyle}
                      >
                        Approva
                      </button>
                      <button
                        onClick={() => handleReview(j.id, 'rifiutato')}
                        disabled={actionLoading === j.id}
                        style={rejectBtnStyle}
                      >
                        Rifiuta
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function statusLabel(s: string) {
  switch (s) { case 'in_attesa': return 'In Attesa'; case 'approvato': return 'Approvato'; case 'rifiutato': return 'Rifiutato'; default: return s; }
}
function statusBg(s: string) {
  switch (s) { case 'approvato': return '#f0fff4'; case 'rifiutato': return '#fff5f5'; case 'in_attesa': return '#fffff0'; default: return '#f7fafc'; }
}
function statusFg(s: string) {
  switch (s) { case 'approvato': return '#276749'; case 'rifiutato': return '#9b2c2c'; case 'in_attesa': return '#975a16'; default: return '#4a5568'; }
}

const cardStyle: React.CSSProperties = { background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '24px' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '6px', fontSize: '13px', color: '#718096', fontWeight: 500 };
const inputStyle: React.CSSProperties = { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '14px' };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '14px' };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #e2e8f0', color: '#4a5568', fontWeight: 600, fontSize: '13px' };
const tdStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid #e2e8f0' };
const approveBtnStyle: React.CSSProperties = { padding: '4px 12px', background: '#f0fff4', color: '#276749', border: '1px solid #c6f6d5', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' };
const rejectBtnStyle: React.CSSProperties = { padding: '4px 12px', background: '#fff5f5', color: '#9b2c2c', border: '1px solid #fed7d7', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' };
