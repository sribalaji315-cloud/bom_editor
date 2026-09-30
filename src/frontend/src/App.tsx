import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { BomListPage } from './pages/BomListPage';
import { BomEditorPage } from './pages/BomEditorPage';
import { RouteListPage } from './pages/RouteListPage';
import { RouteEditorPage } from './pages/RouteEditorPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { ReleaseTemplatesPage } from './pages/ReleaseTemplatesPage';
import { ValidationRulesPage } from './pages/ValidationRulesPage';
import { AiSettingsPage } from './pages/AiSettingsPage';

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
        path="/routes"
        element={
          <ProtectedRoute>
            <AppLayout>
              <RouteListPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/routes/:id"
        element={
          <ProtectedRoute>
            <AppLayout>
              <RouteEditorPage />
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
      <Route
        path="/admin/validation-rules"
        element={
          <ProtectedRoute roles={['Admin']}>
            <AppLayout>
              <ValidationRulesPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/ai-settings"
        element={
          <ProtectedRoute roles={['Admin']}>
            <AppLayout>
              <AiSettingsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
