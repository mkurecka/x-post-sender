# Visual Content Generator - Setup & Troubleshooting

## ❌ Error: "Failed to generate any images"

This error occurs when the html-to-image-worker endpoint is not configured correctly.

## Quick Fix

### Step 1: Get Your HTML-to-Image Worker URL

You mentioned you have: `https://github.com/mkurecka/html-to-image-worker`

**Find your deployed worker URL:**
- It should be something like: `https://html-to-image.YOUR-SUBDOMAIN.workers.dev`
- Or a custom domain you configured

### Step 2: Update Extension Settings

Edit `/extension/settings.json`:

```json
{
  "visualContent": {
    "htmlToImageWorker": {
      "endpoint": "https://YOUR-ACTUAL-ENDPOINT.workers.dev/convert",
      "apiKey": ""  // Add if your worker requires authentication
    }
  }
}
```

### Step 3: Test the Endpoint

Test if your worker is responding:

```bash
curl -X POST https://YOUR-ENDPOINT.workers.dev/convert \
  -H "Content-Type: application/json" \
  -d '{
    "html": "<html><body><h1>Test</h1></body></html>",
    "width": 1200,
    "height": 630,
    "format": "png"
  }' \
  --output test.png
```

Expected result: `test.png` file created

### Step 4: Reload Extension

1. Go to `chrome://extensions/`
2. Find "Universal Text Processor"
3. Click reload (🔄)
4. Try again!

---

## Alternative: Deploy HTML-to-Image Worker

If you don't have the worker deployed yet:

### Option 1: Use Your Existing Worker

```bash
cd /path/to/html-to-image-worker
npm install
npm run deploy
# Note the URL it gives you
```

### Option 2: Deploy from GitHub

```bash
git clone https://github.com/mkurecka/html-to-image-worker
cd html-to-image-worker
npm install
npx wrangler login
npx wrangler deploy
```

Copy the deployment URL and update `settings.json`.

---

## Temporary Mock Solution (Development Only)

If you want to test without the worker, here's a temporary mock:

### Create Mock Worker

Create `extension/mock-image-generator.js`:

```javascript
// Mock image generator for testing
function generateMockImage(html, width, height) {
  // Create a canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Fill background
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, width, height);

  // Add text
  ctx.fillStyle = '#ffffff';
  ctx.font = '32px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Mock Image', width / 2, height / 2);

  // Convert to blob
  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), 'image/png');
  });
}
```

### Modify Background.js

Find this line in `background.js` (around line 669):

```javascript
const imageResponse = await fetch(htmlToImageEndpoint, {
```

Replace the fetch block with:

```javascript
// TEMPORARY MOCK - Remove after configuring real endpoint
if (htmlToImageEndpoint === 'MOCK') {
  const mockBlob = await generateMockImage(html, spec.width, spec.height);
  const imageUrl = URL.createObjectURL(mockBlob);

  images.push({
    type: imageType,
    url: imageUrl,
    width: spec.width,
    height: spec.height,
    filename: `${imageType}.png`
  });
  continue;
}
```

Then in `settings.json`:
```json
"endpoint": "MOCK"
```

---

## Debugging Checklist

### ✅ Check Extension Console

1. Go to `chrome://extensions/`
2. Click "service worker" link
3. Look for errors in console

Common errors:
- `Failed to fetch` → Endpoint doesn't exist
- `CORS error` → Worker CORS not configured
- `404` → Wrong endpoint path
- `Network error` → Internet connection issue

### ✅ Check Settings Loaded

In service worker console:

```javascript
// Check if settings loaded
settingsManager.settings.visualContent
```

Should show the visualContent configuration.

### ✅ Test Template Generation

In service worker console:

```javascript
// Test template generator
generateQuoteCard("Test quote", {
  source: "Test Source",
  branding: {
    primaryColor: "#4CAF50",
    secondaryColor: "#ffffff",
    fontFamily: "Inter, sans-serif"
  }
});
```

Should return HTML string.

### ✅ Verify Imports

Check `background.js` line 2:

```javascript
importScripts('settings-manager.js', 'database.js', 'api-client.js', 'template-generators.js');
```

Make sure `template-generators.js` is there.

---

## Expected Worker API

Your html-to-image-worker should accept:

**Request:**
```json
POST /convert
{
  "html": "<html>...</html>",
  "width": 1200,
  "height": 630,
  "format": "png"
}
```

**Response:**
- Content-Type: `image/png`
- Body: Binary PNG data

**CORS Headers Required:**
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

---

## Next Steps After Fix

Once you have the correct endpoint:

1. ✅ Update `settings.json` with real endpoint
2. ✅ Reload extension
3. ✅ Test image generation
4. ✅ Verify images appear in preview
5. ✅ Check images are saved to backend
6. ✅ Test webhook delivery

---

## Support

**Your HTML-to-Image Worker:**
- GitHub: https://github.com/mkurecka/html-to-image-worker
- Need to deploy it first
- Get the worker URL
- Update settings.json
- Reload extension

**Still having issues?**
1. Check service worker console for errors
2. Verify endpoint with curl
3. Test template generation manually
4. Check network tab in DevTools

---

**Last Updated:** 2025-11-20
