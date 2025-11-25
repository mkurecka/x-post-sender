/**
 * Navigation component
 * Provides consistent navigation across all dashboard pages
 */

export interface NavProps {
  currentPage: string;
  apiBase: string;
}

export function nav({ currentPage, apiBase }: NavProps): string {
  const links = [
    { path: '/dashboard', label: 'Overview', icon: '📊' },
    { path: '/dashboard/memories', label: 'Memories', icon: '💾' },
    { path: '/dashboard/tweets', label: 'Tweets', icon: '🐦' },
    { path: '/dashboard/videos', label: 'Videos', icon: '📹' },
    { path: '/dashboard/ai-content', label: 'AI Content', icon: '✨' },
  ];

  return `
    <nav class="dashboard-nav">
      <div class="nav-brand">
        <a href="/dashboard">📝 Text Processor</a>
      </div>
      <div class="nav-links">
        ${links.map(link => `
          <a href="${link.path}" class="nav-link ${currentPage === link.path ? 'active' : ''}">
            <span class="nav-icon">${link.icon}</span>
            <span class="nav-label">${link.label}</span>
          </a>
        `).join('')}
      </div>
    </nav>

    <style>
      .dashboard-nav {
        background: var(--surface);
        border-bottom: 1px solid var(--border);
        padding: 0 2rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 60px;
        position: sticky;
        top: 0;
        z-index: 100;
      }

      .nav-brand a {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--primary);
        text-decoration: none;
      }

      .nav-links {
        display: flex;
        gap: 0.5rem;
      }

      .nav-link {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        border-radius: 8px;
        color: var(--text-secondary);
        text-decoration: none;
        font-size: 0.875rem;
        font-weight: 500;
        transition: all 0.2s;
      }

      .nav-link:hover {
        background: var(--background);
        color: var(--text-primary);
      }

      .nav-link.active {
        background: var(--primary-light);
        color: var(--primary);
      }

      .nav-icon {
        font-size: 1rem;
      }

      @media (max-width: 768px) {
        .dashboard-nav {
          padding: 0 1rem;
          flex-direction: column;
          height: auto;
          padding: 1rem;
        }

        .nav-links {
          flex-wrap: wrap;
          justify-content: center;
          margin-top: 0.5rem;
        }

        .nav-link {
          padding: 0.5rem 0.75rem;
        }

        .nav-label {
          display: none;
        }
      }
    </style>
  `;
}
