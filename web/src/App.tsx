import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Orders } from './pages/Orders';
import { OrderDetail } from './pages/OrderDetail';
import { UsersPage } from './pages/Users';
import { Profile } from './pages/Profile';
import { ChangePassword } from './pages/ChangePassword';
import { Notifications } from './pages/Notifications';
import { Landing } from './pages/Landing';
import { useAuth } from './context/AuthContext';
import { PageLoadingState } from './components/common/LoadingSpinner';

const RootPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageLoadingState message="Preparing your NetMedika workspace…" />;
  if (!isAuthenticated && location.pathname === '/') return <Landing />;

  return (
    <ProtectedRoute>
      <AdminLayout />
    </ProtectedRoute>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <AuthProvider>
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Admin Portal */}
            <Route
              path="/"
              element={<RootPage />}
            >
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Navigate to="/" replace />} />
              <Route path="orders" element={<Orders />} />
              <Route path="orders/:orderId" element={<OrderDetail />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="profile" element={<Profile />} />
              <Route path="change-password" element={<ChangePassword />} />
              <Route path="notifications" element={<Notifications />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
}

export default App;
