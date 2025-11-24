import { Hono } from 'hono';
import type { Env, UserSettings } from '../types';
import { verifyJWT } from '../utils/jwt';

const settings = new Hono<{ Bindings: Env }>();

// Authentication middleware
async function authMiddleware(c: any, next: any) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    return c.json({ success: false, error: 'No authorization header' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');
  const payload = await verifyJWT(token, c.env.JWT_SECRET);

  if (!payload) {
    return c.json({ success: false, error: 'Invalid or expired token' }, 401);
  }

  c.set('userId', payload.userId);
  await next();
}

// GET /api/settings - Get user settings
settings.get('/', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');

    const user = await c.env.DB
      .prepare('SELECT settings_json FROM users WHERE id = ?')
      .bind(userId)
      .first<any>();

    if (!user) {
      return c.json({
        success: false,
        error: 'User not found',
      }, 404);
    }

    let userSettings: UserSettings = {};
    if (user.settings_json) {
      try {
        userSettings = JSON.parse(user.settings_json);
      } catch (e) {
        console.error('Failed to parse user settings:', e);
      }
    }

    return c.json({
      success: true,
      settings: userSettings,
    });
  } catch (error: any) {
    console.error('Get settings error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to get settings',
    }, 500);
  }
});

// GET /api/settings/history - Get settings change history
settings.get('/history', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    // Query settings history from webhooks table (where we log all changes)
    const history = await c.env.DB
      .prepare(`
        SELECT id, event, data_json, created_at
        FROM webhooks
        WHERE user_id = ? AND event LIKE '%settings%'
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `)
      .bind(userId, limit, offset)
      .all();

    const historyItems = history.results?.map((row: any) => ({
      id: row.id,
      event: row.event,
      data: row.data_json ? JSON.parse(row.data_json) : null,
      timestamp: row.created_at,
    })) || [];

    // Get total count
    const countResult = await c.env.DB
      .prepare('SELECT COUNT(*) as total FROM webhooks WHERE user_id = ? AND event LIKE \'%settings%\'')
      .bind(userId)
      .first<any>();

    return c.json({
      success: true,
      history: historyItems,
      pagination: {
        total: countResult?.total || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (countResult?.total || 0),
      },
    });
  } catch (error: any) {
    console.error('Get settings history error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to get settings history',
    }, 500);
  }
});

// PUT /api/settings - Update user settings
settings.put('/', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const newSettings: UserSettings = await c.req.json();

    // Validate settings structure
    if (typeof newSettings !== 'object') {
      return c.json({
        success: false,
        error: 'Invalid settings format',
      }, 400);
    }

    const settingsJson = JSON.stringify(newSettings);

    await c.env.DB
      .prepare('UPDATE users SET settings_json = ? WHERE id = ?')
      .bind(settingsJson, userId)
      .run();

    // Log settings change to webhooks table for history
    try {
      await c.env.DB
        .prepare('INSERT INTO webhooks (event, data_json, user_id, created_at) VALUES (?, ?, ?, ?)')
        .bind('settings_updated', JSON.stringify({ settings: newSettings }), userId, Date.now())
        .run();
    } catch (logError) {
      console.error('Failed to log settings change:', logError);
    }

    return c.json({
      success: true,
      message: 'Settings updated successfully',
      settings: newSettings,
    });
  } catch (error: any) {
    console.error('Update settings error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to update settings',
    }, 500);
  }
});

// PATCH /api/settings - Partial update user settings
settings.patch('/', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const partialSettings = await c.req.json();

    // Get current settings
    const user = await c.env.DB
      .prepare('SELECT settings_json FROM users WHERE id = ?')
      .bind(userId)
      .first<any>();

    if (!user) {
      return c.json({
        success: false,
        error: 'User not found',
      }, 404);
    }

    let currentSettings: UserSettings = {};
    if (user.settings_json) {
      try {
        currentSettings = JSON.parse(user.settings_json);
      } catch (e) {
        console.error('Failed to parse user settings:', e);
      }
    }

    // Merge settings
    const mergedSettings = deepMerge(currentSettings, partialSettings);
    const settingsJson = JSON.stringify(mergedSettings);

    await c.env.DB
      .prepare('UPDATE users SET settings_json = ? WHERE id = ?')
      .bind(settingsJson, userId)
      .run();

    return c.json({
      success: true,
      message: 'Settings updated successfully',
      settings: mergedSettings,
    });
  } catch (error: any) {
    console.error('Patch settings error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to update settings',
    }, 500);
  }
});

