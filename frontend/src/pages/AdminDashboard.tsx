import { useState, useEffect } from 'react';
import api from '../services/api';
import { User, MonthlySummary } from '../types';

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  useEffect(() => {
    api.get('/users/')
      .then(res => {
        setUsers(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.detail || 'Errore caricamento utenti');
        setLoading(false);
      });
  }, []);

  const fetchSummary = async () => {
    if (!selectedUser) return;
    setError('');
    try {
      const res = await api.get(`/attendance/admin/user/${selectedUser}/summary?year=${year}&month=${month}`);
      setSummary(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Errore caricamento riepilogo');
    }
  };

  useEffect(() => {
    if (selectedUser) fetchSummary();
  }, [selectedUser, year, month]);

  if (loading) return <div>Caricamento...</div>;

  return (
    <div>
      <h2 style={{ color: '#1a365d', marginBottom: '24px' }}>Admin - Gestione Presenze</h2>

      <div style={cardStyle}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={labelStyle}>Dipendente</label>
            <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} style={inputStyle}>
              <option value="">Seleziona...</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>)}
            </select>
          </div>
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
      </div>

      {error && <p style={{ color: '#e53e3e', marginBottom: '16px' }}>{error}</p>}

      {summary && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 16px 0' }}>
            Riepilogo: {summary.user_name} - {new Date(year, month - 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            <StatBox label="Giorni lavorati" value={summary.total_worked_days} />
            <StatBox label="Ferie" value={summary.total_ferie_days} />
            <StatBox label="Permessi" value={summary.total_permesso_days} />
            <StatBox label="Non giustificati" value={summary.total_missing_days} color={summary.total_missing_days > 0 ? '#e53e3e' : undefined} />
            <StatBox label="Ore totali" value={summary.total_hours} />
          </div>

          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Data</th>
                <th style={thStyle}>Entrata</th>
                <th style={thStyle}>Uscita</th>
                <th style={thStyle}>Ore</th>
                <th style={thStyle}>Deficit</th>
                <th style={thStyle}>Stato</th>
              </tr>
            </thead>
            <tbody>
              {summary.daily_details.map((d) => (
                <tr key={d.date} style={{ background: d.is_missing ? '#fff5f5' : 'white' }}>
                  <td style={tdStyle}>{new Date(d.date + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' })}</td>
                  <td style={tdStyle}>{d.clock_in || '-'}</td>
                  <td style={tdStyle}>{d.clock_out || '-'}</td>
                  <td style={tdStyle}>{d.worked_hours}</td>
                  <td style={tdStyle}>{d.deficit_hours > 0 ? <span style={{ color: '#e53e3e' }}>{d.deficit_hours}h</span> : '-'}</td>
                  <td style={tdStyle}>
                    {d.is_missing && <span style={{ color: '#e53e3e', fontWeight: 500 }}>Da giustificare</span>}
                    {d.has_justification && (
                      <span style={{ color: d.justification_status === 'approvato' ? '#38a169' : '#d69e2e', fontWeight: 500 }}>
                        {d.justification_type} ({d.justification_status})
                      </span>
                    )}
                    {!d.is_missing && !d.has_justification && d.clock_in && <span style={{ color: '#38a169' }}>OK</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ background: '#f7fafc', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
      <div style={{ fontSize: '20px', fontWeight: 'bold', color: color || '#2d3748' }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#718096' }}>{label}</div>
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '24px' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '6px', fontSize: '13px', color: '#718096', fontWeight: 500 };
const inputStyle: React.CSSProperties = { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '14px' };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '14px' };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #e2e8f0', color: '#4a5568', fontWeight: 600, fontSize: '13px' };
const tdStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid #e2e8f0' };
