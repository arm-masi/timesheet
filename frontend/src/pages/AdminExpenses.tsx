import { useState, useEffect } from 'react';
import api from '../services/api';
import { Expense } from '../types';

const TYPE_LABELS: Record<string, string> = {
  viaggio: 'Viaggio', autostrada: 'Autostrada', soggiorno: 'Soggiorno',
  parcheggio: 'Parcheggio', pasti: 'Pasti', altro: 'Altro',
};

export default function AdminExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('in_attesa');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchExpenses = async () => {
    try {
      const params = statusFilter ? `?status_filter=${statusFilter}` : '';
      const res = await api.get(`/expenses/admin/all${params}`);
      setExpenses(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Errore caricamento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExpenses(); }, [statusFilter]);

  const handleReview = async (id: string, status: 'approvato' | 'rifiutato') => {
    setActionLoading(id);
    setError('');
    try {
      await api.put(`/expenses/admin/${id}/review`, { status });
      fetchExpenses();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Errore revisione');
    } finally {
      setActionLoading(null);
    }
  };

  const downloadReceipt = (id: string, filename: string) => {
    api.get(`/expenses/receipt/${id}`, { responseType: 'blob' }).then((res) => {
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    });
  };

  if (loading) return <div>Caricamento...</div>;

  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
  const totalKm = expenses.reduce((s, e) => s + (e.km_total || 0), 0);

  return (
    <div>
      <h2 style={{ color: '#1a365d', marginBottom: '24px' }}>Gestione Note Spese</h2>

      <div style={cardStyle}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', marginBottom: '16px' }}>
          <div>
            <label style={labelStyle}>Filtra per stato</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
              <option value="">Tutti</option>
              <option value="in_attesa">In Attesa</option>
              <option value="approvato">Approvati</option>
              <option value="rifiutato">Rifiutati</option>
            </select>
          </div>
          <div style={{ fontSize: '14px', color: '#4a5568' }}>
            Totale spese: <strong>{totalAmount.toFixed(2)} EUR</strong> | Totale km: <strong>{totalKm.toFixed(2)} EUR</strong>
          </div>
        </div>

        {error && <p style={{ color: '#e53e3e', marginBottom: '12px' }}>{error}</p>}

        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Dipendente</th>
                <th style={thStyle}>Data</th>
                <th style={thStyle}>Tipo</th>
                <th style={thStyle}>Descrizione</th>
                <th style={thStyle}>Importo</th>
                <th style={thStyle}>Km</th>
                <th style={thStyle}>EUR/Km</th>
                <th style={thStyle}>Tot Km</th>
                <th style={thStyle}>PDF</th>
                <th style={thStyle}>Stato</th>
                <th style={thStyle}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 && (
                <tr><td colSpan={11} style={{ ...tdStyle, textAlign: 'center', color: '#a0aec0' }}>Nessuna nota spesa</td></tr>
              )}
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td style={tdStyle}>{e.user_name || '-'}</td>
                  <td style={tdStyle}>{new Date(e.date + 'T00:00:00').toLocaleDateString('it-IT')}</td>
                  <td style={tdStyle}><span style={typeBadge}>{TYPE_LABELS[e.expense_type] || e.expense_type}</span></td>
                  <td style={tdStyle}>{e.description}</td>
                  <td style={tdStyle}><strong>{e.amount.toFixed(2)}</strong></td>
                  <td style={tdStyle}>{e.km ?? '-'}</td>
                  <td style={tdStyle}>{e.cost_per_km ?? '-'}</td>
                  <td style={tdStyle}>{e.km_total ? e.km_total.toFixed(2) : '-'}</td>
                  <td style={tdStyle}>
                    {e.receipt_filename ? (
                      <button onClick={() => downloadReceipt(e.id, e.receipt_filename!)} style={pdfBtnStyle}>PDF</button>
                    ) : '-'}
                  </td>
                  <td style={tdStyle}>
                    <span style={statusBadge(e.status)}>{statusLabel(e.status)}</span>
                  </td>
                  <td style={tdStyle}>
                    {e.status === 'in_attesa' && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => handleReview(e.id, 'approvato')} disabled={actionLoading === e.id} style={approveBtnStyle}>Approva</button>
                        <button onClick={() => handleReview(e.id, 'rifiutato')} disabled={actionLoading === e.id} style={rejectBtnStyle}>Rifiuta</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function statusLabel(s: string) {
  switch (s) { case 'in_attesa': return 'In Attesa'; case 'approvato': return 'Approvato'; case 'rifiutato': return 'Rifiutato'; default: return s; }
}

function statusBadge(s: string): React.CSSProperties {
  const base: React.CSSProperties = { padding: '2px 8px', borderRadius: '4px', fontSize: '13px', fontWeight: 500 };
  switch (s) {
    case 'approvato': return { ...base, background: '#f0fff4', color: '#276749' };
    case 'rifiutato': return { ...base, background: '#fff5f5', color: '#9b2c2c' };
    default: return { ...base, background: '#fffff0', color: '#975a16' };
  }
}

const cardStyle: React.CSSProperties = { background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '6px', fontSize: '13px', color: '#718096', fontWeight: 500 };
const inputStyle: React.CSSProperties = { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '14px' };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '13px' };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #e2e8f0', color: '#4a5568', fontWeight: 600, fontSize: '12px' };
const tdStyle: React.CSSProperties = { padding: '8px 10px', borderBottom: '1px solid #e2e8f0' };
const typeBadge: React.CSSProperties = { padding: '2px 6px', borderRadius: '4px', fontSize: '11px', background: '#edf2f7', color: '#4a5568' };
const pdfBtnStyle: React.CSSProperties = { padding: '2px 8px', background: '#ebf8ff', color: '#2b6cb0', border: '1px solid #bee3f8', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 };
const approveBtnStyle: React.CSSProperties = { padding: '3px 10px', background: '#f0fff4', color: '#276749', border: '1px solid #c6f6d5', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' };
const rejectBtnStyle: React.CSSProperties = { padding: '3px 10px', background: '#fff5f5', color: '#9b2c2c', border: '1px solid #fed7d7', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' };
