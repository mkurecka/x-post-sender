# Dashboard Setup Guide

## Why You Don't See Data

The dashboard requires:
1. ✅ Backend API deployed (DONE)
2. ❌ User account created
3. ❌ Authentication token
4. ❌ Data in database (tweets, videos, memories)

Currently your database has **0 users** and **0 data**, so the dashboard shows empty states.

## How to Set Up Dashboard with Real Data

### Step 1: Create a User Account

```bash
# Register a new user
curl -X POST https://text-processor-api.kureckamichal.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-secure-password"
  }'
```

**Response:**
```json
{
  "success": true,
  "userId": "user_abc123",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_abc123",
    "email": "your-email@example.com"
  }
}
```

Save the `token` from the response!

### Step 2: Login (if needed)

```bash
# Login to get fresh token
curl -X POST https://text-processor-api.kureckamichal.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-secure-password"
  }'
```

### Step 3: Test API with Your Token

```bash
# Replace YOUR_TOKEN with the token from step 1
export TOKEN="YOUR_TOKEN_HERE"

# Get settings
curl https://text-processor-api.kureckamichal.workers.dev/api/settings \
  -H "Authorization: Bearer $TOKEN"

# Get stats (this is what dashboard uses)
curl https://text-processor-api.kureckamichal.workers.dev/api/settings/stats \
  -H "Authorization: Bearer $TOKEN"
```

### Step 4: Create Some Test Data

Use the extension to create data, or use API directly:

```bash
# Send a webhook event (simulates saving a tweet)
curl -X POST https://text-processor-api.kureckamichal.workers.dev/api/v1/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "onSaveTweet",
    "userId": "YOUR_USER_ID",
    "data": {
      "tweetId": "test123",
      "text": "This is a test tweet",
      "author": {
        "name": "Test User",
        "username": "testuser"
      }
    },
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
  }'
```

### Step 5: Access Dashboard

#### Option A: Using Browser Console

1. Go to: https://text-processor-api.kureckamichal.workers.dev/dashboard
2. Open browser console (F12)
3. Run:
```javascript
localStorage.setItem('auth_token', 'YOUR_TOKEN_HERE');
location.reload();
```

#### Option B: Using Extension

1. Load the Chrome extension
2. The extension will store auth token automatically
3. Use extension to save tweets/videos
4. Then access dashboard

## Dashboard Features (Once You Have Data)

### Stats Cards
- **Total Settings**: Shows configured settings count
- **History Entries**: Shows webhook event count
- **Active Profiles**: Shows Airtable profiles or accounts
- **Last Updated**: Shows most recent activity

### Sections
- **Settings History**: Timeline of all settings changes
- **User Profiles**: Airtable user profiles list
- **Webhook Events**: Bar chart of webhook event types
- **Settings Configuration**: Current settings display
- **Recent Activity**: Last 10 posts/actions

## Quick Test Script

Save this as `test-dashboard.sh`:

```bash
#!/bin/bash

# Configuration
API_BASE="https://text-processor-api.kureckamichal.workers.dev"
EMAIL="test@example.com"
PASSWORD="test123456"

echo "🚀 Setting up dashboard test data..."

# 1. Register
echo "📝 Registering user..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.token')
USER_ID=$(echo $REGISTER_RESPONSE | jq -r '.userId')

if [ "$TOKEN" = "null" ]; then
  echo "❌ Registration failed. User might already exist. Trying login..."

  # Try login instead
  LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

  TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
  USER_ID=$(echo $LOGIN_RESPONSE | jq -r '.userId')
fi

echo "✅ Token: ${TOKEN:0:20}..."
echo "✅ User ID: $USER_ID"

# 2. Create some test webhook events
echo ""
echo "📊 Creating test data..."

for i in {1..5}; do
  curl -s -X POST "$API_BASE/api/v1/webhook" \
    -H "Content-Type: application/json" \
    -d "{
      \"event\": \"onSaveTweet\",
      \"userId\": \"$USER_ID\",
      \"data\": {
        \"tweetId\": \"tweet_$i\",
        \"text\": \"Test tweet number $i\",
        \"author\": {\"name\": \"Test User\", \"username\": \"testuser\"}
      }
    }" > /dev/null
  echo "  ✓ Created tweet $i"
done

for i in {1..3}; do
  curl -s -X POST "$API_BASE/api/v1/webhook" \
    -H "Content-Type: application/json" \
    -d "{
      \"event\": \"onSaveYouTubeVideo\",
      \"userId\": \"$USER_ID\",
      \"data\": {
        \"videoId\": \"video_$i\",
        \"title\": \"Test video $i\",
        \"url\": \"https://youtube.com/watch?v=test$i\"
      }
    }" > /dev/null
  echo "  ✓ Created video $i"
done

# 3. Get stats
echo ""
echo "📈 Fetching stats..."
STATS=$(curl -s "$API_BASE/api/settings/stats" \
  -H "Authorization: Bearer $TOKEN")

echo ""
echo "Stats response:"
echo $STATS | jq '.'

# 4. Instructions
echo ""
echo "🎉 Setup complete!"
echo ""
echo "To view dashboard:"
echo "1. Go to: $API_BASE/dashboard"
echo "2. Open browser console (F12)"
echo "3. Run: localStorage.setItem('auth_token', '$TOKEN'); location.reload();"
echo ""
echo "Or copy this one-liner:"
echo "localStorage.setItem('auth_token', '$TOKEN'); location.reload();"
```

Make it executable:
```bash
chmod +x test-dashboard.sh
./test-dashboard.sh
```

## Troubleshooting

### "Invalid or expired token"
- Token expired (24 hours validity)
- Login again to get fresh token

### "No data showing"
- Database is empty
- Run test script above to create sample data

### "Dashboard not loading"
- Check browser console for errors
- Ensure auth token is set in localStorage
- Try incognito/private window

### "Stats shows 0 for everything"
- No data in database yet
- Use extension or test script to create data

## API Endpoints Reference

All require `Authorization: Bearer TOKEN` header:

- `GET /api/settings` - Current user settings
- `GET /api/settings/stats` - **Dashboard statistics**
- `GET /api/settings/history` - Settings change history
- `GET /api/airtable/profiles` - Airtable user profiles
- `POST /api/v1/webhook` - Send webhook event
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Get token

## Next Steps

Once you have data:
1. The stats cards will show real numbers
2. Webhook events chart will display
3. Settings configuration will show
4. Recent activity will list your actions
5. History timeline will show changes

The dashboard is fully functional - it just needs data to display!
