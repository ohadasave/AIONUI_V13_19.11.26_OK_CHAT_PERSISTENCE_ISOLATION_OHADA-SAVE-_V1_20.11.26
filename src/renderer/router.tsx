import React, { Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLoader from './components/AppLoader';
import { useAuth } from './context/AuthContext';

const Conversation = React.lazy(() => import('./pages/conversation'));
const Guid = React.lazy(() => import('./pages/guid'));
const About = React.lazy(() => import('./pages/settings/About'));
const AgentSettings = React.lazy(() => import('./pages/settings/AgentSettings'));
const DisplaySettings = React.lazy(() => import('./pages/settings/DisplaySettings'));
const GeminiSettings = React.lazy(() => import('./pages/settings/GeminiSettings'));
const ModeSettings = React.lazy(() => import('./pages/settings/ModeSettings'));
const SystemSettings = React.lazy(() => import('./pages/settings/SystemSettings'));
const SecuritySettings = React.lazy(() => import('./pages/settings/SecuritySettings'));
const ToolsSettings = React.lazy(() => import('./pages/settings/ToolsSettings'));
const WebuiSettings = React.lazy(() => import('./pages/settings/WebuiSettings'));
const ExtensionSettingsPage = React.lazy(() => import('./pages/settings/ExtensionSettingsPage'));
const LoginPage = React.lazy(() => import('./pages/login'));
const ComponentsShowcase = React.lazy(() => import('./pages/test/ComponentsShowcase'));
const N8nWorkflowPage = React.lazy(() => import('./pages/n8n-workflow/N8nWorkflowPage'));
const UserManagement = React.lazy(() => import('./pages/admin/UserManagement'));
const AuditLog = React.lazy(() => import('./pages/admin/AuditLog'));

const withRouteFallback = (Component: React.LazyExoticComponent<React.ComponentType>) => (
  <Suspense fallback={<AppLoader />}>
    <Component />
  </Suspense>
);

const ProtectedLayout: React.FC<{ layout: React.ReactElement }> = ({ layout }) => {
  const { status } = useAuth();

  if (status === 'checking') {
    return <AppLoader />;
  }

  if (status !== 'authenticated') {
    return <Navigate to='/login' replace />;
  }

  return React.cloneElement(layout);
};

const PanelRoute: React.FC<{ layout: React.ReactElement }> = ({ layout }) => {
  const { status } = useAuth();

  // Redirect after login to last conversation or /guid
  const getPostLoginRedirect = () => {
    const lastConversation = localStorage.getItem('last_conversation_path');
    return lastConversation && lastConversation.startsWith('/conversation/') ? lastConversation : '/guid';
  };

  return (
    <HashRouter>
      <Routes>
        <Route path='/login' element={status === 'authenticated' ? <Navigate to={getPostLoginRedirect()} replace /> : withRouteFallback(LoginPage)} />
        <Route element={<ProtectedLayout layout={layout} />}>
          <Route index element={<Navigate to='/guid' replace />} />
          <Route path='/guid' element={withRouteFallback(Guid)} />
          <Route path='/conversation/:id' element={withRouteFallback(Conversation)} />
          <Route path='/n8n-workflow' element={withRouteFallback(N8nWorkflowPage)} />
          <Route path='/admin/users' element={withRouteFallback(UserManagement)} />
          <Route path='/admin/audit' element={withRouteFallback(AuditLog)} />
          <Route path='/admin' element={<Navigate to='/admin/users' replace />} />
          <Route path='/settings/gemini' element={withRouteFallback(GeminiSettings)} />
          <Route path='/settings/model' element={withRouteFallback(ModeSettings)} />
          <Route path='/settings/agent' element={withRouteFallback(AgentSettings)} />
          <Route path='/settings/display' element={withRouteFallback(DisplaySettings)} />
          <Route path='/settings/webui' element={withRouteFallback(WebuiSettings)} />
          <Route path='/settings/system' element={withRouteFallback(SystemSettings)} />
          <Route path='/settings/security' element={withRouteFallback(SecuritySettings)} />
          <Route path='/settings/about' element={withRouteFallback(About)} />
          <Route path='/settings/tools' element={withRouteFallback(ToolsSettings)} />
          <Route path='/settings/ext/:tabId' element={withRouteFallback(ExtensionSettingsPage)} />
          <Route path='/settings' element={<Navigate to='/settings/gemini' replace />} />
          <Route path='/test/components' element={withRouteFallback(ComponentsShowcase)} />
        </Route>
        <Route path='*' element={<Navigate to={status === 'authenticated' ? '/guid' : '/login'} replace />} />
      </Routes>
    </HashRouter>
  );
};

export default PanelRoute;
