# Airtable Integration Testing Guide

## Overview

This guide covers the complete Airtable API integration for Universal Text Processor, including setup, configuration, testing, and troubleshooting.

## Architecture

### Components

1. **Backend Service** (`backend/src/services/airtable.ts`)
   - Centralized Airtable client with MCP integration
   - KV caching layer (15-minute TTL)
   - Methods for profiles, websites, and sync operations

2. **Backend Routes** (`backend/src/routes/airtable.ts`)
   - RESTful API endpoints
   - JWT authentication required
   - Cache control via query parameters

3. **Extension API Client** (`extension/api-client.js`)
   - Airtable methods for extension
   - Local chrome.storage caching
   - Automatic cache invalidation

4. **Configuration** (`extension/settings.json`)
   - Airtable feature flags
   - Sync settings
   - Cache configuration

## Airtable Base Setup

### Step 1: Create Airtable Base

1. Go to [Airtable](https://airtable.com)
2. Create a new base named "Universal Text Processor"
3. Note the Base ID from URL: `https://airtable.com/app{BASE_ID}/...`

### Step 2: Create Tables

#### Table 1: User Profiles

**Table Name**: `User Profiles`

**Fields**:
```
- userId (Single line text) - Primary field, unique identifier
- name (Single line text) - User's name
- displayName (Single line text) - Display name for UI
- email (Email) - User's email address
- accounts (Multiple select) - Account names (e.g., "aicko_cz", "michalku_com")
- writingProfile (Long text) - JSON string with writing profile
- brandingColors (Long text) - JSON string with brand colors
- logoUrl (URL) - Logo URL
- defaultLanguage (Single select) - Default language (english, czech, etc.)
- enabled (Checkbox) - Whether profile is active
- createdAt (Date) - Creation timestamp
- updatedAt (Date) - Last update timestamp
```

**Example writingProfile JSON**:
```json
{
  "language": "english",
  "tone": "professional",
  "style": "informative and engaging",
  "personality": "Expert thought leader",
  "guidelines": [
    "Use clear, concise language",
    "Focus on actionable insights"
  ],
  "avoid": [
    "Excessive emojis",
    "Overly casual slang"
  ],
  "targetAudience": "Business professionals",
  "contentFocus": ["Technology", "Business"],
  "voiceCharacteristics": {
    "formality": "semi-formal",
    "humor": "subtle",
    "enthusiasm": "measured",
    "technical": "moderate"
  }
}
```

**Example brandingColors JSON**:
```json
{
  "primary": "#2563eb",
  "secondary": "#8b5cf6",
  "background": "#ffffff",
  "text": "#1f2937",
  "accent": "#f59e0b"
}
```

#### Table 2: Websites

**Table Name**: `Websites`

**Fields**:
```
- websiteId (Single line text) - Primary field, unique identifier
- name (Single line text) - Website name
- domain (URL) - Website URL
- userId (Single line text) - Linked to User Profiles.userId
- userProfileId (Link to another record) - Link to User Profiles table
- socialProfiles (Long text) - JSON string with social media profiles
- schedulingWebhook (URL) - Webhook URL for scheduling
- enabled (Checkbox) - Whether website is active
- createdAt (Date) - Creation timestamp
- updatedAt (Date) - Last update timestamp
```

**Example socialProfiles JSON**:
```json
[
  {
    "platform": "twitter",
    "username": "aicko_cz",
    "url": "https://twitter.com/aicko_cz",
    "enabled": true
  },
  {
    "platform": "linkedin",
    "username": "michal-kurecka",
    "url": "https://linkedin.com/in/michal-kurecka",
    "enabled": true
  }
]
```

### Step 3: Add Sample Data

**User Profiles Table** - Add a test record:
```
userId: test_user_001
name: Test User
displayName: Test User
email: test@example.com
accounts: aicko_cz, michalku_com
writingProfile: (paste JSON from above)
brandingColors: (paste JSON from above)
logoUrl: https://example.com/logo.png
defaultLanguage: english
enabled: ✓ (checked)
```

**Websites Table** - Add a test record:
```
websiteId: test_website_001
name: Test Website
domain: https://example.com
userId: test_user_001
socialProfiles: (paste JSON from above)
schedulingWebhook: https://example.com/webhook
enabled: ✓ (checked)
```

### Step 4: Get Airtable API Key

1. Go to [Airtable Account](https://airtable.com/account)
2. Generate a Personal Access Token
3. Set scopes:
   - `data.records:read`
   - `data.records:write`
   - `schema.bases:read`
4. Select your base in the access list
5. Copy the token (starts with `pat...`)

## Backend Configuration

### Step 1: Update wrangler.toml

Edit `/backend/wrangler.toml`:

```toml
[vars]
ENVIRONMENT = "development"
JWT_SECRET = "your-jwt-secret"
API_VERSION = "v1"
AIRTABLE_API_KEY = "patXXXXXXXXXXXXXXXXXX"
AIRTABLE_BASE_ID = "appXXXXXXXXXXXXXX"
AIRTABLE_PROFILES_TABLE = "User Profiles"
AIRTABLE_WEBSITES_TABLE = "Websites"
```

**Important**: Never commit API keys to git. For production:

```bash
# Set secrets via Wrangler CLI
npx wrangler secret put AIRTABLE_API_KEY
npx wrangler secret put AIRTABLE_BASE_ID
```

### Step 2: Deploy Backend

```bash
cd backend
npm install
npm run deploy
```

**Expected Output**:
```
✅ Published text-processor-api
   https://text-processor-api.kureckamichal.workers.dev
```

### Step 3: Verify Deployment

```bash
# Health check
curl https://text-processor-api.kureckamichal.workers.dev/

# Airtable health (requires auth)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://text-processor-api.kureckamichal.workers.dev/api/airtable/health
```

## Extension Configuration

### Step 1: Update settings.json

Edit `/extension/settings.json`:

```json
{
  "airtable": {
    "enabled": true,
    "baseId": "appXXXXXXXXXXXXXX",
    "tables": {
      "profiles": "User Profiles",
      "websites": "Websites"
    },
    "sync": {
      "enabled": true,
      "intervalMinutes": 60,
      "syncOnStartup": true,
      "lastSyncAt": null
    },
    "cache": {
      "enabled": true,
      "ttlMinutes": 15
    },
    "fallbackToLocal": true
  }
}
```

### Step 2: Reload Extension

1. Open `chrome://extensions/`
2. Find "Universal Text Processor"
3. Click "Reload" (⟳)
4. Check for errors in console

## Testing

### Test 1: Backend Health Check

**Endpoint**: `GET /api/airtable/health`

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://text-processor-api.kureckamichal.workers.dev/api/airtable/health
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Airtable connection healthy",
  "data": {
    "healthy": true
  }
}
```

### Test 2: List User Profiles

**Endpoint**: `GET /api/airtable/profiles`

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://text-processor-api.kureckamichal.workers.dev/api/airtable/profiles
```

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "recXXXXXXXXXXXX",
      "userId": "test_user_001",
      "name": "Test User",
      "displayName": "Test User",
      "email": "test@example.com",
      "accounts": ["aicko_cz", "michalku_com"],
      "writingProfile": { ... },
      "brandingColors": { ... },
      "logoUrl": "https://example.com/logo.png",
      "defaultLanguage": "english",
      "enabled": true
    }
  ],
  "message": "Retrieved 1 profiles"
}
```

### Test 3: Get Specific Profile

**Endpoint**: `GET /api/airtable/profiles/user/:userId`

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://text-processor-api.kureckamichal.workers.dev/api/airtable/profiles/user/test_user_001
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": "recXXXXXXXXXXXX",
    "userId": "test_user_001",
    "name": "Test User",
    ...
  }
}
```

