import React, { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { authFetch, AuthProvider, useAuth } from './context/AuthContext';
import { MainLayout } from './components/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { GuidPage } from './pages/GuidPage';
import { ChatPage } from './pages/ChatPage';
import type { Conversation } from './types';

const AppRoutes: React.FC = () => {
  const { ready, status } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem('eaudit_theme') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    if (isDark) {
      document.body.setAttribute('arco-theme', 'dark');
    } else {
      document.body.removeAttribute('arco-theme');
    }
    try {
      localStorage.setItem('eaudit_theme', isDark ? 'dark' : 'light');
    } catch {
      // Ignore storage errors
    }
  }, [isDark]);

  const refreshConversations = useCallback(async () => {
    if (status !== 'authenticated') {
      setConversations([]);
      return;
    }
    try {
      const res = await authFetch('/api/conversations');
      if (!res.ok) {
        setConversations([]);
        return;
      }
      const data = (await res.json()) as { success: boolean; conversations?: Conversation[] };
      if (data.success && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
      }
    } catch {
      // Keep current state on transient network error
    }
  }, [status]);

  useEffect(() => {
    if (status !== 'authenticated') {
      setConversations([]);
    }
  }, [status]);

  if (!ready || status === 'checking') {
    return (
      <div className='min-h-screen flex flex-col items-center justify-center bg-[#f7f8fa] dark:bg-gray-950 text-gray-600 dark:text-gray-300 gap-3'>
        <img src='/logo.png' alt='E-audit' className='w-12 h-12 object-contain rounded-xl' />
        <Loader2 className='w-5 h-5 animate-spin text-[#6b1102]' />
        <span className='text-sm'>Chargement de E-audit...</span>
      </div>
    );
  }

  const isAuthenticated = status === 'authenticated';

  return (
    <Routes>
      <Route path='/login' element={isAuthenticated ? <Navigate to='/guid' replace /> : <LoginPage />} />
      <Route
        path='/guid'
        element={
          isAuthenticated ? (
            <MainLayout conversations={conversations} onRefreshConversations={refreshConversations} isDark={isDark} onToggleDark={() => setIsDark((prev) => !prev)}>
              <GuidPage onConversationCreated={refreshConversations} />
            </MainLayout>
          ) : (
            <Navigate to='/login' replace />
          )
        }
      />
      <Route
        path='/conversation/:id'
        element={
          isAuthenticated ? (
            <MainLayout conversations={conversations} onRefreshConversations={refreshConversations} isDark={isDark} onToggleDark={() => setIsDark((prev) => !prev)}>
              <ChatPage onConversationUpdated={refreshConversations} isDark={isDark} />
            </MainLayout>
          ) : (
            <Navigate to='/login' replace />
          )
        }
      />
      <Route path='*' element={<Navigate to={isAuthenticated ? '/guid' : '/login'} replace />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
