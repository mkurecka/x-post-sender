/**
 * Page header component with breadcrumb and title
 */

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  count?: number;
  backLink?: string;
  actions?: string;
}

export function pageHeader({ title, subtitle, icon, count, backLink, actions }: PageHeaderProps): string {
  return `
    <div class="page-header">
      <div class="page-header-main">
        ${backLink ? `
          <a href="${backLink}" class="back-link">
            <span>←</span> Back
          </a>
        ` : ''}
        <div class="page-header-title">
          ${icon ? `<span class="page-icon">${icon}</span>` : ''}
          <h1>${title}${typeof count === 'number' ? ` <span class="count-badge">${count}</span>` : ''}</h1>
        </div>
        ${subtitle ? `<p class="page-subtitle">${subtitle}</p>` : ''}
      </div>
      ${actions ? `<div class="page-actions">${actions}</div>` : ''}
    </div>

    <style>
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 2rem;
        padding-bottom: 1.5rem;
        border-bottom: 1px solid var(--border);
      }

      .page-header-main {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .back-link {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        color: var(--text-secondary);
        font-size: 0.875rem;
        text-decoration: none;
        margin-bottom: 0.5rem;
      }

      .back-link:hover {
        color: var(--primary);
      }

      .page-header-title {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .page-icon {
        font-size: 2rem;
      }

      .page-header h1 {
        font-size: 1.75rem;
        font-weight: 700;
        color: var(--text-primary);
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .count-badge {
        background: var(--primary-light);
        color: var(--primary);
        font-size: 0.875rem;
        font-weight: 600;
        padding: 0.25rem 0.75rem;
        border-radius: 99px;
      }

      .page-subtitle {
        color: var(--text-secondary);
        font-size: 0.95rem;
      }

      .page-actions {
        display: flex;
        gap: 0.75rem;
      }

      @media (max-width: 768px) {
        .page-header {
          flex-direction: column;
          gap: 1rem;
        }

        .page-header h1 {
          font-size: 1.5rem;
        }
      }
    </style>
  `;
}
