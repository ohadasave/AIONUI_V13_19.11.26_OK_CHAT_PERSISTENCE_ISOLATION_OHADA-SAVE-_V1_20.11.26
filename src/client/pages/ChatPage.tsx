import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Message } from '@arco-design/web-react';
import { ArrowDown, ArrowUp, Layers, Loader2, Send, Workflow } from 'lucide-react';
import { ClaraverseContextMenu } from '../components/ClaraverseContextMenu';
import DemarrerMenu from '../components/DemarrerMenu';
import { MessageBubble } from '../components/MessageBubble';
import { authFetch } from '../context/AuthContext';
import { useTablePersistence } from '../hooks/useTablePersistence';
import type { ChatMessage, Conversation } from '../types';

interface ClaraverseSyncBridge {
  getCurrentSessionId: () => string;
  forceSaveTable: (table: HTMLTableElement) => Promise<boolean>;
  saveConsolidation: (modelisedTable: HTMLTableElement, data: { fullContent: string; simpleContent: string }) => Promise<boolean>;
  getSavedConsolidation: (modelisedTable: HTMLTableElement) => { fullContent: string; simpleContent: string; updatedAt?: number } | null;
  saveAllTables: () => Promise<void>;
}

declare global {
  interface Window {
    claraverseSyncAPI?: ClaraverseSyncBridge;
  }
}

interface ChatPageProps {
  onConversationUpdated: () => Promise<void>;
  isDark: boolean;
}

const dispatchedPendingIds = new Set<string>();

function mergeMessagesById(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const map = new Map<string, ChatMessage>();
  for (const msg of existing) map.set(msg.id, msg);
  for (const msg of incoming) map.set(msg.id, msg);
  return Array.from(map.values()).sort((a, b) => a.createdAt - b.createdAt);
}

function isModelisedDomTable(table: HTMLTableElement): boolean {
  const headers = Array.from(table.querySelectorAll('thead th, thead td, tr:first-child th, tr:first-child td')).map((el) => (el.textContent || '').trim().toLowerCase());
  return headers.some((h) => /^assertion$/i.test(h) || /^conclusion$/i.test(h) || /^ctr\d*$/i.test(h));
}

