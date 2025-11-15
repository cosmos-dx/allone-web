import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';
import AutoLock from './components/AutoLock';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Passwords from './pages/Passwords';
import Authenticator from './pages/Authenticator';
import Spaces from './pages/Spaces';
import SpaceDetail from './pages/SpaceDetail';
import Shared from './pages/Shared';
import Settings from './pages/Settings';
import './App.css';

function PrivateRoute({ children }) {
  const { currentUser, loading } = useAuth();
  const [hasBeenAuthenticated, setHasBeenAuthenticated] = React.useState(false);

  // Track if user has been authenticated at least once
  React.useEffect(() => {
    if (currentUser && !loading) {
      setHasBeenAuthenticated(true);
    }
  }, [currentUser, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-orange-50 to-yellow-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // If user was authenticated before but is now null (temporary state), don't redirect
  // Only redirect if user was never authenticated
  if (!currentUser && !hasBeenAuthenticated) {
    return <Navigate to="/" />;
  }

  // If user exists or was previously authenticated, show children
  return children;
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
        path="/spaces/:spaceId"
        element={
          <PrivateRoute>
            <SpaceDetail />
          </PrivateRoute>
        }
      />
      <Route
        path="/shared"
        element={
          <PrivateRoute>
            <Shared />
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
          <AutoLock enabled={true} inactivityTimeout={5 * 60 * 1000} />
          <Toaster position="top-right" />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;