import React from 'react';
import { Link, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <nav style={{
        background: '#1a365d',
        color: 'white',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        height: '56px',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <Link to="/" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold', fontSize: '18px' }}>
            Timesheet
          </Link>
          <Link to="/dashboard" style={navLinkStyle}>Dashboard</Link>
          <Link to="/justifications" style={navLinkStyle}>Giustificativi</Link>
          {isAdmin && <Link to="/admin" style={navLinkStyle}>Admin</Link>}
          {isAdmin && <Link to="/admin/justifications" style={navLinkStyle}>Gestione Giustificativi</Link>}
          {isAdmin && <Link to="/admin/export" style={navLinkStyle}>Export Paghe</Link>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '14px' }}>{user?.full_name} ({user?.role})</span>
          <Link to="/profile" style={navLinkStyle}>Profilo</Link>
          <button onClick={handleLogout} style={logoutBtnStyle}>Esci</button>
        </div>
      </nav>
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        <Outlet />
      </main>
    </div>
  );
}

const navLinkStyle: React.CSSProperties = {
  color: '#cbd5e0',
  textDecoration: 'none',
  fontSize: '14px',
};

const logoutBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #cbd5e0',
  color: '#cbd5e0',
  padding: '4px 12px',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '13px',
};