export const ChatPage: React.FC<ChatPageProps> = ({ onConversationUpdated, isDark }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [pendingUserText, setPendingUserText] = useState<string | null>(null);
  const [input, setInput] = useState('');

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const prevMsgCountRef = useRef<number>(0);
  const onConversationUpdatedRef = useRef(onConversationUpdated);
  onConversationUpdatedRef.current = onConversationUpdated;

  const handleMessageContentUpdated = useCallback((messageId: string, newContent: string) => {
    setMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, content: newContent } : msg)));
  }, []);

  const handleMessageMetadataUpdated = useCallback((messageId: string, metadataPatch: Record<string, unknown>) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        return {
          ...msg,
          metadata: {
            ...(msg.metadata || {}),
            ...metadataPatch,
          },
        };
      })
    );
  }, []);

  const { syncTable, flushPendingReactSync, saveConsolidation, getSavedConsolidation } = useTablePersistence({
    conversationId: id,
    messages,
    onMessageContentUpdated: handleMessageContentUpdated,
    onMessageMetadataUpdated: handleMessageMetadataUpdated,
  });

  useEffect(() => {
    if (!id) return;

    const bridge: ClaraverseSyncBridge = {
      getCurrentSessionId: () => id,
      forceSaveTable: async (table: HTMLTableElement) => {
        if (!table) return false;
        if (table.classList.contains('claraverse-conso-table')) {
          const siblingTable = table.parentElement?.querySelector('table:not(.claraverse-conso-table)') as HTMLTableElement | null;
          const cellHtml = table.querySelector('td')?.innerHTML || '';
          if (!siblingTable || !cellHtml || cellHtml.includes('En attente de consolidation')) {
            return false;
          }
          const existing = getSavedConsolidation(siblingTable);
          return saveConsolidation(siblingTable, {
            fullContent: existing?.fullContent || '',
            simpleContent: cellHtml,
          });
        }
        const deferReact = isModelisedDomTable(table);
        return syncTable(table, { silent: true, deferReactSync: deferReact });
      },
      saveConsolidation: async (modelisedTable: HTMLTableElement, data: { fullContent: string; simpleContent: string }) => {
        return saveConsolidation(modelisedTable, data);
      },
      getSavedConsolidation: (modelisedTable: HTMLTableElement) => {
        return getSavedConsolidation(modelisedTable);
      },
      saveAllTables: async () => {
        const container = messagesContainerRef.current;
        if (!container) return;
        const tables = Array.from(container.querySelectorAll('[data-message-id] table:not(.claraverse-conso-table)')) as HTMLTableElement[];
        for (const tbl of tables) {
          if (tbl.closest('.sample-results-container, .analysis-results-container')) continue;
          await syncTable(tbl, { silent: true, deferReactSync: isModelisedDomTable(tbl) });
        }
      },
    };

    window.claraverseSyncAPI = bridge;

    const timer = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('claraverse:sync:ready', { detail: { conversationId: id } }));
    }, 80);

    return () => {
      window.clearTimeout(timer);
      if (window.claraverseSyncAPI === bridge) {
        delete window.claraverseSyncAPI;
      }
    };
  }, [id, messages, syncTable, saveConsolidation, getSavedConsolidation]);

  const scrollToTop = useCallback(() => {
    messagesContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const prevCount = prevMsgCountRef.current;
    prevMsgCountRef.current = messages.length;
    if (messages.length > prevCount || sending || pendingUserText) {
      scrollToBottom();
    }
  }, [messages.length, sending, pendingUserText, scrollToBottom]);

  const sendPrompt = useCallback(async (convId: string, promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed) return;

    setSending(true);
    setPendingUserText(trimmed);
    try {
      const res = await authFetch(`/api/conversations/${convId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      });
      const data = (await res.json()) as {
        success: boolean;
        message?: string;
        userMessage?: ChatMessage;
        assistantMessage?: ChatMessage;
        conversation?: Conversation;
      };

      if (!res.ok || !data.success || !data.userMessage || !data.assistantMessage) {
        throw new Error(data.message || "Erreur lors de l'exécution du workflow n8n");
      }

      const newUserMsg = data.userMessage;
      const newAssistantMsg = data.assistantMessage;
      setMessages((prev) => mergeMessagesById(prev, [newUserMsg, newAssistantMsg]));
      if (data.conversation) {
        setConversation(data.conversation);
      }
      void onConversationUpdatedRef.current();
    } catch (err) {
      Message.error(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    } finally {
      setPendingUserText(null);
      setSending(false);
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    let active = true;

    const routeStatePrompt = (location.state as { initialPrompt?: string } | null)?.initialPrompt;
    const pendingKey = `eaudit_pending_${id}`;
    let storagePrompt: string | null = null;
    try {
      storagePrompt = sessionStorage.getItem(pendingKey);
    } catch {
      storagePrompt = null;
    }

    const pendingPrompt = (routeStatePrompt || storagePrompt || '').trim();
    const shouldDispatchPending = Boolean(pendingPrompt && !dispatchedPendingIds.has(id));

    if (shouldDispatchPending) {
      dispatchedPendingIds.add(id);
      try {
        sessionStorage.removeItem(pendingKey);
      } catch {
        // Ignore storage error
      }
      if (routeStatePrompt) {
        try {
          window.history.replaceState({}, document.title);
        } catch {
          // Ignore history error
        }
      }
      setLoading(false);
      setMessages([]);
      setConversation(null);
      void sendPrompt(id, pendingPrompt);
    } else {
      setLoading(true);
      setConversation(null);
      setMessages([]);
      setPendingUserText(null);
    }

    const load = async () => {
      try {
        const res = await authFetch(`/api/conversations/${id}`);
        if (!res.ok) {
          if (active) {
            Message.warning('Conversation introuvable');
            void navigate('/guid', { replace: true });
          }
          return;
        }
        const data = (await res.json()) as {
          success: boolean;
          conversation?: Conversation;
          messages?: ChatMessage[];
        };
        if (!active) return;

        if (!data.success || !data.conversation) {
          void navigate('/guid', { replace: true });
          return;
        }

        setConversation(data.conversation);
        setMessages((prev) => mergeMessagesById(prev, data.messages || []));
      } catch {
        if (active) {
          Message.error('Impossible de charger la conversation');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [id, location.state, navigate, sendPrompt]);

  const handleInsertCommand = (command: string) => {
    setInput((prev) => (prev ? `${prev}\n${command}` : command));
  };

  const handleSubmit = async () => {
    if (!id || !input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    await sendPrompt(id, text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <div className='flex-1 h-full flex flex-col min-h-0 overflow-clip bg-[#f7f8fa] dark:bg-gray-950'>
      {/* Conversation Header */}
      <div className='px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between gap-3 shrink-0'>
        <div className='min-w-0 flex items-center gap-2.5'>
          <h2 className='text-sm font-semibold text-gray-800 dark:text-gray-100 truncate'>{conversation?.name || 'Mission E-audit'}</h2>
          {conversation && (
            <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#6b1102]/10 text-[#6b1102] dark:bg-[#6b1102]/25 dark:text-[#ff8a7a] shrink-0'>
              {conversation.type === 'n8n-multi-workflow' ? <Layers className='w-3 h-3' /> : <Workflow className='w-3 h-3' />}
              {conversation.type === 'n8n-multi-workflow' ? 'Multi-Workflow' : 'n8n'}
            </span>
          )}
        </div>
        <div className='flex items-center gap-1.5 shrink-0'>
          <button type='button' onClick={scrollToTop} title='Aller en haut' className='p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-pointer'>
            <ArrowUp className='w-3.5 h-3.5' />
          </button>
          <button type='button' onClick={scrollToBottom} title='Aller en bas' className='p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-pointer'>
            <ArrowDown className='w-3.5 h-3.5' />
          </button>
          <span className='text-xs text-gray-400 ml-1'>{messages.length} message(s)</span>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={messagesContainerRef} className='flex-1 min-h-0 overflow-y-scroll eaudit-scrollbar px-4 py-6'>
        <div className='max-w-4xl mx-auto'>
          {loading ? (
            <div className='flex flex-col items-center justify-center py-20 text-gray-400 gap-3'>
              <Loader2 className='w-6 h-6 animate-spin text-[#6b1102]' />
              <span className='text-sm'>Chargement de la mission...</span>
            </div>
          ) : (
            <>
              {messages.length === 0 && !pendingUserText && (
                <div className='text-center py-16 text-sm text-gray-400'>
                  Aucun message pour le moment. Utilisez le menu <strong>Démarrer</strong> ci-dessous pour lancer une étape d&apos;audit.
                </div>
              )}

              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} isDark={isDark} onPersistTable={syncTable} />
              ))}

              {sending && pendingUserText && (
                <>
                  <div className='flex justify-end mb-4'>
                    <div className='max-w-[82%] rounded-2xl rounded-tr-sm px-4 py-3 bg-[#6b1102] text-white shadow-sm text-sm whitespace-pre-wrap break-words'>{pendingUserText}</div>
                  </div>
                  <div className='flex items-start gap-3 mb-5'>
                    <div className='w-8 h-8 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0 overflow-hidden shadow-xs'>
                      <img src='/logo.png' alt='E-audit' className='w-6 h-6 object-contain' />
                    </div>
                    <div className='bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-xs flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-300'>
                      <Loader2 className='w-4 h-4 animate-spin text-[#6b1102]' />
                      <span>Exécution du workflow n8n en cours...</span>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
          <div className='h-1' />
        </div>
      </div>

      {/* Bottom SendBox */}
      <div className='border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 shrink-0'>
        <div className='max-w-4xl mx-auto border border-gray-200 dark:border-gray-700 rounded-2xl p-3 bg-gray-50/50 dark:bg-gray-950/50 space-y-2'>
          <textarea rows={2} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={sending || loading} placeholder="Saisissez votre commande d'audit ou sélectionnez via Démarrer... (Entrée pour envoyer)" className='w-full resize-y min-h-[48px] max-h-[180px] bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400' />
          <div className='flex items-center justify-between pt-1.5 border-t border-gray-200/70 dark:border-gray-800'>
            <DemarrerMenu onInsertCommand={handleInsertCommand} disabled={sending || loading} />
            <button type='button' onClick={() => void handleSubmit()} disabled={!input.trim() || sending || loading} className='inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-[#6b1102] hover:bg-[#530d01] disabled:opacity-45 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors cursor-pointer'>
              {sending ? <Loader2 className='w-4 h-4 animate-spin' /> : <Send className='w-4 h-4' />}
              <span>{sending ? 'Envoi...' : 'Envoyer'}</span>
            </button>
          </div>
        </div>
      </div>

      <ClaraverseContextMenu isDark={isDark} onSyncTable={syncTable} onFlushPendingSync={flushPendingReactSync} />
    </div>
  );
};
