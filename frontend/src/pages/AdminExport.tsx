import { useState } from 'react';
import api from '../services/api';

export default function AdminExport() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleExport = async (format: 'csv' | 'excel') => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/export/payroll?year=${year}&month=${month}&format=${format}`, {
        responseType: 'blob',
      });
      const ext = format === 'csv' ? 'csv' : 'xlsx';
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `paghe_${year}_${String(month).padStart(2, '0')}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('Errore durante l\'export');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ color: 'var(--text-primary)', marginBottom: '24px' }}>Export Paghe</h2>

      <div style={cardStyle}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Genera il report mensile delle paghe per tutti i dipendenti attivi.
          Il report include: giorni lavorati, ferie, permessi e ore totali.
        </p>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div>
            <label style={labelStyle}>Anno</label>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ ...inputStyle, width: '100px' }} />
          </div>
          <div>
            <label style={labelStyle}>Mese</label>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={inputStyle}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2024, i).toLocaleDateString('it-IT', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p style={{ color: 'var(--badge-error-text)', marginBottom: '16px' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => handleExport('csv')} disabled={loading} style={exportBtnStyle}>
            {loading ? 'Export...' : 'Scarica CSV'}
          </button>
          <button onClick={() => handleExport('excel')} disabled={loading} style={{ ...exportBtnStyle, background: 'var(--green)' }}>
            {loading ? 'Export...' : 'Scarica Excel'}
          </button>
        </div>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: 'var(--bg-card)', padding: '24px', borderRadius: '10px', boxShadow: 'var(--shadow)', border: '1px solid var(--border)' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 };
const inputStyle: React.CSSProperties = { padding: '8px 12px', border: '1px solid var(--input-border)', borderRadius: '6px', fontSize: '14px' };
const exportBtnStyle: React.CSSProperties = {
  padding: '12px 24px', background: 'var(--brand-cyan)', color: 'var(--bg-card)',
  border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px',
};
