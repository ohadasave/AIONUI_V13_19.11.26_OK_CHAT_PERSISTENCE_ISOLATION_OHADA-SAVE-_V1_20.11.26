/**
 * EXTRAIT DE: src/renderer/pages/conversation/ChatHistory.tsx
 * LIGNES: 1-150 (imports + useEffect principal)
 * FONCTION: Chargement des conversations avec window.__currentUserId
 */

import { ipcBridge } from '@/common';
import type { TChatConversation } from '@/common/storage';
import FlexFullContainer from '@/renderer/components/FlexFullContainer';
import { CronJobIndicator, useCronJobsMap } from '@/renderer/pages/cron';
import { addEventListener, emitter } from '@/renderer/utils/emitter';
import { blockMobileInputFocus, blurActiveElement } from '@/renderer/utils/focus';
import { cleanupSiderTooltips, getSiderTooltipProps } from '@/renderer/utils/siderTooltip';
import { getActivityTime, createTimelineGrouper } from '@/renderer/utils/timeline';
import { Empty, Popconfirm, Input, Tooltip } from '@arco-design/web-react';
import { DeleteOne, Toolkit, EditOne } from '@icon-park/react';
import classNames from 'classnames';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useLayoutContext } from '@/renderer/context/LayoutContext';

const useTimeline = () => {
  const { t } = useTranslation();
  return createTimelineGrouper(t);
};

const useScrollIntoView = (id: string) => {
  useEffect(() => {
    if (!id) return;
    const el = document.getElementById('c-' + id);
    if (!el) return;

    const findScrollParent = (node: HTMLElement | null): HTMLElement | null => {
      let p = node?.parentElement;
      while (p) {
        const style = window.getComputedStyle(p);
        const overflowY = style.overflowY;
        if (overflowY === 'auto' || overflowY === 'scroll') return p;
        p = p.parentElement;
      }
      return null;
    };

    const container = findScrollParent(el);

    const isOutOfView = (): boolean => {
      const elRect = el.getBoundingClientRect();
      if (!container) {
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        return elRect.top < 0 || elRect.bottom > viewportHeight;
      }
      const cRect = container.getBoundingClientRect();
      return elRect.top < cRect.top || elRect.bottom > cRect.bottom;
    };

    if (isOutOfView()) {
      el.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    }
  }, [id]);
};

const ChatHistory: React.FC<{ onSessionClick?: () => void; collapsed?: boolean }> = ({ onSessionClick, collapsed = false }) => {
  const layout = useLayoutContext();
  const isMobile = layout?.isMobile ?? false;
  const [chatHistory, setChatHistory] = useState<TChatConversation[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getJobStatus, markAsRead } = useCronJobsMap();
  const siderTooltipProps = getSiderTooltipProps(collapsed && !isMobile);

  useScrollIntoView(id);

  // Mark conversation as read when id changes
  useEffect(() => {
    if (id) {
      markAsRead(id);
    }
  }, [id, markAsRead]);

  const handleSelect = (conversation: TChatConversation) => {
    cleanupSiderTooltips();
    blockMobileInputFocus();
    blurActiveElement();
    Promise.resolve(navigate(`/conversation/${conversation.id}`)).catch((error) => {
      console.error('Navigation failed:', error);
    });
    if (onSessionClick) {
      onSessionClick();
    }
  };

  const isConversation = !!id;

  // ========== PROBLÈME ICI ==========
  useEffect(() => {
    const refresh = () => {
      // ISOLATION FIX: Get userId from auth context
      const userId = (window as any).__currentUserId; // ← SUSPECT: undefined ?
      console.log('[ChatHistory] Fetching conversations for userId:', userId);
      
      // Get conversations from database instead of file storage
      ipcBridge.database.getUserConversations
        .invoke({ userId, page: 0, pageSize: 10000 }) // ← Si userId = undefined, transmis au backend
        .then((history) => {
          if (history && Array.isArray(history) && history.length > 0) {
            const sortedHistory = history.sort((a, b) => getActivityTime(b) - getActivityTime(a));
            setChatHistory(sortedHistory);
          } else {
            setChatHistory([]);
          }
        })
        .catch((error) => {
          console.error('[ChatHistory] Failed to load conversations from database:', error);
          setChatHistory([]);
        });
    };
    refresh();
    return addEventListener('chat.history.refresh', refresh);
  }, [isConversation]); // ← Dépendance: pas de user.id

  const handleRemoveConversation = (id: string) => {
    void ipcBridge.conversation.remove
      .invoke({ id })
      .then((success) => {
        if (success) {
          emitter.emit('chat.history.refresh');
          void Promise.resolve(navigate('/')).catch((error) => {
            console.error('Navigation failed:', error);
          });
        }
      })
      .catch((error) => {
        console.error('Failed to remove conversation:', error);
      });
  };

  const handleEditStart = (conversation: TChatConversation) => {
    setEditingId(conversation.id);
    setEditingName(conversation.name);
  };

  const handleEditSave = async () => {
    if (!editingId || !editingName.trim()) return;
    // ... rest of the component
  };

  // ... rest of the component
};

export default ChatHistory;

/**
 * ANALYSE DU BUG:
 * 
 * Ligne 104: const userId = (window as any).__currentUserId;
 * 
 * HYPOTHÈSE: Race condition
 * 
 * 1. AuthContext.login() termine:
 *    (window as any).__currentUserId = userId;
 *    setUser({ id: userId, ... });
 *    setStatus('authenticated');
 * 
 * 2. React re-render déclenché IMMÉDIATEMENT
 * 
 * 3. ChatHistory.tsx se monte
 * 
 * 4. useEffect s'exécute AVANT que __currentUserId soit accessible depuis ce contexte
 * 
 * 5. userId = undefined
 * 
 * 6. IPC reçoit { userId: undefined, page: 0, pageSize: 10000 }
 * 
 * 7. Backend: finalUserId = undefined || 'system_default_user'
 * 
 * 8. SQL: SELECT * FROM conversations WHERE user_id = 'system_default_user'
 * 
 * 9. TOUTES les conversations du premier compte sont retournées
 * 
 * 
 * SOLUTION PROPOSÉE (v19):
 * 
 * import { useAuth } from '@renderer/context/AuthContext';
 * 
 * const ChatHistory: React.FC<...> = ({ onSessionClick, collapsed }) => {
 *   const { user } = useAuth(); // ← Utiliser React Context
 *   
 *   useEffect(() => {
 *     if (!user?.id) {
 *       console.log('[ChatHistory] No user logged in, skip loading');
 *       setChatHistory([]);
 *       return;
 *     }
 *     
 *     const refresh = () => {
 *       console.log('[ChatHistory] Fetching for user:', user.id);
 *       
 *       ipcBridge.database.getUserConversations
 *         .invoke({ userId: user.id, page: 0, pageSize: 10000 }) // ← user.id garanti défini
 *         .then(history => setChatHistory(history || []));
 *     };
 *     
 *     refresh();
 *     return addEventListener('chat.history.refresh', refresh);
 *   }, [user?.id]); // ← Dépendance sur user.id, garantit synchronisation
 * };
 * 
 * AVANTAGES:
 * - React garantit que user.id est défini quand useEffect s'exécute
 * - Pas de race condition
 * - Type-safe (TypeScript sait que user.id est une string)
 * - Cohérent avec le reste du code React
 */
