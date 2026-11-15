/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * n8n Microservice API
 * Direct HTTP call to n8n cloud platform
 */

const N8N_CLOUD_URL = 'https://5ociivmf.rpcl.app/webhook/template';

export type N8nExecuteRequest = {
  userMessage: string;
  attachments?: any[];
};

export type N8nExecuteResponse = {
  success: boolean;
  data?: any;
  error?: string;
  errorType?: string;
};

/**
 * Normalize n8n response to consistent format
 */
function normalizeN8nResponse(result: any): any {
  if (!result) {
    return {
      type: 'error',
      error: 'Empty response from n8n',
    };
  }

  // FORMAT 1: Array with object containing 'output' (most common format)
  if (Array.isArray(result) && result.length > 0) {
    const firstItem = result[0];

    if (firstItem && typeof firstItem === 'object' && 'output' in firstItem) {
      console.log('[n8nService] FORMAT 1: Array with output');
      return {
        type: 'text',
        content: String(firstItem.output || ''),
        metadata: {
          status: firstItem.status,
          tables_found: firstItem.tables_found,
          timestamp: firstItem.timestamp,
          format: 'array_output',
        },
      };
    }

    // FORMAT 4: Array with "data" structure
    if (firstItem && typeof firstItem === 'object' && 'data' in firstItem) {
      console.log('[n8nService] FORMAT 4: Programme de travail with data');
      return {
        type: 'structured_data',
        data: firstItem.data,
        metadata: {
          format: 'programme_travail_data',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  // FORMAT 2: Object with 'tables' array
  if (result && typeof result === 'object' && !Array.isArray(result) && result.tables && Array.isArray(result.tables)) {
    console.log('[n8nService] FORMAT 2: Object with tables');
    return {
      type: 'tables',
      tables: result.tables,
      metadata: {
        status: result.status,
        tables_found: result.tables_found || result.tables.length,
        format: 'tables_array',
      },
    };
  }

  // FORMAT 3: Direct output
  if (result && typeof result === 'object' && !Array.isArray(result) && result.output && typeof result.output === 'string') {
    console.log('[n8nService] FORMAT 3: Direct output');
    return {
      type: 'text',
      content: result.output,
      metadata: {
        format: 'direct_output',
      },
    };
  }

  // Unknown format
  console.warn('[n8nService] Unknown format, returning raw');
  return {
    type: 'unknown',
    raw: result,
    metadata: {
      format: 'unknown_fallback',
    },
  };
}

/**
 * Execute n8n workflow directly via cloud platform
 */
export async function executeN8nWorkflow(request: N8nExecuteRequest): Promise<N8nExecuteResponse> {
  try {
    console.log('[n8nService] Executing workflow:', { message: request.userMessage.substring(0, 100) });

    // Prepare request body for n8n
    const requestBody = request.attachments && request.attachments.length > 0 ? { data: { question: request.userMessage, attachments: request.attachments } } : { question: request.userMessage };

    const response = await fetch(N8N_CLOUD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('[n8nService] Workflow executed successfully');
    console.log('[n8nService] Raw result:', JSON.stringify(result).substring(0, 500));

    // Normalize n8n response to expected format
    const normalized = normalizeN8nResponse(result);
    console.log('[n8nService] Normalized result:', JSON.stringify(normalized).substring(0, 500));

    return {
      success: true,
      data: normalized,
    };
  } catch (error) {
    console.error('[n8nService] Workflow execution failed:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
      errorType: 'network',
    };
  }
}

/**
 * Check n8n cloud platform health
 */
export async function checkN8nHealth(): Promise<{ status: string; available: boolean }> {
  try {
    // Simple health check by calling the template endpoint
    const response = await fetch(N8N_CLOUD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ question: 'health check' }),
    });

    if (!response.ok) {
      return { status: 'error', available: false };
    }

    return { status: 'ok', available: true };
  } catch (error) {
    console.error('[n8nService] Health check failed:', error);
    return { status: 'unavailable', available: false };
  }
}
