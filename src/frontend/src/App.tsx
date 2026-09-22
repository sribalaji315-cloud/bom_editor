import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { BomListPage } from './pages/BomListPage';
import { BomEditorPage } from './pages/BomEditorPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { ReleaseTemplatesPage } from './pages/ReleaseTemplatesPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout>
              <BomListPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/boms/:id"
        element={
          <ProtectedRoute>
            <AppLayout>
              <BomEditorPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute roles={['Admin']}>
            <AppLayout>
              <UserManagementPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/release-templates"
        element={
          <ProtectedRoute roles={['Admin']}>
            <AppLayout>
              <ReleaseTemplatesPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
