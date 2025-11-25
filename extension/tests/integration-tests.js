// Integration Tests for Extension
// Run with: node tests/integration-tests.js

const fs = require('fs');
const path = require('path');

class IntegrationTests {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('\n🧪 Running Integration Tests\n');
    console.log('='.repeat(60));

    for (const { name, fn } of this.tests) {
      try {
        await fn();
        this.passed++;
        console.log(`✅ ${name}`);
      } catch (error) {
        this.failed++;
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error.message}`);
        if (error.stack) {
          console.log(`   ${error.stack.split('\n')[1]?.trim()}`);
        }
      }
    }

    console.log('='.repeat(60));
    console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed\n`);

    if (this.failed > 0) {
      process.exit(1);
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  assertContains(text, substring, message) {
    if (!text.includes(substring)) {
      throw new Error(
        message || `Expected text to contain "${substring}"`
      );
    }
  }

  assertNotContains(text, substring, message) {
    if (text.includes(substring)) {
      throw new Error(
        message || `Expected text not to contain "${substring}"`
      );
    }
  }
}

const tests = new IntegrationTests();

// Test 1: Check background.js uses webhook instead of local database
tests.test('background.js uses webhook for saves', () => {
  const code = fs.readFileSync(
    path.join(__dirname, '../background.js'),
    'utf8'
  );
  tests.assertContains(code, 'sendWebhookNotification', 'background.js should use sendWebhookNotification');
  tests.assertNotContains(code, 'postDatabase', 'background.js should not use postDatabase (removed)');
});

// Test 2: Check background.js uses backend proxy for AI
tests.test('background.js uses backend proxy for OpenRouter', () => {
  const code = fs.readFileSync(
    path.join(__dirname, '../background.js'),
    'utf8'
  );
  tests.assertContains(code, '/api/proxy/openrouter', 'background.js should use backend proxy');
});

// Test 3: Check background.js does not use DOM APIs
tests.test('background.js does not use URL.createObjectURL', () => {
  const code = fs.readFileSync(
    path.join(__dirname, '../background.js'),
    'utf8'
  );
  tests.assertNotContains(
    code,
    'URL.createObjectURL',
    'background.js should not use URL.createObjectURL'
  );
});

tests.test('background.js handles R2 URL response', () => {
  const code = fs.readFileSync(
    path.join(__dirname, '../background.js'),
    'utf8'
  );
  tests.assertContains(code, 'responseData.data.url', 'background.js should extract URL from JSON response');
  tests.assertContains(code, 'await imageResponse.json()', 'background.js should parse JSON response');
});

// Test 4: Check settings.json has correct endpoint
tests.test('settings.json has html-to-image-worker endpoint', () => {
  const settings = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, '../settings.json'),
      'utf8'
    )
  );
  tests.assert(
    settings.visualContent?.htmlToImageWorker?.endpoint,
    'settings.json should have htmlToImageWorker.endpoint'
  );
  tests.assertNotContains(
    settings.visualContent.htmlToImageWorker.endpoint,
    'https://html-to-image.workers.dev',
    'Should not use default non-existent endpoint'
  );
  tests.assert(
    settings.visualContent.htmlToImageWorker.endpoint.includes('/api/proxy/html-to-image') ||
    settings.visualContent.htmlToImageWorker.endpoint.includes('/render'),
    'Endpoint should be proxy or direct worker endpoint'
  );
});

tests.test('settings.json has webhook configuration', () => {
  const settings = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, '../settings.json'),
      'utf8'
    )
  );
  tests.assert(
    settings.webhook?.url,
    'settings.json should have webhook.url'
  );
  tests.assertContains(
    settings.webhook.url,
    '/webhook',
    'Webhook URL should contain /webhook path'
  );
});

tests.test('settings.json has visual content enabled', () => {
  const settings = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, '../settings.json'),
      'utf8'
    )
  );
  tests.assert(
    settings.visualContent?.enabled === true,
    'Visual content should be enabled'
  );
});

tests.test('settings.json has all image types configured', () => {
  const settings = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, '../settings.json'),
      'utf8'
    )
  );
  const required = ['quote_card', 'screenshot_card', 'infographic', 'story_card', 'thumbnail'];
  required.forEach(type => {
    tests.assert(
      settings.visualContent?.imageTypes?.[type],
      `settings.json should have imageTypes.${type}`
    );
  });
});

