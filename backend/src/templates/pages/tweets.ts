/**
 * Tweets page - displays all saved tweets from X/Twitter
 */

import { baseLayout } from '../layouts/base';
import { nav } from '../components/nav';
import { pageHeader } from '../components/page-header';
import { emptyState } from '../components/empty-state';

export interface TweetsPageProps {
  count: number;
  apiBase: string;
}

export function tweetsPage({ count, apiBase }: TweetsPageProps): string {
  const content = `
    ${nav({ currentPage: '/dashboard/tweets', apiBase })}

    <div class="container">
      ${pageHeader({
        title: 'Saved Tweets',
        subtitle: 'Tweets saved from X/Twitter',
        icon: '🐦',
        count,
        backLink: '/dashboard'
      })}

      <!-- Search and Filter -->
      <div class="toolbar">
        <div class="search-box">
          <input type="text" id="search-input" placeholder="Search tweets..." />
          <span class="search-icon">🔍</span>
        </div>
        <div class="toolbar-actions">
          <select id="sort-select">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      <!-- Tweets List -->
      <div id="tweets-container">
        ${count === 0 ? emptyState({
          title: 'No Tweets Saved',
          message: 'Visit X/Twitter and use the save button on tweets to save them here.',
          icon: '🐦',
          actionText: 'Go to X',
          actionUrl: 'https://x.com'
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

      .tweets-grid {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .tweet-card {
        background: var(--surface);
        border-radius: 12px;
        padding: 1.25rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        border-left: 4px solid #1da1f2;
        transition: all 0.2s;
      }

      .tweet-card:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .tweet-author {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
      }

      .tweet-avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: var(--background);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
      }

      .tweet-author-info {
        flex: 1;
      }

      .tweet-author-name {
        font-weight: 600;
        color: var(--text-primary);
      }

      .tweet-author-handle {
        color: var(--text-secondary);
        font-size: 0.875rem;
      }

      .tweet-text {
        font-size: 0.95rem;
        color: var(--text-primary);
        line-height: 1.6;
        white-space: pre-wrap;
        word-break: break-word;
        margin-bottom: 1rem;
      }

      .tweet-media {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 0.5rem;
        margin-bottom: 1rem;
      }

      .tweet-media img {
        width: 100%;
        border-radius: 8px;
        max-height: 200px;
        object-fit: cover;
      }

      .tweet-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        font-size: 0.8rem;
        color: var(--text-secondary);
        padding-top: 0.75rem;
        border-top: 1px solid var(--border);
      }

      .tweet-meta-item {
        display: flex;
        align-items: center;
        gap: 0.35rem;
      }

      .tweet-link {
        color: #1da1f2;
        text-decoration: none;
        font-weight: 500;
      }

      .tweet-link:hover {
        text-decoration: underline;
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
      let currentSort = 'newest';
      const perPage = 20;

      async function loadTweets() {
        const container = document.getElementById('tweets-container');
        container.innerHTML = '<div class="loading-container"><div class="loading"></div></div>';

        try {
          const offset = (currentPage - 1) * perPage;
          let url = API_BASE + '/api/search/recent?table=posts&type=tweet&limit=' + perPage + '&offset=' + offset;

          if (currentSearch) {
            url += '&q=' + encodeURIComponent(currentSearch);
          }

          const response = await fetch(url);
          const data = await response.json();

          if (data.success && data.results && data.results.length > 0) {
            let tweets = data.results;

            if (currentSort === 'oldest') {
              tweets = tweets.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            }

            const html = tweets.map(item => {
              const date = new Date(item.created_at);
              const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
              const context = item.context_json ? JSON.parse(item.context_json) : {};
              const tweetUrl = context.url || '';
              const author = context.author || {};
              const authorName = author.displayName || author.name || 'Unknown';
              const authorHandle = author.username || author.handle || '';
              const media = context.media || {};
              const images = media.images || [];

              return \`
                <div class="tweet-card">
                  <div class="tweet-author">
                    <div class="tweet-avatar">👤</div>
                    <div class="tweet-author-info">
                      <div class="tweet-author-name">\${escapeHtml(authorName)}</div>
                      \${authorHandle ? \`<div class="tweet-author-handle">@\${escapeHtml(authorHandle)}</div>\` : ''}
                    </div>
                  </div>
                  <div class="tweet-text">\${escapeHtml(item.original_text || '')}</div>
                  \${images.length > 0 ? \`
                    <div class="tweet-media">
                      \${images.slice(0, 4).map(img => \`<img src="\${img}" alt="Tweet media" loading="lazy" />\`).join('')}
                    </div>
                  \` : ''}
                  <div class="tweet-meta">
                    <span class="tweet-meta-item">📅 \${dateStr}</span>
                    \${tweetUrl ? \`<a href="\${tweetUrl}" target="_blank" class="tweet-link tweet-meta-item">🔗 View on X</a>\` : ''}
                  </div>
                </div>
              \`;
            }).join('');

            container.innerHTML = '<div class="tweets-grid">' + html + '</div>';
            updatePagination(data.total || tweets.length);
          } else {
            container.innerHTML = '<div class="no-results"><p>No tweets found</p></div>';
            document.getElementById('pagination').innerHTML = '';
          }
        } catch (error) {
          console.error('Failed to load tweets:', error);
          container.innerHTML = '<div class="no-results"><p>Failed to load tweets</p></div>';
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
        loadTweets();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      // Event listeners
      document.getElementById('search-input').addEventListener('input', debounce(function(e) {
        currentSearch = e.target.value;
        currentPage = 1;
        loadTweets();
      }, 300));

      document.getElementById('sort-select').addEventListener('change', function(e) {
        currentSort = e.target.value;
        loadTweets();
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
        loadTweets();
      }
    </script>
  `;

  return baseLayout({
    title: 'Tweets - Universal Text Processor',
    content,
    styles,
    scripts
  });
}