// PUT /api/settings/models - Update model settings
settings.put('/models', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const { contentModel, imageModel } = await c.req.json();

    // Get current settings
    const user = await c.env.DB
      .prepare('SELECT settings_json FROM users WHERE id = ?')
      .bind(userId)
      .first<any>();

    let currentSettings: UserSettings = {};
    if (user?.settings_json) {
      try {
        currentSettings = JSON.parse(user.settings_json);
      } catch (e) {
        console.error('Failed to parse user settings:', e);
      }
    }

    // Update models
    currentSettings.models = {
      contentModel: contentModel || currentSettings.models?.contentModel,
      imageModel: imageModel || currentSettings.models?.imageModel,
    };

    const settingsJson = JSON.stringify(currentSettings);

    await c.env.DB
      .prepare('UPDATE users SET settings_json = ? WHERE id = ?')
      .bind(settingsJson, userId)
      .run();

    return c.json({
      success: true,
      message: 'Model settings updated successfully',
      models: currentSettings.models,
    });
  } catch (error: any) {
    console.error('Update models error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to update models',
    }, 500);
  }
});

// PUT /api/settings/webhook - Update webhook settings
settings.put('/webhook', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const { enabled, url } = await c.req.json();

    if (enabled && !url) {
      return c.json({
        success: false,
        error: 'Webhook URL is required when enabled',
      }, 400);
    }

    // Get current settings
    const user = await c.env.DB
      .prepare('SELECT settings_json FROM users WHERE id = ?')
      .bind(userId)
      .first<any>();

    let currentSettings: UserSettings = {};
    if (user?.settings_json) {
      try {
        currentSettings = JSON.parse(user.settings_json);
      } catch (e) {
        console.error('Failed to parse user settings:', e);
      }
    }

    // Update webhook
    currentSettings.webhook = {
      enabled: !!enabled,
      url: url || currentSettings.webhook?.url,
    };

    const settingsJson = JSON.stringify(currentSettings);

    await c.env.DB
      .prepare('UPDATE users SET settings_json = ? WHERE id = ?')
      .bind(settingsJson, userId)
      .run();

    return c.json({
      success: true,
      message: 'Webhook settings updated successfully',
      webhook: currentSettings.webhook,
    });
  } catch (error: any) {
    console.error('Update webhook error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to update webhook',
    }, 500);
  }
});

// GET /api/settings/stats - Get dashboard statistics
settings.get('/stats', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');

    // Get counts from database
    const [postsCount, memoryCount, webhooksCount, tweetsCount, videosCount] = await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) as count FROM posts WHERE user_id = ?').bind(userId).first<any>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM posts WHERE user_id = ? AND type = ?').bind(userId, 'memory').first<any>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM webhooks WHERE user_id = ?').bind(userId).first<any>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM posts WHERE user_id = ? AND type = ?').bind(userId, 'tweet').first<any>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM posts WHERE user_id = ? AND type = ?').bind(userId, 'youtube_video').first<any>(),
    ]);

    // Get recent activity
    const recentPosts = await c.env.DB
      .prepare('SELECT type, mode, created_at FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT 10')
      .bind(userId)
      .all();

    // Get webhook events breakdown
    const webhookEvents = await c.env.DB
      .prepare(`
        SELECT event, COUNT(*) as count
        FROM webhooks
        WHERE user_id = ?
        GROUP BY event
        ORDER BY count DESC
        LIMIT 10
      `)
      .bind(userId)
      .all();

    // Get settings
    const user = await c.env.DB
      .prepare('SELECT settings_json FROM users WHERE id = ?')
      .bind(userId)
      .first<any>();

    let userSettings: UserSettings = {};
    if (user?.settings_json) {
      try {
        userSettings = JSON.parse(user.settings_json);
      } catch (e) {
        console.error('Failed to parse user settings:', e);
      }
    }

    return c.json({
      success: true,
      stats: {
        posts: {
          total: postsCount?.count || 0,
          memory: memoryCount?.count || 0,
          tweets: tweetsCount?.count || 0,
          videos: videosCount?.count || 0,
        },
        webhooks: {
          total: webhooksCount?.count || 0,
          events: webhookEvents.results?.map((row: any) => ({
            event: row.event,
            count: row.count,
          })) || [],
        },
        recentActivity: recentPosts.results?.map((row: any) => ({
          type: row.type,
          mode: row.mode,
          timestamp: row.created_at,
        })) || [],
        settings: {
          configured: Object.keys(userSettings).length,
          webhook: userSettings.webhook || {},
          models: userSettings.models || {},
          accounts: userSettings.accounts?.length || 0,
        },
      },
    });
  } catch (error: any) {
    console.error('Get stats error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to get stats',
    }, 500);
  }
});

// Helper function to deep merge objects
function deepMerge(target: any, source: any): any {
  const output = { ...target };

  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      output[key] = deepMerge(target[key], source[key]);
    } else {
      output[key] = source[key];
    }
  }

  return output;
}

export default settings;
