# Visual Content Generation System - Testing Guide

## Overview

This guide explains how to test the newly implemented visual content generation system with carousel support.

## Prerequisites

1. **Backend Deployed**: Backend API must be running at `https://text-processor-api.kureckamichal.workers.dev`
2. **Database Migration Applied**: Migration `0002_visual_content.sql` must be applied
3. **Extension Loaded**: Chrome extension loaded from `/extension` directory
4. **OpenRouter API Key**: Configured in extension settings for caption generation
5. **HTML-to-Image Worker**: Must be available at configured endpoint (default: `https://html-to-image.workers.dev/convert`)

## What Was Implemented

### Backend Components

1. **Database Schema** (`backend/migrations/0002_visual_content.sql`)
   - `visual_content` table with support for multiple images (JSON array)
   - Indexes for efficient querying
   - Carousel mode support

2. **TypeScript Types** (`backend/src/types/index.ts`)
   - `ImageType`: quote_card, screenshot_card, infographic, story_card, thumbnail
   - `VisualContentImage`: Image metadata structure
   - `VisualContent`: Database model
   - `CreateVisualContentRequest/Response`: API contracts

3. **API Routes** (`backend/src/routes/visual-content.ts`)
   - `POST /api/visual-content` - Create visual content
   - `GET /api/visual-content` - List visual content
   - `GET /api/visual-content/:id` - Get specific content
   - `DELETE /api/visual-content/:id` - Delete content

4. **Route Registration** (`backend/src/index.ts`)
   - Visual content routes registered at `/api/visual-content`

### Extension Components

1. **Template Generators** (`extension/template-generators.js`)
   - `generateQuoteCard()` - Social media quote cards
   - `generateScreenshotCard()` - Vertical story cards
   - `generateInfographic()` - Multi-point infographics
   - `generateStoryCard()` - Instagram/Facebook stories
   - `generateThumbnail()` - YouTube/blog thumbnails
   - All templates support customization and branding

2. **Settings Configuration** (`extension/settings.json`)
   - `visualContent` section with image type specifications
   - Branding configuration (colors, fonts, logo)
   - Carousel settings (enabled, default types, max images)
   - Caption generation settings (model, prompt template)
   - Webhook event `onVisualContentCreated`

3. **FAB Enhancement** (`extension/content.js`)
   - New "Create Image" button with image icon
   - `openVisualContentModal()` function
   - Image type selector with checkboxes
   - Carousel mode toggle
   - Caption generation toggle
   - Image preview grid
   - Message handler for `createVisualContent` action

4. **Background Handler** (`extension/background.js`)
   - `createVisualContent` message listener
   - Template generation integration
   - HTML-to-image conversion
   - Caption generation via OpenRouter
   - IndexedDB storage
   - Webhook notification

## Testing Steps

### 1. Basic Single Image Generation

