import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Message } from '@arco-design/web-react';
import { Loader2, Send, Workflow, Layers, Sparkles } from 'lucide-react';
import DemarrerMenu from '../components/DemarrerMenu';
import { authFetch } from '../context/AuthContext';
import type { WorkflowType } from '../types';

interface GuidPageProps {
  onConversationCreated: () => Promise<void>;
}

const LAST_WORKFLOW_STORAGE_KEY = 'guid.lastSelectedAgent';
const LEGACY_AGENT_KEYS: Record<string, WorkflowType> = {
  'custom:builtin-n8n-workflow': 'n8n',
  'custom:builtin-n8n-multi-workflow': 'n8n-multi-workflow',
};

function isN8nType(value: string | null | undefined): value is WorkflowType {
  return value === 'n8n' || value === 'n8n-multi-workflow';
}

function loadSavedWorkflowType(): WorkflowType {
  try {
    const rawKey = localStorage.getItem(LAST_WORKFLOW_STORAGE_KEY);
    if (!rawKey) return 'n8n';
    const migrated = LEGACY_AGENT_KEYS[rawKey] ?? rawKey;
    if (isN8nType(migrated)) {
      if (migrated !== rawKey) {
        localStorage.setItem(LAST_WORKFLOW_STORAGE_KEY, migrated);
      }
      return migrated;
    }
  } catch {
    // Ignore storage access errors
  }
  return 'n8n';
}

const QUICK_PROMPTS = [
  {
    label: 'Programme de travail (Caisse)',
    prompt: '- [Command] = Programme de travail\n- [Processus] = inventaire de caisse\n- [Nb de lignes] = 15',
  },
  {
    label: 'Cartographie des risques',
    prompt: '- [Command] = /Cartographie des risques\n- [Processus] = Sécurité trésorerie\n- [Nb de lignes] = 20',
  },
  {
    label: 'Test de notification locale',
    prompt: 'Bonjour, quelles commandes E-audit puis-je exécuter ?',
  },
];

export const GuidPage: React.FC<GuidPageProps> = ({ onConversationCreated }) => {
  const [input, setInput] = useState('');
  const [workflowType, setWorkflowType] = useState<WorkflowType>(loadSavedWorkflowType);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      localStorage.setItem(LAST_WORKFLOW_STORAGE_KEY, workflowType);
    } catch {
      // Ignore storage errors
    }
  }, [workflowType]);

  const handleInsertCommand = (command: string) => {
    setInput((prev) => (prev ? `${prev}\n${command}` : command));
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const targetWorkflow: WorkflowType = isN8nType(workflowType) ? workflowType : 'n8n';
    setLoading(true);
    try {
      const createRes = await authFetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmed.split('\n')[0].replace(/^-\s*/, '').slice(0, 60) || 'Mission E-audit',
          type: targetWorkflow,
        }),
      });
      const createData = (await createRes.json()) as { success: boolean; message?: string; conversation?: { id: string } };
      if (!createRes.ok || !createData.success || !createData.conversation) {
        throw new Error(createData.message || 'Impossible de créer la conversation');
      }

      const convId = createData.conversation.id;
      try {
        sessionStorage.setItem(`eaudit_pending_${convId}`, trimmed);
      } catch {
        // Navigation state also carries initialPrompt as fallback
      }

      setInput('');
      void onConversationCreated();
      void navigate(`/conversation/${convId}`, { state: { initialPrompt: trimmed } });
    } catch (err) {
      Message.error(err instanceof Error ? err.message : 'Erreur lors du démarrage');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className='flex-1 h-full min-h-0 flex flex-col items-center px-4 py-8 overflow-y-auto eaudit-scrollbar'>
      <div className='w-full max-w-3xl space-y-6 my-auto'>
        {/* Branding Header */}
        <div className='text-center space-y-3'>
          <img src='/logo.png' alt='E-audit' className='w-14 h-14 mx-auto object-contain rounded-xl shadow-xs' />
          <h1 className='text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight'>Automatisez vos activités, d&apos;audit, risque et contrôle</h1>
          <p className='text-sm text-gray-500 dark:text-gray-400'>
            Sélectionnez une étape via le menu <strong>Démarrer</strong> ou saisissez directement votre requête n8n.
          </p>
        </div>

        {/* Workflow Selector */}
        <div className='flex flex-wrap items-center justify-center gap-2'>
          <button type='button' onClick={() => setWorkflowType('n8n')} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all cursor-pointer ${workflowType === 'n8n' ? 'bg-[#6b1102] text-white border-[#6b1102] shadow-sm' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-[#6b1102]/40'}`}>
            <Workflow className='w-4 h-4' />
            E-audit Workflow (n8n)
          </button>
          <button type='button' onClick={() => setWorkflowType('n8n-multi-workflow')} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all cursor-pointer ${workflowType === 'n8n-multi-workflow' ? 'bg-[#6b1102] text-white border-[#6b1102] shadow-sm' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-[#6b1102]/40'}`}>
            <Layers className='w-4 h-4' />
            n8n Multi-Workflow (Bridge)
          </button>
        </div>

        {/* Input Card */}
        <div className='bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-md p-4 space-y-3'>
          <textarea rows={3} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={loading} placeholder="Entrez votre commande d'audit ou cliquez sur Démarrer..." className='w-full resize-y min-h-[60px] max-h-[180px] bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400' />

          <div className='flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800'>
            <div className='flex items-center gap-2'>
              <DemarrerMenu onInsertCommand={handleInsertCommand} disabled={loading} />
            </div>

            <button type='button' onClick={() => void handleSend()} disabled={!input.trim() || loading} className='inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6b1102] hover:bg-[#530d01] disabled:opacity-45 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors cursor-pointer'>
              {loading ? <Loader2 className='w-4 h-4 animate-spin' /> : <Send className='w-4 h-4' />}
              <span>{loading ? 'Démarrage...' : 'Envoyer'}</span>
            </button>
          </div>
        </div>

        {/* Quick-Start Examples */}
        <div className='flex flex-wrap items-center justify-center gap-2'>
          {QUICK_PROMPTS.map((item) => (
            <button key={item.label} type='button' onClick={() => setInput(item.prompt)} className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-[#6b1102]/50 text-xs text-gray-600 dark:text-gray-300 transition-colors cursor-pointer'>
              <Sparkles className='w-3.5 h-3.5 text-[#6b1102] dark:text-[#ff6b5b]' />
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
