# Airtable Integration - Quick Start Guide

## 5-Minute Setup

### Prerequisites
- Airtable account
- Airtable base with "User Profiles" and "Websites" tables
- Cloudflare Workers deployment
- Chrome extension loaded

---

## Step 1: Airtable Setup (2 minutes)

### Create Base
1. Go to [Airtable](https://airtable.com)
2. Create base: "Universal Text Processor"
3. Copy Base ID from URL: `https://airtable.com/app{BASE_ID}`

### Create Tables

**Table 1: User Profiles**
```
userId (Text) | name (Text) | displayName (Text) | email (Email)
accounts (Multiple select) | writingProfile (Long text)
brandingColors (Long text) | logoUrl (URL)
defaultLanguage (Single select) | enabled (Checkbox)
```

**Table 2: Websites**
```
websiteId (Text) | name (Text) | domain (URL) | userId (Text)
socialProfiles (Long text) | schedulingWebhook (URL) | enabled (Checkbox)
```

### Get API Key
1. Visit [Airtable Account](https://airtable.com/account)
2. Create Personal Access Token
3. Scopes: `data.records:read`, `data.records:write`, `schema.bases:read`
4. Add your base to access list
5. Copy token (starts with `pat...`)

---

## Step 2: Backend Configuration (1 minute)

Edit `/backend/wrangler.toml`:

```toml
[vars]
AIRTABLE_API_KEY = "patXXXXXXXXXXXXXXXXXX"
AIRTABLE_BASE_ID = "appXXXXXXXXXXXXXX"
AIRTABLE_PROFILES_TABLE = "User Profiles"
AIRTABLE_WEBSITES_TABLE = "Websites"
```

Deploy:
```bash
cd backend
npm run deploy
```

---

## Step 3: Extension Configuration (1 minute)

Edit `/extension/settings.json`:

```json
{
  "airtable": {
    "enabled": true,
    "baseId": "appXXXXXXXXXXXXXX"
  }
}
```

Reload extension in `chrome://extensions/`

---

## Step 4: Test (1 minute)

### Backend Test
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://text-processor-api.kureckamichal.workers.dev/api/airtable/profiles
```

### Extension Test
Open console in extension background:
```javascript
await apiClient.init();
const profiles = await apiClient.listProfiles();
console.log(profiles);
```

---

## API Endpoints Quick Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/airtable/profiles` | GET | List all profiles |
| `/api/airtable/profiles/:id` | GET | Get profile by ID |
| `/api/airtable/profiles/user/:userId` | GET | Get by userId |
| `/api/airtable/profiles/:id` | PUT | Update profile |
| `/api/airtable/websites/:id` | GET | Get website |
| `/api/airtable/sync` | POST | Trigger sync |
| `/api/airtable/health` | GET | Health check |

All require: `Authorization: Bearer JWT_TOKEN`

---

## Cache Control

**Bypass cache**:
```bash
curl "https://...api/airtable/profiles?noCache=true"
```

**Clear extension cache**:
```javascript
await apiClient.clearAirtableCache();
```

---

## Troubleshooting

### Error: "Base ID not configured"
- Check wrangler.toml has AIRTABLE_BASE_ID
- Verify format: starts with "app"
- Redeploy: `npm run deploy`

### Error: "401 Unauthorized"
- Verify API token scopes
- Check base in token access list
- Regenerate token if needed

### No data returned
- Verify table names match exactly
- Check Airtable has data
- Verify enabled checkbox is checked

---

## Next Steps

1. ✅ **Setup complete** - Integration ready
2. 📖 **Read full guide** - See `AIRTABLE_INTEGRATION_GUIDE.md`
3. 🔧 **MCP Integration** - See `airtable-mcp-implementation.md`
4. 🚀 **Production** - Move API key to Cloudflare secrets

---

**Full Documentation**:
- `AIRTABLE_INTEGRATION_GUIDE.md` - Complete testing guide
- `AIRTABLE_IMPLEMENTATION_SUMMARY.md` - Implementation details
- `backend/src/services/airtable-mcp-implementation.md` - MCP guide
