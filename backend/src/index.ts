import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env } from './types';

// Import routes
import authRoutes from './routes/auth';
import processRoutes from './routes/process';
import postsRoutes from './routes/posts';
import memoryRoutes from './routes/memory';
import settingsRoutes from './routes/settings';
import visualContentRoutes from './routes/visual-content';
import airtableRoutes from './routes/airtable';
import webhookRoutes from './routes/webhook';
import proxyRoutes from './routes/proxy';

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: (origin) => {
    // Allow chrome extensions and local file testing
    if (!origin) return '*';
    if (origin.startsWith('chrome-extension://')) return origin;
    if (origin.startsWith('file://')) return origin;
    if (origin === 'null') return 'null'; // For file:// protocol
    return origin; // Allow all for now, tighten in production
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Health check
app.get('/', (c) => {
  return c.json({
    success: true,
    message: 'Universal Text Processor API',
    version: c.env.API_VERSION || 'v1',
    environment: c.env.ENVIRONMENT || 'development',
    timestamp: Date.now(),
  });
});

app.get('/health', (c) => {
  return c.json({
    success: true,
    status: 'healthy',
    timestamp: Date.now(),
  });
});

// API routes
app.route('/api/auth', authRoutes);
app.route('/api/process', processRoutes);
app.route('/api/posts', postsRoutes);
app.route('/api/memory', memoryRoutes);
app.route('/api/settings', settingsRoutes);
app.route('/api/visual-content', visualContentRoutes);
app.route('/api/airtable', airtableRoutes);
app.route('/api/proxy', proxyRoutes);

// Webhook routes (v1 for backward compatibility)
app.route('/api/v1/webhook', webhookRoutes);
app.route('/api/webhook', webhookRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Not Found',
    message: `Route ${c.req.path} not found`,
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({
    success: false,
    error: err.message || 'Internal Server Error',
  }, 500);
});

export default app;
