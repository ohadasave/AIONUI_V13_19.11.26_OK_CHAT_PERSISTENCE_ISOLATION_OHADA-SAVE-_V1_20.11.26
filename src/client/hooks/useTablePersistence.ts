import { useCallback, useEffect, useRef } from 'react';
import { Message } from '@arco-design/web-react';
import { authFetch } from '../context/AuthContext';
import type { ChatMessage } from '../types';
import { deleteNthTableInMarkdown, findMessageElementForTable, getTableIndexInMessage, insertAfterNthTableInMarkdown, prependTableToMarkdown, replaceNthTableInMarkdown, tableElementToMarkdown } from '../utils/tableMarkdown';

export type TableSyncMode = 'replace' | 'insertAfter' | 'prepend' | 'delete';

export interface SyncTableOptions {
  mode?: TableSyncMode;
  extraMarkdown?: string;
  silent?: boolean;
  deferReactSync?: boolean;
}

export interface ConsoEntry {
  fullContent: string;
  simpleContent: string;
  updatedAt: number;
}

interface UseTablePersistenceArgs {
  conversationId: string | undefined;
  messages: ChatMessage[];
  onMessageContentUpdated: (messageId: string, newContent: string) => void;
  onMessageMetadataUpdated?: (messageId: string, metadataPatch: Record<string, unknown>) => void;
}

