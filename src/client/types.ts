export type WorkflowType = 'n8n' | 'n8n-multi-workflow';

export interface AuthUser {
  id: string;
  username: string;
  role: 'admin' | 'user';
}

export interface Conversation {
  id: string;
  userId: string;
  name: string;
  type: WorkflowType;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
}
