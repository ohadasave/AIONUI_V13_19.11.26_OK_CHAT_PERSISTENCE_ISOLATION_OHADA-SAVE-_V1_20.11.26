/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * n8n Multi-Workflow Microservice API
 * Proxy to local backend service on port 3459
 */

const N8N_MULTI_BACKEND_URL = 'http://localhost:3459/api/n8n-multi-workflow/execute';

export type N8nMultiExecuteRequest = {
  userMessage: string;
  attachments?: any[];
};

export type N8nMultiExecuteResponse = {
  success: boolean;
  data?: any;
  error?: string;
  errorType?: string;
};

/**
 * Execute n8n multi-workflow via backend microservice
 */
export async function executeN8nMultiWorkflow(request: N8nMultiExecuteRequest): Promise<N8nMultiExecuteResponse> {
  try {
    console.log('[n8nMultiWorkflowService] Executing workflow:', { message: request.userMessage.substring(0, 100) });

    const response = await fetch(N8N_MULTI_BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('[n8nMultiWorkflowService] Workflow executed successfully');

    return result;
  } catch (error) {
    console.error('[n8nMultiWorkflowService] Workflow execution failed:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
      errorType: 'network',
    };
  }
}

/**
 * Check n8n multi-workflow backend health
 */
export async function checkN8nMultiHealth(): Promise<{ status: string; available: boolean }> {
  try {
    const response = await fetch('http://localhost:3459/health', {
      method: 'GET',
    });

    if (!response.ok) {
      return { status: 'error', available: false };
    }

    const result = await response.json();
    return { status: result.status || 'ok', available: true };
  } catch (error) {
    console.error('[n8nMultiWorkflowService] Health check failed:', error);
    return { status: 'unavailable', available: false };
  }
}
