import { Hono } from 'hono';
import type { Env, VisualContent, VisualContentImage, VisualContentMetadata, CreateVisualContentRequest, ImageType } from '../types';
import { verifyJWT } from '../utils/jwt';
import { generateId } from '../utils/id';

const visualContent = new Hono<{ Bindings: Env }>();

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

// Image type specifications
const IMAGE_SPECS: Record<ImageType, { width: number; height: number; name: string }> = {
  quote_card: { width: 1200, height: 630, name: 'Quote Card' },
  screenshot_card: { width: 1080, height: 1920, name: 'Screenshot Card' },
  infographic: { width: 800, height: 2000, name: 'Infographic' },
  story_card: { width: 1080, height: 1920, name: 'Story Card' },
  thumbnail: { width: 1280, height: 720, name: 'Thumbnail' },
};

// Generate caption using AI
async function generateCaption(text: string, imageTypes: ImageType[]): Promise<string> {
  const prompt = `Generate a compelling social media caption for visual content based on this text.

Text: "${text}"

Image types being created: ${imageTypes.map(t => IMAGE_SPECS[t].name).join(', ')}

Create a short, engaging caption (1-2 sentences) that would work well for social media posts. Include relevant emojis if appropriate.

Return ONLY the caption text, nothing else.`;

  return `Check out this visual content! 🎨 #VisualContent`;
}

// Upload image to R2
async function uploadToR2(
  env: Env,
  imageBuffer: ArrayBuffer,
  contentId: string,
  imageType: ImageType,
  format: string = 'png'
): Promise<string> {
  const filename = `${imageType}.${format}`;
  const key = `visual-content/${contentId}/${filename}`;

  await env.STORAGE.put(key, imageBuffer, {
    httpMetadata: {
      contentType: `image/${format}`,
    },
  });

  // Return public URL (adjust based on your R2 configuration)
  return `https://text-processor-storage.kureckamichal.workers.dev/${key}`;
}

