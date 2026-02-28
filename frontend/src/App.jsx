/**
 * App.jsx — React Router setup
 * Added routes: /trash, /change-password
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

import Layout        from './components/Layout';
import Login         from './pages/Login';
import Dashboard     from './pages/Dashboard';
import FamilyMgmt   from './pages/FamilyManagement';
import BelieverMgmt  from './pages/BelieverManagement';
import Reports       from './pages/Reports';
import Analytics     from './pages/Analytics';
import Trash         from './pages/Trash';
import ChangePassword from './pages/ChangePassword';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-red-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: { background: '#1a1a1a', color: '#fff', fontSize: '13px', borderRadius: '10px' },
            success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index          element={<Dashboard />} />
            <Route path="families" element={<FamilyMgmt />} />
            <Route path="believers" element={<BelieverMgmt />} />
            <Route path="reports"   element={<Reports />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="trash"     element={<Trash />} />
            <Route path="change-password" element={<ChangePassword />} />
            
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
     
    </AuthProvider>
  );
}
