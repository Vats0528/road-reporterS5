import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import { ProtectedRoute, ManagerRoute } from './components/PermissionGuard';
import Navbar from './components/Navbar';
import BottomNav, { MobileContentWrapper } from './components/BottomNav';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UserDashboard from './pages/UserDashboard';
import ManagerPanel from './pages/ManagerPanel';
import PublicMapPage from './pages/PublicMapPage';
import DiagnosticPage from './pages/DiagnosticPage';

function AppContent() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <MobileContentWrapper>
        <Routes>
          {/* Routes publiques - accessibles à tous */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Route publique pour voir la carte (visiteurs) */}
          <Route path="/map" element={<PublicMapPage />} />
          
          {/* Routes protégées - utilisateurs authentifiés */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          
          {/* Routes manager - managers uniquement */}
          <Route
            path="/manager"
            element={
              <ManagerRoute>
                <ManagerPanel />
              </ManagerRoute>
            }
          />
          
          {/* Route diagnostic - dépannage des rôles */}
          <Route path="/diagnostic" element={<DiagnosticPage />} />
          
          {/* Redirection par défaut */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </MobileContentWrapper>
      <BottomNav />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;