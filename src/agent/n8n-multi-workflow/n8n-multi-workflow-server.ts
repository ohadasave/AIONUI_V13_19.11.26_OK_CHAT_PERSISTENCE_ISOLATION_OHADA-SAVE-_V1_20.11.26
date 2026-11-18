/**
 * n8n Multi-Workflow Microservice Backend
 * Port: 3459
 * Architecture: Direct endpoint call with response parsing, pointing to Netlify provider-bridge
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3459;

// n8n multi-workflow endpoint URL (Netlify provider-bridge)
const N8N_ENDPOINT = 'https://providerbridge.netlify.app/api/providers/n8n/processor';
const N8N_TIMEOUT = 11 * 60 * 1000; // 11 minutes (660000 ms)

app.use(cors());
app.use(express.json());

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'n8n-multi-workflow-backend', port: PORT, endpoint: N8N_ENDPOINT });
});

/**
 * Execute n8n multi-workflow
 * POST /api/n8n-multi-workflow/execute
 * Body: { userMessage: string, attachments?: any[] }
 */
app.post('/api/n8n-multi-workflow/execute', async (req, res) => {
  try {
    const { userMessage, attachments } = req.body;

    if (!userMessage || typeof userMessage !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'userMessage is required and must be a string',
      });
    }

    console.log('📥 Received request for multi-workflow:', { userMessage: userMessage.substring(0, 100), attachments: attachments?.length || 0 });
    console.log('🔄 Calling Provider-Bridge endpoint:', N8N_ENDPOINT);

    // Build request body according to API requirements
    const requestBody = {
      message: userMessage,
      options: {
        timeout: 660000,
      },
    };

    // Call Provider-Bridge endpoint with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), N8N_TIMEOUT);

    const startTime = Date.now();
    const response = await fetch(N8N_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: '*/*',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal as any,
    });

    clearTimeout(timeoutId);

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`📡 Response status: ${response.status} (${elapsedTime}s)`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Provider-Bridge API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Provider-Bridge response received');

    // Return the response as received or adapt it if necessary.
    // The Provider-Bridge returns JSON with {"message": {"content": "...", "role": "assistant"}, ...}
    // We will extract the content and normalize it so it looks like what the frontend expects.

    // Normalize response
    const normalized = normalizeN8nMultiResponse(result);

    res.json({
      success: true,
      data: normalized,
    });
  } catch (error: any) {
    console.error('❌ n8n multi-workflow execution error:', error.message);

    let errorMessage = error.message;
    let errorType = 'unknown';

    if (error.name === 'AbortError') {
      errorMessage = `Request timeout (>${N8N_TIMEOUT / 1000}s)`;
      errorType = 'timeout';
    } else if (error.message.includes('Failed to fetch')) {
      errorMessage = 'Network error: Unable to connect to Provider-Bridge endpoint';
      errorType = 'network';
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      errorType,
    });
  }
});

/**
 * Normalize n8n multi-workflow response to a consistent format
 * The provider-bridge returns:
 * {
 *   "created_at": "...",
 *   "message": { "role": "assistant", "content": "..." },
 *   "metadata": { "format": "array_output" | "direct_output" | "programme_travail_data" etc }
 * }
 */
function normalizeN8nMultiResponse(result: any): any {
  console.log('🔍 Normalizing n8n multi-workflow response...');

  if (!result || !result.message || typeof result.message.content !== 'string') {
    return {
      type: 'error',
      content: '',
      error: 'Invalid response format from Provider-Bridge',
    };
  }

  const content = result.message.content;
  const format = result.metadata?.format;

  // Since the response content is usually Markdown or structured text,
  // we return it as 'text'.
  // If we wanted to distinguish 'programme_travail_data' (Format 4) that gets converted to string,
  // we can just treat everything as text for display in the chat component.
  return {
    type: 'text',
    content: content,
    metadata: {
      format: format || 'direct_output',
      timestamp: result.created_at || new Date().toISOString(),
    },
  };
}

app.listen(PORT, () => {
  console.log('🚀 n8n Multi-Workflow Backend Server');
  console.log('='.repeat(60));
  console.log(`📡 Listening on http://localhost:${PORT}`);
  console.log(`🔗 Provider-Bridge Endpoint: ${N8N_ENDPOINT}`);
  console.log(`⏱️  Timeout: ${N8N_TIMEOUT / 1000}s`);
  console.log('📋 Endpoints:');
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /api/n8n-multi-workflow/execute - Execute workflow`);
  console.log('='.repeat(60));
});
