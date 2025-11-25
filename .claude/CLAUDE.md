# Universal Text Processor - Technical Reference

## Project Overview

Full-stack text processing application with browser extension frontend and Cloudflare Workers backend.

**Repository**: https://github.com/mkurecka/x-post-sender
**Deployed Backend**: https://text-processor-api.kureckamichal.workers.dev
**Extension ID**: epjggaaoglehneiflbfpkfghikblkjom

## Architecture

### Monorepo Structure

```
universal-text-processor/
├── backend/              # Cloudflare Workers backend
│   ├── src/
│   │   ├── index.ts                 # Main Hono app, CORS, routes
│   │   ├── routes/
│   │   │   ├── auth.ts              # JWT authentication
│   │   │   ├── memory.ts            # Memory storage endpoints
│   │   │   ├── posts.ts             # Posts management
│   │   │   ├── process.ts           # Text processing
│   │   │   └── settings.ts          # User settings
│   │   ├── types/
│   │   │   └── index.ts             # TypeScript interfaces
│   │   └── utils/
│   │       ├── crypto.ts            # Encryption utilities
│   │       ├── id.ts                # ID generation
│   │       └── jwt.ts               # JWT utilities
│   ├── migrations/
│   │   └── 0001_initial_schema.sql  # D1 database schema
│   ├── wrangler.toml                # Cloudflare configuration
│   ├── package.json                 # Dependencies
│   └── tsconfig.json                # TypeScript config
│
└── extension/            # Chrome Extension (Manifest V3)
    ├── background.js             # Service worker, message handlers
    ├── content.js                # FAB, text selection, UI
    ├── api-client.js             # Backend API communication
    ├── settings-manager.js       # Settings management
    ├── template-generators.js    # Visual content HTML generators
    ├── manifest.json             # Extension configuration
    ├── settings.json             # Default settings, profiles
    ├── styles.css                # Extension UI styles
    ├── package.json              # Dev dependencies (ESLint, TypeScript)
    ├── tsconfig.json             # TypeScript config for type checking
    ├── .eslintrc.json            # ESLint rules
    └── types/                    # TypeScript type definitions
        ├── api.d.ts              # API response types
        └── chrome.d.ts           # Chrome extension API types
```

## Backend (Cloudflare Workers)

### Tech Stack

- **Runtime**: Cloudflare Workers (V8 isolates)
- **Framework**: Hono v4.7.11 (Express-like routing)
- **Language**: TypeScript 5.7.3
- **Database**: D1 (SQLite at edge)
- **Cache**: KV Namespaces (key-value store)
- **Storage**: R2 (S3-compatible object storage)
- **Auth**: JWT with jose v5.10.0

### Infrastructure Resources

#### D1 Database
- **Name**: text-processor-db
- **ID**: b70b21ae-9fa2-4464-b3fd-9d4eeea7548a
- **Region**: EEUR
- **Binding**: `DB`

**Tables**:
```sql
users          # User accounts, auth
posts          # Processed texts, drafts
memory         # Saved text snippets
sessions       # User sessions
settings       # User preferences
```

#### KV Namespaces
1. **CACHE**
   - **ID**: b52a33acf7114a3e842d575b830b980e
   - **Binding**: `CACHE`
   - **Purpose**: Response caching, rate limiting

2. **SESSIONS**
   - **ID**: 7d68ad4ef5c14fe1aaaa981c50c15597
   - **Binding**: `SESSIONS`
   - **Purpose**: Session management

#### R2 Bucket
- **Name**: text-processor-storage
- **Binding**: `STORAGE`
- **Purpose**: File uploads, images, media

### Environment Variables

Configured in `wrangler.toml`:
```toml
ENVIRONMENT = "development"
JWT_SECRET = "change-this-in-production"
API_VERSION = "v1"
APP_URL = "https://text-processor.app"
OPENROUTER_API_KEY = ""  # For AI processing
```

### API Endpoints

#### Base URL
```
https://text-processor-api.kureckamichal.workers.dev
```

#### Routes

**Health & Info**
- `GET /` - API info, version
- `GET /health` - Health check

**Authentication** (`/api/auth/`)
- `POST /login` - User login
- `POST /register` - User registration
- `POST /refresh` - Refresh JWT token

**Memory** (`/api/memory/`)
- `GET /` - List saved memories
- `POST /` - Save to memory
- `GET /:id` - Get specific memory
- `DELETE /:id` - Delete memory

**Processing** (`/api/process/`)
- `POST /` - Process text with AI
- `POST /batch` - Batch process multiple texts

**Posts** (`/api/posts/`)
- `GET /` - List posts
- `POST /` - Create post
- `GET /:id` - Get post
- `PUT /:id` - Update post
- `DELETE /:id` - Delete post

