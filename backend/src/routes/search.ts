import { Hono } from 'hono';
import type { Env } from '../types';
import { verifyJWT } from '../utils/jwt';
import { generateEmbedding, semanticSearch, extractKeywords } from '../utils/embeddings';

const search = new Hono<{ Bindings: Env }>();

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

/**
 * POST /api/search/semantic
 * Search saved content using semantic similarity
 */
search.post('/semantic', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const { query, table = 'posts', limit = 10, minSimilarity = 0.7 } = await c.req.json();

    if (!query || query.trim().length === 0) {
      return c.json({
        success: false,
        error: 'Query is required'
      }, 400);
    }

    // Generate embedding for query
    const apiKey = c.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return c.json({
        success: false,
        error: 'OpenRouter API key not configured'
      }, 500);
    }

    const queryEmbedding = await generateEmbedding(query, apiKey);
    if (!queryEmbedding) {
      return c.json({
        success: false,
        error: 'Failed to generate query embedding'
      }, 500);
    }

    // Search using semantic similarity
    const results = await semanticSearch(
      c.env,
      queryEmbedding,
      table as 'posts' | 'memory',
      userId,
      limit,
      minSimilarity
    );

    return c.json({
      success: true,
      query,
      results: results.map(r => ({
        ...r,
        embedding_vector: undefined // Don't return full embedding
      })),
      count: results.length
    });

  } catch (error: any) {
    console.error('Semantic search error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to search'
    }, 500);
  }
});

/**
 * POST /api/search/keyword
 * Search using keywords (fallback for no embeddings)
 */
search.post('/keyword', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const { query, table = 'posts', limit = 10 } = await c.req.json();

    if (!query || query.trim().length === 0) {
      return c.json({
        success: false,
        error: 'Query is required'
      }, 400);
    }

    // Extract keywords from query
    const keywords = extractKeywords(query);
    if (keywords.length === 0) {
      return c.json({
        success: true,
        query,
        results: [],
        count: 0
      });
    }

    // Build LIKE conditions for each keyword
    const likeConditions = keywords.map(() =>
      table === 'posts'
        ? '(original_text LIKE ? OR generated_output LIKE ?)'
        : 'text LIKE ?'
    ).join(' OR ');

    const likeParams = keywords.flatMap(kw => {
      const pattern = `%${kw}%`;
      return table === 'posts' ? [pattern, pattern] : [pattern];
    });

    const sql = table === 'posts'
      ? `SELECT id, type, original_text, generated_output, search_keywords, created_at
         FROM posts
         WHERE user_id = ? AND (${likeConditions})
         ORDER BY created_at DESC
         LIMIT ?`
      : `SELECT id, text, context_json, search_keywords, tags, created_at
         FROM memory
         WHERE user_id = ? AND (${likeConditions})
         ORDER BY created_at DESC
         LIMIT ?`;

    const stmt = c.env.DB.prepare(sql).bind(userId, ...likeParams, limit);
    const results = await stmt.all();

    return c.json({
      success: true,
      query,
      keywords,
      results: results.results || [],
      count: results.results?.length || 0
    });

  } catch (error: any) {
    console.error('Keyword search error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to search'
    }, 500);
  }
});

/**
 * GET /api/search/recent
 * Get recent posts or memories (public endpoint for dashboard)
 */
search.get('/recent', async (c) => {
  try {
    // Try to get userId from auth header if present, otherwise get all
    let userId: string | null = null;
    const authHeader = c.req.header('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const payload = await verifyJWT(token, c.env.JWT_SECRET);
      if (payload) {
        userId = payload.userId;
      }
    }

    const table = c.req.query('table') || 'posts';
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');
    const type = c.req.query('type'); // Optional filter for posts type
    const event = c.req.query('event'); // Optional filter for webhook event type

    let sql: string;
    let bindings: any[];

    if (table === 'webhook_events') {
      // Webhook events table
      if (event) {
        sql = `SELECT id, event, data_json, user_id, created_at
               FROM webhook_events WHERE event = ?
               ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        bindings = [event, limit, offset];
      } else {
        sql = `SELECT id, event, data_json, user_id, created_at
               FROM webhook_events
               ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        bindings = [limit, offset];
      }
    } else if (table === 'posts') {
      if (type) {
        if (userId) {
          sql = `SELECT id, type, original_text, generated_output, created_at, context_json
                 FROM posts WHERE user_id = ? AND type = ?
                 ORDER BY created_at DESC LIMIT ?`;
          bindings = [userId, type, limit];
        } else {
          sql = `SELECT id, type, original_text, generated_output, created_at, context_json
                 FROM posts WHERE type = ?
                 ORDER BY created_at DESC LIMIT ?`;
          bindings = [type, limit];
        }
      } else {
        if (userId) {
          sql = `SELECT id, type, original_text, generated_output, created_at, context_json
                 FROM posts WHERE user_id = ?
                 ORDER BY created_at DESC LIMIT ?`;
          bindings = [userId, limit];
        } else {
          sql = `SELECT id, type, original_text, generated_output, created_at, context_json
                 FROM posts
                 ORDER BY created_at DESC LIMIT ?`;
          bindings = [limit];
        }
      }
    } else {
      if (userId) {
        sql = `SELECT id, text, context_json, tags, created_at
               FROM memory WHERE user_id = ?
               ORDER BY created_at DESC LIMIT ?`;
        bindings = [userId, limit];
      } else {
        sql = `SELECT id, text, context_json, tags, created_at
               FROM memory
               ORDER BY created_at DESC LIMIT ?`;
        bindings = [limit];
      }
    }

    const stmt = c.env.DB.prepare(sql).bind(...bindings);
    const results = await stmt.all();

    return c.json({
      success: true,
      table,
      results: results.results || [],
      count: results.results?.length || 0
    });

  } catch (error: any) {
    console.error('Recent search error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to get recent items'
    }, 500);
  }
});

/**
 * DELETE /api/search/memory/:id
 * Delete a memory item (for dashboard)
 */
search.delete('/memory/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const result = await c.env.DB
      .prepare('DELETE FROM memory WHERE id = ?')
      .bind(id)
      .run();

    if (result.meta.changes === 0) {
      return c.json({ success: false, error: 'Memory not found' }, 404);
    }

    return c.json({ success: true, message: 'Memory deleted' });
  } catch (error: any) {
    console.error('Delete memory error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * DELETE /api/search/post/:id
 * Delete a post (tweet, video, etc.) (for dashboard)
 */
search.delete('/post/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const result = await c.env.DB
      .prepare('DELETE FROM posts WHERE id = ?')
      .bind(id)
      .run();

    if (result.meta.changes === 0) {
      return c.json({ success: false, error: 'Post not found' }, 404);
    }

    return c.json({ success: true, message: 'Post deleted' });
  } catch (error: any) {
    console.error('Delete post error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * DELETE /api/search/webhook/:id
 * Delete a webhook event (for dashboard)
 */
search.delete('/webhook/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const result = await c.env.DB
      .prepare('DELETE FROM webhook_events WHERE id = ?')
      .bind(id)
      .run();

    if (result.meta.changes === 0) {
      return c.json({ success: false, error: 'Webhook event not found' }, 404);
    }

    return c.json({ success: true, message: 'Webhook event deleted' });
  } catch (error: any) {
    console.error('Delete webhook error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default search;
