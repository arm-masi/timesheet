import { useState, useEffect } from 'react';
import api from '../services/api';
import { Expense, ExpenseType } from '../types';

const EXPENSE_TYPES: { value: ExpenseType; label: string }[] = [
  { value: 'viaggio', label: 'Viaggio' },
  { value: 'autostrada', label: 'Autostrada' },
  { value: 'soggiorno', label: 'Soggiorno' },
  { value: 'parcheggio', label: 'Parcheggio' },
  { value: 'pasti', label: 'Pasti' },
  { value: 'altro', label: 'Altro' },
];

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  // Form state - expense section
  const [formDate, setFormDate] = useState('');
  const [formType, setFormType] = useState<ExpenseType>('viaggio');
  const [formDesc, setFormDesc] = useState('');
  const [formAmount, setFormAmount] = useState('');

  // Form state - mileage section
  const [formKm, setFormKm] = useState('');
  const [formCostKm, setFormCostKm] = useState('');

  // Form state - receipt
  const [formReceipt, setFormReceipt] = useState<File | null>(null);
  const [receiptError, setReceiptError] = useState('');

  const fetchExpenses = async () => {
    try {
      const res = await api.get('/expenses/my');
      setExpenses(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Errore caricamento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExpenses(); }, []);

  const kmTotal = formKm && formCostKm ? (parseFloat(formKm) * parseFloat(formCostKm)).toFixed(2) : '';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReceiptError('');
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setReceiptError('Solo file PDF sono accettati');
        setFormReceipt(null);
        e.target.value = '';
        return;
      }
      setFormReceipt(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('date_str', formDate);
    formData.append('expense_type', formType);
    formData.append('description', formDesc);
    formData.append('amount', formAmount);
    if (formKm) formData.append('km', formKm);
    if (formCostKm) formData.append('cost_per_km', formCostKm);
    if (formReceipt) formData.append('receipt', formReceipt);

    try {
      await api.post('/expenses/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setShowForm(false);
      resetForm();
      fetchExpenses();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Errore inserimento nota spesa');
    } finally {
      setSubmitLoading(false);
    }
  };

  const resetForm = () => {
    setFormDate('');
    setFormType('viaggio');
    setFormDesc('');
    setFormAmount('');
    setFormKm('');
    setFormCostKm('');
    setFormReceipt(null);
    setReceiptError('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questa nota spesa?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      fetchExpenses();
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

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalKm = expenses.reduce((sum, e) => sum + (e.km_total || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ color: '#1a365d', margin: 0 }}>Note Spese</h2>
        <button onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }} style={primaryBtnStyle}>
          {showForm ? 'Annulla' : 'Nuova Nota Spesa'}
        </button>
      </div>

      {error && <p style={{ color: '#e53e3e', marginBottom: '16px' }}>{error}</p>}

      {showForm && (
        <div style={cardStyle}>
          <form onSubmit={handleSubmit}>
            {/* Section 1: Expense Type */}
            <h3 style={{ margin: '0 0 16px 0', color: '#2d3748', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
              Dettaglio Spesa
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Data</label>
                <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>Tipologia spesa</label>
                <select value={formType} onChange={(e) => setFormType(e.target.value as ExpenseType)} style={inputStyle}>
                  {EXPENSE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={labelStyle}>Descrizione</label>
                <input type="text" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} style={inputStyle} placeholder="Descrizione della spesa" required />
              </div>
              <div>
                <label style={labelStyle}>Importo (EUR)</label>
                <input type="number" step="0.01" min="0.01" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} style={inputStyle} placeholder="0.00" required />
              </div>
            </div>

            {/* Section 2: Mileage Reimbursement */}
            <h3 style={{ margin: '0 0 16px 0', color: '#2d3748', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
              Rimborso Kilometrico <span style={{ fontSize: '13px', color: '#a0aec0', fontWeight: 400 }}>(opzionale)</span>
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={labelStyle}>Km</label>
                <input type="number" step="0.1" min="0" value={formKm} onChange={(e) => setFormKm(e.target.value)} style={inputStyle} placeholder="0" />
              </div>
              <div>
                <label style={labelStyle}>Costo al Km (EUR)</label>
                <input type="number" step="0.01" min="0" value={formCostKm} onChange={(e) => setFormCostKm(e.target.value)} style={inputStyle} placeholder="0.00" />
              </div>
              <div>
                <label style={labelStyle}>Totale Km (EUR)</label>
                <div style={{ ...inputStyle, background: '#f7fafc', display: 'flex', alignItems: 'center', color: kmTotal ? '#2d3748' : '#a0aec0' }}>
                  {kmTotal ? `${kmTotal} EUR` : 'Calcolato automaticamente'}
                </div>
              </div>
            </div>

            {/* Receipt Upload */}
            <h3 style={{ margin: '0 0 16px 0', color: '#2d3748', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
              Scontrino / Ricevuta
            </h3>
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Carica PDF</label>
              <input type="file" accept=".pdf,application/pdf" onChange={handleFileChange} style={{ fontSize: '14px' }} />
              {receiptError && <p style={{ color: '#e53e3e', fontSize: '13px', marginTop: '4px' }}>{receiptError}</p>}
              {formReceipt && <p style={{ color: '#38a169', fontSize: '13px', marginTop: '4px' }}>File selezionato: {formReceipt.name}</p>}
            </div>

            <button type="submit" disabled={submitLoading} style={primaryBtnStyle}>
              {submitLoading ? 'Invio...' : 'Invia Nota Spesa'}
            </button>
          </form>
        </div>
      )}

      {/* Summary */}
      {expenses.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={statStyle}><div style={{ fontSize: '20px', fontWeight: 'bold' }}>{expenses.length}</div><div style={{ fontSize: '12px', color: '#718096' }}>Note spese</div></div>
          <div style={statStyle}><div style={{ fontSize: '20px', fontWeight: 'bold' }}>{totalExpenses.toFixed(2)} EUR</div><div style={{ fontSize: '12px', color: '#718096' }}>Totale spese</div></div>
          <div style={statStyle}><div style={{ fontSize: '20px', fontWeight: 'bold' }}>{totalKm.toFixed(2)} EUR</div><div style={{ fontSize: '12px', color: '#718096' }}>Totale rimborso km</div></div>
        </div>
      )}

      {/* Expense List */}
      <div style={cardStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Data</th>
              <th style={thStyle}>Tipo</th>
              <th style={thStyle}>Descrizione</th>
              <th style={thStyle}>Importo</th>
              <th style={thStyle}>Km</th>
              <th style={thStyle}>Tot Km</th>
              <th style={thStyle}>Scontrino</th>
              <th style={thStyle}>Stato</th>
              <th style={thStyle}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 && (
              <tr><td colSpan={9} style={{ ...tdStyle, textAlign: 'center', color: '#a0aec0' }}>Nessuna nota spesa</td></tr>
            )}
            {expenses.map((e) => (
              <tr key={e.id}>
                <td style={tdStyle}>{new Date(e.date + 'T00:00:00').toLocaleDateString('it-IT')}</td>
                <td style={tdStyle}>
                  <span style={typeBadgeStyle}>{EXPENSE_TYPES.find(t => t.value === e.expense_type)?.label || e.expense_type}</span>
                </td>
                <td style={tdStyle}>{e.description}</td>
                <td style={tdStyle}><strong>{e.amount.toFixed(2)} EUR</strong></td>
                <td style={tdStyle}>{e.km ?? '-'}</td>
                <td style={tdStyle}>{e.km_total ? `${e.km_total.toFixed(2)} EUR` : '-'}</td>
                <td style={tdStyle}>
                  {e.receipt_filename ? (
                    <button onClick={() => downloadReceipt(e.id, e.receipt_filename!)} style={linkBtnStyle}>PDF</button>
                  ) : '-'}
                </td>
                <td style={tdStyle}>
                  <span style={{ ...statusBadge(e.status) }}>{statusLabel(e.status)}</span>
                </td>
                <td style={tdStyle}>
                  {e.status === 'in_attesa' && (
                    <button onClick={() => handleDelete(e.id)} style={deleteBtnStyle}>Elimina</button>
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

function statusBadge(s: string): React.CSSProperties {
  const base: React.CSSProperties = { padding: '2px 8px', borderRadius: '4px', fontSize: '13px', fontWeight: 500 };
  switch (s) {
    case 'approvato': return { ...base, background: '#f0fff4', color: '#276749' };
    case 'rifiutato': return { ...base, background: '#fff5f5', color: '#9b2c2c' };
    case 'in_attesa': return { ...base, background: '#fffff0', color: '#975a16' };
    default: return { ...base, background: '#f7fafc', color: '#4a5568' };
  }
}

const cardStyle: React.CSSProperties = { background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '24px' };
const statStyle: React.CSSProperties = { background: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', textAlign: 'center' };
const primaryBtnStyle: React.CSSProperties = { padding: '10px 20px', background: '#1a365d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 };
const deleteBtnStyle: React.CSSProperties = { padding: '4px 12px', background: '#fff5f5', color: '#e53e3e', border: '1px solid #fed7d7', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' };
const linkBtnStyle: React.CSSProperties = { padding: '2px 8px', background: '#ebf8ff', color: '#2b6cb0', border: '1px solid #bee3f8', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 };
const typeBadgeStyle: React.CSSProperties = { padding: '2px 8px', borderRadius: '4px', fontSize: '12px', background: '#edf2f7', color: '#4a5568' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '6px', fontSize: '14px', color: '#4a5568', fontWeight: 500 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' as const };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '14px' };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #e2e8f0', color: '#4a5568', fontWeight: 600, fontSize: '13px' };
const tdStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid #e2e8f0' };
