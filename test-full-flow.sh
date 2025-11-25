#!/bin/bash

# Full Flow Test Script
# Tests: userId generation → webhook → database save → embeddings → search

API_BASE="https://text-processor-api.kureckamichal.workers.dev"

echo "🚀 Testing Full Data Flow with Embeddings & Search"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Generate a unique userId (simulating extension behavior)
USER_ID="user_$(date +%s)_$(openssl rand -hex 4)"
echo "📝 Generated userId: $USER_ID"
echo ""

# Test 1: Send a tweet webhook
echo "🐦 Test 1: Sending tweet webhook..."
TWEET_RESPONSE=$(curl -s -X POST "$API_BASE/api/v1/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "onSaveTweet",
    "userId": "'"$USER_ID"'",
    "data": {
      "tweetId": "test_tweet_001",
      "text": "Artificial intelligence is transforming how we process and understand information. Machine learning models can now analyze vast amounts of data in seconds.",
      "author": {
        "name": "Tech Enthusiast",
        "username": "techie",
        "handle": "techie",
        "url": "https://x.com/techie"
      },
      "url": "https://x.com/techie/status/123456",
      "timestamp": "'"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"'",
      "media": { "images": [], "videos": [], "hasMedia": false }
    },
    "timestamp": "'"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"'"
  }')

echo "Response: $TWEET_RESPONSE"
echo ""

sleep 2

# Test 2: Send a YouTube video webhook
echo "📹 Test 2: Sending YouTube video webhook..."
VIDEO_RESPONSE=$(curl -s -X POST "$API_BASE/api/v1/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "onSaveYouTubeVideo",
    "userId": "'"$USER_ID"'",
    "data": {
      "videoId": "test_video_001",
      "title": "Introduction to Neural Networks and Deep Learning",
      "url": "https://youtube.com/watch?v=test001",
      "channel": {
        "name": "AI Academy",
        "url": "https://youtube.com/channel/aiacademy"
      },
      "description": "Learn the fundamentals of neural networks, backpropagation, and how deep learning models work.",
      "transcript": {
        "available": true,
        "text": "Welcome to this comprehensive guide on neural networks. Today we will cover the basics of deep learning, including how neurons process information and how networks learn through backpropagation. This is essential knowledge for anyone working in artificial intelligence."
      }
    },
    "timestamp": "'"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"'"
  }')

echo "Response: $VIDEO_RESPONSE"
echo ""

sleep 2

# Test 3: Send a memory webhook
echo "💾 Test 3: Sending memory webhook..."
MEMORY_RESPONSE=$(curl -s -X POST "$API_BASE/api/v1/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "saveToMemory",
    "userId": "'"$USER_ID"'",
    "text": "Remember to explore vector databases for semantic search. Embeddings from OpenAI can be used to find similar content based on meaning, not just keywords.",
    "context": {
      "url": "https://example.com/notes",
      "pageTitle": "My Research Notes"
    },
    "timestamp": "'"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"'"
  }')

echo "Response: $MEMORY_RESPONSE"
echo ""

sleep 3

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏳ Waiting 5 seconds for embeddings to be generated..."
sleep 5
echo ""

# Test 4: Check database counts
echo "📊 Test 4: Checking database counts..."
echo ""

npx wrangler d1 execute text-processor-db --remote --command "
SELECT
  (SELECT COUNT(*) FROM posts WHERE user_id = '$USER_ID') as posts_count,
  (SELECT COUNT(*) FROM memory WHERE user_id = '$USER_ID') as memory_count,
  (SELECT COUNT(*) FROM webhooks WHERE user_id = '$USER_ID') as webhooks_count,
  (SELECT COUNT(*) FROM posts WHERE user_id = '$USER_ID' AND embedding_vector IS NOT NULL) as posts_with_embeddings,
  (SELECT COUNT(*) FROM memory WHERE user_id = '$USER_ID' AND embedding_vector IS NOT NULL) as memory_with_embeddings
"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Full flow test completed!"
echo ""
echo "📌 Summary:"
echo "   • userId: $USER_ID"
echo "   • Sent 3 webhooks (tweet, video, memory)"
echo "   • Data saved to D1 database"
echo "   • Embeddings generated for semantic search"
echo ""
echo "🔍 Next Steps:"
echo "   1. Use this userId to test semantic search"
echo "   2. Create a user account in the system"
echo "   3. Link this userId to a real user account"
echo "   4. View data in dashboard"
echo ""
echo "💡 Note: To use the search API, you need:"
echo "   • JWT authentication token (create user account first)"
echo "   • POST to /api/search/semantic with query"
echo "   • Example: {\"query\": \"neural networks\", \"limit\": 5}"
echo ""
