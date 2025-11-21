import { Hono } from 'hono';
import type { Env } from '../types';

const router = new Hono<{ Bindings: Env }>();

/**
 * POST /api/proxy/openrouter
 * Proxy requests to OpenRouter API
 * Keeps API keys secure on backend
 */
router.post('/openrouter', async (c) => {
  try {
    const { model, messages, ...otherOptions } = await c.req.json();

    if (!model || !messages) {
      return c.json({
        success: false,
        error: 'Missing required fields: model, messages'
      }, 400);
    }

    const apiKey = c.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('[Proxy] OPENROUTER_API_KEY not configured');
      return c.json({
        success: false,
        error: 'OpenRouter API not configured'
      }, 500);
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': c.env.APP_URL || 'https://text-processor.app',
        'X-Title': 'Universal Text Processor'
      },
      body: JSON.stringify({
        model,
        messages,
        ...otherOptions
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Proxy] OpenRouter error:', error);
      return c.json({
        success: false,
        error: 'OpenRouter API error',
        details: error
      }, response.status);
    }

    const data = await response.json();

    return c.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('[Proxy] OpenRouter exception:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to proxy OpenRouter request'
    }, 500);
  }
});

/**
 * POST /api/proxy/html-to-image
 * Proxy requests to html-to-image worker
 * Keeps worker endpoint and API key secure
 */
router.post('/html-to-image', async (c) => {
  try {
    const { html, width, height, format } = await c.req.json();

    if (!html || !width || !height) {
      return c.json({
        success: false,
        error: 'Missing required fields: html, width, height'
      }, 400);
    }

    const workerEndpoint = c.env.HTML_TO_IMAGE_WORKER_URL ||
      'https://html-to-image-worker.kureckamichal.workers.dev/render';

    const workerApiKey = c.env.HTML_TO_IMAGE_WORKER_API_KEY || '';


    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (workerApiKey) {
      headers['X-API-Key'] = workerApiKey;  // Recommended authentication method
    }

    const requestBody = {
      html,
      width,
      height,
      format: format || 'png'
    };

    // Use Service Binding if available (for Worker-to-Worker communication)
    // This avoids the 1042 error when workers try to fetch each other via HTTP
    const serviceBinding = c.env.HTML_TO_IMAGE_SERVICE;

    console.log('[Proxy] HTML-to-Image request:', {
      useServiceBinding: !!serviceBinding,
      bodySize: JSON.stringify(requestBody).length
    });

    let response: Response;

    if (serviceBinding) {
      // Use Service Binding - direct Worker-to-Worker call
      response = await serviceBinding.fetch('https://html-to-image-worker/render', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });
    } else {
      // Fallback to HTTP fetch (may not work for same-account workers)
      response = await fetch(workerEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Proxy] HTML-to-Image error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        headers: Object.fromEntries(response.headers.entries())
      });
      return c.json({
        success: false,
        error: 'HTML-to-Image worker error',
        details: errorText,
        status: response.status
      }, response.status);
    }

    const data = await response.json();

    return c.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('[Proxy] HTML-to-Image exception:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to proxy HTML-to-Image request'
    }, 500);
  }
});

/**
 * GET /api/proxy/health
 * Health check for proxy endpoints
 */
router.get('/health', (c) => {
  return c.json({
    success: true,
    message: 'Proxy endpoints are healthy',
    endpoints: {
      openrouter: '/api/proxy/openrouter',
      htmlToImage: '/api/proxy/html-to-image'
    },
    timestamp: Date.now()
  });
});

export default router;
