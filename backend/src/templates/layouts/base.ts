/**
 * Base layout template
 * Provides HTML structure, meta tags, and global styles
 */

export interface BaseLayoutProps {
  title: string;
  content: string;
  styles?: string;
  scripts?: string;
}

export function baseLayout({ title, content, styles = '', scripts = '' }: BaseLayoutProps): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Universal Text Processor Dashboard">
  <title>${title}</title>

  <!-- Global Styles -->
  <style>
    :root {
      --primary: #065f4a;
      --primary-dark: #054433;
      --primary-light: #dcfce7;
      --secondary: #10b981;
      --background: #f9fafb;
      --surface: #ffffff;
      --text-primary: #111827;
      --text-secondary: #6b7280;
      --border: #e5e7eb;
      --error: #ef4444;
      --success: #10b981;
      --warning: #f59e0b;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: var(--background);
      color: var(--text-primary);
      line-height: 1.6;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }

    h1, h2, h3, h4, h5, h6 {
      font-weight: 600;
      line-height: 1.2;
    }

    a {
      color: var(--primary);
      text-decoration: none;
      transition: color 0.2s;
    }

    a:hover {
      color: var(--primary-dark);
    }

    button {
      cursor: pointer;
      border: none;
      background: none;
      font-family: inherit;
    }

    /* Card Component */
    .card {
      background: var(--surface);
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .card-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: var(--text-primary);
    }

    /* Grid System */
    .grid {
      display: grid;
      gap: 1.5rem;
    }

    .grid-2 {
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    }

    .grid-3 {
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    }

    .grid-4 {
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    }

    /* Utility Classes */
    .text-center { text-align: center; }
    .text-muted { color: var(--text-secondary); }
    .text-small { font-size: 0.875rem; }
    .mb-1 { margin-bottom: 0.5rem; }
    .mb-2 { margin-bottom: 1rem; }
    .mb-3 { margin-bottom: 1.5rem; }
    .mt-1 { margin-top: 0.5rem; }
    .mt-2 { margin-top: 1rem; }
    .mt-3 { margin-top: 1.5rem; }

    /* Loading State */
    .loading {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 3px solid var(--border);
      border-radius: 50%;
      border-top-color: var(--primary);
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .container {
        padding: 1rem;
      }

      .grid-2, .grid-3, .grid-4 {
        grid-template-columns: 1fr;
      }
    }
  </style>

  ${styles}
</head>
<body>
  ${content}

  ${scripts}
</body>
</html>`;
}
