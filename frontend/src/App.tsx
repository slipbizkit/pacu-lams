import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { PrivateRoute } from './components/PrivateRoute';
import { DashboardLayout } from './components/DashboardLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import IntakePage from './pages/IntakePage';
import FeedbackPage from './pages/FeedbackPage';
import QueuePage from './pages/QueuePage';
import MyClientsPage from './pages/MyClientsPage';
import TransactionHistoryPage from './pages/TransactionHistoryPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminCategoriesPage from './pages/AdminCategoriesPage';
import AdminOfficesPage from './pages/AdminOfficesPage';
import AdminReportsPage from './pages/AdminReportsPage';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/intake" element={<IntakePage />} />
          <Route path="/feedback" element={<FeedbackPage />} />

          <Route element={<PrivateRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>
          </Route>

          <Route element={<PrivateRoute allowedRoles={['personnel', 'lawyer', 'admin']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/queue" element={<QueuePage />} />
            </Route>
          </Route>

          <Route element={<PrivateRoute allowedRoles={['lawyer']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/clients" element={<MyClientsPage />} />
              <Route path="/history" element={<TransactionHistoryPage />} />
            </Route>
          </Route>

          <Route element={<PrivateRoute allowedRoles={['admin']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/categories" element={<AdminCategoriesPage />} />
              <Route path="/admin/offices" element={<AdminOfficesPage />} />
              <Route path="/admin/reports" element={<AdminReportsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
