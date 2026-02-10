import { useState, useEffect } from 'react';
import api from '../services/api';
import { Justification } from '../types';

export default function Justifications() {
  const [justifications, setJustifications] = useState<Justification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState('');
  const [formType, setFormType] = useState<'ferie' | 'permesso'>('ferie');
  const [formReason, setFormReason] = useState('');
  const [error, setError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchJustifications = async () => {
    try {
      const res = await api.get('/justifications/my');
      setJustifications(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Errore caricamento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJustifications(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');
    try {
      await api.post('/justifications/', {
        date: formDate,
        type: formType,
        reason: formReason || null,
      });
      setShowForm(false);
      setFormDate('');
      setFormReason('');
      fetchJustifications();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Errore creazione giustificativo');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questo giustificativo?')) return;
    try {
      await api.delete(`/justifications/${id}`);
      fetchJustifications();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Errore eliminazione');
    }
  };

  if (loading) return <div>Caricamento...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ color: '#1a365d', margin: 0 }}>I Miei Giustificativi</h2>
        <button onClick={() => setShowForm(!showForm)} style={primaryBtnStyle}>
          {showForm ? 'Annulla' : 'Nuovo Giustificativo'}
        </button>
      </div>

      {error && <p style={{ color: '#e53e3e', marginBottom: '16px' }}>{error}</p>}

      {showForm && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 16px 0' }}>Nuovo Giustificativo</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Data</label>
                <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>Tipo</label>
                <select value={formType} onChange={(e) => setFormType(e.target.value as 'ferie' | 'permesso')} style={inputStyle}>
                  <option value="ferie">Ferie</option>
                  <option value="permesso">Permesso</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Motivazione (opzionale)</label>
                <input type="text" value={formReason} onChange={(e) => setFormReason(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <button type="submit" disabled={submitLoading} style={primaryBtnStyle}>
              {submitLoading ? 'Invio...' : 'Invia Richiesta'}
            </button>
          </form>
        </div>
      )}

      <div style={cardStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Data</th>
              <th style={thStyle}>Tipo</th>
              <th style={thStyle}>Stato</th>
              <th style={thStyle}>Motivazione</th>
              <th style={thStyle}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {justifications.length === 0 && (
              <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: '#a0aec0' }}>Nessun giustificativo</td></tr>
            )}
            {justifications.map((j) => (
              <tr key={j.id}>
                <td style={tdStyle}>{new Date(j.date + 'T00:00:00').toLocaleDateString('it-IT')}</td>
                <td style={tdStyle}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    background: j.type === 'ferie' ? '#ebf8ff' : '#faf5ff',
                    color: j.type === 'ferie' ? '#2b6cb0' : '#6b46c1',
                  }}>
                    {j.type === 'ferie' ? 'Ferie' : 'Permesso'}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: 500,
                    background: statusBg(j.status),
                    color: statusFg(j.status),
                  }}>
                    {statusLabel(j.status)}
                  </span>
                </td>
                <td style={tdStyle}>{j.reason || '-'}</td>
                <td style={tdStyle}>
                  {(j.status === 'in_attesa' || j.status === 'inserito') && (
                    <button onClick={() => handleDelete(j.id)} style={deleteBtnStyle}>Elimina</button>
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
  switch (s) {
    case 'in_attesa': return 'In Attesa';
    case 'approvato': return 'Approvato';
    case 'rifiutato': return 'Rifiutato';
    case 'inserito': return 'Inserito';
    default: return s;
  }
}

function statusBg(s: string) {
  switch (s) {
    case 'approvato': return '#f0fff4';
    case 'rifiutato': return '#fff5f5';
    case 'in_attesa': return '#fffff0';
    default: return '#f7fafc';
  }
}

function statusFg(s: string) {
  switch (s) {
    case 'approvato': return '#276749';
    case 'rifiutato': return '#9b2c2c';
    case 'in_attesa': return '#975a16';
    default: return '#4a5568';
  }
}

const cardStyle: React.CSSProperties = {
  background: 'white',
  padding: '24px',
  borderRadius: '8px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  marginBottom: '24px',
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '10px 20px',
  background: '#1a365d',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontWeight: 500,
};

const deleteBtnStyle: React.CSSProperties = {
  padding: '4px 12px',
  background: '#fff5f5',
  color: '#e53e3e',
  border: '1px solid #fed7d7',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '13px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '6px',
  fontSize: '14px',
  color: '#4a5568',
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #e2e8f0',
  borderRadius: '4px',
  fontSize: '14px',
  boxSizing: 'border-box',
};

const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '14px' };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #e2e8f0', color: '#4a5568', fontWeight: 600, fontSize: '13px' };
const tdStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid #e2e8f0' };
