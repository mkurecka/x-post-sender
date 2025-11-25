import { Hono } from 'hono';
import type { Env } from '../types';
import { generateId } from '../utils/id';
import { generateEmbedding, extractKeywords } from '../utils/embeddings';

const router = new Hono<{ Bindings: Env }>();

/**
 * POST /api/webhook
 * Generic webhook endpoint to receive events from extension
 * Now saves actual data to posts/memory tables based on event type
 */
router.post('/', async (c) => {
  try {
    const payload = await c.req.json();
    const { event, data, userId } = payload;

    console.log('[Webhook] Received event:', event);
    console.log('[Webhook] Full payload:', JSON.stringify(payload, null, 2));
    console.log('[Webhook] UserId:', userId || 'anonymous');
    console.log('[Webhook] Data keys:', data ? Object.keys(data) : 'no data');

    // Store webhook event in webhook_events table (event log)
    try {
      const eventId = generateId('evt');
      await c.env.DB.prepare(
        'INSERT INTO webhook_events (id, event, data_json, user_id, created_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(
        eventId,
        event,
        JSON.stringify(data),
        userId || null,
        Date.now()
      ).run();
    } catch (dbError) {
      console.error('[Webhook] Database error:', dbError);
      // Continue even if DB fails
    }

    // Save actual data to appropriate tables based on event type
    if (userId) {
      console.log('[Webhook] UserId present, attempting to save data...');
      try {
        // Ensure user exists (create guest user if needed)
        await ensureUserExists(c, userId);
        console.log('[Webhook] User exists check passed');

        console.log('[Webhook] Checking event type:', event);
        switch (event) {
          case 'onSaveTweet':
            console.log('[Webhook] Calling saveTweetToDatabase...');
            await saveTweetToDatabase(c, userId, data);
            break;
          case 'onSaveYouTubeVideo':
            console.log('[Webhook] Calling saveYouTubeVideoToDatabase...');
            await saveYouTubeVideoToDatabase(c, userId, data);
            break;
          case 'saveToMemory':
          case 'onSaveToMemory':
            console.log('[Webhook] Calling saveMemoryToDatabase...');
            await saveMemoryToDatabase(c, userId, data);
            break;
          case 'processText':
          case 'onProcessText':
            console.log('[Webhook] Calling saveProcessedTextToDatabase...');
            await saveProcessedTextToDatabase(c, userId, data);
            break;
          default:
            console.log('[Webhook] Unknown event type, not saving:', event);
        }
      } catch (saveError) {
        console.error('[Webhook] Error saving data:', saveError);
        console.error('[Webhook] Stack trace:', saveError instanceof Error ? saveError.stack : 'no stack');
        // Continue even if save fails
      }
    } else {
      console.log('[Webhook] No userId provided, skipping data save');
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

/**
 * Ensure user exists in database (create guest user if needed)
 */
async function ensureUserExists(c: any, userId: string) {
  try {
    // Check if user exists
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE id = ?'
    ).bind(userId).first();

    if (!existingUser) {
      // Create guest user (no email/password, just for data storage)
      await c.env.DB.prepare(
        `INSERT INTO users (id, email, password_hash, created_at, subscription_tier)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(
        userId,
        `guest_${userId}@extension.local`, // Placeholder email
        'guest', // Placeholder password hash
        Date.now(),
        'free'
      ).run();

      console.log('[Webhook] Created guest user:', userId);
    }
  } catch (error) {
    console.error('[Webhook] Error ensuring user exists:', error);
    throw error; // Re-throw to prevent saving data without user
  }
}

/**
 * Helper function to save tweet data to posts table
 */
async function saveTweetToDatabase(c: any, userId: string, data: any) {
  console.log('[saveTweetToDatabase] Starting...');
  console.log('[saveTweetToDatabase] Input data:', JSON.stringify(data, null, 2));

  const postId = generateId('post');
  const tweetData = data.data || data;
  console.log('[saveTweetToDatabase] Extracted tweetData:', JSON.stringify(tweetData, null, 2));

  const text = tweetData.text || '';
  console.log('[saveTweetToDatabase] Extracted text:', text);

  // Generate embedding and keywords for semantic search
  const apiKey = c.env.OPENROUTER_API_KEY;
  let embedding: number[] | null = null;
  let keywords: string[] = [];

  if (apiKey && text) {
    console.log('[saveTweetToDatabase] Generating embedding...');
    embedding = await generateEmbedding(text, apiKey);
    keywords = extractKeywords(text);
    console.log('[saveTweetToDatabase] Embedding generated:', !!embedding, 'Keywords:', keywords.length);
  } else {
    console.log('[saveTweetToDatabase] Skipping embedding (apiKey:', !!apiKey, 'text:', !!text, ')');
  }

  console.log('[saveTweetToDatabase] Inserting into posts table...');
  const result = await c.env.DB.prepare(
    `INSERT INTO posts (id, user_id, type, original_text, context_json, status, embedding_vector, embedding_model, search_keywords, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    postId,
    userId,
    'tweet',
    text,
    JSON.stringify({
      tweetId: tweetData.tweetId,
      author: tweetData.author,
      url: tweetData.url,
      timestamp: tweetData.timestamp,
      media: tweetData.media,
      metadata: tweetData.metadata
    }),
    'completed',
    embedding ? JSON.stringify(embedding) : null,
    embedding ? 'openai/text-embedding-3-small' : null,
    keywords.length > 0 ? JSON.stringify(keywords) : null,
    Date.now()
  ).run();

  console.log('[saveTweetToDatabase] Insert result:', JSON.stringify(result));
  console.log('[Webhook] Saved tweet to posts table:', postId, embedding ? '(with embedding)' : '(no embedding)');
}

/**
 * Helper function to save YouTube video data to posts table
 */
async function saveYouTubeVideoToDatabase(c: any, userId: string, data: any) {
  const postId = generateId('post');
  const videoData = data.data || data;
  const title = videoData.title || '';
  const description = videoData.description || '';
  const transcript = videoData.transcript?.text || '';
  const combinedText = `${title} ${description} ${transcript}`.trim();

  // Generate embedding and keywords
  const apiKey = c.env.OPENROUTER_API_KEY;
  let embedding: number[] | null = null;
  let keywords: string[] = [];

  if (apiKey && combinedText) {
    embedding = await generateEmbedding(combinedText, apiKey);
    keywords = extractKeywords(combinedText);
  }

  await c.env.DB.prepare(
    `INSERT INTO posts (id, user_id, type, original_text, generated_output, context_json, status, embedding_vector, embedding_model, search_keywords, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    postId,
    userId,
    'youtube_video',
    title,
    transcript || null,
    JSON.stringify({
      videoId: videoData.videoId,
      url: videoData.url,
      title: videoData.title,
      channel: videoData.channel,
      description: videoData.description,
      transcript: videoData.transcript,
      metadata: videoData.metadata
    }),
    'completed',
    embedding ? JSON.stringify(embedding) : null,
    embedding ? 'openai/text-embedding-3-small' : null,
    keywords.length > 0 ? JSON.stringify(keywords) : null,
    Date.now()
  ).run();

  console.log('[Webhook] Saved YouTube video to posts table:', postId, embedding ? '(with embedding)' : '(no embedding)');
}

/**
 * Helper function to save memory data to memory table
 */
async function saveMemoryToDatabase(c: any, userId: string, data: any) {
  const memoryId = generateId('mem');
  const text = data.text || '';

  // Generate embedding and keywords
  const apiKey = c.env.OPENROUTER_API_KEY;
  let embedding: number[] | null = null;
  let keywords: string[] = [];

  if (apiKey && text) {
    embedding = await generateEmbedding(text, apiKey);
    keywords = extractKeywords(text);
  }

  await c.env.DB.prepare(
    `INSERT INTO memory (id, user_id, text, context_json, priority, embedding_vector, embedding_model, search_keywords, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    memoryId,
    userId,
    text,
    JSON.stringify(data.context || {}),
    'medium',
    embedding ? JSON.stringify(embedding) : null,
    embedding ? 'openai/text-embedding-3-small' : null,
    keywords.length > 0 ? JSON.stringify(keywords) : null,
    Date.now()
  ).run();

  console.log('[Webhook] Saved to memory table:', memoryId, embedding ? '(with embedding)' : '(no embedding)');
}

/**
 * Helper function to save processed text to posts table
 */
async function saveProcessedTextToDatabase(c: any, userId: string, data: any) {
  const postId = generateId('post');

  await c.env.DB.prepare(
    `INSERT INTO posts (id, user_id, type, mode, account, original_text, generated_output, language, status, context_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    postId,
    userId,
    'processed',
    data.mode || null,
    data.account || null,
    data.originalText || '',
    data.generatedContent || '',
    data.language || null,
    'completed',
    JSON.stringify(data.context || {}),
    Date.now()
  ).run();

  console.log('[Webhook] Saved processed text to posts table:', postId);
}

export default router;
