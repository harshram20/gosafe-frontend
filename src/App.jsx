import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import ShareTracking from './pages/ShareTracking';

// Route wrapper to require authentication or active guest mode
const ProtectedRoute = ({ children }) => {
  const { user, isGuest } = useAuth();
  
  if (!user && !isGuest) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Route wrapper to redirect away from auth pages if logged in
const AuthRoute = ({ children }) => {
  const { user } = useAuth();
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function AppContent() {
  return (
    <Routes>
      {/* Public Share Route */}
      <Route path="/share/:journeyId" element={<ShareTracking />} />
      <Route path="/share-tracking" element={<ShareTracking />} />

      {/* Auth Routes */}
      <Route path="/login" element={
        <AuthRoute>
          <Login />
        </AuthRoute>
      } />
      <Route path="/register" element={
        <AuthRoute>
          <Register />
        </AuthRoute>
      } />
      <Route path="/forgot-password" element={
        <AuthRoute>
          <ForgotPassword />
        </AuthRoute>
      } />

      {/* Protected Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/history" element={
        <ProtectedRoute>
          <History />
        </ProtectedRoute>
      } />

      {/* Fallback redirection */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;