// Test 5: Check manifest.json
tests.test('manifest.json does not have type: module in background', () => {
  const manifest = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, '../manifest.json'),
      'utf8'
    )
  );
  tests.assert(
    manifest.background?.type !== 'module',
    'manifest.json background should not have type: module'
  );
});

tests.test('manifest.json has service worker', () => {
  const manifest = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, '../manifest.json'),
      'utf8'
    )
  );
  tests.assert(
    manifest.background?.service_worker === 'background.js',
    'manifest.json should have background.service_worker'
  );
});

tests.test('manifest.json has required permissions', () => {
  const manifest = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, '../manifest.json'),
      'utf8'
    )
  );
  const required = ['storage'];
  required.forEach(perm => {
    tests.assert(
      manifest.permissions?.includes(perm),
      `manifest.json should have ${perm} permission`
    );
  });
});

// Test 6: Check background.js imports
tests.test('background.js imports template-generators.js', () => {
  const code = fs.readFileSync(
    path.join(__dirname, '../background.js'),
    'utf8'
  );
  tests.assertContains(
    code,
    "template-generators.js",
    'background.js should import template-generators.js'
  );
});

tests.test('background.js does not import database.js (removed)', () => {
  const code = fs.readFileSync(
    path.join(__dirname, '../background.js'),
    'utf8'
  );
  tests.assertContains(
    code,
    "importScripts",
    'background.js should use importScripts'
  );
  tests.assertNotContains(
    code,
    "database.js",
    'background.js should NOT import database.js (removed)'
  );
});

// Test 7: Check message handlers
tests.test('background.js has createVisualContent handler', () => {
  const code = fs.readFileSync(
    path.join(__dirname, '../background.js'),
    'utf8'
  );
  tests.assertContains(
    code,
    'action === "createVisualContent"',
    'background.js should handle createVisualContent action'
  );
});

tests.test('background.js has ping handler', () => {
  const code = fs.readFileSync(
    path.join(__dirname, '../background.js'),
    'utf8'
  );
  tests.assertContains(
    code,
    'action === "ping"',
    'background.js should handle ping action for service worker wake-up'
  );
});

// Test 8: Check content.js
tests.test('content.js has wakeUpServiceWorker function', () => {
  const code = fs.readFileSync(
    path.join(__dirname, '../content.js'),
    'utf8'
  );
  tests.assertContains(
    code,
    'wakeUpServiceWorker',
    'content.js should have wakeUpServiceWorker function'
  );
});

tests.test('content.js has create-image button', () => {
  const code = fs.readFileSync(
    path.join(__dirname, '../content.js'),
    'utf8'
  );
  tests.assertContains(
    code,
    'data-action="create-image"',
    'content.js should have create-image button'
  );
});

tests.test('content.js handles create-image action', () => {
  const code = fs.readFileSync(
    path.join(__dirname, '../content.js'),
    'utf8'
  );
  tests.assertContains(
    code,
    "case 'create-image':",
    'content.js should handle create-image action'
  );
});

// Test 9: Check for common anti-patterns
tests.test('background.js does not use eval', () => {
  const code = fs.readFileSync(
    path.join(__dirname, '../background.js'),
    'utf8'
  );
  tests.assertNotContains(
    code,
    'eval(',
    'background.js should not use eval'
  );
});

tests.test('template-generators.js does not use eval', () => {
  const code = fs.readFileSync(
    path.join(__dirname, '../template-generators.js'),
    'utf8'
  );
  tests.assertNotContains(
    code,
    'eval(',
    'template-generators.js should not use eval'
  );
});

// Test 10: File existence checks
tests.test('All required extension files exist', () => {
  const required = [
    'manifest.json',
    'background.js',
    'content.js',
    // 'database.js' - REMOVED: now using backend API only
    'api-client.js',
    'settings-manager.js',
    'template-generators.js',
    'settings.json',
    'styles.css'
  ];

  required.forEach(file => {
    const exists = fs.existsSync(path.join(__dirname, '..', file));
    tests.assert(exists, `Required file ${file} should exist`);
  });
});

// Test 11: database.js should NOT exist (intentionally removed)
tests.test('database.js should NOT exist (removed)', () => {
  const exists = fs.existsSync(path.join(__dirname, '../database.js'));
  tests.assert(!exists, 'database.js should NOT exist - all data via backend API');
});

// Run all tests
tests.run().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
