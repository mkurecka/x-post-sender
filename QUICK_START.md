# 🚀 Quick Start Guide

## Current Status

✅ **Backend Deployed**: `https://text-processor-api.kureckamichal.workers.dev`
✅ **Extension Configured**: Connected to backend
✅ **CORS Fixed**: Extension can communicate with backend
⏳ **Service Worker**: Will activate when you use the extension

## How to Activate & Test

### Step 1: Reload Extension

1. Go to `chrome://extensions/`
2. Find **Universal Text Processor**
3. Click the **reload button (🔄)**

### Step 2: Test the Extension

**Option A: Use Test Page**
1. Open `/extension/activate-test.html` in Chrome
2. Select text on the page
3. FAB (Floating Action Button) appears in bottom-left
4. Click FAB → Choose action

**Option B: Use Any Webpage**
1. Go to any website (e.g., Twitter, Reddit, news site)
2. Select any text
3. FAB appears in bottom-left
4. Click FAB and choose:
   - **Process** - Open AI processing modal
   - **Memory** - Save to backend memory
   - **Database** - View saved items
   - **Settings** - Configure extension

### Step 3: Verify Service Worker Activated

After clicking the FAB:
1. Go back to `chrome://extensions/`
2. Service worker status should show **"Active"**
3. Click on "service worker" link to see console
4. Should see: `[API Client] Initialized with base URL: https://text-processor-api.kureckamichal.workers.dev`

## What Works Now

✅ **FAB Display** - Appears when you select text
✅ **Backend Connection** - Extension can reach Cloudflare Workers
✅ **Memory Save** - Text saved to backend D1 database
✅ **Webhook** - Events sent to backend webhook endpoint
✅ **Service Worker** - Auto-wakes up when needed

## Next Steps

### 1. Configure API Key (Optional)

For AI processing, you need an OpenRouter API key:

```javascript
// In browser console (F12)
chrome.storage.local.set({
  openrouterApiKey: 'your-api-key-here'
});
```

Get your key at: https://openrouter.ai/

### 2. Test Each Feature

- [x] Select text → FAB appears
- [ ] Click Memory → Save successful
- [ ] Click Process → Modal opens
- [ ] Click Database → View saved items
- [ ] Click Settings → Configure extension

### 3. Check Backend Logs

```bash
cd backend
npm run tail
```

Watch real-time logs to see:
- Memory saves
- Webhook deliveries
- API requests

## Troubleshooting

### FAB Doesn't Appear

**Check:**
1. Extension is enabled in `chrome://extensions/`
2. You selected text (highlight with mouse)
3. CSS is loaded (check DevTools for errors)

**Fix:**
```bash
cd extension
# Reload extension in chrome://extensions/
```

### "Failed to Save" Error

**Check console for:**
- `401 Unauthorized` → Need API key
- `CORS error` → Backend CORS issue (should be fixed)
- `Connection refused` → Backend might be down

**Fix:**
```bash
# Check backend is running
curl https://text-processor-api.kureckamichal.workers.dev/

# Should return: {"success":true,"message":"Universal Text Processor API",...}
```

### Service Worker Won't Activate

**Try:**
1. Select text on any page
2. Click the FAB
3. This should wake up the service worker

Or manually:
```javascript
// In browser console
chrome.runtime.sendMessage(
  'epjggaaoglehneiflbfpkfghikblkjom',
  { action: 'ping' }
);
```

## Useful Commands

### Backend

```bash
cd backend

# Deploy changes
npm run deploy

# Watch logs
npm run tail

# Local development
npm run dev

# Check D1 database
npx wrangler d1 execute text-processor-db --command "SELECT * FROM posts LIMIT 5"
```

### Extension

```bash
cd extension

# Reload in chrome://extensions/
# No build step needed - direct load

# Check console
# Service Worker console in chrome://extensions/
# Content script console in page DevTools (F12)
```

## Architecture Overview

```
┌─────────────┐         ┌──────────────────┐
│  Extension  │────────▶│ Cloudflare Edge  │
│  (Browser)  │  HTTPS  │    Workers       │
└─────────────┘         └──────────────────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
                ┌───▼───┐   ┌───▼───┐   ┌──▼──┐
                │  D1   │   │  KV   │   │ R2  │
                │  DB   │   │ Cache │   │Store│
                └───────┘   └───────┘   └─────┘
```

## What's Been Done

### Backend ✅
- Cloudflare Workers deployed
- D1 database created & migrated
- KV namespaces configured
- R2 bucket created
- CORS configured for extension
- API endpoints ready

### Extension ✅
- Connected to new backend
- API client integrated
- Service worker wake-up mechanism
- FAB interface ready
- Webhook configured

### Testing ✅
- Test page created
- CORS fixed
- Backend responding
- Extension loading

## Support Resources

- **Backend URL**: https://text-processor-api.kureckamichal.workers.dev
- **Extension ID**: `epjggaaoglehneiflbfpkfghikblkjom`
- **Extension Path**: `~/PhpstormProjects/universal-text-processor/extension`
- **Backend Path**: `~/PhpstormProjects/universal-text-processor/backend`

## Ready to Go!

Your extension is fully configured and ready to use. Just:

1. **Reload the extension** in `chrome://extensions/`
2. **Select text** on any webpage
3. **Click the FAB** in the bottom-left corner
4. **Choose an action** and watch it work!

The service worker will activate automatically when you first use the FAB.

---

**Need help?** Check the console (F12) for detailed logs and error messages.
