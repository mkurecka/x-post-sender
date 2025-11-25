/**
 * Header component
 */

export interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function header({ title, subtitle }: HeaderProps): string {
  return `
    <header class="header">
      <div class="header-content">
        <h1 class="header-title">${title}</h1>
        ${subtitle ? `<p class="header-subtitle">${subtitle}</p>` : ''}
      </div>
    </header>

    <style>
      .header {
        background: var(--surface);
        border-bottom: 1px solid var(--border);
        padding: 2rem 0;
        margin-bottom: 2rem;
      }

      .header-content {
        max-width: 1400px;
        margin: 0 auto;
        padding: 0 2rem;
      }

      .header-title {
        font-size: 2rem;
        color: var(--primary);
        margin-bottom: 0.5rem;
      }

      .header-subtitle {
        color: var(--text-secondary);
        font-size: 1rem;
      }

      @media (max-width: 768px) {
        .header-content {
          padding: 0 1rem;
        }

        .header-title {
          font-size: 1.5rem;
        }
      }
    </style>
  `;
}
