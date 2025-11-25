import { Hono } from 'hono';
import type { Env } from '../types';
import * as fs from 'fs';
import * as path from 'path';

const router = new Hono<{ Bindings: Env }>();

// Serve dashboard HTML
router.get('/dashboard', async (c) => {
  // Read the HTML file
  const htmlPath = path.join(__dirname, '../pages/settings-dashboard.html');

  try {
    const html = fs.readFileSync(htmlPath, 'utf-8');
    return c.html(html);
  } catch (error) {
    console.error('Error loading dashboard HTML:', error);

    // Return inline dashboard if file read fails
    return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Settings Dashboard</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 40px;
      max-width: 1200px;
      margin: 0 auto;
      background: #f5f6f7;
    }
    h1 { color: #065f4a; margin-bottom: 8px; }
    .subtitle { color: #6b7280; margin-bottom: 32px; }
    .card {
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin: 20px 0;
    }
    .endpoint {
      background: #f5f6f7;
      padding: 12px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 14px;
      margin: 8px 0;
    }
    .error {
      background: #fee;
      color: #c00;
      padding: 16px;
      border-radius: 8px;
      margin: 16px 0;
    }
  </style>
</head>
<body>
  <h1>Settings Dashboard</h1>
  <p class="subtitle">Real-time database statistics and configuration</p>

  <div class="error">
    <strong>⚠️ Dashboard HTML not loaded</strong><br>
    The dashboard requires authentication and a database with data.
  </div>

  <div class="card">
    <h2>Setup Instructions</h2>
    <ol>
      <li>Create a user account via <code>/api/auth/register</code></li>
      <li>Login to get JWT token via <code>/api/auth/login</code></li>
      <li>Use the browser extension to create some data (tweets, videos, memories)</li>
      <li>Access dashboard with token in localStorage</li>
    </ol>
  </div>

  <div class="card">
    <h2>API Endpoints</h2>
    <p><strong>Statistics:</strong></p>
    <div class="endpoint">GET /api/settings/stats (requires auth)</div>

    <p><strong>Settings History:</strong></p>
    <div class="endpoint">GET /api/settings/history (requires auth)</div>

    <p><strong>User Profiles:</strong></p>
    <div class="endpoint">GET /api/airtable/profiles (requires auth)</div>

    <p><strong>Settings:</strong></p>
    <div class="endpoint">GET /api/settings (requires auth)</div>
  </div>

  <div class="card">
    <h2>Testing with cURL</h2>
    <pre style="background: #f5f6f7; padding: 12px; border-radius: 8px; overflow-x: auto;">
# Register
curl -X POST https://text-processor-api.kureckamichal.workers.dev/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"email":"test@example.com","password":"test123"}'

# Login
curl -X POST https://text-processor-api.kureckamichal.workers.dev/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"test@example.com","password":"test123"}'

# Get Stats (use token from login response)
curl https://text-processor-api.kureckamichal.workers.dev/api/settings/stats \\
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
    </pre>
  </div>

  <script>
    // Try to load real dashboard if we have auth token
    const authToken = localStorage.getItem('auth_token');
    if (authToken) {
      console.log('Auth token found, dashboard should work');
      console.log('Fetching stats...');

      fetch(window.location.origin + '/api/settings/stats', {
        headers: { 'Authorization': 'Bearer ' + authToken }
      })
      .then(r => r.json())
      .then(data => {
        console.log('Stats data:', data);
        if (data.success) {
          document.body.innerHTML = '<div style="padding: 40px; text-align: center;"><h1 style="color: #065f4a;">✓ Dashboard Working!</h1><p>Stats loaded successfully. Full dashboard coming soon...</p><pre style="text-align: left; background: #f5f6f7; padding: 20px; border-radius: 8px;">' + JSON.stringify(data.stats, null, 2) + '</pre></div>';
        }
      })
      .catch(err => {
        console.error('Error fetching stats:', err);
      });
    } else {
      console.log('No auth token found. Please login first.');
    }
  </script>
</body>
</html>
    `);
  }
});

export default router;
