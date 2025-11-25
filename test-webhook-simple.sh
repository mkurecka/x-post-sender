#!/bin/bash

# Simple webhook test matching extension format exactly

API_BASE="https://text-processor-api.kureckamichal.workers.dev"
USER_ID="test_user_$(date +%s)"

echo "🧪 Testing webhook with userId: $USER_ID"
echo ""

# Test: Send tweet in exact extension format
echo "📤 Sending tweet webhook..."
curl -X POST "$API_BASE/api/v1/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "onSaveTweet",
    "userId": "'"$USER_ID"'",
    "event": "tweet_saved",
    "data": {
      "id": "local_123",
      "tweetId": "tweet_test_001",
      "text": "This is a test tweet to verify database saving works correctly.",
      "author": {
        "name": "Test User",
        "username": "testuser",
        "handle": "testuser",
        "url": "https://x.com/testuser"
      },
      "url": "https://x.com/testuser/status/123456",
      "timestamp": "'"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"'",
      "media": {
        "images": [],
        "videos": [],
        "hasMedia": false
      },
      "savedAt": "'"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"'"
    },
    "timestamp": "'"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"'",
    "source": "universal-text-processor-extension"
  }'

echo ""
echo ""
echo "⏳ Waiting 2 seconds..."
sleep 2

echo "📊 Checking database..."
npx wrangler d1 execute text-processor-db --remote --command "
SELECT
  (SELECT COUNT(*) FROM posts WHERE user_id = '$USER_ID') as posts_count,
  (SELECT COUNT(*) FROM webhook_events WHERE user_id = '$USER_ID') as events_count
"
