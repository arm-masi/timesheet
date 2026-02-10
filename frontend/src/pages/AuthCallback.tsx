import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const { loginWithAzure } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      loginWithAzure(code)
        .then(() => navigate('/dashboard'))
        .catch((err) => {
          setError(err.response?.data?.detail || 'Errore SSO');
        });
    } else {
      setError('Nessun codice di autorizzazione ricevuto');
    }
  }, [searchParams, loginWithAzure, navigate]);

  if (error) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <p style={{ color: '#e53e3e' }}>{error}</p>
        <a href="/login">Torna al login</a>
      </div>
    );
  }

  return <div style={{ padding: '48px', textAlign: 'center' }}>Autenticazione in corso...</div>;
}