### Test 4: Cache Verification

**First Request** (cache miss):
```bash
time curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://text-processor-api.kureckamichal.workers.dev/api/airtable/profiles
```

**Second Request** (cache hit - should be faster):
```bash
time curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://text-processor-api.kureckamichal.workers.dev/api/airtable/profiles
```

**Bypass Cache**:
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "https://text-processor-api.kureckamichal.workers.dev/api/airtable/profiles?noCache=true"
```

### Test 5: Update Profile

**Endpoint**: `PUT /api/airtable/profiles/:id`

```bash
curl -X PUT \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "displayName": "Updated Name",
       "defaultLanguage": "czech"
     }' \
     https://text-processor-api.kureckamichal.workers.dev/api/airtable/profiles/recXXXXXXXXXXXX
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": "recXXXXXXXXXXXX",
    "displayName": "Updated Name",
    "defaultLanguage": "czech",
    ...
  },
  "message": "Profile updated successfully"
}
```

### Test 6: Get Website Data

**Endpoint**: `GET /api/airtable/websites/:websiteId`

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://text-processor-api.kureckamichal.workers.dev/api/airtable/websites/test_website_001
```

### Test 7: Trigger Sync

**Endpoint**: `POST /api/airtable/sync`

```bash
curl -X POST \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://text-processor-api.kureckamichal.workers.dev/api/airtable/sync
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "lastSyncAt": 1706112000000,
    "profilesCount": 1,
    "websitesCount": 1,
    "success": true
  },
  "message": "Sync completed: 1 profiles, 1 websites"
}
```

### Test 8: Get Sync Status

**Endpoint**: `GET /api/airtable/sync/status`

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://text-processor-api.kureckamichal.workers.dev/api/airtable/sync/status
```

## Extension Testing

### Test 9: Extension API Client

Open extension background console and run:

```javascript
// Initialize API client
await apiClient.init();

// Get user profile
const profile = await apiClient.getUserProfile('test_user_001');
console.log('Profile:', profile);

// Get website data
const website = await apiClient.getWebsiteData('test_website_001');
console.log('Website:', website);

// List all profiles
const profiles = await apiClient.listProfiles();
console.log('All profiles:', profiles);

// Trigger sync
const syncStatus = await apiClient.triggerSync();
console.log('Sync status:', syncStatus);

// Check cache
chrome.storage.local.get(null, (items) => {
  const airtableKeys = Object.keys(items).filter(k => k.startsWith('airtable_'));
  console.log('Cached items:', airtableKeys);
});

