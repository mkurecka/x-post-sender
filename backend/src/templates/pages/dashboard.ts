/**
 * Dashboard overview page - landing page with navigation cards
 */

import { baseLayout } from '../layouts/base';
import { nav } from '../components/nav';
import { pageHeader } from '../components/page-header';
import { statCard } from '../components/stat-card';

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
  const navigationCards = [
    {
      title: 'Memories',
      description: 'Saved text snippets and notes from anywhere',
      icon: '💾',
      count: stats.posts.memory,
      link: '/dashboard/memories',
      color: '#8b5cf6'
    },
    {
      title: 'Tweets',
      description: 'Tweets saved from X/Twitter',
      icon: '🐦',
      count: stats.posts.tweets,
      link: '/dashboard/tweets',
      color: '#1da1f2'
    },
    {
      title: 'Videos',
      description: 'YouTube videos and video content',
      icon: '📹',
      count: stats.posts.videos,
      link: '/dashboard/videos',
      color: '#ff0000'
    },
    {
      title: 'AI Content',
      description: 'AI-generated and processed content',
      icon: '✨',
      count: stats.posts.total - stats.posts.tweets - stats.posts.videos,
      link: '/dashboard/ai-content',
      color: '#10b981'
    }
  ];

  const content = `
    ${nav({ currentPage: '/dashboard', apiBase })}

    <div class="container">
      ${pageHeader({
        title: 'Dashboard Overview',
        subtitle: 'Welcome to your content hub. Navigate to different sections to view your saved content.',
        icon: '📊'
      })}

      <!-- Quick Stats -->
      <div class="grid grid-4 mb-3">
        ${statCard({
          title: 'Total Content',
          value: stats.posts.total + stats.posts.memory,
          subtitle: 'All saved items',
          icon: '📦'
        })}
        ${statCard({
          title: 'Memories',
          value: stats.posts.memory,
          subtitle: 'Text snippets',
          icon: '💾'
        })}
        ${statCard({
          title: 'Social Media',
          value: stats.posts.tweets,
          subtitle: 'From X/Twitter',
          icon: '🐦'
        })}
        ${statCard({
          title: 'Webhook Events',
          value: stats.webhooks.total,
          subtitle: 'Events logged',
          icon: '📡'
        })}
      </div>

      <!-- Navigation Cards -->
      <h2 class="section-title mb-2">Browse Content</h2>
      <div class="nav-cards-grid">
        ${navigationCards.map(card => `
          <a href="${card.link}" class="nav-card" style="--accent-color: ${card.color}">
            <div class="nav-card-icon">${card.icon}</div>
            <div class="nav-card-content">
              <h3>${card.title}</h3>
              <p>${card.description}</p>
            </div>
            <div class="nav-card-count">${card.count}</div>
            <div class="nav-card-arrow">→</div>
          </a>
        `).join('')}
      </div>

      <!-- Recent Activity Preview -->
      <div class="card mt-3">
        <h2 class="card-title">📋 Recent Activity</h2>
        <div id="recent-activity">
          <div class="loading"></div>
        </div>
      </div>
    </div>
  `;

  const styles = `
    <style>
      .section-title {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--text-primary);
      }

      .nav-cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1.25rem;
      }

      .nav-card {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1.5rem;
        background: var(--surface);
        border-radius: 12px;
        text-decoration: none;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: all 0.2s;
        border-left: 4px solid var(--accent-color, var(--primary));
      }

      .nav-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .nav-card-icon {
        font-size: 2.5rem;
        flex-shrink: 0;
      }

      .nav-card-content {
        flex: 1;
        min-width: 0;
      }

      .nav-card-content h3 {
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 0.25rem;
      }

      .nav-card-content p {
        font-size: 0.875rem;
        color: var(--text-secondary);
        margin: 0;
      }

      .nav-card-count {
        background: var(--background);
        color: var(--text-primary);
        font-weight: 700;
        font-size: 1.25rem;
        padding: 0.5rem 0.75rem;
        border-radius: 8px;
        flex-shrink: 0;
      }

      .nav-card-arrow {
        color: var(--text-secondary);
        font-size: 1.5rem;
        transition: transform 0.2s;
      }

      .nav-card:hover .nav-card-arrow {
        transform: translateX(4px);
        color: var(--primary);
      }

      .activity-item {
        display: flex;
        gap: 1rem;
        padding: 0.75rem 0;
        border-bottom: 1px solid var(--border);
      }

      .activity-item:last-child {
        border-bottom: none;
      }

      .activity-icon {
        font-size: 1.25rem;
        flex-shrink: 0;
      }

      .activity-content {
        flex: 1;
        min-width: 0;
      }

      .activity-text {
        font-size: 0.875rem;
        color: var(--text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .activity-meta {
        font-size: 0.75rem;
        color: var(--text-secondary);
        margin-top: 0.25rem;
      }

      .activity-type {
        background: var(--primary-light);
        color: var(--primary);
        font-size: 0.7rem;
        padding: 0.125rem 0.5rem;
        border-radius: 99px;
        font-weight: 500;
        text-transform: uppercase;
      }
    </style>
  `;

  const scripts = `
    <script>
      const API_BASE = '${apiBase}';

      async function loadRecentActivity() {
        const container = document.getElementById('recent-activity');
        try {
          const [memoriesRes, postsRes] = await Promise.all([
            fetch(API_BASE + '/api/search/recent?table=memory&limit=5'),
            fetch(API_BASE + '/api/search/recent?table=posts&limit=5')
          ]);

          const [memoriesData, postsData] = await Promise.all([
            memoriesRes.json(),
            postsRes.json()
          ]);

          const activities = [];

          if (memoriesData.success && memoriesData.results) {
            memoriesData.results.forEach(item => {
              activities.push({
                type: 'memory',
                icon: '💾',
                text: item.text,
                date: new Date(item.created_at)
              });
            });
          }

          if (postsData.success && postsData.results) {
            postsData.results.forEach(item => {
              const icon = item.type === 'tweet' ? '🐦' : item.type === 'youtube_video' ? '📹' : '✨';
              activities.push({
                type: item.type || 'content',
                icon,
                text: item.original_text || item.title || 'Untitled',
                date: new Date(item.created_at)
              });
            });
          }

          // Sort by date descending
          activities.sort((a, b) => b.date - a.date);
          const recent = activities.slice(0, 10);

          if (recent.length > 0) {
            container.innerHTML = recent.map(item => \`
              <div class="activity-item">
                <span class="activity-icon">\${item.icon}</span>
                <div class="activity-content">
                  <div class="activity-text">\${item.text}</div>
                  <div class="activity-meta">
                    <span class="activity-type">\${item.type.replace(/_/g, ' ')}</span>
                    · \${item.date.toLocaleDateString()} \${item.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              </div>
            \`).join('');
          } else {
            container.innerHTML = '<p class="text-muted text-small">No recent activity. Start using the extension to save content!</p>';
          }
        } catch (error) {
          console.error('Failed to load activity:', error);
          container.innerHTML = '<p class="text-muted text-small">Failed to load recent activity</p>';
        }
      }

      loadRecentActivity();
    </script>
  `;

  return baseLayout({
    title: 'Dashboard - Universal Text Processor',
    content,
    styles,
    scripts
  });
}
