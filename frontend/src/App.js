import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Passwords from './pages/Passwords';
import Authenticator from './pages/Authenticator';
import Spaces from './pages/Spaces';
import Settings from './pages/Settings';
import './App.css';

function PrivateRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-orange-50 to-yellow-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return currentUser ? children : <Navigate to="/" />;
}

function AppRoutes() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-orange-50 to-yellow-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={currentUser ? <Navigate to="/dashboard" /> : <LandingPage />} />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/passwords"
        element={
          <PrivateRoute>
            <Passwords />
          </PrivateRoute>
        }
      />
      <Route
        path="/authenticator"
        element={
          <PrivateRoute>
            <Authenticator />
          </PrivateRoute>
        }
      />
      <Route
        path="/spaces"
        element={
          <PrivateRoute>
            <Spaces />
          </PrivateRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <PrivateRoute>
            <Settings />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="App">
          <AppRoutes />
          <Toaster position="top-right" />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;