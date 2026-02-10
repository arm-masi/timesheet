import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import Justifications from './pages/Justifications';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import AdminJustifications from './pages/AdminJustifications';
import AdminExport from './pages/AdminExport';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="justifications" element={<Justifications />} />
            <Route path="profile" element={<Profile />} />
            <Route path="admin" element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="admin/justifications" element={
              <ProtectedRoute requireAdmin>
                <AdminJustifications />
              </ProtectedRoute>
            } />
            <Route path="admin/export" element={
              <ProtectedRoute requireAdmin>
                <AdminExport />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