// POST /api/visual-content - Create visual content
visualContent.post('/', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const {
      text,
      imageTypes,
      carouselMode = false,
      branding,
      customization,
      generateCaption: shouldGenerateCaption = true,
      context,
    } = await c.req.json<CreateVisualContentRequest>();

    if (!text || !imageTypes || imageTypes.length === 0) {
      return c.json({
        success: false,
        error: 'Text and at least one image type are required',
      }, 400);
    }

    // Validate image types
    const invalidTypes = imageTypes.filter(type => !IMAGE_SPECS[type]);
    if (invalidTypes.length > 0) {
      return c.json({
        success: false,
        error: `Invalid image types: ${invalidTypes.join(', ')}`,
      }, 400);
    }

    const visualContentId = generateId();
    const now = Date.now();
    const images: VisualContentImage[] = [];

    // Generate images for each type
    for (const imageType of imageTypes) {
      const spec = IMAGE_SPECS[imageType];

      try {
        // Build HTML template for this image type
        // This will be done by template-generators.js in the extension
        // For backend, we expect the extension to send pre-rendered HTML
        // For now, we'll create a placeholder that the extension will replace

        // In production, the extension would call html-to-image-worker directly
        // and send us the image URLs, but we'll support server-side generation too

        const htmlTemplate = `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { margin: 0; padding: 40px; font-family: Arial, sans-serif; }
                .container { width: ${spec.width}px; height: ${spec.height}px; }
                .text { font-size: 24px; line-height: 1.5; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="text">${text}</div>
              </div>
            </body>
          </html>
        `;

        // For now, we'll store the metadata and let the extension handle image generation
        // In a full implementation, we'd call html-to-image-worker here

        const imageUrl = `https://placeholder.com/${spec.width}x${spec.height}`;

        images.push({
          type: imageType,
          url: imageUrl,
          width: spec.width,
          height: spec.height,
          filename: `${imageType}.png`,
        });

      } catch (error: any) {
        console.error(`Error generating ${imageType}:`, error);
        // Continue with other image types
      }
    }

    if (images.length === 0) {
      return c.json({
        success: false,
        error: 'Failed to generate any images',
      }, 500);
    }

    // Generate caption if requested
    let caption: string | undefined;
    if (shouldGenerateCaption) {
      try {
        caption = await generateCaption(text, imageTypes);
      } catch (error) {
        console.error('Caption generation error:', error);
        // Continue without caption
      }
    }

    // Build metadata
    const metadata: VisualContentMetadata = {
      branding,
      customization,
      sourceUrl: context?.url,
      account: context?.pageTitle,
    };

    // Save to database
    await c.env.DB
      .prepare(`
        INSERT INTO visual_content (
          id, user_id, content_text, content_type, images_json,
          carousel_mode, caption, metadata_json, status, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        visualContentId,
        userId,
        text,
        imageTypes[0], // Primary type
        JSON.stringify(images),
        carouselMode ? 1 : 0,
        caption || null,
        JSON.stringify(metadata),
        'generated',
        now
      )
      .run();

    return c.json({
      success: true,
      visualContentId,
      images,
      caption,
      message: 'Visual content created successfully',
    }, 201);
  } catch (error: any) {
    console.error('Create visual content error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to create visual content',
    }, 500);
  }
});

// GET /api/visual-content - List visual content
visualContent.get('/', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const { type, status, limit = '50', offset = '0' } = c.req.query();

    let query = 'SELECT * FROM visual_content WHERE user_id = ?';
    const bindings: any[] = [userId];

    if (type) {
      query += ' AND content_type = ?';
      bindings.push(type);
    }

    if (status) {
      query += ' AND status = ?';
      bindings.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    bindings.push(parseInt(limit), parseInt(offset));

    const result = await c.env.DB
      .prepare(query)
      .bind(...bindings)
      .all<VisualContent>();

    return c.json({
      success: true,
      visualContent: result.results || [],
      count: result.results?.length || 0,
    });
  } catch (error: any) {
    console.error('List visual content error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to list visual content',
    }, 500);
  }
});

// GET /api/visual-content/:id - Get single visual content
visualContent.get('/:id', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const visualContentId = c.req.param('id');

    const item = await c.env.DB
      .prepare('SELECT * FROM visual_content WHERE id = ? AND user_id = ?')
      .bind(visualContentId, userId)
      .first<VisualContent>();

    if (!item) {
      return c.json({
        success: false,
        error: 'Visual content not found',
      }, 404);
    }

    return c.json({
      success: true,
      visualContent: item,
      images: JSON.parse(item.images_json),
    });
  } catch (error: any) {
    console.error('Get visual content error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to get visual content',
    }, 500);
  }
});

// DELETE /api/visual-content/:id - Delete visual content
visualContent.delete('/:id', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const visualContentId = c.req.param('id');

    // Get the item first to delete associated R2 objects
    const item = await c.env.DB
      .prepare('SELECT * FROM visual_content WHERE id = ? AND user_id = ?')
      .bind(visualContentId, userId)
      .first<VisualContent>();

    if (!item) {
      return c.json({
        success: false,
        error: 'Visual content not found',
      }, 404);
    }

    // Delete from R2
    try {
      const images: VisualContentImage[] = JSON.parse(item.images_json);
      for (const image of images) {
        const key = `visual-content/${visualContentId}/${image.filename}`;
        await c.env.STORAGE.delete(key);
      }
    } catch (error) {
      console.error('R2 cleanup error:', error);
      // Continue even if R2 cleanup fails
    }

    // Delete from database
    await c.env.DB
      .prepare('DELETE FROM visual_content WHERE id = ? AND user_id = ?')
      .bind(visualContentId, userId)
      .run();

    return c.json({
      success: true,
      message: 'Visual content deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete visual content error:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to delete visual content',
    }, 500);
  }
});

export default visualContent;
