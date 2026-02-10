import { useState, useEffect } from 'react';
import api from '../services/api';
import { ExpenseReport } from '../types';

const TYPE_LABELS: Record<string, string> = {
  viaggio: 'Viaggio', autostrada: 'Autostrada', soggiorno: 'Soggiorno',
  parcheggio: 'Parcheggio', pasti: 'Pasti', altro: 'Altro',
};

export default function AdminExpenses() {
  const [reports, setReports] = useState<ExpenseReport[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('in_attesa');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchReports = async () => {
    try {
      const params = statusFilter ? `?status_filter=${statusFilter}` : '';
      const res = await api.get(`/expenses/admin/all${params}`);
      setReports(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Errore caricamento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, [statusFilter]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleReview = async (id: string, status: 'approvato' | 'rifiutato') => {
    setActionLoading(id);
    setError('');
    try {
      await api.put(`/expenses/admin/${id}/review`, { status });
      fetchReports();
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

  const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('it-IT');

  if (loading) return <div>Caricamento...</div>;

  const grandTotal = reports.reduce((s, r) => s + r.grand_total, 0);
  const totalExpenses = reports.reduce((s, r) => s + r.total_expenses, 0);
  const totalKm = reports.reduce((s, r) => s + r.total_km_reimbursement, 0);

  return (
    <div>
      <h2 style={{ color: '#333', marginBottom: '24px' }}>Gestione Note Spese</h2>

      <div style={cardStyle}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '16px' }}>
          <div>
            <label style={labelStyle}>Filtra per stato</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
              <option value="">Tutti</option>
              <option value="in_attesa">In Attesa</option>
              <option value="approvato">Approvati</option>
              <option value="rifiutato">Rifiutati</option>
            </select>
          </div>
          <div style={{ fontSize: '14px', color: '#555' }}>
            Spese: <strong>{totalExpenses.toFixed(2)} EUR</strong> | Rimborso km: <strong>{totalKm.toFixed(2)} EUR</strong> | Totale: <strong style={{ color: '#00BCD4' }}>{grandTotal.toFixed(2)} EUR</strong>
          </div>
        </div>

        {error && <p style={{ color: '#e53e3e', marginBottom: '12px' }}>{error}</p>}

        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}></th>
                <th style={thStyle}>Dipendente</th>
                <th style={thStyle}>Periodo</th>
                <th style={thStyle}>Descrizione</th>
                <th style={thStyle}>Spese</th>
                <th style={thStyle}>Rimb. Km</th>
                <th style={thStyle}>Totale</th>
                <th style={thStyle}>PDF</th>
                <th style={thStyle}>Stato</th>
                <th style={thStyle}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 && (
                <tr><td colSpan={10} style={{ ...tdStyle, textAlign: 'center', color: '#aaa' }}>Nessuna nota spesa</td></tr>
              )}
              {reports.map((r) => (
                <>
                  <tr key={r.id} style={{ background: expanded.has(r.id) ? '#f4f6f9' : undefined }}>
                    <td style={tdStyle}>
                      <button onClick={() => toggleExpand(r.id)} style={expandBtnStyle}>
                        {expanded.has(r.id) ? '▼' : '▶'} {r.items.length}
                      </button>
                    </td>
                    <td style={tdStyle}>{r.user_name || '-'}</td>
                    <td style={tdStyle}>{fmtDate(r.date_from)} — {fmtDate(r.date_to)}</td>
                    <td style={tdStyle}>{r.description || '-'}</td>
                    <td style={tdStyle}><strong>{r.total_expenses.toFixed(2)}</strong></td>
                    <td style={tdStyle}><strong>{r.total_km_reimbursement.toFixed(2)}</strong></td>
                    <td style={tdStyle}><strong style={{ color: '#00BCD4' }}>{r.grand_total.toFixed(2)}</strong></td>
                    <td style={tdStyle}>
                      {r.receipt_filename ? (
                        <button onClick={() => downloadReceipt(r.id, r.receipt_filename!)} style={pdfBtnStyle}>PDF</button>
                      ) : '-'}
                    </td>
                    <td style={tdStyle}>
                      <span style={statusBadge(r.status)}>{statusLabel(r.status)}</span>
                    </td>
                    <td style={tdStyle}>
                      {r.status === 'in_attesa' && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleReview(r.id, 'approvato')} disabled={actionLoading === r.id} style={approveBtnStyle}>Approva</button>
                          <button onClick={() => handleReview(r.id, 'rifiutato')} disabled={actionLoading === r.id} style={rejectBtnStyle}>Rifiuta</button>
                        </div>
                      )}
                    </td>
                  </tr>
                  {expanded.has(r.id) && (
                    <tr key={r.id + '-items'}>
                      <td colSpan={10} style={{ padding: '0 10px 12px 32px', background: '#f4f6f9' }}>
                        <table style={{ ...tableStyle, fontSize: '12px', marginTop: '4px' }}>
                          <thead>
                            <tr>
                              <th style={subThStyle}>Tipo</th>
                              <th style={subThStyle}>Descrizione</th>
                              <th style={subThStyle}>Importo</th>
                              <th style={subThStyle}>Km</th>
                              <th style={subThStyle}>EUR/Km</th>
                              <th style={subThStyle}>Tot Km</th>
                            </tr>
                          </thead>
                          <tbody>
                            {r.items.map((item) => (
                              <tr key={item.id}>
                                <td style={subTdStyle}><span style={typeBadge}>{TYPE_LABELS[item.expense_type] || item.expense_type}</span></td>
                                <td style={subTdStyle}>{item.description}</td>
                                <td style={subTdStyle}>{item.amount.toFixed(2)}</td>
                                <td style={subTdStyle}>{item.km ?? '-'}</td>
                                <td style={subTdStyle}>{item.cost_per_km ?? '-'}</td>
                                <td style={subTdStyle}>{item.km_total ? item.km_total.toFixed(2) : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
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
    case 'approvato': return { ...base, background: '#e8f5e9', color: '#2e7d32' };
    case 'rifiutato': return { ...base, background: '#ffebee', color: '#c62828' };
    default: return { ...base, background: '#fff8e1', color: '#f57f17' };
  }
}

const cardStyle: React.CSSProperties = { background: 'white', padding: '24px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8ecf1' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '6px', fontSize: '13px', color: '#888', fontWeight: 500 };
const inputStyle: React.CSSProperties = { padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '13px' };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #e8ecf1', color: '#555', fontWeight: 600, fontSize: '12px' };
const tdStyle: React.CSSProperties = { padding: '8px 10px', borderBottom: '1px solid #e8ecf1' };
const subThStyle: React.CSSProperties = { textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #e8ecf1', color: '#888', fontWeight: 600, fontSize: '11px' };
const subTdStyle: React.CSSProperties = { padding: '4px 8px', borderBottom: '1px solid #f0f0f0' };
const typeBadge: React.CSSProperties = { padding: '2px 6px', borderRadius: '4px', fontSize: '11px', background: '#e0f7fa', color: '#00838f' };
const expandBtnStyle: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#555', padding: '2px 4px' };
const pdfBtnStyle: React.CSSProperties = { padding: '2px 8px', background: '#e0f7fa', color: '#00838f', border: '1px solid #b2ebf2', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 };
const approveBtnStyle: React.CSSProperties = { padding: '3px 10px', background: '#e8f5e9', color: '#2e7d32', border: '1px solid #c8e6c9', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' };
const rejectBtnStyle: React.CSSProperties = { padding: '3px 10px', background: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' };
