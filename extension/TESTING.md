# Extension Testing Guide

## Current Status
✅ Extension code refactored - local database completely removed
✅ All data operations now use webhook to backend API
✅ Single user ID: `michal_main_user`

## Testing Steps

### 1. Reload Extension
1. Open `chrome://extensions/`
2. Find "Universal Text Processor"
3. Click the reload icon (🔄)
4. Verify "Service worker (Inactive)" status (this is normal when idle)

### 2. Test Memory Save (Context Menu)
1. Go to any webpage (e.g., https://example.com)
2. Select some text on the page
3. Right-click → "Save to Memory"
4. Open Console (F12 → Console tab)
5. Look for logs:
   ```
   [Extension] Context menu clicked: saveToMemory
   [Extension] Sending webhook: saveToMemory userId: michal_main_user
   [Extension] Webhook sent successfully for saveToMemory: 200
   [Extension] Saved to backend: [selected text]
   ```

### 3. Test Memory Save (FAB)
1. Go to any webpage
2. Select text
3. FAB should appear in bottom-left corner
4. Click FAB → Memory icon
5. Check console for same logs as above

### 4. Verify Data in Backend

#### Option A: Check Dashboard
```
https://text-processor-api.kureckamichal.workers.dev/dashboard
```
Look at the "Memory" count - it should increase after each save.

#### Option B: Query Database Directly
```bash
cd /Users/michalkurecka/PhpstormProjects/universal-text-processor/backend
npx wrangler d1 execute text-processor-db --remote --command "SELECT text, user_id, created_at FROM memory WHERE user_id = 'michal_main_user' ORDER BY created_at DESC LIMIT 5"
```

### 5. Test Tweet Save
1. Go to Twitter/X
2. Find a tweet
3. Right-click → "Save Tweet" (if context menu exists)
4. Or use FAB if configured
5. Check console for:
   ```
   [Extension] Sending webhook: onSaveTweet userId: michal_main_user
   [Extension] Tweet saved to backend: [tweet_id]
   ```

### 6. Verify Webhook Events
```bash
npx wrangler d1 execute text-processor-db --remote --command "SELECT event, user_id, created_at FROM webhook_events WHERE user_id = 'michal_main_user' ORDER BY created_at DESC LIMIT 5"
```

## Expected Results

### Working Extension
- ✅ No errors in console
- ✅ Webhook logs show successful sends (status 200)
- ✅ userId always shows as `michal_main_user`
- ✅ Data appears in backend database
- ✅ Dashboard count increases

### Broken Extension (What NOT to see)
- ❌ "Could not establish connection" errors
- ❌ "Failed to save" messages
- ❌ Webhook status 400/500 errors
- ❌ Missing userId in logs
- ❌ No data in backend database

## Troubleshooting

### Service Worker Inactive
**Normal behavior** - service worker goes inactive when not in use. It auto-wakes when you interact with extension.

### "Webhook disabled or not configured"
Check `extension/settings.json`:
```json
{
  "webhook": {
    "enabled": true,
    "url": "https://text-processor-api.kureckamichal.workers.dev/api/v1/webhook"
  }
}
```

### "Could not establish connection"
1. Reload extension
2. Try sending a ping first:
   ```javascript
   chrome.runtime.sendMessage({action: "ping"}, response => {
     console.log(response);
   });
   ```

### Data Not Saving
1. Check webhook logs in console (must show status 200)
2. Verify payload structure in Network tab:
   ```json
   {
     "event": "saveToMemory",
     "userId": "michal_main_user",
     "data": {
       "text": "selected text",
       "context": {}
     }
   }
   ```
3. Check backend logs (if accessible)

## Database Schema Reference

### memory table
```sql
- id (TEXT PRIMARY KEY)
- user_id (TEXT) -- should be 'michal_main_user'
- text (TEXT) -- the saved content
- context_json (TEXT) -- metadata
- priority (TEXT) -- 'medium' by default
- created_at (INTEGER) -- timestamp
- embedding_vector (TEXT) -- AI-generated, may be null
- search_keywords (TEXT) -- extracted keywords
```

### webhook_events table
```sql
- id (TEXT PRIMARY KEY)
- event (TEXT) -- e.g., 'saveToMemory', 'onSaveTweet'
- user_id (TEXT) -- 'michal_main_user'
- data_json (TEXT) -- full webhook payload
- created_at (INTEGER) -- timestamp
```

## Success Criteria

✅ Extension loads without errors
✅ Context menu appears on text selection
✅ Webhooks send successfully (200 status)
✅ All webhooks use userId: `michal_main_user`
✅ Data appears in backend D1 database
✅ Dashboard reflects correct counts
✅ No local IndexedDB usage
✅ No "database.js" references in code

## Current Code Status

- ✅ database.js - DELETED
- ✅ background.js - Updated to use webhooks only
- ✅ getUserId() - Returns hardcoded 'michal_main_user'
- ✅ sendWebhookNotification() - Proper payload format
- ✅ All postDatabase calls - REMOVED
- ✅ Read operations - Redirect to dashboard

**Last Updated**: 2025-11-25
**Status**: Ready for testing
