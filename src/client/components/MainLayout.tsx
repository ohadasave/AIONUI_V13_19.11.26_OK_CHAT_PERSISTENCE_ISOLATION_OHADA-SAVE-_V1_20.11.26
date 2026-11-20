import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Message } from '@arco-design/web-react';
import { LogOut, MessageSquarePlus, Moon, PanelLeftClose, PanelLeftOpen, Search, Sun, Trash2, User as UserIcon } from 'lucide-react';
import { authFetch, useAuth } from '../context/AuthContext';
import type { Conversation } from '../types';

interface MainLayoutProps {
  children: React.ReactNode;
  conversations: Conversation[];
  onRefreshConversations: () => Promise<void>;
  isDark: boolean;
  onToggleDark: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, conversations, onRefreshConversations, isDark, onToggleDark }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { id: activeConversationId } = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    void onRefreshConversations();
  }, [onRefreshConversations]);

  const filtered = conversations.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const handleDelete = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    try {
      const res = await authFetch(`/api/conversations/${convId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        Message.success('Conversation supprimée');
        await onRefreshConversations();
        if (activeConversationId === convId) {
          void navigate('/guid');
        }
      }
    } catch {
      Message.error('Erreur lors de la suppression');
    }
  };

  const handleLogout = async () => {
    await logout();
    void navigate('/login');
  };

  return (
    <div className='flex h-screen w-screen overflow-clip bg-[#f7f8fa] dark:bg-gray-950 text-gray-900 dark:text-gray-100'>
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-200 overflow-hidden bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col shrink-0`}>
        <div className='p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between'>
          <button type='button' onClick={() => void navigate('/guid')} className='flex items-center gap-2.5 cursor-pointer text-left'>
            <img src='/logo.png' alt='E-audit' className='w-8 h-8 object-contain rounded-lg' />
            <div>
              <div className='font-bold text-base leading-tight text-gray-900 dark:text-white'>E-audit</div>
              <div className='text-[10px] text-gray-400 uppercase tracking-wider'>Audit &amp; Contrôle</div>
            </div>
          </button>
          <button type='button' onClick={() => setSidebarOpen(false)} className='p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 cursor-pointer' title='Réduire la barre latérale'>
            <PanelLeftClose className='w-4 h-4' />
          </button>
        </div>

        <div className='p-3 space-y-2'>
          <button type='button' onClick={() => void navigate('/guid')} className='w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#6b1102] hover:bg-[#530d01] text-white text-sm font-medium transition-colors shadow-xs cursor-pointer'>
            <MessageSquarePlus className='w-4 h-4' />
            Nouvelle mission
          </button>

          <div className='relative'>
            <Search className='w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2' />
            <input type='text' value={search} onChange={(e) => setSearch(e.target.value)} placeholder='Rechercher...' className='w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-[#6b1102]/40 outline-none text-gray-700 dark:text-gray-200' />
          </div>
        </div>

        {/* Isolated Conversations List */}
        <div className='flex-1 overflow-y-auto eaudit-scrollbar px-2 py-1 space-y-1'>
          <div className='px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400'>Historique ({filtered.length})</div>
          {filtered.length === 0 ? (
            <div className='px-3 py-6 text-center text-xs text-gray-400'>Aucune conversation pour ce compte.</div>
          ) : (
            filtered.map((conv) => {
              const isActive = conv.id === activeConversationId;
              return (
                <div key={conv.id} onClick={() => void navigate(`/conversation/${conv.id}`)} className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${isActive ? 'bg-[#6b1102]/10 text-[#6b1102] dark:bg-[#6b1102]/25 dark:text-[#ff8a7a] font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                  <div className='min-w-0 flex-1'>
                    <div className='truncate text-xs'>{conv.name}</div>
                    <div className='text-[10px] text-gray-400 mt-0.5 flex items-center gap-1.5'>
                      <span>{conv.type === 'n8n-multi-workflow' ? 'Multi-WF' : 'n8n'}</span>
                      <span>·</span>
                      <span>
                        {new Date(conv.updatedAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                    </div>
                  </div>
                  <button type='button' onClick={(e) => void handleDelete(e, conv.id)} className='opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 transition-opacity cursor-pointer' title='Supprimer'>
                    <Trash2 className='w-3.5 h-3.5' />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* User Footer + Logout */}
        <div className='p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/60 space-y-2'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2 min-w-0'>
              <div className='w-7 h-7 rounded-full bg-[#6b1102]/15 text-[#6b1102] dark:text-[#ff8a7a] flex items-center justify-center shrink-0'>
                <UserIcon className='w-3.5 h-3.5' />
              </div>
              <div className='min-w-0'>
                <div className='text-xs font-medium truncate text-gray-800 dark:text-gray-200'>{user?.username}</div>
                <div className='text-[10px] text-gray-400'>Espace isolé</div>
              </div>
            </div>
            <button type='button' onClick={onToggleDark} className='p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-pointer' title={isDark ? 'Mode clair' : 'Mode sombre'}>
              {isDark ? <Sun className='w-4 h-4' /> : <Moon className='w-4 h-4' />}
            </button>
          </div>
          <button type='button' onClick={() => void handleLogout()} className='w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 hover:border-red-200 text-xs font-medium text-gray-600 dark:text-gray-300 transition-colors cursor-pointer'>
            <LogOut className='w-3.5 h-3.5' />
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className='flex-1 flex flex-col min-w-0 h-full'>
        {/* Top Bar */}
        <header className='h-12 px-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between shrink-0'>
          <div className='flex items-center gap-2.5'>
            {!sidebarOpen && (
              <button type='button' onClick={() => setSidebarOpen(true)} className='p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 cursor-pointer' title='Afficher la barre latérale'>
                <PanelLeftOpen className='w-4 h-4' />
              </button>
            )}
            <img src='/logo.png' alt='E-audit' className='w-6 h-6 object-contain' />
            <span className='font-semibold text-sm text-gray-800 dark:text-gray-100'>E-audit</span>
          </div>
          <div className='text-xs text-gray-400 hidden sm:block'>Automatisez vos activités, d&apos;audit, risque et contrôle</div>
        </header>

        <main className='flex-1 min-h-0 overflow-clip flex flex-col'>{children}</main>
      </div>
    </div>
  );
};
