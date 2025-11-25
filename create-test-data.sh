#!/bin/bash

# Dashboard Test Data Creator
# This script creates sample data so you can see the dashboard in action

API_BASE="https://text-processor-api.kureckamichal.workers.dev"
EMAIL="demo@example.com"
PASSWORD="demo123456"

echo "🚀 Creating test data for dashboard..."
echo ""

# 1. Register user
echo "📝 Step 1: Creating user account..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"userId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "   ℹ️  User might already exist, trying login..."

  LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  USER_ID=$(echo "$LOGIN_RESPONSE" | grep -o '"userId":"[^"]*"' | cut -d'"' -f4)
fi

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "   ❌ Failed to get auth token"
  echo "   Response: $REGISTER_RESPONSE"
  exit 1
fi

echo "   ✅ User created/logged in"
echo "   📧 Email: $EMAIL"
echo "   🔑 Token: ${TOKEN:0:30}..."
echo "   👤 User ID: $USER_ID"
echo ""

# 2. Create sample tweets
echo "🐦 Step 2: Creating sample tweets..."
for i in {1..10}; do
  curl -s -X POST "$API_BASE/api/v1/webhook" \
    -H "Content-Type: application/json" \
    -d "{
      \"event\": \"onSaveTweet\",
      \"userId\": \"$USER_ID\",
      \"data\": {
        \"tweetId\": \"tweet_$i\",
        \"text\": \"Sample tweet #$i - This is test data for the dashboard\",
        \"author\": {
          \"name\": \"Demo User\",
          \"username\": \"demouser\",
          \"handle\": \"demouser\",
          \"url\": \"https://x.com/demouser\"
        },
        \"url\": \"https://x.com/demouser/status/123456$i\",
        \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",
        \"media\": {\"images\": [], \"videos\": [], \"hasMedia\": false}
      },
      \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\"
    }" > /dev/null 2>&1
  echo "   ✓ Tweet $i created"
  sleep 0.2
done
echo ""

# 3. Create sample YouTube videos
echo "📹 Step 3: Creating sample YouTube videos..."
for i in {1..5}; do
  curl -s -X POST "$API_BASE/api/v1/webhook" \
    -H "Content-Type: application/json" \
    -d "{
      \"event\": \"onSaveYouTubeVideo\",
      \"userId\": \"$USER_ID\",
      \"data\": {
        \"videoId\": \"video_$i\",
        \"title\": \"Sample Video #$i - Demo Content\",
        \"url\": \"https://youtube.com/watch?v=demo$i\",
        \"channel\": {
          \"name\": \"Demo Channel\",
          \"url\": \"https://youtube.com/channel/demochannel\"
        },
        \"description\": \"This is a sample video for dashboard testing\",
        \"transcript\": {
          \"available\": false,
          \"text\": null
        }
      },
      \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\"
    }" > /dev/null 2>&1
  echo "   ✓ Video $i created"
  sleep 0.2
done
echo ""

# 4. Create settings update events
echo "⚙️  Step 4: Creating settings history..."
curl -s -X POST "$API_BASE/api/v1/webhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"event\": \"settings_updated\",
    \"userId\": \"$USER_ID\",
    \"data\": {
      \"webhook\": {\"enabled\": true, \"url\": \"https://example.com/webhook\"},
      \"models\": {\"contentModel\": \"openai/gpt-4o-mini\"}
    },
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\"
  }" > /dev/null 2>&1
echo "   ✓ Settings event created"
echo ""

# 5. Update user settings
echo "💾 Step 5: Updating user settings..."
curl -s -X PUT "$API_BASE/api/settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "enabled": true,
      "url": "https://example.com/webhook"
    },
    "models": {
      "contentModel": "openai/gpt-4o-mini",
      "imageModel": "google/gemini-2.0-flash-001"
    },
    "accounts": [
      {"id": "demo1", "name": "Demo Account 1", "enabled": true},
      {"id": "demo2", "name": "Demo Account 2", "enabled": true}
    ]
  }' > /dev/null 2>&1
echo "   ✓ User settings updated"
echo ""

# 6. Get stats to verify
echo "📊 Step 6: Fetching dashboard stats..."
STATS_RESPONSE=$(curl -s "$API_BASE/api/settings/stats" \
  -H "Authorization: Bearer $TOKEN")

echo "$STATS_RESPONSE" | grep -q "success.*true"
if [ $? -eq 0 ]; then
  echo "   ✅ Stats endpoint working!"
  echo ""
  echo "   Stats preview:"
  echo "$STATS_RESPONSE" | grep -o '"posts":{[^}]*}' | head -1
  echo "$STATS_RESPONSE" | grep -o '"webhooks":{[^}]*}' | head -1
else
  echo "   ⚠️  Stats response:"
  echo "   $STATS_RESPONSE"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Test data created successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Dashboard Data Summary:"
echo "   • 10 sample tweets"
echo "   • 5 sample YouTube videos"
echo "   • Settings configured"
echo "   • Webhook events logged"
echo ""
echo "🌐 View Dashboard:"
echo "   URL: $API_BASE/dashboard"
echo ""
echo "🔑 Set Auth Token in Browser:"
echo "   1. Open: $API_BASE/dashboard"
echo "   2. Open browser console (F12)"
echo "   3. Paste this command:"
echo ""
echo "      localStorage.setItem('auth_token', '$TOKEN'); location.reload();"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Login Credentials (save these):"
echo "   Email: $EMAIL"
echo "   Password: $PASSWORD"
echo "   Token: $TOKEN"
echo ""
echo "💡 Test the API:"
echo "   curl $API_BASE/api/settings/stats -H \"Authorization: Bearer $TOKEN\""
echo ""
