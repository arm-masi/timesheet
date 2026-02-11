import { useState, useEffect } from 'react';
import api from '../services/api';
import { ExpenseReport, ExpenseType } from '../types';

const EXPENSE_TYPES: { value: ExpenseType; label: string }[] = [
  { value: 'viaggio', label: 'Viaggio' },
  { value: 'autostrada', label: 'Autostrada' },
  { value: 'soggiorno', label: 'Soggiorno' },
  { value: 'parcheggio', label: 'Parcheggio' },
  { value: 'pasti', label: 'Pasti' },
  { value: 'altro', label: 'Altro' },
];

interface ItemForm {
  expense_type: ExpenseType;
  description: string;
  amount: string;
  km: string;
  cost_per_km: string;
}

const emptyItem = (): ItemForm => ({
  expense_type: 'viaggio',
  description: '',
  amount: '',
  km: '',
  cost_per_km: '',
});

export default function Expenses() {
  const [reports, setReports] = useState<ExpenseReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [items, setItems] = useState<ItemForm[]>([emptyItem()]);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptError, setReceiptError] = useState('');

  const fetchReports = async () => {
    try {
      const res = await api.get('/expenses/my');
      setReports(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Errore caricamento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const updateItem = (idx: number, field: keyof ItemForm, value: string) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const addItem = () => setItems(prev => [...prev, emptyItem()]);

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const getItemKmTotal = (item: ItemForm) => {
    const km = parseFloat(item.km);
    const cpk = parseFloat(item.cost_per_km);
    if (!isNaN(km) && !isNaN(cpk) && km > 0 && cpk > 0) return (km * cpk).toFixed(2);
    return '';
  };

  const calcTotals = () => {
    let expenses = 0, kmTotal = 0;
    items.forEach(item => {
      const amt = parseFloat(item.amount);
      if (!isNaN(amt)) expenses += amt;
      const kt = getItemKmTotal(item);
      if (kt) kmTotal += parseFloat(kt);
    });
    return { expenses: expenses.toFixed(2), km: kmTotal.toFixed(2), grand: (expenses + kmTotal).toFixed(2) };
  };

  const totals = calcTotals();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReceiptError('');
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setReceiptError('Solo file PDF sono accettati');
        setReceipt(null);
        e.target.value = '';
        return;
      }
      setReceipt(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');

    const data = {
      date_from: dateFrom,
      date_to: dateTo,
      description: reportDesc || null,
      items: items.map(item => ({
        expense_type: item.expense_type,
        description: item.description,
        amount: parseFloat(item.amount) || 0,
        km: item.km ? parseFloat(item.km) : null,
        cost_per_km: item.cost_per_km ? parseFloat(item.cost_per_km) : null,
      })),
    };

    const formData = new FormData();
    formData.append('data', JSON.stringify(data));
    if (receipt) formData.append('receipt', receipt);

    try {
      await api.post('/expenses/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setShowForm(false);
      resetForm();
      fetchReports();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Errore inserimento nota spesa');
    } finally {
      setSubmitLoading(false);
    }
  };

  const resetForm = () => {
    setDateFrom('');
    setDateTo('');
    setReportDesc('');
    setItems([emptyItem()]);
    setReceipt(null);
    setReceiptError('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questa nota spesa?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      fetchReports();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Errore eliminazione');
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>Note Spese</h2>
        <button onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }} style={primaryBtnStyle}>
          {showForm ? 'Annulla' : 'Nuova Nota Spesa'}
        </button>
      </div>

      {error && <p style={{ color: 'var(--badge-error-text)', marginBottom: '16px' }}>{error}</p>}

      {showForm && (
        <div style={cardStyle}>
          <form onSubmit={handleSubmit}>
            {/* Date range */}
            <h3 style={sectionTitle}>Periodo</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={labelStyle}>Data Da</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>Data A</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>Descrizione nota spesa (opzionale)</label>
                <input type="text" value={reportDesc} onChange={e => setReportDesc(e.target.value)} style={inputStyle} placeholder="Es: Trasferta Milano" />
              </div>
            </div>

            {/* Items */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={sectionTitle}>Voci di Spesa</h3>
              <button type="button" onClick={addItem} style={addBtnStyle}>+ Aggiungi voce</button>
            </div>

            {items.map((item, idx) => (
              <div key={idx} style={{ background: 'var(--bg-section)', padding: '16px', borderRadius: '8px', marginBottom: '12px', position: 'relative', border: '1px solid var(--border)' }}>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(idx)} style={removeBtnStyle}>X</button>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={labelStyle}>Tipologia</label>
                    <select value={item.expense_type} onChange={e => updateItem(idx, 'expense_type', e.target.value)} style={inputStyle}>
                      {EXPENSE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Descrizione</label>
                    <input type="text" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} style={inputStyle} required />
                  </div>
                  <div>
                    <label style={labelStyle}>Importo (EUR)</label>
                    <input type="number" step="0.01" min="0.01" value={item.amount} onChange={e => updateItem(idx, 'amount', e.target.value)} style={inputStyle} required />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelSmall}>Km (opz.)</label>
                    <input type="number" step="0.1" value={item.km} onChange={e => updateItem(idx, 'km', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelSmall}>EUR/Km (opz.)</label>
                    <input type="number" step="0.01" value={item.cost_per_km} onChange={e => updateItem(idx, 'cost_per_km', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelSmall}>Totale Km</label>
                    <div style={{ ...inputStyle, background: 'var(--border)', color: getItemKmTotal(item) ? 'var(--text-primary)' : 'var(--text-placeholder)' }}>
                      {getItemKmTotal(item) ? `${getItemKmTotal(item)} EUR` : '-'}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Totals */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', margin: '16px 0', padding: '16px', background: 'var(--totals-bg)', borderRadius: '8px', border: '1px solid var(--totals-border)' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--totals-label)' }}>Totale Spese</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{totals.expenses} EUR</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--totals-label)' }}>Totale Rimborso Km</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{totals.km} EUR</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--totals-label)' }}>TOTALE DA RIMBORSARE</div>
                <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--brand-cyan)' }}>{totals.grand} EUR</div>
              </div>
            </div>

            {/* Receipt */}
            <h3 style={sectionTitle}>Scontrino / Ricevuta</h3>
            <div style={{ marginBottom: '24px' }}>
              <input type="file" accept=".pdf,application/pdf" onChange={handleFileChange} style={{ fontSize: '14px' }} />
              {receiptError && <p style={{ color: 'var(--badge-error-text)', fontSize: '13px', marginTop: '4px' }}>{receiptError}</p>}
              {receipt && <p style={{ color: 'var(--green)', fontSize: '13px', marginTop: '4px' }}>File: {receipt.name}</p>}
            </div>

            <button type="submit" disabled={submitLoading} style={primaryBtnStyle}>
              {submitLoading ? 'Invio...' : 'Invia Nota Spesa'}
            </button>
          </form>
        </div>
      )}

      {/* Reports list */}
      {reports.map(r => (
        <div key={r.id} style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <strong style={{ fontSize: '15px' }}>
                {new Date(r.date_from + 'T00:00:00').toLocaleDateString('it-IT')} - {new Date(r.date_to + 'T00:00:00').toLocaleDateString('it-IT')}
              </strong>
              {r.description && <span style={{ color: 'var(--text-muted)', marginLeft: '12px' }}>{r.description}</span>}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={statusBadge(r.status)}>{statusLabel(r.status)}</span>
              {r.receipt_filename && (
                <button onClick={() => downloadReceipt(r.id, r.receipt_filename!)} style={pdfBtnStyle}>PDF</button>
              )}
              {r.status === 'in_attesa' && (
                <button onClick={() => handleDelete(r.id)} style={deleteBtnStyle}>Elimina</button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '24px', fontSize: '14px', marginBottom: '8px' }}>
            <span>Spese: <strong>{r.total_expenses.toFixed(2)} EUR</strong></span>
            <span>Rimborso Km: <strong>{r.total_km_reimbursement.toFixed(2)} EUR</strong></span>
            <span style={{ color: 'var(--brand-cyan)', fontWeight: 700 }}>Totale: {r.grand_total.toFixed(2)} EUR</span>
            <span style={{ color: 'var(--text-placeholder)' }}>{r.items.length} voci</span>
          </div>

          <button onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} style={toggleBtnStyle}>
            {expandedId === r.id ? 'Nascondi dettaglio' : 'Mostra dettaglio'}
          </button>

          {expandedId === r.id && (
            <table style={{ ...tableStyle, marginTop: '12px' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Tipo</th>
                  <th style={thStyle}>Descrizione</th>
                  <th style={thStyle}>Importo</th>
                  <th style={thStyle}>Km</th>
                  <th style={thStyle}>EUR/Km</th>
                  <th style={thStyle}>Tot Km</th>
                </tr>
              </thead>
              <tbody>
                {r.items.map(item => (
                  <tr key={item.id}>
                    <td style={tdStyle}><span style={typeBadge}>{EXPENSE_TYPES.find(t => t.value === item.expense_type)?.label}</span></td>
                    <td style={tdStyle}>{item.description}</td>
                    <td style={tdStyle}><strong>{item.amount.toFixed(2)}</strong></td>
                    <td style={tdStyle}>{item.km ?? '-'}</td>
                    <td style={tdStyle}>{item.cost_per_km ?? '-'}</td>
                    <td style={tdStyle}>{item.km_total ? item.km_total.toFixed(2) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}

      {reports.length === 0 && !showForm && (
        <div style={{ ...cardStyle, textAlign: 'center', color: 'var(--text-placeholder)' }}>Nessuna nota spesa</div>
      )}
    </div>
  );
}

function statusLabel(s: string) {
  switch (s) { case 'in_attesa': return 'In Attesa'; case 'approvato': return 'Approvato'; case 'rifiutato': return 'Rifiutato'; default: return s; }
}
function statusBadge(s: string): React.CSSProperties {
  const base: React.CSSProperties = { padding: '3px 10px', borderRadius: '4px', fontSize: '13px', fontWeight: 500 };
  switch (s) {
    case 'approvato': return { ...base, background: 'var(--badge-success-bg)', color: 'var(--badge-success-text)' };
    case 'rifiutato': return { ...base, background: 'var(--badge-error-bg)', color: 'var(--badge-error-text)' };
    default: return { ...base, background: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)' };
  }
}

const cardStyle: React.CSSProperties = { background: 'var(--bg-card)', padding: '24px', borderRadius: '10px', boxShadow: 'var(--shadow)', marginBottom: '16px', border: '1px solid var(--border)' };
const sectionTitle: React.CSSProperties = { margin: '0 0 12px 0', color: 'var(--text-primary)', borderBottom: '2px solid var(--border)', paddingBottom: '8px' };
const primaryBtnStyle: React.CSSProperties = { padding: '10px 20px', background: 'var(--brand-cyan)', color: 'var(--bg-card)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 };
const addBtnStyle: React.CSSProperties = { padding: '6px 14px', background: 'var(--brand-cyan)', color: 'var(--bg-card)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', marginBottom: '12px' };
const removeBtnStyle: React.CSSProperties = { position: 'absolute', top: '8px', right: '8px', background: 'var(--badge-error-border)', color: 'var(--badge-error-text)', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '2px 8px', fontSize: '12px', fontWeight: 700 };
const deleteBtnStyle: React.CSSProperties = { padding: '4px 10px', background: 'var(--badge-error-bg)', color: 'var(--badge-error-text)', border: '1px solid var(--badge-error-border)', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' };
const pdfBtnStyle: React.CSSProperties = { padding: '3px 10px', background: 'var(--badge-info-bg)', color: 'var(--badge-info-text)', border: '1px solid var(--badge-info-border)', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 };
const toggleBtnStyle: React.CSSProperties = { padding: '4px 12px', background: 'var(--bg-section)', color: 'var(--text-secondary)', border: '1px solid var(--input-border)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' };
const typeBadge: React.CSSProperties = { padding: '2px 6px', borderRadius: '4px', fontSize: '11px', background: 'var(--badge-info-bg)', color: 'var(--badge-info-text)' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '4px', fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 };
const labelSmall: React.CSSProperties = { display: 'block', marginBottom: '4px', fontSize: '12px', color: 'var(--text-muted)' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', border: '1px solid var(--input-border)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' as const };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '13px' };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '12px' };
const tdStyle: React.CSSProperties = { padding: '8px 10px', borderBottom: '1px solid var(--border)' };
