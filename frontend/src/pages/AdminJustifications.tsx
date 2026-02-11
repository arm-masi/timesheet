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
      <h2 style={{ color: 'var(--text-primary)', marginBottom: '24px' }}>Gestione Giustificativi</h2>

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

        {error && <p style={{ color: 'var(--badge-error-text)', marginBottom: '12px' }}>{error}</p>}

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
              <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-placeholder)' }}>Nessun giustificativo</td></tr>
            )}
            {justifications.map((j) => (
              <tr key={j.id}>
                <td style={tdStyle}>{j.user_name || '-'}</td>
                <td style={tdStyle}>{new Date(j.date + 'T00:00:00').toLocaleDateString('it-IT')}</td>
                <td style={tdStyle}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '13px',
                    background: j.type === 'ferie' ? 'var(--badge-info-bg)' : 'var(--badge-accent-bg)',
                    color: j.type === 'ferie' ? 'var(--badge-info-text)' : 'var(--badge-accent-text)',
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
  switch (s) { case 'approvato': return 'var(--badge-success-bg)'; case 'rifiutato': return 'var(--badge-error-bg)'; case 'in_attesa': return 'var(--badge-warning-bg)'; default: return 'var(--bg-section)'; }
}
function statusFg(s: string) {
  switch (s) { case 'approvato': return 'var(--badge-success-text)'; case 'rifiutato': return 'var(--badge-error-text)'; case 'in_attesa': return 'var(--badge-warning-text)'; default: return 'var(--text-secondary)'; }
}

const cardStyle: React.CSSProperties = { background: 'var(--bg-card)', padding: '24px', borderRadius: '10px', boxShadow: 'var(--shadow)', marginBottom: '24px', border: '1px solid var(--border)' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 };
const inputStyle: React.CSSProperties = { padding: '8px 12px', border: '1px solid var(--input-border)', borderRadius: '6px', fontSize: '14px' };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '14px' };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '13px' };
const tdStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid var(--border)' };
const approveBtnStyle: React.CSSProperties = { padding: '4px 12px', background: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', border: '1px solid var(--badge-success-border)', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' };
const rejectBtnStyle: React.CSSProperties = { padding: '4px 12px', background: 'var(--badge-error-bg)', color: 'var(--badge-error-text)', border: '1px solid var(--badge-error-border)', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' };
