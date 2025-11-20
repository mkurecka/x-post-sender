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
    const { event, data } = payload;

    console.log('[Webhook] Received event:', event, {
      dataSize: data ? JSON.stringify(data).length : 0,
      timestamp: Date.now()
    });

    // TODO: Process webhook events
    // - Store in D1 database
    // - Trigger integrations (Blotato, Airtable, etc.)
    // - Send notifications
    // - Queue for processing

    // For now, just acknowledge receipt
    return c.json({
      success: true,
      message: 'Webhook received',
      event,
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
