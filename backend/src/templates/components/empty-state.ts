/**
 * Empty State component
 * Shows when no data is available
 */

export interface EmptyStateProps {
  title: string;
  message: string;
  icon?: string;
  actionText?: string;
  actionUrl?: string;
}

export function emptyState({ title, message, icon = '📭', actionText, actionUrl }: EmptyStateProps): string {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">${icon}</div>
      <h3 class="empty-state-title">${title}</h3>
      <p class="empty-state-message">${message}</p>
      ${actionText && actionUrl ? `
        <a href="${actionUrl}" class="empty-state-action">${actionText}</a>
      ` : ''}
    </div>

    <style>
      .empty-state {
        text-align: center;
        padding: 3rem 1.5rem;
        background: var(--surface);
        border-radius: 12px;
        border: 2px dashed var(--border);
      }

      .empty-state-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
        opacity: 0.5;
      }

      .empty-state-title {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 0.5rem;
      }

      .empty-state-message {
        color: var(--text-secondary);
        font-size: 0.9375rem;
        max-width: 400px;
        margin: 0 auto 1.5rem;
      }

      .empty-state-action {
        display: inline-block;
        padding: 0.75rem 1.5rem;
        background: var(--primary);
        color: white;
        border-radius: 8px;
        font-weight: 500;
        transition: background 0.2s;
      }

      .empty-state-action:hover {
        background: var(--primary-dark);
        color: white;
      }
    </style>
  `;
}
