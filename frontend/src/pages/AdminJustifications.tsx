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
      <h2 style={{ color: '#333', marginBottom: '24px' }}>Gestione Giustificativi</h2>

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
              <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#aaa' }}>Nessun giustificativo</td></tr>
            )}
            {justifications.map((j) => (
              <tr key={j.id}>
                <td style={tdStyle}>{j.user_name || '-'}</td>
                <td style={tdStyle}>{new Date(j.date + 'T00:00:00').toLocaleDateString('it-IT')}</td>
                <td style={tdStyle}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '13px',
                    background: j.type === 'ferie' ? '#e0f7fa' : '#fce4ec',
                    color: j.type === 'ferie' ? '#00838f' : '#c2185b',
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
  switch (s) { case 'approvato': return '#e8f5e9'; case 'rifiutato': return '#ffebee'; case 'in_attesa': return '#fff8e1'; default: return '#f4f6f9'; }
}
function statusFg(s: string) {
  switch (s) { case 'approvato': return '#2e7d32'; case 'rifiutato': return '#c62828'; case 'in_attesa': return '#f57f17'; default: return '#555'; }
}

const cardStyle: React.CSSProperties = { background: 'white', padding: '24px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '24px', border: '1px solid #e8ecf1' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '6px', fontSize: '13px', color: '#888', fontWeight: 500 };
const inputStyle: React.CSSProperties = { padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '14px' };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #e8ecf1', color: '#555', fontWeight: 600, fontSize: '13px' };
const tdStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid #e8ecf1' };
const approveBtnStyle: React.CSSProperties = { padding: '4px 12px', background: '#e8f5e9', color: '#2e7d32', border: '1px solid #c8e6c9', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' };
const rejectBtnStyle: React.CSSProperties = { padding: '4px 12px', background: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' };
