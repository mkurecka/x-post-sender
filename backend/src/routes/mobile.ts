/**
 * Mobile API routes - simplified endpoints for iOS Shortcuts / automation
 * These endpoints are designed to be called easily from mobile automation tools
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { generateId } from '../utils/id';

const router = new Hono<{ Bindings: Env }>();

// Default user for mobile saves (can be customized via header)
const DEFAULT_MOBILE_USER = 'mobile_user';

/**
 * POST /api/mobile/save-text
 * Simple endpoint to save text from iOS Shortcuts
 *
 * Body: { text: string, source?: string, tags?: string }
 * Or just plain text in body
 */
router.post('/save-text', async (c) => {
  try {
    let text: string;
    let source: string | null = null;
    let tags: string[] = [];

    const contentType = c.req.header('Content-Type') || '';

    // Support both JSON and plain text
    if (contentType.includes('application/json')) {
      const body = await c.req.json();
      text = body.text;
      source = body.source || body.url || null;
      tags = body.tags ? (typeof body.tags === 'string' ? body.tags.split(',').map((t: string) => t.trim()) : body.tags) : [];
    } else {
      // Plain text body
      text = await c.req.text();
    }

    if (!text || text.trim().length === 0) {
      return c.json({ success: false, error: 'No text provided' }, 400);
    }

    // Get user ID from header or use default
    const userId = c.req.header('X-User-ID') || DEFAULT_MOBILE_USER;

    // Ensure user exists
    await ensureUserExists(c, userId);

    // Save to memory table
    const memoryId = generateId('mem');
    const contextJson = JSON.stringify({
      url: source,
      tags,
      savedFrom: 'ios_shortcut',
      savedAt: new Date().toISOString()
    });

    // Use tag field for first tag if provided
    const primaryTag = tags.length > 0 ? tags[0] : null;

    await c.env.DB.prepare(`
      INSERT INTO memory (id, user_id, text, context_json, tag, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      memoryId,
      userId,
      text.trim(),
      contextJson,
      primaryTag,
      Date.now()
    ).run();

    return c.json({
      success: true,
      message: 'Text saved!',
      id: memoryId,
      preview: text.substring(0, 100) + (text.length > 100 ? '...' : '')
    });

  } catch (error) {
    console.error('[Mobile] save-text error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save text'
    }, 500);
  }
});

/**
 * POST /api/mobile/save-tweet
 * Save a tweet from iOS Shortcuts
 *
 * Body: { url: string, text?: string, author?: string }
 */
router.post('/save-tweet', async (c) => {
  try {
    const body = await c.req.json();
    const { url, text, author } = body;

    if (!url) {
      return c.json({ success: false, error: 'No tweet URL provided' }, 400);
    }

    // Extract tweet ID from URL
    const tweetIdMatch = url.match(/status\/(\d+)/);
    const tweetId = tweetIdMatch ? tweetIdMatch[1] : null;

    const userId = c.req.header('X-User-ID') || DEFAULT_MOBILE_USER;
    await ensureUserExists(c, userId);

    const postId = generateId('post');
    const contextJson = JSON.stringify({
      tweetId,
      author: author || 'Unknown',
      url,
      savedFrom: 'ios_shortcut',
      savedAt: new Date().toISOString()
    });

    await c.env.DB.prepare(`
      INSERT INTO posts (id, user_id, type, original_text, context_json, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      postId,
      userId,
      'tweet',
      text || url,
      contextJson,
      'saved',
      Date.now()
    ).run();

    return c.json({
      success: true,
      message: 'Tweet saved!',
      id: postId,
      tweetId
    });

  } catch (error) {
    console.error('[Mobile] save-tweet error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save tweet'
    }, 500);
  }
});

/**
 * POST /api/mobile/save-youtube
 * Save a YouTube video from iOS Shortcuts
 *
 * Body: { url: string, title?: string, channel?: string }
 */
