/**
 * Videos page - displays all saved YouTube videos
 */

import { baseLayout } from '../layouts/base';
import { nav } from '../components/nav';
import { pageHeader } from '../components/page-header';
import { emptyState } from '../components/empty-state';

export interface VideosPageProps {
  count: number;
  apiBase: string;
}

export function videosPage({ count, apiBase }: VideosPageProps): string {
  const content = `
    ${nav({ currentPage: '/dashboard/videos', apiBase })}

    <div class="container">
      ${pageHeader({
        title: 'Saved Videos',
        subtitle: 'YouTube videos and video content',
        icon: '📹',
        count,
        backLink: '/dashboard'
      })}

      <!-- Search and Filter -->
      <div class="toolbar">
        <div class="search-box">
          <input type="text" id="search-input" placeholder="Search videos..." />
          <span class="search-icon">🔍</span>
        </div>
        <div class="toolbar-actions">
          <select id="sort-select">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      <!-- Videos Grid -->
      <div id="videos-container">
        ${count === 0 ? emptyState({
          title: 'No Videos Saved',
          message: 'Visit YouTube and use the extension to save videos here.',
          icon: '📹',
          actionText: 'Go to YouTube',
          actionUrl: 'https://youtube.com'
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

      .videos-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 1.5rem;
      }

      .video-card {
        background: var(--surface);
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: all 0.2s;
      }

      .video-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      }

      .video-thumbnail {
        position: relative;
        width: 100%;
        aspect-ratio: 16/9;
        background: var(--background);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }

      .video-thumbnail img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .video-thumbnail-placeholder {
        font-size: 4rem;
      }

      .video-play-overlay {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 60px;
        height: 60px;
        background: rgba(0, 0, 0, 0.7);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.2s;
      }

      .video-card:hover .video-play-overlay {
        opacity: 1;
      }

      .video-play-overlay::after {
        content: '';
        border-style: solid;
        border-width: 12px 0 12px 20px;
        border-color: transparent transparent transparent white;
        margin-left: 4px;
      }

      .video-content {
        padding: 1rem;
      }

      .video-title {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary);
        line-height: 1.4;
        margin-bottom: 0.5rem;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .video-channel {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--text-secondary);
        font-size: 0.875rem;
        margin-bottom: 0.75rem;
      }

      .video-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        font-size: 0.75rem;
        color: var(--text-secondary);
        padding-top: 0.75rem;
        border-top: 1px solid var(--border);
      }

      .video-meta-item {
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }

      .video-link {
        color: #ff0000;
        text-decoration: none;
        font-weight: 500;
      }

      .video-link:hover {
        text-decoration: underline;
      }

      .delete-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        opacity: 0.5;
        transition: all 0.2s;
        margin-left: auto;
      }

      .delete-btn:hover {
        opacity: 1;
        background: #fee2e2;
      }

      .video-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        font-size: 0.75rem;
        color: var(--text-secondary);
        padding-top: 0.75rem;
        border-top: 1px solid var(--border);
        align-items: center;
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
      const perPage = 12;

      async function loadVideos() {
        const container = document.getElementById('videos-container');
        container.innerHTML = '<div class="loading-container"><div class="loading"></div></div>';

        try {
          const offset = (currentPage - 1) * perPage;
          let url = API_BASE + '/api/search/recent?table=posts&type=youtube_video&limit=' + perPage + '&offset=' + offset;

          if (currentSearch) {
            url += '&q=' + encodeURIComponent(currentSearch);
          }

          const response = await fetch(url);
          const data = await response.json();

          if (data.success && data.results && data.results.length > 0) {
            let videos = data.results;

            if (currentSort === 'oldest') {
              videos = videos.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            }

            const html = videos.map(item => {
              const date = new Date(item.created_at);
              const dateStr = date.toLocaleDateString();
              const context = item.context_json ? JSON.parse(item.context_json) : {};
              const videoUrl = context.url || '';
              const channel = context.channel || {};
              const channelName = channel.name || channel.title || context.channelName || 'Unknown Channel';
              const thumbnail = context.thumbnail || '';
              const title = item.original_text || context.title || 'Untitled Video';

              // Extract video ID for YouTube thumbnail fallback
              let videoId = context.videoId || '';
              if (!videoId && videoUrl) {
                const match = videoUrl.match(/(?:youtube\\.com\\/watch\\?v=|youtu\\.be\\/)([\\w-]+)/);
                if (match) videoId = match[1];
              }
              const thumbUrl = thumbnail || (videoId ? 'https://img.youtube.com/vi/' + videoId + '/mqdefault.jpg' : '');

              return \`
                <div class="video-card" data-id="\${item.id}">
                  <a href="\${videoUrl || '#'}" target="_blank" class="video-thumbnail">
                    \${thumbUrl
                      ? '<img src="' + thumbUrl + '" alt="' + escapeHtml(title) + '" loading="lazy" />'
                      : '<span class="video-thumbnail-placeholder">📹</span>'
                    }
                    <div class="video-play-overlay"></div>
                  </a>
                  <div class="video-content">
                    <h3 class="video-title">\${escapeHtml(title)}</h3>
                    <div class="video-channel">
                      <span>📺</span>
                      <span>\${escapeHtml(channelName)}</span>
                    </div>
                    <div class="video-meta">
                      <span class="video-meta-item">📅 Saved \${dateStr}</span>
                      \${videoUrl ? \`<a href="\${videoUrl}" target="_blank" class="video-link video-meta-item">🔗 Watch</a>\` : ''}
                      <button class="delete-btn" onclick="deleteVideo('\${item.id}', this)" title="Delete">🗑️</button>
                    </div>
                  </div>
                </div>
              \`;
            }).join('');

            container.innerHTML = '<div class="videos-grid">' + html + '</div>';
            updatePagination(data.total || videos.length);
          } else {
            container.innerHTML = '<div class="no-results"><p>No videos found</p></div>';
            document.getElementById('pagination').innerHTML = '';
          }
        } catch (error) {
          console.error('Failed to load videos:', error);
          container.innerHTML = '<div class="no-results"><p>Failed to load videos</p></div>';
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
        loadVideos();
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
        loadVideos();
      }, 300));

      document.getElementById('sort-select').addEventListener('change', function(e) {
        currentSort = e.target.value;
        loadVideos();
      });

      function debounce(func, wait) {
        let timeout;
        return function(...args) {
          clearTimeout(timeout);
          timeout = setTimeout(() => func.apply(this, args), wait);
        };
      }

      async function deleteVideo(id, btn) {
        if (!confirm('Delete this video?')) return;

        btn.textContent = '⏳';
        btn.disabled = true;

        try {
          const response = await fetch(API_BASE + '/api/search/post/' + id, {
            method: 'DELETE'
          });
          const data = await response.json();

          if (data.success) {
            const card = btn.closest('.video-card');
            card.style.opacity = '0';
            setTimeout(() => card.remove(), 300);
          } else {
            alert('Failed to delete: ' + data.error);
            btn.textContent = '🗑️';
            btn.disabled = false;
          }
        } catch (error) {
          alert('Error: ' + error.message);
          btn.textContent = '🗑️';
          btn.disabled = false;
        }
      }

      // Initial load
      if (${count} > 0) {
        loadVideos();
      }
    </script>
  `;

  return baseLayout({
    title: 'Videos - Universal Text Processor',
    content,
    styles,
    scripts
  });
}