**Settings** (`/api/settings/`)
- `GET /` - Get user settings
- `PUT /` - Update settings

**Webhooks**
- `POST /api/v1/webhook` - Receive webhook events

### CORS Configuration

```typescript
origin: (origin) => {
  if (!origin) return '*';
  if (origin.startsWith('chrome-extension://')) return origin;
  if (origin.startsWith('file://')) return origin;
  if (origin === 'null') return 'null';
  return origin;
}
```

Allows: Chrome extensions, local files, all origins (for development)

### Deployment

```bash
cd backend
npm install
npm run deploy
```

**Commands**:
- `npm run dev` - Local development (localhost:8787)
- `npm run deploy` - Deploy to Cloudflare
- `npm run tail` - Watch real-time logs
- `npm run d1:migrate` - Run database migrations

**Performance**:
- Startup Time: 14-19ms
- Bundle Size: 151 KiB (32 KiB gzipped)
- Global Edge: 300+ cities

## Extension (Chrome Manifest V3)

### Tech Stack

- **Platform**: Chrome/Edge Manifest V3
- **Language**: Vanilla JavaScript (ES6+)
- **Storage**: IndexedDB + chrome.storage.local
- **API Client**: Fetch API
- **UI**: Custom FAB (Floating Action Button)

### Architecture

#### Service Worker (background.js)
- **Type**: Service worker (not module)
- **Imports**: Uses `importScripts()` (not ES modules)
- **Lifecycle**: Auto-wakes on message, sleeps when idle

**Key Responsibilities**:
- Message handling from content script
- API key storage management
- OpenRouter API calls for AI processing
- Database operations (IndexedDB)
- Context menu creation
- Webhook delivery
- Settings management

**Message Actions**:
```javascript
{
  ping: "Wake up service worker",
  processText: "Process text with AI",
  saveToMemory: "Save to backend memory",
  saveProcessedText: "Save processed result",
  getSettings: "Retrieve settings",
  updateSettings: "Update settings",
  getModelSettings: "Get AI model config",
  updateModelSettings: "Update AI models"
}
```

#### Content Script (content.js)
- **Injection**: All URLs (`<all_urls>`)
- **Auto-load**: Yes (via manifest)

**Key Responsibilities**:
- Text selection detection
- Image click handling
- FAB creation and management
- Modal UI rendering
- User interaction handling
- Backend communication via messages

**FAB (Floating Action Button)**:
- Position: Bottom-left corner
- Trigger: Text selection or image click
- Actions:
  - Process (AI processing)
  - Memory (save to backend)
  - Database (view saved items)
  - Settings (configuration)

#### API Client (api-client.js)
Centralized backend communication layer.

**Methods**:
```javascript
apiClient.init()                    // Initialize with settings
apiClient.saveToMemory(data)        // POST /api/v1/memory
apiClient.processText(data)         // POST /api/v1/process
apiClient.sendWebhook(event, data)  // POST webhook
apiClient.getSettings()             // GET /api/v1/settings
apiClient.updateSettings(settings)  // PUT /api/v1/settings
```

**Configuration**:
```javascript
{
  baseUrl: "https://text-processor-api.kureckamichal.workers.dev",
  apiVersion: "v1",
  apiKey: null  // Loaded from chrome.storage.local
}
```

#### Database (database.js)
IndexedDB wrapper for offline storage.

**Store**: `posts`
**Schema**:
```javascript
{
  id: "auto-increment",
  type: "memory|processed",
  originalText: "string",
  generatedOutput: "string",
  mode: "string",
  account: "string",
  language: "string",
  comment: "string",
  context: "object",
  timestamp: "number",
  synced: "boolean"
}
```

#### Settings Manager (settings-manager.js)
Manages user profiles and processing modes.

**Settings Structure**:
```javascript
{
  accounts: [
    {
      id: "account_id",
      name: "Account Name",
      displayName: "Display Name",
      enabled: true,
      writingProfile: {
        language: "english",
        tone: "professional",
        style: "informative",
        personality: "Expert",
        guidelines: [],
        avoid: [],
        targetAudience: "Business professionals",
        contentFocus: [],
        voiceCharacteristics: {}
      }
    }
  ],
  modes: {
    rewrite_twitter: {
      name: "Rewrite for Twitter",
      description: "...",
      promptTemplate: "..."
    },
    describe_image: {
      name: "Describe Image",
      model: "google/gemini-2.0-flash-001",
      promptTemplate: "..."
    }
  },
  api: {
    provider: "openrouter",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    model: "openai/gpt-4o-mini"
  },
  ui: {
    defaultMode: "rewrite",
    defaultAccount: "aicko_cz",
    showPreview: true,
    autoClose: false,
    defaultLanguage: "cs"
  },
  languages: [...],
  webhook: {
    enabled: true,
    url: "https://text-processor-api.kureckamichal.workers.dev/api/v1/webhook",
    events: {}
  },
  backend: {
    baseUrl: "https://text-processor-api.kureckamichal.workers.dev",
    apiVersion: "v1"
  }
}
```