router.post('/save-youtube', async (c) => {
  try {
    const body = await c.req.json();
    const { url, title, channel } = body;

    if (!url) {
      return c.json({ success: false, error: 'No YouTube URL provided' }, 400);
    }

    // Extract video ID from URL
    let videoId: string | null = null;
    const watchMatch = url.match(/[?&]v=([^&]+)/);
    const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
    const embedMatch = url.match(/embed\/([^?&]+)/);
    videoId = watchMatch?.[1] || shortMatch?.[1] || embedMatch?.[1] || null;

    const userId = c.req.header('X-User-ID') || DEFAULT_MOBILE_USER;
    await ensureUserExists(c, userId);

    const postId = generateId('post');
    const contextJson = JSON.stringify({
      videoId,
      title: title || 'Untitled',
      channelName: channel || 'Unknown',
      url,
      savedFrom: 'ios_shortcut',
      savedAt: new Date().toISOString()
    });

    await c.env.DB.prepare(`
      INSERT INTO posts (id, user_id, type, original_text, context_json, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      postId,
      userId,
      'youtube_video',
      title || url,
      contextJson,
      'saved',
      Date.now()
    ).run();

    return c.json({
      success: true,
      message: 'Video saved!',
      id: postId,
      videoId
    });

  } catch (error) {
    console.error('[Mobile] save-youtube error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save video'
    }, 500);
  }
});

/**
 * POST /api/mobile/save
 * Universal save endpoint - auto-detects content type from URL
 *
 * Detects:
 * - x.com, twitter.com → saves as tweet, fetches tweet data
 * - youtube.com, youtu.be → saves as video, fetches video data
 * - anything else → saves as memory/text
 */
router.post('/save', async (c) => {
  try {
    let input: string;
    const contentType = c.req.header('Content-Type') || '';

    if (contentType.includes('application/json')) {
      const body = await c.req.json();
      input = body.text || body.url || body.input || '';
    } else {
      input = await c.req.text();
    }

    input = input.trim();

    if (!input) {
      return c.json({ success: false, error: 'No input provided' }, 400);
    }

    const userId = c.req.header('X-User-ID') || DEFAULT_MOBILE_USER;
    await ensureUserExists(c, userId);

    // Detect content type from input
    const lowerInput = input.toLowerCase();

    // Twitter/X detection
    if (lowerInput.includes('x.com/') || lowerInput.includes('twitter.com/')) {
      return await saveTweetFromUrl(c, userId, input);
    }

    // YouTube detection
    if (lowerInput.includes('youtube.com/') || lowerInput.includes('youtu.be/')) {
      return await saveYouTubeFromUrl(c, userId, input);
    }

    // Default: save as text/memory
    return await saveAsMemory(c, userId, input);

  } catch (error) {
    console.error('[Mobile] save error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save'
    }, 500);
  }
});

/**
 * Save tweet from URL - extracts tweet ID and fetches data if possible
 */
async function saveTweetFromUrl(c: any, userId: string, url: string) {
  // Extract tweet ID
  const tweetIdMatch = url.match(/status\/(\d+)/);
  const tweetId = tweetIdMatch ? tweetIdMatch[1] : null;

  // Extract username from URL
  const usernameMatch = url.match(/(?:x\.com|twitter\.com)\/([^\/\?]+)/);
  const username = usernameMatch ? usernameMatch[1] : null;

  const postId = generateId('post');
  const contextJson = JSON.stringify({
    tweetId,
    author: username || 'Unknown',
    url,
    savedFrom: 'ios_shortcut',
    savedAt: new Date().toISOString()
  });

  await c.env.DB.prepare(`
    INSERT INTO posts (id, user_id, type, original_text, context_json, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    postId,
    userId,
    'tweet',
    url,
    contextJson,
    'saved',
    Date.now()
  ).run();

  return c.json({
    success: true,
    message: '🐦 Tweet saved!',
    type: 'tweet',
    id: postId,
    tweetId,
    username
  });
}

/**
 * Save YouTube video from URL - extracts video ID and fetches metadata
 */
async function saveYouTubeFromUrl(c: any, userId: string, url: string) {
  // Extract video ID
  let videoId: string | null = null;
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  const embedMatch = url.match(/embed\/([^?&]+)/);
  videoId = watchMatch?.[1] || shortMatch?.[1] || embedMatch?.[1] || null;

  // Try to fetch video title from YouTube oEmbed API (no API key needed)
  let title = 'YouTube Video';
  let channelName = 'Unknown';

  if (videoId) {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const response = await fetch(oembedUrl);
      if (response.ok) {
        const data = await response.json() as { title?: string; author_name?: string };
        title = data.title || title;
        channelName = data.author_name || channelName;
      }
    } catch (e) {
      console.log('[Mobile] Could not fetch YouTube metadata:', e);
    }
  }

  const postId = generateId('post');
  const contextJson = JSON.stringify({
    videoId,
    title,
    channelName,
    url,
    savedFrom: 'ios_shortcut',
    savedAt: new Date().toISOString()
  });

  await c.env.DB.prepare(`
    INSERT INTO posts (id, user_id, type, original_text, context_json, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    postId,
    userId,
    'youtube_video',
    title,
    contextJson,
    'saved',
    Date.now()
  ).run();

  return c.json({
    success: true,
    message: '📹 Video saved!',
    type: 'youtube',
    id: postId,
    videoId,
    title,
    channelName
  });
}

/**
 * Save as memory/text
 */
async function saveAsMemory(c: any, userId: string, text: string) {
  const memoryId = generateId('mem');
  const contextJson = JSON.stringify({
    savedFrom: 'ios_shortcut',
    savedAt: new Date().toISOString()
  });

  await c.env.DB.prepare(`
    INSERT INTO memory (id, user_id, text, context_json, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    memoryId,
    userId,
    text,
    contextJson,
    Date.now()
  ).run();

  return c.json({
    success: true,
    message: '💾 Text saved!',
    type: 'memory',
    id: memoryId,
    preview: text.substring(0, 100) + (text.length > 100 ? '...' : '')
  });
}

/**
 * GET /api/mobile/health
 * Health check for mobile endpoints
 */
router.get('/health', (c) => {
  return c.json({
    success: true,
    message: 'Mobile API ready',
    endpoints: [
      'POST /api/mobile/save - Universal save (auto-detects tweet/youtube/text)',
      'POST /api/mobile/save-text',
      'POST /api/mobile/save-tweet',
      'POST /api/mobile/save-youtube'
    ]
  });
});

/**
 * Ensure user exists in database
 */
async function ensureUserExists(c: any, userId: string) {
  const existing = await c.env.DB.prepare(
    'SELECT id FROM users WHERE id = ?'
  ).bind(userId).first();

  if (!existing) {
    await c.env.DB.prepare(`
      INSERT INTO users (id, email, password_hash, created_at, subscription_tier)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      userId,
      `${userId}@mobile.local`,
      'mobile',
      Date.now(),
      'free'
    ).run();
  }
}

export default router;
