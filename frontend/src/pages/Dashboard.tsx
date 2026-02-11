import { useState, useEffect } from 'react';
import api from '../services/api';
import { Attendance, MonthlySummary } from '../types';

export default function Dashboard() {
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [clockLoading, setClockLoading] = useState(false);
  const [error, setError] = useState('');
  const [justifyLoading, setJustifyLoading] = useState<string | null>(null);
  const [justifyError, setJustifyError] = useState('');

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const fetchData = async () => {
    setLoading(true);
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

  useEffect(() => { fetchData(); }, [year, month]);

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

  const handleJustify = async (dateStr: string, type: 'ferie' | 'permesso') => {
    setJustifyLoading(dateStr);
    setJustifyError('');
    try {
      await api.post('/justifications/', { date: dateStr, type });
      fetchData();
    } catch (err: any) {
      setJustifyError(err.response?.data?.detail || 'Errore inserimento giustificativo');
    } finally {
      setJustifyLoading(null);
    }
  };

  const prevMonth = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else { setMonth(month - 1); }
  };

  const nextMonth = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else { setMonth(month + 1); }
  };

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  if (loading) return <div>Caricamento...</div>;

  const canClockIn = !todayAttendance || !todayAttendance.clock_in;
  const canClockOut = todayAttendance?.clock_in && !todayAttendance.clock_out;

  return (
    <div>
      <h2 style={{ marginBottom: '24px', color: 'var(--text-primary)' }}>Dashboard</h2>

      {/* Clock In/Out Card */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)' }}>
          Timbratura - {new Date().toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </h3>

        {todayAttendance && (
          <div style={{ marginBottom: '16px', display: 'flex', gap: '24px' }}>
            {todayAttendance.clock_in && (
              <span style={badgeGreen}>Entrata: {todayAttendance.clock_in}</span>
            )}
            {todayAttendance.clock_out && (
              <span style={badgeCyan}>Uscita: {todayAttendance.clock_out}</span>
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
            <span style={{ color: 'var(--green)', fontWeight: 500 }}>Giornata completata</span>
          )}
        </div>

        {error && <p style={{ color: 'var(--badge-error-text)', marginTop: '12px', fontSize: '14px' }}>{error}</p>}
      </div>

      {/* Monthly Summary */}
      {summary && (
        <div style={cardStyle}>
          {/* Month navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <button onClick={prevMonth} style={navBtnStyle}>&larr; Mese precedente</button>
            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
              Riepilogo {new Date(year, month - 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
            </h3>
            <button onClick={nextMonth} disabled={isCurrentMonth} style={{ ...navBtnStyle, opacity: isCurrentMonth ? 0.4 : 1 }}>
              Mese successivo &rarr;
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <StatCard label="Giorni lavorati" value={summary.total_worked_days} />
            <StatCard label="Ferie" value={summary.total_ferie_days} />
            <StatCard label="Permessi" value={summary.total_permesso_days} />
            <StatCard label="Non giustificati" value={summary.total_missing_days} color={summary.total_missing_days > 0 ? 'var(--badge-error-text)' : undefined} />
            <StatCard label="Ore totali" value={summary.total_hours} />
          </div>

          {justifyError && <p style={{ color: 'var(--badge-error-text)', marginBottom: '12px', fontSize: '14px' }}>{justifyError}</p>}

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
                  <th style={thStyle}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {summary.daily_details.map((d) => (
                  <tr key={d.date} style={{ background: d.is_missing ? 'var(--row-missing)' : d.has_justification ? 'var(--row-justified)' : 'var(--bg-card)' }}>
                    <td style={tdStyle}>{new Date(d.date + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' })}</td>
                    <td style={tdStyle}>{d.clock_in || '-'}</td>
                    <td style={tdStyle}>{d.clock_out || '-'}</td>
                    <td style={tdStyle}>{d.worked_hours}</td>
                    <td style={tdStyle}>{d.deficit_hours > 0 ? <span style={{ color: 'var(--badge-error-text)' }}>{d.deficit_hours}h</span> : '-'}</td>
                    <td style={tdStyle}>
                      {d.is_missing && <span style={{ color: 'var(--badge-error-text)', fontWeight: 500 }}>Da giustificare</span>}
                      {d.has_justification && (
                        <span style={{ color: statusColor(d.justification_status), fontWeight: 500 }}>
                          {d.justification_type === 'ferie' ? 'Ferie' : 'Permesso'} ({statusLabel(d.justification_status)})
                        </span>
                      )}
                      {!d.is_missing && !d.has_justification && d.clock_in && d.clock_out && (
                        <span style={{ color: 'var(--green)' }}>OK</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      {d.is_missing && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => handleJustify(d.date, 'ferie')}
                            disabled={justifyLoading === d.date}
                            style={ferieBtnStyle}
                          >
                            {justifyLoading === d.date ? '...' : 'Ferie'}
                          </button>
                          <button
                            onClick={() => handleJustify(d.date, 'permesso')}
                            disabled={justifyLoading === d.date}
                            style={permessoBtnStyle}
                          >
                            {justifyLoading === d.date ? '...' : 'Permesso'}
                          </button>
                        </div>
                      )}
                      {d.has_justification && d.deficit_hours > 0 && !d.is_missing && (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Coperto</span>
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
    <div style={{ background: 'var(--bg-section)', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: '24px', fontWeight: 'bold', color: color || 'var(--brand-cyan)' }}>{value}</div>
      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{label}</div>
    </div>
  );
}

function statusColor(status: string | null): string {
  switch (status) {
    case 'approvato': return 'var(--green)';
    case 'rifiutato': return 'var(--badge-error-text)';
    case 'in_attesa': return 'var(--badge-warning-text)';
    default: return 'var(--text-muted)';
  }
}

function statusLabel(status: string | null): string {
  switch (status) {
    case 'approvato': return 'Approvato';
    case 'rifiutato': return 'Rifiutato';
    case 'in_attesa': return 'In attesa';
    default: return status || '';
  }
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  padding: '24px',
  borderRadius: '10px',
  boxShadow: 'var(--shadow)',
  marginBottom: '24px',
  border: '1px solid var(--border)',
};

const clockInBtnStyle: React.CSSProperties = {
  padding: '12px 32px',
  background: 'var(--brand-cyan)',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: '15px',
  cursor: 'pointer',
  fontWeight: 600,
};

const clockOutBtnStyle: React.CSSProperties = {
  padding: '12px 32px',
  background: 'var(--brand-magenta)',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: '15px',
  cursor: 'pointer',
  fontWeight: 600,
};

const navBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: 'var(--bg-section)',
  color: 'var(--text-secondary)',
  border: '1px solid var(--input-border)',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 500,
};

const ferieBtnStyle: React.CSSProperties = {
  padding: '3px 10px',
  background: 'var(--badge-info-bg)',
  color: 'var(--badge-info-text)',
  border: '1px solid var(--badge-info-border)',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 500,
};

const permessoBtnStyle: React.CSSProperties = {
  padding: '3px 10px',
  background: 'var(--badge-accent-bg)',
  color: 'var(--badge-accent-text)',
  border: '1px solid var(--badge-accent-border)',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 500,
};

const badgeGreen: React.CSSProperties = {
  background: 'var(--badge-success-bg)',
  color: 'var(--badge-success-text)',
  padding: '6px 12px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 500,
};

const badgeCyan: React.CSSProperties = {
  background: 'var(--badge-info-bg)',
  color: 'var(--badge-info-text)',
  padding: '6px 12px',
  borderRadius: '6px',
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
  borderBottom: '2px solid var(--border)',
  color: 'var(--text-secondary)',
  fontSize: '13px',
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid var(--border)',
};