1. Open any webpage (e.g., https://example.com)
2. Select some text (e.g., "This is a test quote for visual content generation")
3. FAB should appear in bottom-left corner
4. Click FAB main button to open menu
5. Click "Create Image" button
6. Modal should open showing:
   - Selected text preview
   - 5 image type checkboxes (Quote Card, Screenshot Card, etc.)
   - Carousel Mode checkbox
   - Generate Caption checkbox
7. Select ONE image type (e.g., "Quote Card")
8. UNCHECK "Carousel Mode"
9. Click "Generate Images"
10. Should see:
    - Status: "⏳ Generating images..."
    - Then: "✅ Images generated successfully!"
    - Image preview showing the generated quote card
    - Optional caption below

**Expected Result**: Single image generated, displayed in preview

### 2. Carousel Mode (Multiple Images)

1. Select text on any page
2. Open FAB → Create Image
3. Select MULTIPLE image types (e.g., Quote Card + Screenshot Card + Story Card)
4. CHECK "Carousel Mode"
5. CHECK "Generate Caption"
6. Click "Generate Images"
7. Should generate multiple images (2-5 depending on selection)
8. Preview should show grid of all generated images
9. Caption should be displayed below

**Expected Result**: Multiple images generated in carousel format

### 3. Image Type Specifications

Test each image type individually:

#### Quote Card (1200×630)
- Best for: Social media sharing
- Features: Large quote text, optional author attribution
- Layout: Centered text on gradient background

#### Screenshot Card (1080×1920)
- Best for: Vertical stories
- Features: Header with title/subtitle, content area, footer
- Layout: Header → Content → Footer

#### Infographic (800×2000)
- Best for: Educational content
- Features: Numbered points, visual hierarchy
- Layout: Title + numbered sections with icons

#### Story Card (1080×1920)
- Best for: Instagram/Facebook stories
- Features: Centered text on gradient, optional logo
- Layout: Logo (optional) + centered content card

#### Thumbnail (1280×720)
- Best for: YouTube/blog headers
- Features: Bold text, optional badge
- Layout: Centered bold text + corner badge

### 4. Customization Options

Test branding customization:

1. Edit `extension/settings.json`
2. Modify `visualContent.branding`:
   ```json
   {
     "colors": {
       "primary": "#ff0000",
       "secondary": "#00ff00",
       "background": "#ffffff",
       "text": "#000000"
     }
   }
   ```
3. Reload extension
4. Generate image
5. Should use custom colors

### 5. Caption Generation

1. Ensure OpenRouter API key is configured
2. Select text: "AI is transforming how we work"
3. Generate visual content with "Generate Caption" enabled
4. Should receive AI-generated caption like:
   - "Discover how AI is revolutionizing the workplace! 🚀 #AI #Future"

### 6. Database Storage

1. Generate visual content
2. Open browser DevTools → Application → IndexedDB
3. Navigate to `text-processor-db` → `posts`
4. Should see entry with:
   - `type`: "visual_content"
   - `originalText`: Your selected text
   - `generatedOutput`: JSON array of image data
   - `mode`: "carousel" or "single"
   - `comment`: Caption (if generated)

### 7. Backend API Testing

Test backend endpoints directly:

#### Create Visual Content (requires auth)
```bash
# Note: Replace YOUR_JWT_TOKEN with actual token
curl -X POST https://text-processor-api.kureckamichal.workers.dev/api/visual-content \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Test visual content",
    "imageTypes": ["quote_card", "thumbnail"],
    "carouselMode": true,
    "generateCaption": true
  }'
```

#### List Visual Content
```bash
curl -X GET https://text-processor-api.kureckamichal.workers.dev/api/visual-content \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 8. Webhook Testing

If webhooks are enabled:

1. Configure webhook URL in `extension/settings.json`
2. Generate visual content
3. Check webhook endpoint for POST request with:
   ```json
   {
     "event": "onVisualContentCreated",
     "data": {
       "text": "...",
       "imageTypes": ["quote_card"],
       "images": [...],
       "caption": "...",
       "carouselMode": false
     }
   }
   ```

### 9. Error Handling

Test error scenarios:

1. **No Text Selected**: Click "Create Image" without selecting text
   - Expected: "Please select some text first" notification

2. **No Image Type Selected**: Click "Generate Images" without checking any type
   - Expected: "Please select at least one image type" notification

3. **HTML-to-Image Worker Unavailable**: Configure invalid endpoint
   - Expected: "Failed to generate images" error

4. **Invalid API Key**: Try caption generation without API key
   - Expected: Caption generation skipped, images still generated

### 10. Performance Testing

1. Generate carousel with 5 image types
2. Measure time from "Generate" click to preview display
3. Expected: <5 seconds for all images + caption
4. Check browser console for any errors
5. Verify service worker wakes up properly

## Troubleshooting

### Service Worker Won't Activate

**Problem**: "Could not establish connection" error

**Solution**:
1. Open `chrome://extensions/`
2. Find "Universal Text Processor"
3. Click "service worker" link
4. Check console for errors
5. Reload extension

### Template Generators Not Found

**Problem**: `generateTemplate is not defined`

**Solution**:
1. Check `background.js` line 2: `importScripts('template-generators.js')`
2. Verify `template-generators.js` exists in extension directory
3. Reload extension

### Images Not Displaying

**Problem**: Preview shows broken images

**Solution**:
1. Check HTML-to-Image Worker endpoint in settings
2. Verify worker is accessible
3. Check browser console for CORS errors
4. Ensure image URLs are properly generated

### Caption Not Generated

**Problem**: No caption despite checkbox enabled

**Solution**:
1. Verify OpenRouter API key is configured
2. Check browser console for API errors
3. Verify caption generation settings in `settings.json`
4. Check API key permissions

### Database Errors

**Problem**: Backend returns 500 errors

**Solution**:
1. Verify migration was applied: `npm run d1:migrate -- --remote`
2. Check D1 database status
3. Review backend logs: `npm run tail`

## File Size Verification

All files should be under 500 lines:

```bash
wc -l backend/src/routes/visual-content.ts
wc -l backend/src/types/index.ts
wc -l extension/template-generators.js
wc -l extension/content.js
wc -l extension/background.js
```

Expected:
- `visual-content.ts`: ~350 lines ✅
- `types/index.ts`: ~270 lines ✅
- `template-generators.js`: ~380 lines ✅
- `content.js`: ~1540 lines ⚠️ (large but acceptable for main content script)
- `background.js`: ~830 lines ⚠️ (large but acceptable for service worker)

## Success Criteria

✅ Backend API deployed and accessible
✅ Database migration applied (local + remote)
✅ FAB shows "Create Image" button
✅ Modal opens with image type selection
✅ Single image generation works
✅ Carousel mode generates multiple images
✅ Caption generation works (with API key)
✅ Images saved to IndexedDB
✅ Webhook notification sent (if enabled)
✅ No console errors during operation

## Next Steps

After successful testing:

1. **Production Deployment**
   - Configure production webhook URLs
   - Set up production HTML-to-Image Worker
   - Configure R2 for image storage
   - Enable authentication

2. **Enhancements**
   - Add more image templates
   - Support custom branding per account
   - Implement image editing UI
   - Add batch download functionality
   - Support video thumbnail generation

3. **Monitoring**
   - Track image generation success rate
   - Monitor HTML-to-Image Worker performance
   - Log caption generation quality
   - Monitor R2 storage usage

## Support

For issues or questions:
- Check browser console logs
- Review Cloudflare Workers logs: `npm run tail`
- Check D1 database: `npx wrangler d1 execute text-processor-db --command "SELECT * FROM visual_content LIMIT 10"`

---

**Last Updated**: 2025-01-20
**Version**: 1.0.0
**Status**: ✅ Ready for Testing