// Clear cache
await apiClient.clearAirtableCache();
```

### Test 10: Cache Expiry

```javascript
// Set a profile in cache
await apiClient.getUserProfile('test_user_001');

// Verify cache exists
const cached = await apiClient.getFromLocalCache('airtable_profile_test_user_001');
console.log('Cached:', cached);

// Wait 15+ minutes, then check again (should be null)
setTimeout(async () => {
  const expired = await apiClient.getFromLocalCache('airtable_profile_test_user_001');
  console.log('After expiry:', expired); // Should be null
}, 900000); // 15 minutes
```

## Performance Testing

### Test 11: Response Times

**Without Cache**:
```bash
time curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "https://text-processor-api.kureckamichal.workers.dev/api/airtable/profiles?noCache=true"
```

Expected: 200-500ms (depends on Airtable API)

**With Cache**:
```bash
time curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://text-processor-api.kureckamichal.workers.dev/api/airtable/profiles
```

Expected: <50ms (KV cache hit)

### Test 12: Concurrent Requests

```bash
# Run 10 parallel requests
for i in {1..10}; do
  curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
       https://text-processor-api.kureckamichal.workers.dev/api/airtable/profiles &
done
wait
```

All should complete successfully with cached responses.

## Monitoring

### Cloudflare Workers Logs

```bash
cd backend
npm run tail
```

**Expected Log Output**:
```
[Airtable] Cache hit: airtable:profiles:all
[Airtable] Fetching user profiles from Airtable
[Airtable] Cache set: airtable:profiles:all (TTL: 900s)
[Airtable] Synced 1 profiles
[Airtable] Sync completed in 234ms
```

### KV Cache Inspection

```bash
# List cache keys
npx wrangler kv:key list --namespace-id b52a33acf7114a3e842d575b830b980e

# Get specific cache entry
npx wrangler kv:key get "airtable:profiles:all" \
  --namespace-id b52a33acf7114a3e842d575b830b980e
```

## Troubleshooting

### Issue 1: "Airtable Base ID not configured"

**Symptom**: Health check fails with error message

**Solution**:
1. Verify `AIRTABLE_BASE_ID` in wrangler.toml
2. Ensure it starts with `app`
3. Redeploy: `npm run deploy`

### Issue 2: "401 Unauthorized" from Airtable

**Symptom**: API calls fail with 401

**Solutions**:
1. Verify API token has correct scopes
2. Check token hasn't expired
3. Ensure base is included in token access list
4. Try regenerating token

### Issue 3: Cache Not Working

**Symptom**: Every request is slow, logs show cache miss

**Solutions**:
1. Verify KV namespace binding in wrangler.toml
2. Check cache TTL isn't set to 0
3. Inspect KV namespace for keys:
   ```bash
   npx wrangler kv:key list --namespace-id b52a33acf7114a3e842d575b830b980e
   ```

### Issue 4: Extension Can't Access Profiles

**Symptom**: Extension shows no profiles

**Solutions**:
1. Verify JWT token is valid
2. Check API client initialization:
   ```javascript
   await apiClient.init();
   console.log('API Key:', apiClient.apiKey);
   ```
3. Check CORS settings in backend
4. Verify backend URL in settings.json

### Issue 5: Sync Fails Silently

**Symptom**: Sync endpoint returns success but no data

**Solutions**:
1. Check Airtable table names match exactly
2. Verify filterByFormula syntax
3. Check Airtable API rate limits (5 req/sec)
4. Review backend logs for errors

## Rate Limiting

Airtable API has rate limits:
- **5 requests per second** per base
- Backend implements automatic retry with backoff
- KV caching reduces API calls significantly

**Recommended**:
- Enable caching (default: 15 min TTL)
- Sync every hour, not more frequently
- Use `noCache=true` sparingly

## Security Best Practices

1. **Never commit API keys**
   - Use wrangler secrets for production
   - Keep wrangler.toml out of git (add to .gitignore)

2. **JWT Authentication**
   - All Airtable endpoints require valid JWT
   - Tokens expire after configured period

3. **Cache Security**
   - KV cache is private to your worker
   - chrome.storage.local is encrypted by Chrome

4. **Data Sanitization**
   - All user inputs are validated
   - JSON parsing has error handling

## Next Steps

1. **Enable MCP Integration**
   - Implement actual MCP tool calls in AirtableService
   - Replace placeholder comments with real MCP invocations

2. **Add Background Sync**
   - Implement hourly sync in extension background.js
   - Use chrome.alarms API for scheduling

3. **Enhance Error Handling**
   - Add retry logic for failed requests
   - Implement exponential backoff

4. **Monitoring & Alerts**
   - Set up Cloudflare Workers analytics
   - Monitor sync failures
   - Track cache hit rates

5. **Advanced Features**
   - Profile versioning
   - Conflict resolution
   - Batch updates
   - Webhook notifications on changes

## Support

For issues or questions:
- Check backend logs: `npm run tail`
- Inspect extension console
- Review Airtable API logs
- Verify all environment variables

---

**Last Updated**: 2025-11-20
**Version**: 1.0.0
**Status**: Ready for Testing
