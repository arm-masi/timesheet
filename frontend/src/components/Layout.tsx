import React from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const navLink = (to: string, label: string) => (
    <Link to={to} style={{
      ...navLinkStyle,
      color: isActive(to) ? '#00BCD4' : '#555',
      borderBottom: isActive(to) ? '3px solid #00BCD4' : '3px solid transparent',
      fontWeight: isActive(to) ? 600 : 400,
    }}>{label}</Link>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6f9' }}>
      <nav style={{
        background: 'white',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        height: '60px',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        borderBottom: '1px solid #e8ecf1',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', height: '100%' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', marginRight: '8px' }}>
            <img src="/logo.png" alt="aXcent" style={{ height: '32px' }} />
          </Link>
          {navLink('/dashboard', 'Dashboard')}
          {navLink('/justifications', 'Giustificativi')}
          {navLink('/expenses', 'Note Spese')}
          {isAdmin && <span style={{ borderLeft: '2px solid #e8ecf1', height: '28px', margin: '0 4px' }} />}
          {isAdmin && navLink('/admin', 'Admin - Dashboard')}
          {isAdmin && navLink('/admin/justifications', 'Admin - Giustificativi')}
          {isAdmin && navLink('/admin/expenses', 'Admin - Note Spese')}
          {isAdmin && navLink('/admin/export', 'Admin - Export')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '13px', color: '#666' }}>
            {user?.full_name} <span style={{ color: '#00BCD4', fontWeight: 600 }}>({user?.role})</span>
          </span>
          <Link to="/profile" style={{ ...navLinkStyle, color: isActive('/profile') ? '#00BCD4' : '#555', fontSize: '13px' }}>Profilo</Link>
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
  textDecoration: 'none',
  fontSize: '13px',
  padding: '18px 2px',
  display: 'flex',
  alignItems: 'center',
  height: '100%',
  transition: 'color 0.2s',
};

const logoutBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #ddd',
  color: '#666',
  padding: '5px 14px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 500,
};
