import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import { Copy, Check } from 'lucide-react';
import { Message } from '@arco-design/web-react';
import type { SyncTableOptions } from '../hooks/useTablePersistence';
import type { ChatMessage } from '../types';
import { InteractiveTable } from './InteractiveTable';
import CiaAccordionRenderer from './renderers/CiaAccordionRenderer';
import CiaMethodoAccordionRenderer from './renderers/CiaMethodoAccordionRenderer';
import CiaQcmAccordionRenderer from './renderers/CiaQcmAccordionRenderer';

interface MessageBubbleProps {
  message: ChatMessage;
  isDark: boolean;
  onPersistTable?: (table: HTMLTableElement, options?: SyncTableOptions) => Promise<boolean>;
}

const CIA_ACCORDION_PREFIX = '__CIA_ACCORDION__';
const CIA_METHODO_PREFIX = '__CIA_METHODO_ACCORDION__';
const CIA_QCM_PREFIX = '__CIA_QCM_ACCORDION__';

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isDark, onPersistTable }) => {
  const [copied, setCopied] = React.useState(false);
  const isUser = message.role === 'user';

  const specialPayload = useMemo(() => {
    const content = message.content || '';
    if (content.startsWith(CIA_METHODO_PREFIX)) {
      try {
        return { type: 'methodo' as const, data: JSON.parse(content.slice(CIA_METHODO_PREFIX.length)) };
      } catch {
        return null;
      }
    }
    if (content.startsWith(CIA_QCM_PREFIX)) {
      try {
        return { type: 'qcm' as const, data: JSON.parse(content.slice(CIA_QCM_PREFIX.length)) };
      } catch {
        return null;
      }
    }
    if (content.startsWith(CIA_ACCORDION_PREFIX)) {
      try {
        return { type: 'cia' as const, data: JSON.parse(content.slice(CIA_ACCORDION_PREFIX.length)) };
      } catch {
        return null;
      }
    }
    return null;
  }, [message.content]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      Message.success('Message copié');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      Message.error('Copie impossible');
    }
  };

  if (isUser) {
    return (
      <div data-message-id={message.id} className='message-item flex justify-end mb-4'>
        <div className='max-w-[82%] rounded-2xl rounded-tr-sm px-4 py-3 bg-[#6b1102] text-white shadow-sm text-sm whitespace-pre-wrap break-words'>{message.content}</div>
      </div>
    );
  }

  return (
    <div data-message-id={message.id} className='message-item flex items-start gap-3 mb-5 group'>
      <div className='w-8 h-8 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0 overflow-hidden shadow-xs'>
        <img src='/logo.png' alt='E-audit' className='w-6 h-6 object-contain' />
      </div>
      <div className='flex-1 min-w-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-xs'>
        {specialPayload ? (
          specialPayload.type === 'methodo' ? (
            <CiaMethodoAccordionRenderer data={specialPayload.data} isDark={isDark} />
          ) : specialPayload.type === 'qcm' ? (
            <CiaQcmAccordionRenderer data={specialPayload.data} isDark={isDark} />
          ) : (
            <CiaAccordionRenderer data={specialPayload.data} isDark={isDark} />
          )
        ) : (
          <div className='eaudit-prose text-sm text-gray-800 dark:text-gray-100 break-words overflow-x-auto'>
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              rehypePlugins={[rehypeRaw]}
              components={{
                table: ({ children }) => <InteractiveTable onPersistTable={onPersistTable}>{children}</InteractiveTable>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        <div className='mt-2 pt-1.5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px] text-gray-400'>
          <span>
            {new Date(message.createdAt).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
            {message.metadata?.format ? ` · ${String(message.metadata.format)}` : ''}
          </span>
          <button type='button' onClick={() => void handleCopy()} className='inline-flex items-center gap-1 px-2 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors cursor-pointer'>
            {copied ? <Check className='w-3 h-3 text-emerald-500' /> : <Copy className='w-3 h-3' />}
            <span>{copied ? 'Copié' : 'Copier'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
