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
import QueueBoardPage from './pages/QueueBoardPage';
import MyClientsPage from './pages/MyClientsPage';
import TransactionHistoryPage from './pages/TransactionHistoryPage';
import CancelledTransactionsPage from './pages/CancelledTransactionsPage';
import SupportStaffHistoryPage from './pages/SupportStaffHistoryPage';
import MyAccountPage from './pages/MyAccountPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminCategoriesPage from './pages/AdminCategoriesPage';
import AdminOfficesPage from './pages/AdminOfficesPage';
import AdminReportsPage from './pages/AdminReportsPage';
import PersonnelCancelledPage from './pages/PersonnelCancelledPage';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/intake" element={<IntakePage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/queue-board" element={<QueueBoardPage />} />

          <Route element={<PrivateRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>
          </Route>

          <Route element={<PrivateRoute allowedRoles={['support_staff']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/ss-history" element={<SupportStaffHistoryPage />} />
            </Route>
          </Route>

          <Route element={<PrivateRoute allowedRoles={['personnel']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/personnel-history" element={<SupportStaffHistoryPage />} />
              <Route path="/personnel-cancelled" element={<PersonnelCancelledPage />} />
            </Route>
          </Route>

          <Route element={<PrivateRoute allowedRoles={['personnel', 'lawyer', 'admin', 'support_staff']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/queue" element={<QueuePage />} />
            </Route>
          </Route>

          <Route element={<PrivateRoute allowedRoles={['lawyer']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/clients" element={<MyClientsPage />} />
              <Route path="/history" element={<TransactionHistoryPage />} />
              <Route path="/cancelled" element={<CancelledTransactionsPage />} />
            </Route>
          </Route>

          <Route element={<PrivateRoute allowedRoles={['personnel', 'lawyer', 'admin', 'support_staff']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/account" element={<MyAccountPage />} />
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
