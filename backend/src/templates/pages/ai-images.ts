/**
 * AI Images Gallery page - displays all AI-generated images from R2 storage
 */

import { baseLayout } from '../layouts/base';
import { nav } from '../components/nav';
import { pageHeader } from '../components/page-header';
import { emptyState } from '../components/empty-state';

export interface AIImagesPageProps {
  count: number;
  apiBase: string;
}

export function aiImagesPage({ count, apiBase }: AIImagesPageProps): string {
  const content = `
    ${nav({ currentPage: '/dashboard/ai-images', apiBase })}

    <div class="container">
      ${pageHeader({
        title: 'AI Generated Images',
        subtitle: 'Images generated via OpenRouter AI models',
        icon: '🖼️',
        count,
        backLink: '/dashboard'
      })}

      <!-- Toolbar -->
      <div class="toolbar">
        <div class="toolbar-actions">
          <select id="sort-select">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          <button id="refresh-btn" class="btn-secondary">🔄 Refresh</button>
        </div>
      </div>

      <!-- Images Gallery -->
      <div id="images-container">
        ${count === 0 ? emptyState({
          title: 'No AI Images Yet',
          message: 'Use the extension to generate AI images. They will appear here.',
          icon: '🖼️',
          actionText: 'Learn More',
          actionUrl: '/setup'
        }) : '<div class="loading-container"><div class="loading"></div></div>'}
      </div>

      <!-- Pagination -->
      <div id="pagination" class="pagination"></div>
    </div>

    <!-- Lightbox Modal -->
    <div id="lightbox" class="lightbox" onclick="closeLightbox(event)">
      <div class="lightbox-content">
        <button class="lightbox-close" onclick="closeLightbox()">&times;</button>
        <img id="lightbox-img" src="" alt="Full size image">
        <div id="lightbox-info" class="lightbox-info"></div>
      </div>
    </div>
  `;

  const styles = `
    <style>
      .toolbar {
        display: flex;
        gap: 1rem;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
        justify-content: flex-end;
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

      .btn-secondary {
        padding: 0.75rem 1rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--surface);
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-secondary:hover {
        background: var(--primary-light);
        border-color: var(--primary);
      }

      .loading-container {
        display: flex;
        justify-content: center;
        padding: 3rem;
      }

      .images-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1.5rem;
      }

      .image-card {
        background: var(--surface);
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .image-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      }

      .image-wrapper {
        position: relative;
        aspect-ratio: 1;
        overflow: hidden;
        cursor: pointer;
        background: var(--background);
      }

      .image-wrapper img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s;
      }

      .image-card:hover .image-wrapper img {
        transform: scale(1.05);
      }

      .image-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%);
        opacity: 0;
        transition: opacity 0.3s;
        display: flex;
        align-items: flex-end;
        padding: 1rem;
      }

      .image-card:hover .image-overlay {
        opacity: 1;
      }

      .overlay-actions {
        display: flex;
        gap: 0.5rem;
      }

      .overlay-btn {
        background: white;
        border: none;
        padding: 0.5rem 0.75rem;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s;
      }

      .overlay-btn:hover {
        background: var(--primary-light);
      }

      .image-info {
        padding: 1rem;
      }

      .image-prompt {
        font-size: 0.875rem;
        color: var(--text-primary);
        line-height: 1.5;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        margin-bottom: 0.75rem;
      }

      .image-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        font-size: 0.75rem;
        color: var(--text-secondary);
      }

      .image-meta-item {
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }

      .model-badge {
        background: var(--primary-light);
        color: var(--primary);
        font-size: 0.7rem;
        font-weight: 600;
        padding: 0.2rem 0.5rem;
        border-radius: 99px;
      }

      /* Lightbox */
      .lightbox {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.9);
        z-index: 1000;
        justify-content: center;
        align-items: center;
        padding: 2rem;
      }

      .lightbox.active {
        display: flex;
      }

      .lightbox-content {
        position: relative;
        max-width: 90vw;
        max-height: 90vh;
      }

      .lightbox-close {
        position: absolute;
        top: -40px;
        right: 0;
        background: none;
        border: none;
        color: white;
        font-size: 2rem;
        cursor: pointer;
        padding: 0.5rem;
      }

      .lightbox-close:hover {
        color: var(--primary);
      }

      #lightbox-img {
        max-width: 100%;
        max-height: 80vh;
        border-radius: 8px;
      }

      .lightbox-info {
        color: white;
        padding: 1rem 0;
        text-align: center;
        font-size: 0.875rem;
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

      .size-badge {
        background: var(--background);
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        font-size: 0.7rem;
      }
    </style>
  `;

  const scripts = `
    <script>
      const API_BASE = '${apiBase}';
      let currentPage = 1;
      let currentSort = 'newest';
      const perPage = 12;
      let allImages = [];

      async function loadImages() {
        const container = document.getElementById('images-container');
        container.innerHTML = '<div class="loading-container"><div class="loading"></div></div>';

        try {
          const response = await fetch(API_BASE + '/api/proxy/ai-images?limit=100');
          const data = await response.json();

          if (data.success && data.data) {
            allImages = data.data;

            // Sort
            if (currentSort === 'oldest') {
              allImages.sort((a, b) => new Date(a.uploaded) - new Date(b.uploaded));
            } else {
              allImages.sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded));
            }

            renderImages();
          } else {
            container.innerHTML = '<div class="no-results"><p>No images found</p></div>';
          }
        } catch (error) {
          console.error('Failed to load images:', error);
          container.innerHTML = '<div class="no-results"><p>Failed to load images</p></div>';
        }
      }

      function renderImages() {
        const container = document.getElementById('images-container');
        const offset = (currentPage - 1) * perPage;
        const paginated = allImages.slice(offset, offset + perPage);

        if (paginated.length === 0) {
          container.innerHTML = '<div class="no-results"><p>No images found</p></div>';
          document.getElementById('pagination').innerHTML = '';
          return;
        }

        const html = paginated.map((img, index) => {
          const date = new Date(img.uploaded);
          const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
          const prompt = img.metadata?.prompt || 'No prompt';
          const model = img.metadata?.model || 'Unknown';
          const modelShort = model.split('/').pop() || model;
          const sizeKB = (img.size / 1024).toFixed(0);

          return \`
            <div class="image-card">
              <div class="image-wrapper" onclick="openLightbox('\${img.url}', '\${escapeAttr(prompt)}', '\${model}', '\${dateStr}')">
                <img src="\${img.url}" alt="\${escapeAttr(prompt)}" loading="lazy">
                <div class="image-overlay">
                  <div class="overlay-actions">
                    <button class="overlay-btn" onclick="event.stopPropagation(); downloadImage('\${img.url}', '\${img.filename}')">⬇️ Download</button>
                    <button class="overlay-btn" onclick="event.stopPropagation(); copyUrl('\${img.url}')">🔗 Copy URL</button>
                  </div>
                </div>
              </div>
              <div class="image-info">
                <div class="image-prompt">\${escapeHtml(prompt)}</div>
                <div class="image-meta">
                  <span class="model-badge">\${modelShort}</span>
                  <span class="image-meta-item">📅 \${dateStr}</span>
                  <span class="size-badge">\${sizeKB} KB</span>
                </div>
              </div>
            </div>
          \`;
        }).join('');

        container.innerHTML = '<div class="images-grid">' + html + '</div>';
        updatePagination(allImages.length);
      }

      function openLightbox(url, prompt, model, date) {
        const lightbox = document.getElementById('lightbox');
        const img = document.getElementById('lightbox-img');
        const info = document.getElementById('lightbox-info');

        img.src = url;
        info.innerHTML = \`
          <p><strong>Prompt:</strong> \${prompt}</p>
          <p><strong>Model:</strong> \${model} | <strong>Generated:</strong> \${date}</p>
        \`;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
      }

      function closeLightbox(event) {
        if (event && event.target !== event.currentTarget) return;
        const lightbox = document.getElementById('lightbox');
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
      }

      async function downloadImage(url, filename) {
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = filename || 'ai-image.png';
          link.click();
          URL.revokeObjectURL(link.href);
        } catch (error) {
          console.error('Download failed:', error);
          alert('Failed to download image');
        }
      }

      function copyUrl(url) {
        navigator.clipboard.writeText(url).then(() => {
          showNotification('URL copied to clipboard!');
        }).catch(err => {
          console.error('Copy failed:', err);
        });
      }

      function showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: var(--primary); color: white; padding: 1rem 1.5rem; border-radius: 8px; z-index: 1001; animation: slideIn 0.3s ease;';
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
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
        renderImages();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      function escapeAttr(text) {
        return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      }

      // Event listeners
      document.getElementById('sort-select').addEventListener('change', function(e) {
        currentSort = e.target.value;
        currentPage = 1;
        if (currentSort === 'oldest') {
          allImages.sort((a, b) => new Date(a.uploaded) - new Date(b.uploaded));
        } else {
          allImages.sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded));
        }
        renderImages();
      });

      document.getElementById('refresh-btn').addEventListener('click', function() {
        loadImages();
      });

      // Close lightbox on Escape
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeLightbox();
      });

      // Initial load
      if (${count} > 0) {
        loadImages();
      }
    </script>
  `;

  return baseLayout({
    title: 'AI Images - Universal Text Processor',
    content,
    styles,
    scripts
  });
}