### Manifest Configuration

```json
{
  "manifest_version": 3,
  "name": "Universal Text Processor",
  "version": "2.2.0",
  "permissions": [
    "activeTab",
    "scripting",
    "storage",
    "contextMenus"
  ],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "css": ["styles.css"]
  }],
  "web_accessible_resources": [{
    "resources": ["settings.json"],
    "matches": ["<all_urls>"]
  }]
}
```

**Important Notes**:
- NO `"type": "module"` in background (incompatible with importScripts)
- Service worker uses importScripts(), not ES modules
- All URLs access for maximum compatibility

### Chrome Storage

**Local Storage Keys**:
```javascript
{
  apiKey: "Backend API key for authentication",
  openrouterApiKey: "OpenRouter API key for AI",
  contentModel: "AI model for text processing",
  imageModel: "AI model for image description"
}
```

### Extension Loading

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `/extension` directory
5. Extension loads with ID: `epjggaaoglehneiflbfpkfghikblkjom`

### Service Worker Lifecycle

**States**:
- **Inactive** (Neaktivní) - Normal when not in use
- **Active** - When processing messages
- **Terminated** - After idle timeout

**Activation**:
- Automatically on first message
- User interaction (FAB click)
- Context menu usage
- Manual ping: `chrome.runtime.sendMessage({action: "ping"})`

## Data Flow

### Text Processing Flow

```
1. User selects text
   ↓
2. content.js detects selection
   ↓
3. FAB appears in bottom-left
   ↓
4. User clicks FAB → Process
   ↓
5. Modal opens with text
   ↓
6. User configures (account, mode, language)
   ↓
7. content.js → sendMessage → background.js
   ↓
8. background.js wakes up (if inactive)
   ↓
9. background.js calls OpenRouter API
   ↓
10. AI processes text
    ↓
11. Response → background.js
    ↓
12. background.js → sendResponse → content.js
    ↓
13. Modal shows result
    ↓
14. User approves/rejects
    ↓
15. Saved to IndexedDB (database.js)
    ↓
16. Optional: Webhook to backend
```

### Memory Save Flow

```
1. User selects text
   ↓
2. FAB appears
   ↓
3. User clicks FAB → Memory
   ↓
4. content.js calls wakeUpServiceWorker()
   ↓
5. Ping message sent to background.js
   ↓
6. background.js responds (now active)
   ↓
7. saveToMemory message sent
   ↓
8. background.js receives message
   ↓
9. Saves to local IndexedDB
   ↓
10. Calls apiClient.saveToMemory()
    ↓
11. POST to backend /api/v1/memory
    ↓
12. Backend saves to D1 database
    ↓
13. Optional: Webhook triggered
    ↓
14. Response to content.js
    ↓
15. Notification: "✓ Saved to memory"
```

## Development Workflows

### Backend Development

```bash
cd backend

# Install
npm install

# Local dev (http://localhost:8787)
npm run dev

# Deploy to production
npm run deploy

# Watch logs
npm run tail

# Database
npx wrangler d1 execute text-processor-db --command "SELECT * FROM posts"
npx wrangler d1 migrations apply text-processor-db
npx wrangler d1 migrations apply text-processor-db --remote

# KV
npx wrangler kv:namespace list
npx wrangler kv:key list --namespace-id b52a33acf7114a3e842d575b830b980e

# R2
npx wrangler r2 bucket list
npx wrangler r2 object list text-processor-storage
```

### Extension Development

```bash
cd extension

# Install dev dependencies (first time only)
npm install

# REQUIRED: Run linting before any commit
npm run check        # Runs both type-check and lint
npm run lint         # ESLint only
npm run lint:fix     # Auto-fix fixable issues

# No build step needed for extension itself
# Edit files → Reload extension in chrome://extensions/

# Test in browser
open activate-test.html
# Or load extension and test on any website

# Check console
# Service Worker: chrome://extensions/ → service worker link
# Content Script: Page DevTools (F12) → Console
```

**IMPORTANT**: Always run `npm run check` in the extension directory before committing changes. This catches bugs like undefined variables and type mismatches that cause runtime errors.

### Testing Backend

