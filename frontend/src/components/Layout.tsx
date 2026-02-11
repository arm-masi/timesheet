import React from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const { toggleTheme, isDark } = useTheme();
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
      color: isActive(to) ? 'var(--brand-cyan)' : 'var(--nav-link)',
      borderBottom: isActive(to) ? '3px solid var(--brand-cyan)' : '3px solid transparent',
      fontWeight: isActive(to) ? 600 : 400,
    }}>{label}</Link>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      <nav style={{
        background: 'var(--nav-bg)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        height: '60px',
        justifyContent: 'space-between',
        boxShadow: 'var(--shadow)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        transition: 'background-color 0.3s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', height: '100%' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', marginRight: '8px' }}>
            <img src="/logo.png" alt="aXcent" style={{ height: '32px' }} />
          </Link>
          {navLink('/dashboard', 'Dashboard')}
          {navLink('/justifications', 'Giustificativi')}
          {navLink('/expenses', 'Note Spese')}
          {isAdmin && <span style={{ borderLeft: '2px solid var(--nav-divider)', height: '28px', margin: '0 4px' }} />}
          {isAdmin && navLink('/admin', 'Admin - Dashboard')}
          {isAdmin && navLink('/admin/justifications', 'Admin - Giustificativi')}
          {isAdmin && navLink('/admin/expenses', 'Admin - Note Spese')}
          {isAdmin && navLink('/admin/export', 'Admin - Export')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={toggleTheme} style={themeBtnStyle} title={isDark ? 'Tema chiaro' : 'Tema scuro'}>
            {isDark ? '\u2600\uFE0F' : '\uD83C\uDF19'}
          </button>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {user?.full_name} <span style={{ color: 'var(--brand-cyan)', fontWeight: 600 }}>({user?.role})</span>
          </span>
          <Link to="/profile" style={{ ...navLinkStyle, color: isActive('/profile') ? 'var(--brand-cyan)' : 'var(--nav-link)', fontSize: '13px' }}>Profilo</Link>
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
  border: '1px solid var(--border)',
  color: 'var(--text-muted)',
  padding: '5px 14px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 500,
};

const themeBtnStyle: React.CSSProperties = {
  background: 'var(--bg-section)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '16px',
  padding: '4px 10px',
  lineHeight: 1,
};
