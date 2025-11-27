/**
 * Memories page - displays all saved memories
 */

import { baseLayout } from '../layouts/base';
import { nav } from '../components/nav';
import { pageHeader } from '../components/page-header';
import { emptyState } from '../components/empty-state';

export interface MemoriesPageProps {
  count: number;
  apiBase: string;
}

export function memoriesPage({ count, apiBase }: MemoriesPageProps): string {
  const content = `
    ${nav({ currentPage: '/dashboard/memories', apiBase })}

    <div class="container">
      ${pageHeader({
        title: 'Memories',
        subtitle: 'All your saved text snippets and notes',
        icon: '💾',
        count,
        backLink: '/dashboard'
      })}

      <!-- Search and Filter -->
      <div class="toolbar">
        <div class="search-box">
          <input type="text" id="search-input" placeholder="Search memories..." />
          <span class="search-icon">🔍</span>
        </div>
        <div class="toolbar-actions">
          <select id="sort-select">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      <!-- Memories List -->
      <div id="memories-container">
        ${count === 0 ? emptyState({
          title: 'No Memories Yet',
          message: 'Select any text on a webpage and use the extension to save it to your memories.',
          icon: '💾',
          actionText: 'Learn More',
          actionUrl: '/setup'
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

      .memories-grid {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .memory-card {
        background: var(--surface);
        border-radius: 12px;
        padding: 1.25rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        border-left: 4px solid #8b5cf6;
        transition: all 0.2s;
      }

      .memory-card:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .memory-text {
        font-size: 0.95rem;
        color: var(--text-primary);
        line-height: 1.6;
        white-space: pre-wrap;
        word-break: break-word;
        margin-bottom: 1rem;
      }

      .memory-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      .memory-meta-item {
        display: flex;
        align-items: center;
        gap: 0.35rem;
      }

      .memory-source {
        color: var(--primary);
        text-decoration: none;
      }

      .memory-source:hover {
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

      .memory-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        font-size: 0.8rem;
        color: var(--text-secondary);
        align-items: center;
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

      async function loadMemories() {
        const container = document.getElementById('memories-container');
        container.innerHTML = '<div class="loading-container"><div class="loading"></div></div>';

        try {
          const offset = (currentPage - 1) * perPage;
          let url = API_BASE + '/api/search/recent?table=memory&limit=' + perPage + '&offset=' + offset;

          if (currentSearch) {
            url += '&q=' + encodeURIComponent(currentSearch);
          }

          const response = await fetch(url);
          const data = await response.json();

          if (data.success && data.results && data.results.length > 0) {
            let memories = data.results;

            // Sort
            if (currentSort === 'oldest') {
              memories = memories.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            }

            const html = memories.map(item => {
              const date = new Date(item.created_at);
              const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
              const context = item.context_json ? JSON.parse(item.context_json) : {};
              const url = context.url || '';
              const pageTitle = context.pageTitle || 'Source';

              return \`
                <div class="memory-card" data-id="\${item.id}">
                  <div class="memory-text">\${escapeHtml(item.text)}</div>
                  <div class="memory-meta">
                    <span class="memory-meta-item">📅 \${dateStr}</span>
                    \${url ? \`<a href="\${url}" target="_blank" class="memory-source memory-meta-item">🔗 \${pageTitle}</a>\` : ''}
                    <button class="delete-btn" onclick="deleteMemory('\${item.id}', this)" title="Delete">🗑️</button>
                  </div>
                </div>
              \`;
            }).join('');

            container.innerHTML = '<div class="memories-grid">' + html + '</div>';
            updatePagination(data.total || memories.length);
          } else {
            container.innerHTML = '<div class="no-results"><p>No memories found</p></div>';
            document.getElementById('pagination').innerHTML = '';
          }
        } catch (error) {
          console.error('Failed to load memories:', error);
          container.innerHTML = '<div class="no-results"><p>Failed to load memories</p></div>';
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
        loadMemories();
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
        loadMemories();
      }, 300));

      document.getElementById('sort-select').addEventListener('change', function(e) {
        currentSort = e.target.value;
        loadMemories();
      });

      function debounce(func, wait) {
        let timeout;
        return function(...args) {
          clearTimeout(timeout);
          timeout = setTimeout(() => func.apply(this, args), wait);
        };
      }

      async function deleteMemory(id, btn) {
        if (!confirm('Delete this memory?')) return;

        btn.textContent = '⏳';
        btn.disabled = true;

        try {
          const response = await fetch(API_BASE + '/api/search/memory/' + id, {
            method: 'DELETE'
          });
          const data = await response.json();

          if (data.success) {
            const card = btn.closest('.memory-card');
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
        loadMemories();
      }
    </script>
  `;

  return baseLayout({
    title: 'Memories - Universal Text Processor',
    content,
    styles,
    scripts
  });
}