```bash
# Health check
curl https://text-processor-api.kureckamichal.workers.dev/

# Memory endpoint
curl -X POST https://text-processor-api.kureckamichal.workers.dev/api/v1/memory \
  -H "Content-Type: application/json" \
  -d '{"text": "Test memory", "context": {}}'

# Webhook test
curl -X POST https://text-processor-api.kureckamichal.workers.dev/api/v1/webhook \
  -H "Content-Type: application/json" \
  -d '{"event": "test", "data": {}}'
```

## Code Quality Rules

### REQUIRED: Run Linting Before Commits
**Extension**: Always run `npm run check` in the extension directory before committing any JavaScript changes.

```bash
cd extension
npm run check  # MUST pass with 0 errors before commit
```

This catches:
- Undefined variables (like the `account` bug that was found)
- Dead code using undefined variables (like the `menuOpen` bug)
- Type mismatches in API responses (like double-wrapped proxy responses)
- Common JavaScript errors

**Backend**: TypeScript compiler already enforces types. Run `npm run type-check` if needed.

### API Response Handling
When calling backend proxy endpoints (`/api/proxy/*`), responses may be double-wrapped:
- Direct response: `{success, data: {url}}`
- Proxy-wrapped: `{success, data: {success, data: {url}}}`

Always check both levels when extracting data from proxy responses.

## Common Issues & Solutions

### Service Worker Won't Activate
**Cause**: `"type": "module"` in manifest incompatible with importScripts()
**Fix**: Remove `"type": "module"` from manifest.json background section

### CORS Errors
**Cause**: Backend not allowing extension origin
**Fix**: CORS configuration in backend/src/index.ts already handles chrome-extension://

### "Could not establish connection"
**Cause**: Service worker inactive when content script sends message
**Fix**: Call `wakeUpServiceWorker()` before sending messages (implemented in content.js)

### FAB Not Appearing
**Cause**: Content script not loaded or CSS not injected
**Fix**: Reload extension, check console for errors

### Backend Deployment Fails
**Cause**: Missing wrangler.toml bindings or invalid IDs
**Fix**: Ensure all resource IDs in wrangler.toml are correct

## Performance Metrics

### Backend
- **Cold Start**: 14-19ms
- **API Response**: <200ms
- **Database Query**: <10ms (D1)
- **KV Read**: <1ms
- **R2 Read**: <50ms

### Extension
- **Service Worker Wake**: <100ms
- **FAB Render**: <50ms
- **Modal Open**: <100ms
- **API Call**: <500ms (includes network)

## Security Considerations

### Backend
- JWT tokens for authentication
- API key validation
- Input sanitization (all user inputs)
- Rate limiting (via KV)
- CORS restrictions
- Environment variable secrets

### Extension
- No eval() or unsafe-inline
- Content Security Policy enforced
- API keys stored in chrome.storage (encrypted by Chrome)
- No secrets in code
- HTTPS only for API calls

## File Size Limits

### Backend
- **Maximum file**: 500 lines (enforced in CLAUDE.md)
- **Bundle size**: <1MB target
- **D1 database**: 500MB per database
- **KV value**: 25MB max
- **R2 object**: 5TB max

### Extension
- **Manifest V3**: No size limit
- **IndexedDB**: ~50MB per origin
- **chrome.storage.local**: 10MB

## Dependencies

### Backend
```json
{
  "hono": "^4.7.11",
  "jose": "^5.10.0"
}
```

### Extension
**Runtime**: No npm dependencies - pure vanilla JavaScript
**Dev Dependencies** (for linting/type-checking):
```json
{
  "eslint": "^8.57.0",
  "typescript": "^5.7.3"
}
```

## Git Workflow

### Repository
- **Remote**: https://github.com/mkurecka/x-post-sender
- **Branch**: master
- **Structure**: Monorepo (backend + extension)

### Commit Format
```
<type>: <description>

<body>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

Types: feat, fix, docs, refactor, test, chore

### Deployment
- Backend: Manual via `npm run deploy`
- Extension: Manual load in browser

## Environment Setup

### Required
- Node.js 18+
- npm 9+
- Wrangler CLI 4.49.1+
- Chrome/Edge browser
- GitHub account
- Cloudflare account

### Optional
- OpenRouter API key (for AI processing)
- Custom domain (for backend)

## Contact & Support

- **Extension ID**: epjggaaoglehneiflbfpkfghikblkjom
- **Backend**: https://text-processor-api.kureckamichal.workers.dev
- **Repository**: https://github.com/mkurecka/x-post-sender
- **Version**: 2.2.0

---

**Last Updated**: 2025-11-25
**Status**: ✅ Production Ready
**Deployment**: Live on Cloudflare Workers
