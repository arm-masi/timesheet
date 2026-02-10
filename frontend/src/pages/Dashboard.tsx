import { useState, useEffect } from 'react';
import api from '../services/api';
import { Attendance, MonthlySummary } from '../types';

export default function Dashboard() {
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [clockLoading, setClockLoading] = useState(false);
  const [error, setError] = useState('');

  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month] = useState(now.getMonth() + 1);

  const fetchData = async () => {
    try {
      const [todayRes, summaryRes] = await Promise.all([
        api.get('/attendance/today'),
        api.get(`/attendance/my-summary?year=${year}&month=${month}`),
      ]);
      setTodayAttendance(todayRes.data);
      setSummary(summaryRes.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Errore nel caricamento dati');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleClockIn = async () => {
    setClockLoading(true);
    setError('');
    try {
      const res = await api.post('/attendance/clock-in', {});
      setTodayAttendance(res.data);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Errore timbratura entrata');
    } finally {
      setClockLoading(false);
    }
  };

  const handleClockOut = async () => {
    setClockLoading(true);
    setError('');
    try {
      const res = await api.post('/attendance/clock-out', {});
      setTodayAttendance(res.data);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Errore timbratura uscita');
    } finally {
      setClockLoading(false);
    }
  };

  if (loading) return <div>Caricamento...</div>;

  const canClockIn = !todayAttendance || !todayAttendance.clock_in;
  const canClockOut = todayAttendance?.clock_in && !todayAttendance.clock_out;

  return (
    <div>
      <h2 style={{ marginBottom: '24px', color: '#1a365d' }}>Dashboard</h2>

      {/* Clock In/Out Card */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px 0', color: '#2d3748' }}>
          Timbratura - {new Date().toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </h3>

        {todayAttendance && (
          <div style={{ marginBottom: '16px', display: 'flex', gap: '24px' }}>
            {todayAttendance.clock_in && (
              <span style={badgeGreen}>Entrata: {todayAttendance.clock_in}</span>
            )}
            {todayAttendance.clock_out && (
              <span style={badgeBlue}>Uscita: {todayAttendance.clock_out}</span>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          {canClockIn && (
            <button onClick={handleClockIn} disabled={clockLoading} style={clockInBtnStyle}>
              {clockLoading ? '...' : 'Timbra Entrata'}
            </button>
          )}
          {canClockOut && (
            <button onClick={handleClockOut} disabled={clockLoading} style={clockOutBtnStyle}>
              {clockLoading ? '...' : 'Timbra Uscita'}
            </button>
          )}
          {todayAttendance?.clock_in && todayAttendance?.clock_out && (
            <span style={{ color: '#38a169', fontWeight: 500 }}>Giornata completata</span>
          )}
        </div>

        {error && <p style={{ color: '#e53e3e', marginTop: '12px', fontSize: '14px' }}>{error}</p>}
      </div>

      {/* Monthly Summary */}
      {summary && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 16px 0', color: '#2d3748' }}>
            Riepilogo {new Date(year, month - 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <StatCard label="Giorni lavorati" value={summary.total_worked_days} />
            <StatCard label="Ferie" value={summary.total_ferie_days} />
            <StatCard label="Permessi" value={summary.total_permesso_days} />
            <StatCard label="Non giustificati" value={summary.total_missing_days} color={summary.total_missing_days > 0 ? '#e53e3e' : undefined} />
            <StatCard label="Ore totali" value={summary.total_hours} />
          </div>

          {/* Daily Details Table */}
          <div style={{ overflowX: 'auto' }}>
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
                  <tr key={d.date} style={{ background: d.is_missing ? '#fff5f5' : d.has_justification ? '#fffff0' : 'white' }}>
                    <td style={tdStyle}>{new Date(d.date + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' })}</td>
                    <td style={tdStyle}>{d.clock_in || '-'}</td>
                    <td style={tdStyle}>{d.clock_out || '-'}</td>
                    <td style={tdStyle}>{d.worked_hours}</td>
                    <td style={tdStyle}>{d.deficit_hours > 0 ? <span style={{ color: '#e53e3e' }}>{d.deficit_hours}h</span> : '-'}</td>
                    <td style={tdStyle}>
                      {d.is_missing && <span style={{ color: '#e53e3e', fontWeight: 500 }}>Da giustificare</span>}
                      {d.has_justification && (
                        <span style={{ color: statusColor(d.justification_status), fontWeight: 500 }}>
                          {d.justification_type} ({d.justification_status})
                        </span>
                      )}
                      {!d.is_missing && !d.has_justification && d.clock_in && d.clock_out && (
                        <span style={{ color: '#38a169' }}>OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ background: '#f7fafc', padding: '16px', borderRadius: '6px', textAlign: 'center' }}>
      <div style={{ fontSize: '24px', fontWeight: 'bold', color: color || '#2d3748' }}>{value}</div>
      <div style={{ fontSize: '13px', color: '#718096', marginTop: '4px' }}>{label}</div>
    </div>
  );
}

function statusColor(status: string | null): string {
  switch (status) {
    case 'approvato': return '#38a169';
    case 'rifiutato': return '#e53e3e';
    case 'in_attesa': return '#d69e2e';
    default: return '#718096';
  }
}

const cardStyle: React.CSSProperties = {
  background: 'white',
  padding: '24px',
  borderRadius: '8px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  marginBottom: '24px',
};

const clockInBtnStyle: React.CSSProperties = {
  padding: '12px 32px',
  background: '#38a169',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '15px',
  cursor: 'pointer',
  fontWeight: 600,
};

const clockOutBtnStyle: React.CSSProperties = {
  padding: '12px 32px',
  background: '#e53e3e',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '15px',
  cursor: 'pointer',
  fontWeight: 600,
};

const badgeGreen: React.CSSProperties = {
  background: '#f0fff4',
  color: '#276749',
  padding: '6px 12px',
  borderRadius: '4px',
  fontSize: '14px',
  fontWeight: 500,
};

const badgeBlue: React.CSSProperties = {
  background: '#ebf8ff',
  color: '#2a4365',
  padding: '6px 12px',
  borderRadius: '4px',
  fontSize: '14px',
  fontWeight: 500,
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '14px',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  borderBottom: '2px solid #e2e8f0',
  color: '#4a5568',
  fontSize: '13px',
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid #e2e8f0',
};
