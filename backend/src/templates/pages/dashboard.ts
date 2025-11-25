/**
 * Dashboard page template
 * Assembles all components into the main dashboard view
 */

import { baseLayout } from '../layouts/base';
import { header } from '../components/header';
import { statCard } from '../components/stat-card';
import { emptyState } from '../components/empty-state';

export interface DashboardStats {
  posts: {
    total: number;
    tweets: number;
    videos: number;
    memory: number;
  };
  webhooks: {
    total: number;
  };
  users: {
    total: number;
  };
}

export interface DashboardProps {
  stats: DashboardStats;
  apiBase: string;
}

export function dashboardPage({ stats, apiBase }: DashboardProps): string {
  const hasData = stats.posts.total > 0 || stats.webhooks.total > 0;

  const content = `
    ${header({
      title: 'Dashboard',
      subtitle: 'Monitor your saved content and activity'
    })}

    <div class="container">
      <!-- Stats Grid -->
      <div class="grid grid-4 mb-3">
        ${statCard({
          title: 'Total Posts',
          value: stats.posts.total,
          subtitle: `${stats.posts.tweets} tweets, ${stats.posts.videos} videos`,
          icon: '📝',
          trend: stats.posts.total > 0 ? 'up' : 'neutral'
        })}

        ${statCard({
          title: 'Memories Saved',
          value: stats.posts.memory,
          subtitle: 'Saved text snippets',
          icon: '💾'
        })}

        ${statCard({
          title: 'Webhook Events',
          value: stats.webhooks.total,
          subtitle: 'Total events logged',
          icon: '📡'
        })}

        ${statCard({
          title: 'Active Users',
          value: stats.users.total,
          subtitle: 'Registered users',
          icon: '👥'
        })}
      </div>

      ${!hasData ? emptyState({
        title: 'No Data Yet',
        message: 'Start using the browser extension to save tweets, YouTube videos, and memories. They will appear here automatically.',
        icon: '🚀',
        actionText: 'View Setup Guide',
        actionUrl: `${apiBase}/setup`
      }) : `
        <!-- Memories Section -->
        <div class="card">
          <h2 class="card-title">💾 Saved Memories (${stats.posts.memory})</h2>
          <div id="memories-list">
            <div class="loading"></div>
          </div>
        </div>

        <!-- Tweets Section -->
        <div class="card">
          <h2 class="card-title">🐦 Saved Tweets (${stats.posts.tweets})</h2>
          <div id="tweets-list">
            <div class="loading"></div>
          </div>
        </div>

        <!-- Videos Section -->
        <div class="card">
          <h2 class="card-title">📹 YouTube Videos (${stats.posts.videos})</h2>
          <div id="videos-list">
            <div class="loading"></div>
          </div>
        </div>

        <!-- Processed Content Section -->
        <div class="card">
          <h2 class="card-title">✨ AI Generated Content</h2>
          <div id="processed-list">
            <div class="loading"></div>
          </div>
        </div>

        <!-- Webhook Events Section -->
        <div class="card">
          <h2 class="card-title">📡 Recent Webhook Events (${stats.webhooks.total})</h2>
          <div id="webhooks-list">
            <div class="loading"></div>
          </div>
        </div>
      `}
    </div>
  `;

  const scripts = `
    <script>
      const API_BASE = '${apiBase}';

      // Common styles for lists
      const listStyles = \`
        <style>
          .data-list {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            max-height: 400px;
            overflow-y: auto;
          }
          .data-item {
            padding: 0.75rem;
            background: var(--background);
            border-radius: 8px;
            border-left: 3px solid var(--primary);
          }
          .item-text {
            font-size: 0.875rem;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
            white-space: pre-wrap;
            word-break: break-word;
          }
          .item-meta {
            font-size: 0.75rem;
            color: var(--text-secondary);
            display: flex;
            gap: 1rem;
          }
          .item-url {
            font-size: 0.75rem;
            color: var(--primary);
            text-decoration: none;
          }
          .item-url:hover {
            text-decoration: underline;
          }
        </style>
      \`;

      // Load memories
      async function loadMemories() {
        const container = document.getElementById('memories-list');
        try {
          const response = await fetch(API_BASE + '/api/search/recent?table=memory&limit=20');
          const data = await response.json();

          if (data.success && data.results && data.results.length > 0) {
            const html = data.results.map(item => {
              const date = new Date(item.created_at).toLocaleDateString() + ' ' + new Date(item.created_at).toLocaleTimeString();
              const context = item.context_json ? JSON.parse(item.context_json) : {};
              const url = context.url || '';
              const pageTitle = context.pageTitle || '';

              return \`
                <div class="data-item">
                  <div class="item-text">\${item.text}</div>
                  <div class="item-meta">
                    <span>📅 \${date}</span>
                    \${url ? \`<a href="\${url}" target="_blank" class="item-url">🔗 \${pageTitle || 'Source'}</a>\` : ''}
                  </div>
                </div>
              \`;
            }).join('');
            container.innerHTML = listStyles + \`<div class="data-list">\${html}</div>\`;
          } else {
            container.innerHTML = '<p class="text-muted text-small">No memories saved yet</p>';
          }
        } catch (error) {
          console.error('Failed to load memories:', error);
          container.innerHTML = '<p class="text-muted text-small">Failed to load memories</p>';
        }
      }

      // Load tweets
      async function loadTweets() {
        const container = document.getElementById('tweets-list');
        try {
          const response = await fetch(API_BASE + '/api/search/recent?table=posts&type=tweet&limit=20');
          const data = await response.json();

          if (data.success && data.results && data.results.length > 0) {
            const html = data.results.map(item => {
              const date = new Date(item.created_at).toLocaleDateString() + ' ' + new Date(item.created_at).toLocaleTimeString();
              const context = item.context_json ? JSON.parse(item.context_json) : {};
              const tweetUrl = context.url || '';
              const author = context.author?.username || context.author?.handle || context.author || '';

              return \`
                <div class="data-item">
                  <div class="item-text">\${item.original_text}</div>
                  <div class="item-meta">
                    <span>📅 \${date}</span>
                    \${author ? \`<span>👤 @\${author}</span>\` : ''}
                    \${tweetUrl ? \`<a href="\${tweetUrl}" target="_blank" class="item-url">🔗 View on X</a>\` : ''}
                  </div>
                </div>
              \`;
            }).join('');
            container.innerHTML = listStyles + \`<div class="data-list">\${html}</div>\`;
          } else {
            container.innerHTML = '<p class="text-muted text-small">No tweets saved yet</p>';
          }
        } catch (error) {
          console.error('Failed to load tweets:', error);
          container.innerHTML = '<p class="text-muted text-small">Failed to load tweets</p>';
        }
      }

      // Load videos
      async function loadVideos() {
        const container = document.getElementById('videos-list');
        try {
          const response = await fetch(API_BASE + '/api/search/recent?table=posts&type=youtube_video&limit=20');
          const data = await response.json();

          if (data.success && data.results && data.results.length > 0) {
            const html = data.results.map(item => {
              const date = new Date(item.created_at).toLocaleDateString() + ' ' + new Date(item.created_at).toLocaleTimeString();
              const context = item.context_json ? JSON.parse(item.context_json) : {};
              const videoUrl = context.url || '';
              const channel = context.channel?.name || context.channel || '';

              return \`
                <div class="data-item">
                  <div class="item-text"><strong>\${item.original_text}</strong></div>
                  <div class="item-meta">
                    <span>📅 \${date}</span>
                    \${channel ? \`<span>📺 \${channel}</span>\` : ''}
                    \${videoUrl ? \`<a href="\${videoUrl}" target="_blank" class="item-url">🔗 Watch on YouTube</a>\` : ''}
                  </div>
                </div>
              \`;
            }).join('');
            container.innerHTML = listStyles + \`<div class="data-list">\${html}</div>\`;
          } else {
            container.innerHTML = '<p class="text-muted text-small">No videos saved yet</p>';
          }
        } catch (error) {
          console.error('Failed to load videos:', error);
          container.innerHTML = '<p class="text-muted text-small">Failed to load videos</p>';
        }
      }

      // Load processed/generated content
      async function loadProcessedContent() {
        const container = document.getElementById('processed-list');
        try {
          const response = await fetch(API_BASE + '/api/search/recent?table=posts&limit=50');
          const data = await response.json();

          if (data.success && data.results) {
            // Filter only items with generated_output
            const processed = data.results.filter(item => item.generated_output);

            if (processed.length > 0) {
              const html = processed.map(item => {
                const date = new Date(item.created_at).toLocaleDateString() + ' ' + new Date(item.created_at).toLocaleTimeString();
                const mode = item.mode || item.type || 'processed';
                const modeLabel = mode.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                return \`
                  <div class="data-item">
                    <div style="font-size: 0.7rem; color: var(--primary); font-weight: 600; margin-bottom: 0.5rem; text-transform: uppercase;">
                      \${modeLabel}
                    </div>
                    <div class="item-text">
                      <strong>Original:</strong><br/>
                      \${item.original_text || 'N/A'}
                    </div>
                    <div class="item-text" style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--border);">
                      <strong>Generated:</strong><br/>
                      \${item.generated_output}
                    </div>
                    <div class="item-meta">
                      <span>📅 \${date}</span>
                      \${item.language ? \`<span>🌍 \${item.language}</span>\` : ''}
                      \${item.account ? \`<span>👤 \${item.account}</span>\` : ''}
                    </div>
                  </div>
                \`;
              }).join('');
              container.innerHTML = listStyles + \`<div class="data-list">\${html}</div>\`;
            } else {
              container.innerHTML = '<p class="text-muted text-small">No AI-generated content yet. Use the extension to process text, rewrite for Twitter, describe images, etc.</p>';
            }
          } else {
            container.innerHTML = '<p class="text-muted text-small">No processed content yet</p>';
          }
        } catch (error) {
          console.error('Failed to load processed content:', error);
          container.innerHTML = '<p class="text-muted text-small">Failed to load processed content</p>';
        }
      }

      // Load webhook events - need to create endpoint
      async function loadWebhooks() {
        const container = document.getElementById('webhooks-list');
        container.innerHTML = '<p class="text-muted text-small">Webhook events: ${stats.webhooks.total} total</p>';
      }

      // Load all data if we have content
      if (${hasData}) {
        loadMemories();
        loadTweets();
        loadVideos();
        loadProcessedContent();
        loadWebhooks();
      }
    </script>
  `;

  return baseLayout({
    title: 'Dashboard - Universal Text Processor',
    content,
    scripts
  });
}
