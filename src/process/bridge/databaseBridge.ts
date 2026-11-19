/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '../../common';
import { getDatabase } from '@process/database';

export function initDatabaseBridge(): void {
  // Get conversation messages from database
  ipcBridge.database.getConversationMessages.provider(({ conversation_id, page = 0, pageSize = 10000 }) => {
    try {
      const db = getDatabase();
      const result = db.getConversationMessages(conversation_id, page, pageSize);
      return Promise.resolve(result.data || []);
    } catch (error) {
      console.error('[DatabaseBridge] Error getting conversation messages:', error);
      return Promise.resolve([]);
    }
  });

  // Get user conversations from database with lazy migration from file storage
  ipcBridge.database.getUserConversations.provider(async ({ userId, page = 0, pageSize = 10000 }) => {
    try {
      console.log('[DatabaseBridge] getUserConversations:', { userId, page, pageSize });

      // FAIL CLOSED: bloquer tout appel sans userId
      if (!userId) {
        console.error('[DatabaseBridge] BLOCKED: userId is required');
        return [];
      }

      // Mode multi-utilisateur: AUCUN merge avec file storage
      const db = getDatabase();
      const result = db.getUserConversations(userId, page, pageSize);
      const dbConversations = result.data || [];

      console.log(`[DatabaseBridge] Returning ${dbConversations.length} conversations for userId=${userId}`);
      return dbConversations;
    } catch (error) {
      console.error('[DatabaseBridge] Error getting user conversations:', error);
      return [];
    }
  });

  // Update message content in database (for table modifications)
  ipcBridge.database.updateMessageContent.provider(({ messageId, conversationId, content }) => {
    try {
      const db = getDatabase();

      // Get the existing message
      const messages = db.getConversationMessages(conversationId, 0, 10000);
      const existingMessage = messages.data?.find((msg) => msg.id === messageId);

      if (!existingMessage) {
        console.error('[DatabaseBridge] Message not found:', messageId);
        return Promise.resolve({ success: false, error: 'Message not found' });
      }

      // Update the message content
      const updatedMessage = {
        ...existingMessage,
        content: {
          ...existingMessage.content,
          content,
        },
      };

      const result = db.updateMessage(messageId, updatedMessage);

      if (result.success) {
        console.log('[DatabaseBridge] Message content updated successfully:', messageId);
        return Promise.resolve({ success: true });
      } else {
        console.error('[DatabaseBridge] Failed to update message:', result.error);
        return Promise.resolve({ success: false, error: result.error });
      }
    } catch (error) {
      console.error('[DatabaseBridge] Error updating message content:', error);
      return Promise.resolve({ success: false, error: String(error) });
    }
  });
}
