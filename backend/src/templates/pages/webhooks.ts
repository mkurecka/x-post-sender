/**
 * Webhooks page - displays webhook event history
 */

import { baseLayout } from '../layouts/base';
import { nav } from '../components/nav';
import { pageHeader } from '../components/page-header';
import { emptyState } from '../components/empty-state';

export interface WebhooksPageProps {
  count: number;
  apiBase: string;
}

export function webhooksPage({ count, apiBase }: WebhooksPageProps): string {
  const content = `
    ${nav({ currentPage: '/dashboard/webhooks', apiBase })}

    <div class="container">
      ${pageHeader({
        title: 'Webhook Events',
        subtitle: 'History of all webhook events received',
        icon: '📡',
        count,
        backLink: '/dashboard'
      })}

      <!-- Filters -->
      <div class="toolbar">
        <div class="search-box">
          <input type="text" id="search-input" placeholder="Search events..." />
          <span class="search-icon">🔍</span>
        </div>
        <div class="toolbar-actions">
          <select id="event-filter">
            <option value="">All Events</option>
            <option value="onSaveTweet">Save Tweet</option>
            <option value="onSaveYouTubeVideo">Save Video</option>
            <option value="saveToMemory">Save Memory</option>
            <option value="onSaveToMemory">Save Memory (alt)</option>
            <option value="processText">Process Text</option>
            <option value="onProcessText">Process Text (alt)</option>
            <option value="onCreateVisualContent">Visual Content</option>
          </select>
          <select id="sort-select">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      <!-- Webhooks List -->
      <div id="webhooks-container">
        ${count === 0 ? emptyState({
          title: 'No Webhook Events',
          message: 'Webhook events will appear here when the extension sends data.',
          icon: '📡'
        }) : '<div class="loading-container"><div class="loading"></div></div>'}
      </div>

      <!-- Pagination -->
      <div id="pagination" class="pagination"></div>
    </div>
  `;

  const styles = `
    <style>
      .toolbar {
        display: flex;
        gap: 1rem;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
      }

      .search-box {
        position: relative;
        flex: 1;
        min-width: 200px;
      }

      .search-box input {
        width: 100%;
        padding: 0.75rem 1rem 0.75rem 2.5rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        font-size: 0.95rem;
        background: var(--surface);
      }

      .search-box input:focus {
        outline: none;
        border-color: var(--primary);
        box-shadow: 0 0 0 3px var(--primary-light);
      }

      .search-icon {
        position: absolute;
        left: 0.75rem;
        top: 50%;
        transform: translateY(-50%);
        font-size: 1rem;
      }

      .toolbar-actions {
        display: flex;
        gap: 0.75rem;
      }

      .toolbar-actions select {
        padding: 0.75rem 1rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--surface);
        font-size: 0.875rem;
        cursor: pointer;
      }

      .loading-container {
        display: flex;
        justify-content: center;
        padding: 3rem;
      }

      .webhooks-grid {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .webhook-card {
        background: var(--surface);
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        border-left: 4px solid var(--event-color, #6b7280);
      }

      .webhook-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1rem;
        background: var(--background);
        border-bottom: 1px solid var(--border);
      }

      .webhook-event {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .event-badge {
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.25rem 0.75rem;
        border-radius: 99px;
        text-transform: uppercase;
      }

      .event-tweet { background: #e8f5fd; color: #1da1f2; }
      .event-video { background: #fee2e2; color: #dc2626; }
      .event-memory { background: #f3e8ff; color: #8b5cf6; }
      .event-process { background: #dcfce7; color: #16a34a; }
      .event-visual { background: #fef3c7; color: #d97706; }
      .event-default { background: #f3f4f6; color: #6b7280; }

      .webhook-date {
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      .webhook-body {
        padding: 1rem;
      }

      .webhook-user {
        font-size: 0.8rem;
        color: var(--text-secondary);
        margin-bottom: 0.75rem;
      }

      .webhook-data {
        background: var(--background);
        border-radius: 8px;
        padding: 0.75rem;
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 0.8rem;
        max-height: 200px;
        overflow: auto;
        white-space: pre-wrap;
        word-break: break-all;
      }

      .webhook-data-preview {
        color: var(--text-primary);
        line-height: 1.5;
      }

      .toggle-data {
        background: none;
        border: 1px solid var(--border);
        padding: 0.35rem 0.75rem;
        border-radius: 6px;
        font-size: 0.75rem;
        color: var(--text-secondary);
        cursor: pointer;
        margin-top: 0.5rem;
      }

      .toggle-data:hover {
        background: var(--background);
        color: var(--text-primary);
      }

      .pagination {
        display: flex;
        justify-content: center;
        gap: 0.5rem;
        margin-top: 2rem;
      }

      .pagination button {
        padding: 0.5rem 1rem;
        border: 1px solid var(--border);
        border-radius: 6px;
        background: var(--surface);
        color: var(--text-primary);
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.2s;
      }

      .pagination button:hover:not(:disabled) {
        background: var(--primary-light);
        border-color: var(--primary);
      }

      .pagination button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .pagination button.active {
        background: var(--primary);
        color: white;
        border-color: var(--primary);
      }

      .no-results {
        text-align: center;
        padding: 3rem;
        color: var(--text-secondary);
      }
    </style>
  `;

  const scripts = `
    <script>
      const API_BASE = '${apiBase}';
      let currentPage = 1;
      let currentSearch = '';
      let currentEvent = '';
      let currentSort = 'newest';
      const perPage = 20;

      async function loadWebhooks() {
        const container = document.getElementById('webhooks-container');
        container.innerHTML = '<div class="loading-container"><div class="loading"></div></div>';

        try {
          const offset = (currentPage - 1) * perPage;
          let url = API_BASE + '/api/search/recent?table=webhook_events&limit=' + perPage + '&offset=' + offset;

          if (currentSearch) {
            url += '&q=' + encodeURIComponent(currentSearch);
          }

          if (currentEvent) {
            url += '&event=' + encodeURIComponent(currentEvent);
          }

          const response = await fetch(url);
          const data = await response.json();

          if (data.success && data.results && data.results.length > 0) {
            let webhooks = data.results;

            if (currentSort === 'oldest') {
              webhooks = webhooks.sort((a, b) => a.created_at - b.created_at);
            }

            const html = webhooks.map((item, index) => {
              const date = new Date(item.created_at);
              const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
              const event = item.event || 'unknown';
              const eventClass = getEventClass(event);
              const eventLabel = formatEventName(event);
              const eventColor = getEventColor(event);
              const dataJson = item.data_json || '{}';
              let parsedData;
              try {
                parsedData = JSON.parse(dataJson);
              } catch (e) {
                parsedData = dataJson;
              }
              const preview = getDataPreview(parsedData);
              const uniqueId = 'webhook-data-' + index;

              return \`
                <div class="webhook-card" style="--event-color: \${eventColor}">
                  <div class="webhook-header">
                    <div class="webhook-event">
                      <span class="event-badge \${eventClass}">\${eventLabel}</span>
                    </div>
                    <span class="webhook-date">\${dateStr}</span>
                  </div>
                  <div class="webhook-body">
                    \${item.user_id ? \`<div class="webhook-user">👤 User: \${item.user_id}</div>\` : ''}
                    <div class="webhook-data-preview">\${preview}</div>
                    <button class="toggle-data" onclick="toggleData('\${uniqueId}')">Show raw data</button>
                    <div id="\${uniqueId}" class="webhook-data" style="display: none;">\${JSON.stringify(parsedData, null, 2)}</div>
                  </div>
                </div>
              \`;
            }).join('');

            container.innerHTML = '<div class="webhooks-grid">' + html + '</div>';
            updatePagination(data.total || webhooks.length);
          } else {
            container.innerHTML = '<div class="no-results"><p>No webhook events found</p></div>';
            document.getElementById('pagination').innerHTML = '';
          }
        } catch (error) {
          console.error('Failed to load webhooks:', error);
          container.innerHTML = '<div class="no-results"><p>Failed to load webhook events</p></div>';
        }
      }

      function getEventClass(event) {
        if (event.includes('Tweet')) return 'event-tweet';
        if (event.includes('Video') || event.includes('YouTube')) return 'event-video';
        if (event.includes('Memory')) return 'event-memory';
        if (event.includes('Process') || event.includes('Text')) return 'event-process';
        if (event.includes('Visual')) return 'event-visual';
        return 'event-default';
      }

      function getEventColor(event) {
        if (event.includes('Tweet')) return '#1da1f2';
        if (event.includes('Video') || event.includes('YouTube')) return '#dc2626';
        if (event.includes('Memory')) return '#8b5cf6';
        if (event.includes('Process') || event.includes('Text')) return '#16a34a';
        if (event.includes('Visual')) return '#d97706';
        return '#6b7280';
      }

      function formatEventName(event) {
        return event
          .replace('on', '')
          .replace(/([A-Z])/g, ' $1')
          .trim();
      }

      function getDataPreview(data) {
        if (!data) return 'No data';

        // Try to extract meaningful preview
        const innerData = data.data || data;

        if (innerData.text) {
          return '📝 ' + truncate(innerData.text, 150);
        }
        if (innerData.tweetId) {
          return '🐦 Tweet ID: ' + innerData.tweetId + (innerData.text ? ' - ' + truncate(innerData.text, 100) : '');
        }
        if (innerData.videoId) {
          return '📹 Video: ' + (innerData.title || innerData.videoId);
        }
        if (innerData.originalText) {
          return '✨ ' + truncate(innerData.originalText, 150);
        }

        const keys = Object.keys(innerData);
        if (keys.length > 0) {
          return 'Fields: ' + keys.slice(0, 5).join(', ') + (keys.length > 5 ? '...' : '');
        }

        return 'Empty payload';
      }

      function truncate(str, len) {
        if (!str) return '';
        return str.length > len ? str.substring(0, len) + '...' : str;
      }

      function toggleData(id) {
        const el = document.getElementById(id);
        const btn = el.previousElementSibling;
        if (el.style.display === 'none') {
          el.style.display = 'block';
          btn.textContent = 'Hide raw data';
        } else {
          el.style.display = 'none';
          btn.textContent = 'Show raw data';
        }
      }

      function updatePagination(total) {
        const totalPages = Math.ceil(total / perPage);
        const pagination = document.getElementById('pagination');

        if (totalPages <= 1) {
          pagination.innerHTML = '';
          return;
        }

        let html = '';
        html += '<button ' + (currentPage === 1 ? 'disabled' : '') + ' onclick="goToPage(' + (currentPage - 1) + ')">← Prev</button>';

        for (let i = 1; i <= totalPages; i++) {
          if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += '<button class="' + (i === currentPage ? 'active' : '') + '" onclick="goToPage(' + i + ')">' + i + '</button>';
          } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += '<span style="padding: 0.5rem;">...</span>';
          }
        }

        html += '<button ' + (currentPage === totalPages ? 'disabled' : '') + ' onclick="goToPage(' + (currentPage + 1) + ')">Next →</button>';
        pagination.innerHTML = html;
      }

      function goToPage(page) {
        currentPage = page;
        loadWebhooks();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      // Event listeners
      document.getElementById('search-input').addEventListener('input', debounce(function(e) {
        currentSearch = e.target.value;
        currentPage = 1;
        loadWebhooks();
      }, 300));

      document.getElementById('event-filter').addEventListener('change', function(e) {
        currentEvent = e.target.value;
        currentPage = 1;
        loadWebhooks();
      });

      document.getElementById('sort-select').addEventListener('change', function(e) {
        currentSort = e.target.value;
        loadWebhooks();
      });

      function debounce(func, wait) {
        let timeout;
        return function(...args) {
          clearTimeout(timeout);
          timeout = setTimeout(() => func.apply(this, args), wait);
        };
      }

      // Initial load
      if (${count} > 0) {
        loadWebhooks();
      }
    </script>
  `;

  return baseLayout({
    title: 'Webhooks - Universal Text Processor',
    content,
    styles,
    scripts
  });
}
