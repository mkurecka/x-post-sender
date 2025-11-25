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
 * POST /api/proxy/image
 * Proxy requests to OpenRouter for AI image generation
 * Uses OpenRouter's multimodal models with image output
 * Keeps API keys secure on backend
 */
router.post('/image', async (c) => {
  try {
    const { prompt, style, aspectRatio, model } = await c.req.json();

    if (!prompt) {
      return c.json({
        success: false,
        error: 'Missing required field: prompt'
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

    const styleDescriptions: Record<string, string> = {
      'vivid': 'dramatic, hyper-realistic, vibrant colors, high contrast',
      'natural': 'realistic, subtle, natural lighting, soft colors'
    };

    // Build the image generation prompt
    const imagePrompt = `Generate an image: ${prompt}. Style: ${styleDescriptions[style] || styleDescriptions['vivid']}. Aspect ratio: ${aspectRatio || '1:1'}.`;

    const selectedModel = model || 'google/gemini-2.5-flash-image';

    console.log('[Proxy] Image generation request via OpenRouter:', {
      promptLength: imagePrompt.length,
      style: style || 'vivid',
      aspectRatio: aspectRatio || '1:1',
      model: selectedModel
    });

    // Use OpenRouter's chat completions API with multimodal models
    // Content must be an array of typed objects per OpenRouter docs
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': c.env.APP_URL || 'https://text-processor.app',
        'X-Title': 'Universal Text Processor'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: imagePrompt
            }
          ]
        }],
        // Request image output modality - required for image generation
        modalities: ['text', 'image']
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Proxy] OpenRouter image generation error:', error);
      return c.json({
        success: false,
        error: 'Image generation API error',
        details: error
      }, response.status);
    }

    const data = await response.json() as {
      choices?: Array<{
        finish_reason?: string;
        native_finish_reason?: string;
        message?: {
          content?: string | Array<{
            type: string;
            image_url?: { url: string };
            text?: string;
          }>;
          // OpenRouter returns images in a separate 'images' array
          images?: Array<{
            url?: string;
            b64_json?: string;
          }>;
        };
      }>;
    };

    const choice = data.choices?.[0];
    const message = choice?.message as any; // Use any to access dynamic fields

    console.log('[Proxy] OpenRouter full response:', JSON.stringify(data).substring(0, 2000));
    console.log('[Proxy] OpenRouter response parsed:', {
      hasChoices: !!data.choices,
      finishReason: choice?.finish_reason,
      nativeFinishReason: choice?.native_finish_reason,
      hasImages: !!message?.images,
      imagesLength: message?.images?.length,
      contentType: typeof message?.content,
      contentIsArray: Array.isArray(message?.content),
      contentLength: Array.isArray(message?.content) ? message.content.length : (typeof message?.content === 'string' ? message.content.length : 0),
      messageKeys: message ? Object.keys(message) : []
    });

    // Check for safety block or content filter
    if (choice?.native_finish_reason === 'IMAGE_SAFETY' ||
        choice?.native_finish_reason === 'SAFETY' ||
        choice?.finish_reason === 'content_filter') {
      return c.json({
        success: false,
        error: 'Image generation blocked by safety filter. Try a different prompt.',
        code: 'SAFETY_FILTER'
      }, 400);
    }

    // Extract image from response
    let imageUrl: string | null = null;

    // First check for images array (OpenRouter format)
    // Images can be: { url: "..." } or { type: "image_url", image_url: { url: "..." } }
    if (message?.images && message.images.length > 0) {
      const img = message.images[0];
      if (img.url) {
        imageUrl = img.url;
      } else if (img.image_url?.url) {
        // OpenRouter Gemini format: { type: "image_url", image_url: { url: "data:image/png;base64,..." } }
        imageUrl = img.image_url.url;
      } else if (img.b64_json) {
        imageUrl = `data:image/png;base64,${img.b64_json}`;
      }
    }

    // Fallback: check content array for image parts
    if (!imageUrl && Array.isArray(message?.content)) {
      for (const part of message.content) {
        if (part.type === 'image_url' && part.image_url?.url) {
          imageUrl = part.image_url.url;
          break;
        }
        if (part.type === 'image' && (part as any).url) {
          imageUrl = (part as any).url;
          break;
        }
        if (part.type === 'image' && (part as any).b64_json) {
          imageUrl = `data:image/png;base64,${(part as any).b64_json}`;
          break;
        }
      }
    }

    // Fallback: check if content is a data URL string
    if (!imageUrl && typeof message?.content === 'string') {
      if (message.content.startsWith('data:image')) {
        imageUrl = message.content;
      } else if (message.content.startsWith('http')) {
        imageUrl = message.content;
      }
    }

    if (!imageUrl) {
      console.error('[Proxy] No image in response:', JSON.stringify(data).substring(0, 1000));
      return c.json({
        success: false,
        error: 'No image generated. The model returned no image data.',
        details: JSON.stringify(data).substring(0, 500)
      }, 400);
    }

    // Save image to R2 storage
    let r2Url: string | null = null;
    try {
      // Extract base64 data from data URL
      if (imageUrl.startsWith('data:image/')) {
        const matches = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
        if (matches) {
          const imageFormat = matches[1]; // png, jpeg, etc.
          const base64Data = matches[2];
          const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

          // Generate unique filename
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substring(2, 10);
          const filename = `ai-images/${timestamp}-${randomId}.${imageFormat}`;

          // Upload to R2
          await c.env.STORAGE.put(filename, binaryData, {
            httpMetadata: {
              contentType: `image/${imageFormat}`
            },
            customMetadata: {
              model: selectedModel,
              prompt: prompt.substring(0, 200),
              generatedAt: new Date().toISOString()
            }
          });

          // Construct URL to serve through our API (use worker URL, not APP_URL)
          r2Url = `https://text-processor-api.kureckamichal.workers.dev/api/proxy/ai-images/${timestamp}-${randomId}.${imageFormat}`;
          console.log('[Proxy] Image saved to R2:', filename, '-> URL:', r2Url);
        }
      }
    } catch (r2Error) {
      console.error('[Proxy] Failed to save image to R2:', r2Error);
      // Continue without R2 URL - still return the base64 image
    }

    return c.json({
      success: true,
      url: r2Url || imageUrl,
      originalUrl: imageUrl.startsWith('data:') ? undefined : imageUrl,
      r2Url,
      data: { url: r2Url || imageUrl }
    });

  } catch (error) {
    console.error('[Proxy] Image generation exception:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate image'
    }, 500);
  }
});

