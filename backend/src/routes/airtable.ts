/**
 * Airtable Routes - API endpoints for Airtable integration
 * Provides access to user profiles and website data from Airtable
 */

import { Hono } from 'hono';
import type { Env, ApiResponse, AirtableUserProfile, AirtableWebsite } from '../types';
import { AirtableService } from '../services/airtable';
import { verifyJWT } from '../utils/jwt';

const app = new Hono<{ Bindings: Env }>();

/**
 * Authentication middleware
 */
async function authMiddleware(c: any, next: any) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({
      success: false,
      error: 'Unauthorized',
      message: 'Missing or invalid authorization header'
    }, 401);
  }

  const token = authHeader.substring(7);
  try {
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    if (payload) {
      c.set('userId', payload.userId);
      c.set('userEmail', payload.email);
    }
    await next();
  } catch (err: any) {
    return c.json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    }, 401);
  }
}

// Apply auth middleware to all routes
app.use('*', authMiddleware);

/**
 * GET /api/airtable/profiles
 * List all user profiles from Airtable
 */
app.get('/profiles', async (c) => {
  try {
    const airtable = new AirtableService(c.env);
    const noCache = c.req.query('noCache') === 'true';

    const profiles = await airtable.listUserProfiles(!noCache);

    return c.json<ApiResponse<AirtableUserProfile[]>>({
      success: true,
      data: profiles,
      message: `Retrieved ${profiles.length} profiles`
    });
  } catch (err: any) {
    console.error('[Airtable Routes] Error listing profiles:', err);
    return c.json<ApiResponse>({
      success: false,
      error: err.message || 'Failed to list profiles'
    }, 500);
  }
});

/**
 * GET /api/airtable/profiles/:id
 * Get specific user profile by Airtable record ID
 */
app.get('/profiles/:id', async (c) => {
  try {
    const profileId = c.req.param('id');
    const airtable = new AirtableService(c.env);
    const noCache = c.req.query('noCache') === 'true';

    const profile = await airtable.getUserProfile(profileId, !noCache);

    if (!profile) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Not Found',
        message: `Profile ${profileId} not found`
      }, 404);
    }

    return c.json<ApiResponse<AirtableUserProfile>>({
      success: true,
      data: profile
    });
  } catch (err: any) {
    console.error('[Airtable Routes] Error fetching profile:', err);
    return c.json<ApiResponse>({
      success: false,
      error: err.message || 'Failed to fetch profile'
    }, 500);
  }
});

/**
 * GET /api/airtable/profiles/user/:userId
 * Get user profile by userId field (not Airtable record ID)
 */
app.get('/profiles/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const airtable = new AirtableService(c.env);
    const noCache = c.req.query('noCache') === 'true';

    const profile = await airtable.getUserProfileByUserId(userId, !noCache);

    if (!profile) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Not Found',
        message: `Profile for user ${userId} not found`
      }, 404);
    }

    return c.json<ApiResponse<AirtableUserProfile>>({
      success: true,
      data: profile
    });
  } catch (err: any) {
    console.error('[Airtable Routes] Error fetching user profile:', err);
    return c.json<ApiResponse>({
      success: false,
      error: err.message || 'Failed to fetch user profile'
    }, 500);
  }
});

/**
 * PUT /api/airtable/profiles/:id
 * Update user profile in Airtable
 */
app.put('/profiles/:id', async (c) => {
  try {
    const profileId = c.req.param('id');
    const updates = await c.req.json();
    const airtable = new AirtableService(c.env);

    // Validate updates
    if (!updates || typeof updates !== 'object') {
      return c.json<ApiResponse>({
        success: false,
        error: 'Bad Request',
        message: 'Invalid update data'
      }, 400);
    }

    const updated = await airtable.updateUserProfile(profileId, updates);

    if (!updated) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Update Failed',
        message: `Failed to update profile ${profileId}`
      }, 500);
    }

    return c.json<ApiResponse<AirtableUserProfile>>({
      success: true,
      data: updated,
      message: 'Profile updated successfully'
    });
  } catch (err: any) {
    console.error('[Airtable Routes] Error updating profile:', err);
    return c.json<ApiResponse>({
      success: false,
      error: err.message || 'Failed to update profile'
    }, 500);
  }
});

/**
 * GET /api/airtable/websites
 * List all websites from Airtable
 */
app.get('/websites', async (c) => {
  try {
    const airtable = new AirtableService(c.env);
    const noCache = c.req.query('noCache') === 'true';

    const websites = await airtable.listWebsites(!noCache);

    return c.json<ApiResponse<AirtableWebsite[]>>({
      success: true,
      data: websites,
      message: `Retrieved ${websites.length} websites`
    });
  } catch (err: any) {
    console.error('[Airtable Routes] Error listing websites:', err);
    return c.json<ApiResponse>({
      success: false,
      error: err.message || 'Failed to list websites'
    }, 500);
  }
});

/**
 * GET /api/airtable/websites/:id
 * Get specific website by websiteId
 */
app.get('/websites/:id', async (c) => {
  try {
    const websiteId = c.req.param('id');
    const airtable = new AirtableService(c.env);
    const noCache = c.req.query('noCache') === 'true';

    const website = await airtable.getWebsiteData(websiteId, !noCache);

    if (!website) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Not Found',
        message: `Website ${websiteId} not found`
      }, 404);
    }

    return c.json<ApiResponse<AirtableWebsite>>({
      success: true,
      data: website
    });
  } catch (err: any) {
    console.error('[Airtable Routes] Error fetching website:', err);
    return c.json<ApiResponse>({
      success: false,
      error: err.message || 'Failed to fetch website'
    }, 500);
  }
});

/**
 * POST /api/airtable/sync
 * Trigger full sync from Airtable
 */
app.post('/sync', async (c) => {
  try {
    const airtable = new AirtableService(c.env);
    const status = await airtable.syncAll();

    return c.json<ApiResponse>({
      success: status.success,
      data: status,
      message: status.success ?
        `Sync completed: ${status.profilesCount} profiles, ${status.websitesCount} websites` :
        'Sync completed with errors'
    });
  } catch (err: any) {
    console.error('[Airtable Routes] Error syncing:', err);
    return c.json<ApiResponse>({
      success: false,
      error: err.message || 'Sync failed'
    }, 500);
  }
});

/**
 * GET /api/airtable/sync/status
 * Get last sync status
 */
app.get('/sync/status', async (c) => {
  try {
    const airtable = new AirtableService(c.env);
    const status = await airtable.getSyncStatus();

    if (!status) {
      return c.json<ApiResponse>({
        success: false,
        error: 'Not Found',
        message: 'No sync status available'
      }, 404);
    }

    return c.json<ApiResponse>({
      success: true,
      data: status
    });
  } catch (err: any) {
    console.error('[Airtable Routes] Error fetching sync status:', err);
    return c.json<ApiResponse>({
      success: false,
      error: err.message || 'Failed to fetch sync status'
    }, 500);
  }
});

/**
 * GET /api/airtable/health
 * Check Airtable connection health
 */
app.get('/health', async (c) => {
  try {
    const airtable = new AirtableService(c.env);
    const healthy = await airtable.healthCheck();

    return c.json<ApiResponse>({
      success: healthy,
      message: healthy ? 'Airtable connection healthy' : 'Airtable connection failed',
      data: { healthy }
    });
  } catch (err: any) {
    console.error('[Airtable Routes] Health check error:', err);
    return c.json<ApiResponse>({
      success: false,
      error: 'Health check failed'
    }, 500);
  }
});

export default app;
