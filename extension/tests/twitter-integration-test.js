#!/usr/bin/env node

/**
 * Test suite for X/Twitter integration
 * Tests the save tweet button functionality
 */

const fs = require('fs');
const path = require('path');

const tests = {
  passed: 0,
  failed: 0,
  errors: []
};

function assert(condition, message) {
  if (condition) {
    console.log(`✅ ${message}`);
    tests.passed++;
  } else {
    console.error(`❌ ${message}`);
    tests.failed++;
    tests.errors.push(message);
  }
}

console.log('\n🧪 Running X/Twitter Integration Tests\n');
console.log('============================================================');

// Read content.js
const contentJs = fs.readFileSync(
  path.join(__dirname, '../content.js'),
  'utf8'
);

// database.js removed - now using backend API only
const databaseJs = ''; // Placeholder for removed file

// Read background.js
const backgroundJs = fs.readFileSync(
  path.join(__dirname, '../background.js'),
  'utf8'
);

// Read settings.json
const settings = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../settings.json'),
    'utf8'
  )
);

// Test 1: Check if isTwitterPage function exists
assert(
  contentJs.includes('function isTwitterPage()'),
  'content.js has isTwitterPage function'
);

// Test 2: Check if it detects x.com
assert(
  contentJs.includes("window.location.hostname === 'x.com'"),
  'isTwitterPage detects x.com'
);

// Test 3: Check if it detects twitter.com
assert(
  contentJs.includes("window.location.hostname === 'twitter.com'"),
  'isTwitterPage detects twitter.com'
);

// Test 4: Check if extractTweetData function exists
assert(
  contentJs.includes('function extractTweetData(tweetElement)'),
  'content.js has extractTweetData function'
);

// Test 5: Check if it extracts tweet text
assert(
  contentJs.includes("querySelector('[data-testid=\"tweetText\"]')"),
  'extractTweetData extracts tweet text'
);

// Test 6: Check if it extracts author info
assert(
  contentJs.includes("querySelector('[data-testid=\"User-Name\"]')"),
  'extractTweetData extracts author info'
);

// Test 7: Check if it extracts tweet URL
assert(
  contentJs.includes('tweetUrl'),
  'extractTweetData extracts tweet URL'
);

// Test 8: Check if it extracts media
assert(
  contentJs.includes('images') && contentJs.includes('videos'),
  'extractTweetData extracts media (images and videos)'
);

// Test 9: Check if injectSaveTweetButton function exists
assert(
  contentJs.includes('function injectSaveTweetButton(tweetElement)'),
  'content.js has injectSaveTweetButton function'
);

// Test 10: Check if button has correct styling
assert(
  contentJs.includes('utp-save-tweet-btn'),
  'Save button has correct CSS class'
);

// Test 11: Check if button sends saveTweet message
assert(
  contentJs.includes("action: 'saveTweet'"),
  'Button sends saveTweet action to background'
);

// Test 12: Check if initTwitterObserver exists
assert(
  contentJs.includes('function initTwitterObserver()'),
  'content.js has initTwitterObserver function'
);

// Test 13: Check if observer watches for new tweets
assert(
  contentJs.includes('MutationObserver') && contentJs.includes('article[data-testid="tweet"]'),
  'Observer watches for new tweets'
);

// Test 14: database.js removed - tweets saved via webhook
assert(
  backgroundJs.includes('sendWebhookNotification'),
  'Tweets saved via webhook (database.js removed)'
);

// Test 15: Check if saveTweet uses webhook
assert(
  backgroundJs.includes("'onSaveTweet'"),
  'saveTweet uses onSaveTweet webhook event'
);

// Test 16: Check if background has saveTweet handler
assert(
  backgroundJs.includes('request.action === "saveTweet"'),
  'background.js has saveTweet handler'
);

// Test 17: Check if webhook is sent for onSaveTweet
assert(
  backgroundJs.includes("sendWebhookNotification('onSaveTweet'"),
  'background.js sends webhook for onSaveTweet'
);

// Test 18: Check if settings has onSaveTweet event
assert(
  settings.webhook && settings.webhook.events && settings.webhook.events.onSaveTweet !== undefined,
  'settings.json has onSaveTweet webhook event'
);

// Test 19: Check if button shows loading state
assert(
  contentJs.includes('saveButton.innerHTML') && contentJs.includes('loading'),
  'Button shows loading state'
);

// Test 20: Check if button shows success state
assert(
  contentJs.includes('success') && contentJs.includes('rgb(0, 186, 124)'),
  'Button shows success state (green checkmark)'
);

// Test 21: Check if button shows error state
assert(
  contentJs.includes('error') && contentJs.includes('rgb(244, 33, 46)'),
  'Button shows error state (red X)'
);

// Test 22: Check if button prevents event propagation
assert(
  contentJs.includes('e.stopPropagation()') && contentJs.includes('e.preventDefault()'),
  'Button prevents event propagation'
);

// Test 23: Check if observer processes on scroll
assert(
  contentJs.includes("addEventListener('scroll'"),
  'Observer processes tweets on scroll'
);

// Test 24: Check if tweet data includes all required fields
const requiredFields = ['tweetId', 'text', 'author', 'url', 'timestamp', 'media', 'metadata'];
const hasAllFields = requiredFields.every(field =>
  contentJs.includes(`${field}:`) || contentJs.includes(`${field} =`)
);
assert(
  hasAllFields,
  'extractTweetData includes all required fields'
);

// Test 25: Check if background sends tweetId in webhook
assert(
  backgroundJs.includes('tweetId'),
  'background.js sends tweetId in webhook payload'
);

console.log('============================================================\n');
console.log(`📊 Results: ${tests.passed} passed, ${tests.failed} failed\n`);

if (tests.failed > 0) {
  console.error('Failed tests:');
  tests.errors.forEach((error, index) => {
    console.error(`  ${index + 1}. ${error}`);
  });
  process.exit(1);
}

process.exit(0);