/**
 * GET /api/proxy/image-models
 * Fetch available image generation models from OpenRouter
 * Filters models that have "image" in output_modalities
 */
router.get('/image-models', async (c) => {
  try {
    const skipCache = c.req.query('refresh') === 'true';

    // Try to get from cache first
    if (!skipCache) {
      const cached = await c.env.CACHE.get('openrouter_image_models');
      if (cached) {
        return c.json({
          success: true,
          data: JSON.parse(cached),
          cached: true
        });
      }
    }

    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json() as {
      data: Array<{
        id: string;
        name: string;
        description?: string;
        pricing?: {
          prompt?: string;
          completion?: string;
          image?: string;
        };
        architecture?: {
          output_modalities?: string[];
        };
      }>;
    };

    // Filter models with image output capability (nested under architecture)
    const imageModels = data.data
      .filter(m => m.architecture?.output_modalities?.includes('image'))
      .map(m => ({
        id: m.id,
        name: m.name,
        description: m.description,
        pricing: m.pricing?.image || m.pricing?.completion || 'unknown'
      }));

    // Cache for 1 hour
    await c.env.CACHE.put('openrouter_image_models', JSON.stringify(imageModels), {
      expirationTtl: 3600
    });

    return c.json({
      success: true,
      data: imageModels,
      cached: false
    });

  } catch (error) {
    console.error('[Proxy] Fetch image models error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch image models'
    }, 500);
  }
});

/**
 * GET /api/proxy/ai-images
 * List all AI-generated images from R2 storage
 */
router.get('/ai-images', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const cursor = c.req.query('cursor');

    const listOptions: R2ListOptions = {
      prefix: 'ai-images/',
      limit,
      include: ['customMetadata', 'httpMetadata']
    };
    if (cursor) {
      listOptions.cursor = cursor;
    }

    const listed = await c.env.STORAGE.list(listOptions);

    const images = listed.objects.map(obj => {
      const filename = obj.key.replace('ai-images/', '');
      return {
        filename,
        url: `https://text-processor-api.kureckamichal.workers.dev/api/proxy/ai-images/${filename}`,
        size: obj.size,
        uploaded: obj.uploaded.toISOString(),
        metadata: obj.customMetadata || {}
      };
    });

    // Sort by upload date (newest first)
    images.sort((a, b) => new Date(b.uploaded).getTime() - new Date(a.uploaded).getTime());

    return c.json({
      success: true,
      data: images,
      count: images.length,
      truncated: listed.truncated,
      cursor: listed.truncated ? listed.cursor : undefined
    });
  } catch (error) {
    console.error('[Proxy] Failed to list images:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list images'
    }, 500);
  }
});

/**
 * GET /api/proxy/ai-images/:filename
 * Serve AI-generated images from R2 storage
 */
router.get('/ai-images/:filename', async (c) => {
  try {
    const filename = c.req.param('filename');
    const key = `ai-images/${filename}`;

    const object = await c.env.STORAGE.get(key);
    if (!object) {
      return c.json({ success: false, error: 'Image not found' }, 404);
    }

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/png');
    headers.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    headers.set('Access-Control-Allow-Origin', '*');

    return new Response(object.body, { headers });
  } catch (error) {
    console.error('[Proxy] Failed to serve image:', error);
    return c.json({ success: false, error: 'Failed to serve image' }, 500);
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
      htmlToImage: '/api/proxy/html-to-image',
      image: '/api/proxy/image',
      imageModels: '/api/proxy/image-models'
    },
    timestamp: Date.now()
  });
});

export default router;