export function useTablePersistence({ conversationId, messages, onMessageContentUpdated, onMessageMetadataUpdated }: UseTablePersistenceArgs) {
  const latestContentRef = useRef<Map<string, string>>(new Map());
  const latestMetadataRef = useRef<Map<string, Record<string, unknown>>>(new Map());
  const pendingReactSyncRef = useRef<Map<string, string>>(new Map());
  const writeQueueRef = useRef<Map<string, Promise<void>>>(new Map());
  const onMessageContentUpdatedRef = useRef(onMessageContentUpdated);
  onMessageContentUpdatedRef.current = onMessageContentUpdated;
  const onMessageMetadataUpdatedRef = useRef(onMessageMetadataUpdated);
  onMessageMetadataUpdatedRef.current = onMessageMetadataUpdated;

  useEffect(() => {
    const contentMap = new Map<string, string>();
    const metaMap = new Map<string, Record<string, unknown>>();
    for (const msg of messages) {
      const pending = pendingReactSyncRef.current.get(msg.id);
      contentMap.set(msg.id, pending ?? msg.content);
      const existingConso = latestMetadataRef.current.get(msg.id)?.consoData;
      const serverConso = msg.metadata?.consoData;
      if (existingConso || serverConso) {
        metaMap.set(msg.id, {
          ...(msg.metadata || {}),
          consoData: {
            ...((serverConso as Record<string, unknown>) || {}),
            ...((existingConso as Record<string, unknown>) || {}),
          },
        });
      } else if (msg.metadata) {
        metaMap.set(msg.id, msg.metadata);
      }
    }
    latestContentRef.current = contentMap;
    latestMetadataRef.current = metaMap;
  }, [messages]);

  const flushPendingReactSync = useCallback((messageId?: string) => {
    if (messageId) {
      const pending = pendingReactSyncRef.current.get(messageId);
      if (pending !== undefined) {
        pendingReactSyncRef.current.delete(messageId);
        onMessageContentUpdatedRef.current(messageId, pending);
      }
      return;
    }
    if (pendingReactSyncRef.current.size === 0) return;
    const entries = Array.from(pendingReactSyncRef.current.entries());
    pendingReactSyncRef.current.clear();
    for (const [id, content] of entries) {
      onMessageContentUpdatedRef.current(id, content);
    }
  }, []);

  const persistMessagePatch = useCallback(
    async (messageId: string, payload: { content?: string; metadataPatch?: Record<string, unknown> }, silent = false): Promise<boolean> => {
      if (!conversationId) return false;

      const prevQueue = writeQueueRef.current.get(messageId) ?? Promise.resolve();
      let succeeded = false;

      const nextPromise = prevQueue
        .catch(() => undefined)
        .then(async () => {
          try {
            const res = await authFetch(`/api/conversations/${conversationId}/messages/${messageId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            if (!res.ok) {
              throw new Error(`HTTP ${res.status}`);
            }
            succeeded = true;
            if (!silent) {
              Message.success({ content: 'Tableau sauvegardé', duration: 1600 });
            }
          } catch (err) {
            console.error('[TablePersistence] Erreur lors de la sauvegarde:', err);
            if (!silent) {
              Message.error('Impossible de sauvegarder les modifications du tableau');
            }
          }
        });

      writeQueueRef.current.set(messageId, nextPromise);
      await nextPromise;
      return succeeded;
    },
    [conversationId]
  );

  const syncTable = useCallback(
    async (table: HTMLTableElement, options: SyncTableOptions = {}): Promise<boolean> => {
      const { mode = 'replace', extraMarkdown = '', silent = false, deferReactSync } = options;
      if (!conversationId) return false;

      const messageEl = findMessageElementForTable(table);
      if (!messageEl) {
        console.warn('[TablePersistence] Conteneur [data-message-id] introuvable pour cette table');
        return false;
      }

      const messageId = messageEl.getAttribute('data-message-id');
      if (!messageId) return false;

      const currentContent = latestContentRef.current.get(messageId) ?? '';
      const tableIndex = getTableIndexInMessage(table, messageEl);
      if (mode !== 'prepend' && tableIndex < 0) {
        console.warn('[TablePersistence] Index de table introuvable dans le message', messageId);
        return false;
      }

      let newContent = currentContent;
      if (mode === 'replace') {
        const md = tableElementToMarkdown(table);
        if (!md) return false;
        newContent = replaceNthTableInMarkdown(currentContent, tableIndex, md);
      } else if (mode === 'insertAfter') {
        if (!extraMarkdown.trim()) return false;
        newContent = insertAfterNthTableInMarkdown(currentContent, tableIndex, extraMarkdown);
      } else if (mode === 'prepend') {
        if (!extraMarkdown.trim()) return false;
        newContent = prependTableToMarkdown(currentContent, extraMarkdown);
      } else if (mode === 'delete') {
        newContent = deleteNthTableInMarkdown(currentContent, tableIndex);
      }

      if (newContent === currentContent) {
        return true;
      }

      latestContentRef.current.set(messageId, newContent);

      const hasSelectControls = table.querySelector('select') !== null;
      const focusInsideTable = Boolean(document.activeElement && table.contains(document.activeElement));
      const shouldDeferReact = deferReactSync ?? (mode === 'replace' && (focusInsideTable || hasSelectControls));

      if (shouldDeferReact) {
        pendingReactSyncRef.current.set(messageId, newContent);
        if (focusInsideTable && !hasSelectControls) {
          const handleFocusOut = (ev: FocusEvent) => {
            const nextFocused = ev.relatedTarget as Node | null;
            if (!nextFocused || !table.contains(nextFocused)) {
              table.removeEventListener('focusout', handleFocusOut);
              flushPendingReactSync(messageId);
            }
          };
          table.addEventListener('focusout', handleFocusOut);
        }
      } else {
        pendingReactSyncRef.current.delete(messageId);
        onMessageContentUpdatedRef.current(messageId, newContent);
      }

      return persistMessagePatch(messageId, { content: newContent }, silent);
    },
    [conversationId, flushPendingReactSync, persistMessagePatch]
  );

  const saveConsolidation = useCallback(
    async (modelisedTable: HTMLTableElement, data: { fullContent: string; simpleContent: string }): Promise<boolean> => {
      if (!conversationId) return false;
      const messageEl = findMessageElementForTable(modelisedTable);
      if (!messageEl) return false;
      const messageId = messageEl.getAttribute('data-message-id');
      if (!messageId) return false;
      const tableIndex = getTableIndexInMessage(modelisedTable, messageEl);
      if (tableIndex < 0) return false;

      const key = `table_${tableIndex}`;
      const entry: ConsoEntry = {
        fullContent: data.fullContent || '',
        simpleContent: data.simpleContent || '',
        updatedAt: Date.now(),
      };

      const prevMeta = latestMetadataRef.current.get(messageId) || {};
      const prevConso = (prevMeta.consoData as Record<string, ConsoEntry> | undefined) || {};
      const nextConsoData = { ...prevConso, [key]: entry };
      latestMetadataRef.current.set(messageId, { ...prevMeta, consoData: nextConsoData });
      onMessageMetadataUpdatedRef.current?.(messageId, { consoData: nextConsoData });

      return persistMessagePatch(messageId, { metadataPatch: { consoData: { [key]: entry } } }, true);
    },
    [conversationId, persistMessagePatch]
  );

  const getSavedConsolidation = useCallback((modelisedTable: HTMLTableElement): ConsoEntry | null => {
    const messageEl = findMessageElementForTable(modelisedTable);
    if (!messageEl) return null;
    const messageId = messageEl.getAttribute('data-message-id');
    if (!messageId) return null;
    const tableIndex = getTableIndexInMessage(modelisedTable, messageEl);
    if (tableIndex < 0) return null;

    const meta = latestMetadataRef.current.get(messageId);
    const consoData = meta?.consoData as Record<string, ConsoEntry> | undefined;
    return consoData?.[`table_${tableIndex}`] ?? null;
  }, []);

  return {
    syncTable,
    flushPendingReactSync,
    saveConsolidation,
    getSavedConsolidation,
  };
}
