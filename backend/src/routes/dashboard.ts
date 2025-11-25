import { Hono } from 'hono';
import type { Env } from '../types';
import { dashboardPage } from '../templates/pages/dashboard';

const router = new Hono<{ Bindings: Env }>();

/**
 * GET /dashboard
 * Public dashboard view (shows stats without authentication)
 */
router.get('/', async (c) => {
  try {
    // Get public stats (without user-specific data)
    const [postsCount, memoryCount, webhooksCount, usersCount, tweetsCount, videosCount] = await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) as count FROM posts').first<any>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM memory').first<any>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM webhook_events').first<any>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first<any>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM posts WHERE type = ?').bind('tweet').first<any>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM posts WHERE type = ?').bind('youtube_video').first<any>(),
    ]);

    const stats = {
      posts: {
        total: postsCount?.count || 0,
        tweets: tweetsCount?.count || 0,
        videos: videosCount?.count || 0,
        memory: memoryCount?.count || 0,
      },
      webhooks: {
        total: webhooksCount?.count || 0,
      },
      users: {
        total: usersCount?.count || 0,
      },
    };

    // Use actual Worker URL for API calls, not APP_URL which may be a custom domain
    const apiBase = 'https://text-processor-api.kureckamichal.workers.dev';

    const html = dashboardPage({ stats, apiBase });

    return c.html(html);

  } catch (error: any) {
    console.error('Dashboard error:', error);

    return c.html(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Dashboard Error</title>
        <style>
          body { font-family: system-ui; padding: 2rem; max-width: 600px; margin: 0 auto; }
          .error { background: #fee; color: #c00; padding: 1rem; border-radius: 8px; }
        </style>
      </head>
      <body>
        <h1>Dashboard Error</h1>
        <div class="error">
          <strong>Error:</strong> ${error.message || 'Failed to load dashboard'}
        </div>
        <p style="margin-top: 1rem; color: #666;">
          Please check the server logs for more details.
        </p>
      </body>
      </html>
    `, 500);
  }
});

export default router;
