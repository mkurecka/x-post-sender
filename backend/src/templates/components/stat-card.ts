/**
 * Stat Card component
 * Displays a statistic with title, value, and optional trend
 */

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: string;
}

export function statCard({ title, value, subtitle, trend, trendValue, icon }: StatCardProps): string {
  const trendClass = trend ? `trend-${trend}` : '';
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';

  return `
    <div class="stat-card">
      <div class="stat-card-header">
        <span class="stat-card-title">${title}</span>
        ${icon ? `<span class="stat-card-icon">${icon}</span>` : ''}
      </div>
      <div class="stat-card-value">${value}</div>
      ${subtitle ? `<div class="stat-card-subtitle">${subtitle}</div>` : ''}
      ${trend && trendValue ? `
        <div class="stat-card-trend ${trendClass}">
          <span class="trend-icon">${trendIcon}</span>
          <span class="trend-value">${trendValue}</span>
        </div>
      ` : ''}
    </div>

    <style>
      .stat-card {
        background: var(--surface);
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .stat-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }

      .stat-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
      }

      .stat-card-title {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .stat-card-icon {
        font-size: 1.25rem;
        opacity: 0.6;
      }

      .stat-card-value {
        font-size: 2rem;
        font-weight: 700;
        color: var(--text-primary);
        margin-bottom: 0.25rem;
      }

      .stat-card-subtitle {
        font-size: 0.875rem;
        color: var(--text-secondary);
      }

      .stat-card-trend {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.875rem;
        font-weight: 500;
        margin-top: 0.5rem;
      }

      .trend-up {
        color: var(--success);
      }

      .trend-down {
        color: var(--error);
      }

      .trend-neutral {
        color: var(--text-secondary);
      }

      .trend-icon {
        font-weight: bold;
      }
    </style>
  `;
}
