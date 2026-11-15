/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { uuid } from '@/common/utils';
import SendBox from '@/renderer/components/sendbox';
import { useAddOrUpdateMessage } from '@/renderer/messages/hooks';
import { Message } from '@arco-design/web-react';
import React, { useCallback, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { TMessage } from '@/common/chatLib';
import { ipcBridge } from '@/common';

const N8nMultiWorkflowSendBox: React.FC<{
  conversation_id: string;
}> = ({ conversation_id }) => {
  const { t } = useTranslation();
  const addOrUpdateMessage = useAddOrUpdateMessage();
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');

  // Listen to response stream
  useEffect(() => {
    return ipcBridge.conversation.responseStream.on((message) => {
      if (conversation_id !== message.conversation_id) {
        return;
      }

      if (message.type === 'message') {
        addOrUpdateMessage({
          id: message.msg_id,
          msg_id: message.msg_id,
          type: 'text',
          position: 'left',
          conversation_id,
          content: {
            content: message.data,
          },
          createdAt: Date.now(),
        } as TMessage);
      } else if (message.type === 'user_content') {
        addOrUpdateMessage({
          id: message.msg_id,
          msg_id: message.msg_id,
          type: 'text',
          position: 'right',
          conversation_id,
          content: {
            content: message.data,
          },
          createdAt: Date.now(),
        } as TMessage);
      } else if (message.type === 'error') {
        addOrUpdateMessage({
          id: message.msg_id,
          msg_id: message.msg_id,
          type: 'text',
          position: 'left',
          conversation_id,
          content: {
            content: message.data,
          },
          createdAt: Date.now(),
        } as TMessage);
      } else if (message.type === 'finish') {
        setSending(false);
      }
    });
  }, [conversation_id, addOrUpdateMessage]);

  const handleSend = useCallback(
    async (content: string) => {
      if (!content.trim() || sending) return;

      setSending(true);

      const assistant_msg_id = uuid();
      const user_msg_id = uuid();

      // Placeholder
      addOrUpdateMessage(
        {
          id: assistant_msg_id,
          msg_id: assistant_msg_id,
          type: 'text',
          position: 'left',
          conversation_id,
          content: {
            content: '🔄 Exécution du multi-workflow en cours...',
          },
          createdAt: Date.now() + 1,
        } as TMessage,
        true
      );

      try {
        await ipcBridge.conversation.sendMessage.invoke({
          conversation_id,
          input: content,
          msg_id: assistant_msg_id,
          user_msg_id,
          files: [],
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        
        let troubleshooting = '';
        if (errorMessage.includes('timeout')) {
          troubleshooting = `\n\n**Solutions:**\n1. Augmentez le timeout du backend\n2. Vérifiez le serveur puente n8n (Provider-bridge)`;
        } else if (errorMessage.includes('Network') || errorMessage.includes('Failed to fetch')) {
          troubleshooting = `\n\n**Vérifications:**\n1. Le serveur n8n-multi backend est-il démarré sur http://localhost:3459 ?\n2. L'endpoint Provider-bridge Netlify est-il accessible ?`;
        }

        addOrUpdateMessage({
          id: assistant_msg_id,
          msg_id: assistant_msg_id,
          type: 'text',
          position: 'left',
          conversation_id,
          content: {
            content: `❌ Erreur: ${errorMessage}${troubleshooting}\n\nAssurez-vous que:\n1. Le backend multi-workflow est lancé.\n2. Le endpoint Provider-bridge répond.`,
          },
          createdAt: Date.now(),
        } as TMessage);

        Message.error(t('Failed to execute n8n multi-workflow'));
        setSending(false);
      }
    },
    [conversation_id, addOrUpdateMessage, sending, t]
  );

  return <SendBox value={input} onChange={setInput} onSend={handleSend} disabled={sending} placeholder="Entrez la commande multi-workflow (ex: - [Command] = Programme...)" />;
};

export default N8nMultiWorkflowSendBox;
