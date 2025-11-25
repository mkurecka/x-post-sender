/**
 * Profiles page - displays Airtable user profiles and websites
 */

import { baseLayout } from '../layouts/base';
import { nav } from '../components/nav';
import { pageHeader } from '../components/page-header';
import { emptyState } from '../components/empty-state';

export interface ProfilesPageProps {
  profilesCount: number;
  websitesCount: number;
  apiBase: string;
  configured: boolean;
}

export function profilesPage({ profilesCount, websitesCount, apiBase, configured }: ProfilesPageProps): string {
  const totalCount = profilesCount + websitesCount;

  const content = `
    ${nav({ currentPage: '/dashboard/profiles', apiBase })}

    <div class="container">
      ${pageHeader({
        title: 'Airtable Profiles',
        subtitle: 'User profiles and websites synced from Airtable',
        icon: '👤',
        count: totalCount,
        backLink: '/dashboard'
      })}

      ${!configured ? `
        <div class="config-warning">
          <span class="warning-icon">⚠️</span>
          <div class="warning-content">
            <strong>Airtable Not Configured</strong>
            <p>Set AIRTABLE_API_KEY and AIRTABLE_BASE_ID environment variables to enable this feature.</p>
          </div>
        </div>
      ` : ''}

      <!-- Tabs -->
      <div class="tabs">
        <button class="tab active" data-tab="profiles">
          <span class="tab-icon">👤</span>
          Profiles
          <span class="tab-count">${profilesCount}</span>
        </button>
        <button class="tab" data-tab="websites">
          <span class="tab-icon">🌐</span>
          Websites
          <span class="tab-count">${websitesCount}</span>
        </button>
      </div>

      <!-- Toolbar -->
      <div class="toolbar">
        <div class="search-box">
          <input type="text" id="search-input" placeholder="Search profiles..." />
          <span class="search-icon">🔍</span>
        </div>
        <div class="toolbar-actions">
          <button id="sync-btn" class="btn-primary" ${!configured ? 'disabled' : ''}>
            🔄 Sync from Airtable
          </button>
        </div>
      </div>

      <!-- Profiles Tab Content -->
      <div id="profiles-tab" class="tab-content active">
        <div id="profiles-container">
          ${profilesCount === 0 ? emptyState({
            title: 'No Profiles Found',
            message: configured ? 'Sync from Airtable to load user profiles.' : 'Configure Airtable to see profiles.',
            icon: '👤'
          }) : '<div class="loading-container"><div class="loading"></div></div>'}
        </div>
      </div>

      <!-- Websites Tab Content -->
      <div id="websites-tab" class="tab-content">
        <div id="websites-container">
          ${websitesCount === 0 ? emptyState({
            title: 'No Websites Found',
            message: configured ? 'Sync from Airtable to load websites.' : 'Configure Airtable to see websites.',
            icon: '🌐'
          }) : '<div class="loading-container"><div class="loading"></div></div>'}
        </div>
      </div>

      <!-- Sync Status -->
      <div id="sync-status" class="sync-status" style="display: none;"></div>
    </div>
  `;

  const styles = `
    <style>
      .config-warning {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        padding: 1rem 1.25rem;
        background: #fef3c7;
        border: 1px solid #f59e0b;
        border-radius: 8px;
        margin-bottom: 1.5rem;
      }

      .warning-icon {
        font-size: 1.5rem;
      }

      .warning-content strong {
        display: block;
        color: #92400e;
        margin-bottom: 0.25rem;
      }

      .warning-content p {
        color: #a16207;
        font-size: 0.875rem;
        margin: 0;
      }

      .tabs {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
        border-bottom: 1px solid var(--border);
        padding-bottom: 0;
      }

      .tab {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.25rem;
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.2s;
      }

      .tab:hover {
        color: var(--text-primary);
      }

      .tab.active {
        color: var(--primary);
        border-bottom-color: var(--primary);
      }

      .tab-count {
        background: var(--background);
        padding: 0.125rem 0.5rem;
        border-radius: 99px;
        font-size: 0.75rem;
      }

      .tab.active .tab-count {
        background: var(--primary-light);
        color: var(--primary);
      }

      .tab-content {
        display: none;
      }

      .tab-content.active {
        display: block;
      }

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

      .btn-primary {
        padding: 0.75rem 1.25rem;
        background: var(--primary);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-primary:hover:not(:disabled) {
        opacity: 0.9;
      }

      .btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .loading-container {
        display: flex;
        justify-content: center;
        padding: 3rem;
      }

      .profiles-grid, .websites-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 1rem;
      }

      .profile-card, .website-card {
        background: var(--surface);
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        border: 1px solid var(--border);
      }

      .card-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        background: var(--background);
        border-bottom: 1px solid var(--border);
      }

      .profile-avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: var(--primary-light);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        color: var(--primary);
      }

      .profile-avatar img {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        object-fit: cover;
      }

      .card-title {
        flex: 1;
      }

      .card-title h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary);
      }

      .card-title p {
        margin: 0.25rem 0 0;
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      .status-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 99px;
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
      }

      .status-enabled {
        background: #dcfce7;
        color: #16a34a;
      }

      .status-disabled {
        background: #fee2e2;
        color: #dc2626;
      }

      .card-body {
        padding: 1rem;
      }

      .card-row {
        display: flex;
        justify-content: space-between;
        padding: 0.5rem 0;
        border-bottom: 1px solid var(--border);
        font-size: 0.875rem;
      }

      .card-row:last-child {
        border-bottom: none;
      }

      .card-label {
        color: var(--text-secondary);
      }

      .card-value {
        color: var(--text-primary);
        font-weight: 500;
        text-align: right;
      }

      .accounts-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
        justify-content: flex-end;
      }

      .account-tag {
        background: var(--primary-light);
        color: var(--primary);
        padding: 0.125rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
      }

      .branding-colors {
        display: flex;
        gap: 0.25rem;
        justify-content: flex-end;
      }

      .color-swatch {
        width: 20px;
        height: 20px;
        border-radius: 4px;
        border: 1px solid var(--border);
      }

      .social-profiles {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .social-badge {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        background: var(--background);
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
      }

      .sync-status {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        background: var(--surface);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        font-size: 0.875rem;
        z-index: 1000;
      }

      .sync-status.success {
        border-left: 4px solid #16a34a;
      }

      .sync-status.error {
        border-left: 4px solid #dc2626;
      }

      .sync-status.loading {
        border-left: 4px solid var(--primary);
      }

      .no-results {
        text-align: center;
        padding: 3rem;
        color: var(--text-secondary);
      }

      @media (max-width: 768px) {
        .profiles-grid, .websites-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  `;

  const scripts = `
    <script>
      const API_BASE = '${apiBase}';
      const CONFIGURED = ${configured};
      let currentTab = 'profiles';
      let currentSearch = '';
      let profilesData = [];
      let websitesData = [];

      // Tab switching
      document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
          const tabName = this.dataset.tab;
          switchTab(tabName);
        });
      });

      function switchTab(tabName) {
        currentTab = tabName;

        // Update tab buttons
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelector('[data-tab="' + tabName + '"]').classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(tabName + '-tab').classList.add('active');

        // Update search placeholder
        document.getElementById('search-input').placeholder = 'Search ' + tabName + '...';
      }

      // Search
      document.getElementById('search-input').addEventListener('input', debounce(function(e) {
        currentSearch = e.target.value.toLowerCase();
        if (currentTab === 'profiles') {
          renderProfiles(filterProfiles(profilesData));
        } else {
          renderWebsites(filterWebsites(websitesData));
        }
      }, 300));

      // Sync button
      document.getElementById('sync-btn').addEventListener('click', async function() {
        if (!CONFIGURED) return;
        await syncFromAirtable();
      });

      function filterProfiles(profiles) {
        if (!currentSearch) return profiles;
        return profiles.filter(p =>
          (p.name || '').toLowerCase().includes(currentSearch) ||
          (p.displayName || '').toLowerCase().includes(currentSearch) ||
          (p.email || '').toLowerCase().includes(currentSearch) ||
          (p.userId || '').toLowerCase().includes(currentSearch)
        );
      }

      function filterWebsites(websites) {
        if (!currentSearch) return websites;
        return websites.filter(w =>
          (w.name || '').toLowerCase().includes(currentSearch) ||
          (w.domain || '').toLowerCase().includes(currentSearch) ||
          (w.websiteId || '').toLowerCase().includes(currentSearch)
        );
      }

      async function loadProfiles() {
        if (!CONFIGURED) return;

        const container = document.getElementById('profiles-container');
        container.innerHTML = '<div class="loading-container"><div class="loading"></div></div>';

        try {
          const response = await fetch(API_BASE + '/api/airtable/profiles');
          const data = await response.json();

          if (data.success && data.data) {
            profilesData = data.data;
            renderProfiles(profilesData);
          } else {
            container.innerHTML = '<div class="no-results"><p>' + (data.error || 'Failed to load profiles') + '</p></div>';
          }
        } catch (error) {
          console.error('Failed to load profiles:', error);
          container.innerHTML = '<div class="no-results"><p>Failed to load profiles</p></div>';
        }
      }

      async function loadWebsites() {
        if (!CONFIGURED) return;

        const container = document.getElementById('websites-container');
        container.innerHTML = '<div class="loading-container"><div class="loading"></div></div>';

        try {
          const response = await fetch(API_BASE + '/api/airtable/websites');
          const data = await response.json();

          if (data.success && data.data) {
            websitesData = data.data;
            renderWebsites(websitesData);
          } else {
            container.innerHTML = '<div class="no-results"><p>' + (data.error || 'Failed to load websites') + '</p></div>';
          }
        } catch (error) {
          console.error('Failed to load websites:', error);
          container.innerHTML = '<div class="no-results"><p>Failed to load websites</p></div>';
        }
      }

      function renderProfiles(profiles) {
        const container = document.getElementById('profiles-container');

        if (!profiles || profiles.length === 0) {
          container.innerHTML = '<div class="no-results"><p>No profiles found</p></div>';
          return;
        }

        const html = profiles.map(profile => {
          const initials = (profile.name || 'U').charAt(0).toUpperCase();
          const accounts = profile.accounts || [];
          const colors = profile.brandingColors || {};

          return \`
            <div class="profile-card">
              <div class="card-header">
                <div class="profile-avatar">
                  \${profile.logoUrl ? \`<img src="\${profile.logoUrl}" alt="\${profile.name}">\` : initials}
                </div>
                <div class="card-title">
                  <h3>\${profile.name || 'Unnamed'}</h3>
                  <p>\${profile.displayName || profile.email || profile.userId || ''}</p>
                </div>
                <span class="status-badge \${profile.enabled ? 'status-enabled' : 'status-disabled'}">
                  \${profile.enabled ? 'Active' : 'Disabled'}
                </span>
              </div>
              <div class="card-body">
                \${profile.userId ? \`
                  <div class="card-row">
                    <span class="card-label">User ID</span>
                    <span class="card-value">\${profile.userId}</span>
                  </div>
                \` : ''}
                \${profile.defaultLanguage ? \`
                  <div class="card-row">
                    <span class="card-label">Language</span>
                    <span class="card-value">\${profile.defaultLanguage}</span>
                  </div>
                \` : ''}
                \${accounts.length > 0 ? \`
                  <div class="card-row">
                    <span class="card-label">Accounts</span>
                    <div class="accounts-list">
                      \${accounts.map(a => \`<span class="account-tag">\${a}</span>\`).join('')}
                    </div>
                  </div>
                \` : ''}
                \${Object.keys(colors).length > 0 ? \`
                  <div class="card-row">
                    <span class="card-label">Branding</span>
                    <div class="branding-colors">
                      \${colors.primary ? \`<div class="color-swatch" style="background: \${colors.primary}" title="Primary"></div>\` : ''}
                      \${colors.secondary ? \`<div class="color-swatch" style="background: \${colors.secondary}" title="Secondary"></div>\` : ''}
                      \${colors.accent ? \`<div class="color-swatch" style="background: \${colors.accent}" title="Accent"></div>\` : ''}
                    </div>
                  </div>
                \` : ''}
              </div>
            </div>
          \`;
        }).join('');

        container.innerHTML = '<div class="profiles-grid">' + html + '</div>';
      }

      function renderWebsites(websites) {
        const container = document.getElementById('websites-container');

        if (!websites || websites.length === 0) {
          container.innerHTML = '<div class="no-results"><p>No websites found</p></div>';
          return;
        }

        const html = websites.map(website => {
          const socials = website.socialProfiles || [];

          return \`
            <div class="website-card">
              <div class="card-header">
                <div class="profile-avatar">🌐</div>
                <div class="card-title">
                  <h3>\${website.name || 'Unnamed'}</h3>
                  <p>\${website.domain || ''}</p>
                </div>
                <span class="status-badge \${website.enabled ? 'status-enabled' : 'status-disabled'}">
                  \${website.enabled ? 'Active' : 'Disabled'}
                </span>
              </div>
              <div class="card-body">
                \${website.websiteId ? \`
                  <div class="card-row">
                    <span class="card-label">Website ID</span>
                    <span class="card-value">\${website.websiteId}</span>
                  </div>
                \` : ''}
                \${website.userId ? \`
                  <div class="card-row">
                    <span class="card-label">Owner</span>
                    <span class="card-value">\${website.userId}</span>
                  </div>
                \` : ''}
                \${website.schedulingWebhook ? \`
                  <div class="card-row">
                    <span class="card-label">Webhook</span>
                    <span class="card-value" style="font-size: 0.75rem;">Configured</span>
                  </div>
                \` : ''}
                \${socials.length > 0 ? \`
                  <div class="card-row">
                    <span class="card-label">Social</span>
                    <div class="social-profiles">
                      \${socials.map(s => \`
                        <span class="social-badge">
                          \${getSocialIcon(s.platform)} \${s.platform}
                        </span>
                      \`).join('')}
                    </div>
                  </div>
                \` : ''}
              </div>
            </div>
          \`;
        }).join('');

        container.innerHTML = '<div class="websites-grid">' + html + '</div>';
      }

      function getSocialIcon(platform) {
        const icons = {
          twitter: '🐦',
          x: '𝕏',
          facebook: '📘',
          instagram: '📸',
          linkedin: '💼',
          youtube: '📹',
          tiktok: '🎵'
        };
        return icons[platform.toLowerCase()] || '🔗';
      }

      async function syncFromAirtable() {
        showSyncStatus('Syncing from Airtable...', 'loading');

        try {
          const response = await fetch(API_BASE + '/api/airtable/sync', {
            method: 'POST'
          });
          const data = await response.json();

          if (data.success) {
            showSyncStatus(
              'Synced ' + (data.data?.profilesCount || 0) + ' profiles and ' + (data.data?.websitesCount || 0) + ' websites',
              'success'
            );
            // Reload data
            loadProfiles();
            loadWebsites();
          } else {
            showSyncStatus(data.error || 'Sync failed', 'error');
          }
        } catch (error) {
          console.error('Sync error:', error);
          showSyncStatus('Sync failed: ' + error.message, 'error');
        }
      }

      function showSyncStatus(message, type) {
        const status = document.getElementById('sync-status');
        status.textContent = message;
        status.className = 'sync-status ' + type;
        status.style.display = 'block';

        if (type !== 'loading') {
          setTimeout(() => {
            status.style.display = 'none';
          }, 4000);
        }
      }

      function debounce(func, wait) {
        let timeout;
        return function(...args) {
          clearTimeout(timeout);
          timeout = setTimeout(() => func.apply(this, args), wait);
        };
      }

      // Initial load
      if (CONFIGURED) {
        loadProfiles();
        loadWebsites();
      }
    </script>
  `;

  return baseLayout({
    title: 'Profiles - Universal Text Processor',
    content,
    styles,
    scripts
  });
}
