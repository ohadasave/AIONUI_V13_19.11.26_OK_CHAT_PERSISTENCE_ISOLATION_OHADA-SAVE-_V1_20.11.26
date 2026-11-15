/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TChatConversation } from '@/common/storage';
import { ipcBridge } from '@/common';
import { executeN8nMultiWorkflow } from '../services/n8nMultiWorkflowService';
import { addMessage } from '../message';
import type { TMessage } from '@/common/chatLib';
import { uuid } from '@/common/utils';

export class N8nMultiWorkflowAgentManager {
  public readonly type = 'n8n-multi-workflow';
  public readonly id: string;
  public readonly workspace: string;
  public readonly status = 'idle';
  private conversation: TChatConversation;

  constructor(conversation: TChatConversation) {
    this.id = conversation.id;
    this.conversation = conversation;
    this.workspace = conversation.extra?.workspace || '';
  }

  /**
   * Send message to n8n-multi-workflow
   */
  async sendMessage({ content, msg_id, user_msg_id }: { content: string; files?: string[]; msg_id: string; user_msg_id?: string }): Promise<void> {
    (this as any).status = 'running';

    const userMessage: TMessage = {
      id: user_msg_id || uuid(),
      msg_id: user_msg_id || msg_id,
      type: 'text',
      position: 'right',
      conversation_id: this.id,
      content: {
        content,
      },
      createdAt: Date.now(),
    };
    addMessage(this.id, userMessage);

    ipcBridge.conversation.responseStream.emit({
      type: 'user_content',
      conversation_id: this.id,
      msg_id: userMessage.msg_id,
      data: content,
    });

    await this.execute(content, msg_id);
  }

  async execute(userMessage: string, msgId: string): Promise<void> {
    try {
      const result = await executeN8nMultiWorkflow({ userMessage });

      if (result.success && result.data) {
        let markdown = typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2);

        const assistantMessage: TMessage = {
          id: uuid(),
          msg_id: msgId,
          type: 'text',
          position: 'left',
          conversation_id: this.id,
          content: {
            content: markdown,
          },
          createdAt: Date.now(),
        };
        addMessage(this.id, assistantMessage);

        ipcBridge.conversation.responseStream.emit({
          type: 'message',
          conversation_id: this.id,
          msg_id: msgId,
          data: markdown,
        });

        ipcBridge.conversation.responseStream.emit({
          type: 'finish',
          conversation_id: this.id,
          msg_id: msgId,
          data: null,
        });
      } else {
        const errorMessage = `❌ Multi-workflow execution failed:\n\n${result.error || 'Unknown error'}`;

        const errorMsg: TMessage = {
          id: uuid(),
          msg_id: msgId,
          type: 'text',
          position: 'left',
          conversation_id: this.id,
          content: {
            content: errorMessage,
          },
          createdAt: Date.now(),
        };
        addMessage(this.id, errorMsg);

        ipcBridge.conversation.responseStream.emit({
          type: 'error',
          conversation_id: this.id,
          msg_id: msgId,
          data: errorMessage,
        });
      }
    } catch (error) {
      const errorMessage = `❌ Multi-workflow error:\n\n${error instanceof Error ? error.message : 'Unknown error'}`;

      const errorMsg: TMessage = {
        id: uuid(),
        msg_id: msgId,
        type: 'text',
        position: 'left',
        conversation_id: this.id,
        content: {
          content: errorMessage,
        },
        createdAt: Date.now(),
      };
      addMessage(this.id, errorMsg);

      ipcBridge.conversation.responseStream.emit({
        type: 'error',
        conversation_id: this.id,
        msg_id: msgId,
        data: errorMessage,
      });
    }
  }

  stop(): void {}

  getConfirmations(): any[] {
    return [];
  }

  confirm(_msgId: string, _callId: string, _data: any): void {}

  destroy(): void {}

  kill(): void {}
}
