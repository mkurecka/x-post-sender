import { Hono } from 'hono';
import type { Env } from '../types';
import { dashboardPage } from '../templates/pages/dashboard';
import { memoriesPage } from '../templates/pages/memories';
import { tweetsPage } from '../templates/pages/tweets';
import { videosPage } from '../templates/pages/videos';
import { aiContentPage } from '../templates/pages/ai-content';
import { webhooksPage } from '../templates/pages/webhooks';
import { profilesPage } from '../templates/pages/profiles';
import { AirtableService } from '../services/airtable';

const router = new Hono<{ Bindings: Env }>();

// Use actual Worker URL for API calls
const apiBase = 'https://text-processor-api.kureckamichal.workers.dev';

/**
 * GET /dashboard
 * Main dashboard overview page
 */
router.get('/', async (c) => {
  try {
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

    const html = dashboardPage({ stats, apiBase });
    return c.html(html);

  } catch (error: any) {
    console.error('Dashboard error:', error);
    return c.html(errorPage('Dashboard Error', error.message), 500);
  }
});

/**
 * GET /dashboard/memories
 * Memories listing page
 */
router.get('/memories', async (c) => {
  try {
    const result = await c.env.DB.prepare('SELECT COUNT(*) as count FROM memory').first<any>();
    const count = result?.count || 0;

    const html = memoriesPage({ count, apiBase });
    return c.html(html);

  } catch (error: any) {
    console.error('Memories page error:', error);
    return c.html(errorPage('Memories Error', error.message), 500);
  }
});

/**
 * GET /dashboard/tweets
 * Tweets listing page
 */
router.get('/tweets', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM posts WHERE type = ?'
    ).bind('tweet').first<any>();
    const count = result?.count || 0;

    const html = tweetsPage({ count, apiBase });
    return c.html(html);

  } catch (error: any) {
    console.error('Tweets page error:', error);
    return c.html(errorPage('Tweets Error', error.message), 500);
  }
});

/**
 * GET /dashboard/videos
 * Videos listing page
 */
router.get('/videos', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM posts WHERE type = ?'
    ).bind('youtube_video').first<any>();
    const count = result?.count || 0;

    const html = videosPage({ count, apiBase });
    return c.html(html);

  } catch (error: any) {
    console.error('Videos page error:', error);
    return c.html(errorPage('Videos Error', error.message), 500);
  }
});

/**
 * GET /dashboard/ai-content
 * AI-generated content listing page
 */
router.get('/ai-content', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM posts WHERE generated_output IS NOT NULL AND generated_output != ?'
    ).bind('').first<any>();
    const count = result?.count || 0;

    const html = aiContentPage({ count, apiBase });
    return c.html(html);

  } catch (error: any) {
    console.error('AI Content page error:', error);
    return c.html(errorPage('AI Content Error', error.message), 500);
  }
});

/**
 * GET /dashboard/webhooks
 * Webhook events history page
 */
router.get('/webhooks', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM webhook_events'
    ).first<any>();
    const count = result?.count || 0;

    const html = webhooksPage({ count, apiBase });
    return c.html(html);

  } catch (error: any) {
    console.error('Webhooks page error:', error);
    return c.html(errorPage('Webhooks Error', error.message), 500);
  }
});

/**
 * GET /dashboard/profiles
 * Airtable profiles and websites page
 */
router.get('/profiles', async (c) => {
  try {
    const airtable = new AirtableService(c.env);
    const configured = airtable.isConfigured();

    let profilesCount = 0;
    let websitesCount = 0;

    if (configured) {
      try {
        const [profiles, websites] = await Promise.all([
          airtable.listUserProfiles(),
          airtable.listWebsites()
        ]);
        profilesCount = profiles.length;
        websitesCount = websites.length;
      } catch (error) {
        console.error('Error fetching Airtable data:', error);
      }
    }

    const html = profilesPage({ profilesCount, websitesCount, apiBase, configured });
    return c.html(html);

  } catch (error: any) {
    console.error('Profiles page error:', error);
    return c.html(errorPage('Profiles Error', error.message), 500);
  }
});

/**
 * Error page helper
 */
function errorPage(title: string, message: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: system-ui; padding: 2rem; max-width: 600px; margin: 0 auto; }
        .error { background: #fee; color: #c00; padding: 1rem; border-radius: 8px; }
        a { color: #065f4a; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="error">
        <strong>Error:</strong> ${message || 'An unexpected error occurred'}
      </div>
      <p style="margin-top: 1rem;">
        <a href="/dashboard">← Back to Dashboard</a>
      </p>
    </body>
    </html>
  `;
}

export default router;
