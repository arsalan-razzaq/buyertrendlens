import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingScreen from './components/LoadingScreen';
import DashboardLayout from './layouts/DashboardLayout';
import AdminLayout from './layouts/AdminLayout';
import { useAuth } from './hooks/useAuth';
import HomePage from './pages/HomePage';
import ContactPage from './pages/ContactPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import WalletPage from './pages/WalletPage';
import AdminPage from './pages/AdminPage';
import G2gpage from './pages/G2gpage';
import SupportPage from './pages/SupportPage';

const App = () => {
  const { ready, user } = useAuth();
  const userHomePath = user?.role === 'admin' ? '/admin' : '/dashboard';

  if (!ready) {
    return <LoadingScreen message="Loading application..." />;
  }

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to={userHomePath} replace /> : <HomePage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/login" element={user ? <Navigate to={userHomePath} replace /> : <LoginPage />} />
      <Route element={<ProtectedRoute allowRoles={['user']} redirectTo="/admin" />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/g2g" element={<G2gpage />} />
          <Route path="/support" element={<SupportPage />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute allowRoles={['admin']} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminPage />} />
          <Route path="users" element={<AdminPage />} />
          <Route path="payments" element={<AdminPage />} />
          <Route path="settings" element={<Navigate to="/admin" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={user ? userHomePath : '/'} replace />} />
    </Routes>
  );
};

export default App;
