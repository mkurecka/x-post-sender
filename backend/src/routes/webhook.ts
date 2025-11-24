import { Hono } from 'hono';
import type { Env } from '../types';

const router = new Hono<{ Bindings: Env }>();

/**
 * POST /api/webhook
 * Generic webhook endpoint to receive events from extension
 */
router.post('/', async (c) => {
  try {
    const payload = await c.req.json();
    const { event, data, userId } = payload;

    console.log('[Webhook] Received event:', event, {
      dataSize: data ? JSON.stringify(data).length : 0,
      userId: userId || 'anonymous',
      timestamp: Date.now()
    });

    // Store webhook event in database
    try {
      await c.env.DB.prepare(
        'INSERT INTO webhooks (event, data_json, user_id, created_at) VALUES (?, ?, ?, ?)'
      ).bind(
        event,
        JSON.stringify(data),
        userId || null,
        Date.now()
      ).run();
    } catch (dbError) {
      console.error('[Webhook] Database error:', dbError);
      // Continue even if DB fails
    }

    // Forward to external webhook if configured
    let forwardUrl: string | null = null;

    // Try to get webhook URL from user settings
    if (userId) {
      try {
        const userSettings = await c.env.DB.prepare(
          'SELECT settings_json FROM users WHERE id = ?'
        ).bind(userId).first();

        if (userSettings?.settings_json) {
          const settings = JSON.parse(userSettings.settings_json as string);
          if (settings?.webhook?.url && settings?.webhook?.enabled) {
            forwardUrl = settings.webhook.url;
          }
        }
      } catch (settingsError) {
        console.error('[Webhook] Error fetching user settings:', settingsError);
      }
    }

    // Fallback to environment variable
    if (!forwardUrl && c.env.RAILWAY_WEBHOOK_URL) {
      forwardUrl = c.env.RAILWAY_WEBHOOK_URL;
    }

    // Forward webhook if URL is configured
    if (forwardUrl) {
      try {
        console.log('[Webhook] Forwarding to:', forwardUrl);

        const forwardResponse = await fetch(forwardUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-From': 'text-processor-api',
            'X-Original-Event': event
          },
          body: JSON.stringify(payload)
        });

        console.log('[Webhook] Forward response:', {
          status: forwardResponse.status,
          ok: forwardResponse.ok
        });

        if (!forwardResponse.ok) {
          const errorText = await forwardResponse.text();
          console.error('[Webhook] Forward failed:', errorText);
        }
      } catch (forwardError) {
        console.error('[Webhook] Forward error:', forwardError);
        // Don't fail the original webhook on forward errors
      }
    }

    return c.json({
      success: true,
      message: 'Webhook received',
      event,
      forwarded: !!forwardUrl,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('[Webhook] Error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process webhook'
    }, 400);
  }
});

/**
 * GET /api/webhook/health
 * Health check for webhook endpoint
 */
router.get('/health', (c) => {
  return c.json({
    success: true,
    message: 'Webhook endpoint is healthy',
    timestamp: Date.now()
  });
});

export default router;
