/**
 * HTML Template Generators for Visual Content
 * Generates HTML templates for different image types that can be converted to images
 * via html-to-image-worker
 */

// Image type specifications
const IMAGE_SPECS = {
  quote_card: { width: 1200, height: 630, name: 'Quote Card' },
  screenshot_card: { width: 1080, height: 1920, name: 'Screenshot Card' },
  infographic: { width: 800, height: 2000, name: 'Infographic' },
  story_card: { width: 1080, height: 1920, name: 'Story Card' },
  thumbnail: { width: 1280, height: 720, name: 'Thumbnail' },
};

// Default branding
const DEFAULT_BRANDING = {
  colors: {
    primary: '#2563eb',
    secondary: '#8b5cf6',
    background: '#ffffff',
    text: '#1f2937',
  },
  fonts: {
    heading: 'Inter, system-ui, sans-serif',
    body: 'Inter, system-ui, sans-serif',
  },
};

/**
 * Generate Quote Card HTML
 */
function generateQuoteCard(text, options = {}) {
  const branding = { ...DEFAULT_BRANDING, ...options.branding };
  const { width, height } = IMAGE_SPECS.quote_card;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: ${width}px;
      height: ${height}px;
      background: linear-gradient(135deg, ${branding.colors.primary} 0%, ${branding.colors.secondary} 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: ${branding.fonts.body};
      padding: 60px;
    }
    .quote-container {
      background: ${branding.colors.background};
      border-radius: 24px;
      padding: 60px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 100%;
    }
    .quote-mark {
      font-size: 80px;
      color: ${branding.colors.primary};
      line-height: 1;
      font-family: Georgia, serif;
      margin-bottom: 20px;
    }
    .quote-text {
      font-size: 36px;
      line-height: 1.5;
      color: ${branding.colors.text};
      font-weight: 600;
      font-family: ${branding.fonts.heading};
    }
    ${options.author ? `
    .quote-author {
      margin-top: 30px;
      font-size: 24px;
      color: ${branding.colors.primary};
      font-style: italic;
    }
    ` : ''}
  </style>
</head>
<body>
  <div class="quote-container">
    <div class="quote-mark">"</div>
    <div class="quote-text">${escapeHtml(text)}</div>
    ${options.author ? `<div class="quote-author">— ${escapeHtml(options.author)}</div>` : ''}
  </div>
</body>
</html>
  `;
}

/**
 * Generate Screenshot Card HTML (vertical story format)
 */
function generateScreenshotCard(text, options = {}) {
  const branding = { ...DEFAULT_BRANDING, ...options.branding };
  const { width, height } = IMAGE_SPECS.screenshot_card;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: ${width}px;
      height: ${height}px;
      background: ${branding.colors.background};
      display: flex;
      flex-direction: column;
      font-family: ${branding.fonts.body};
    }
    .header {
      padding: 40px;
      background: ${branding.colors.primary};
      color: white;
    }
    .header h1 {
      font-size: 48px;
      font-weight: 700;
      margin-bottom: 10px;
    }
    .header p {
      font-size: 28px;
      opacity: 0.9;
    }
    .content {
      flex: 1;
      padding: 60px 40px;
      display: flex;
      align-items: center;
    }
    .text {
      font-size: 40px;
      line-height: 1.6;
      color: ${branding.colors.text};
      font-weight: 500;
    }
    .footer {
      padding: 40px;
      background: ${branding.colors.text};
      color: white;
      text-align: center;
      font-size: 24px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(options.title || 'Post')}</h1>
    <p>${escapeHtml(options.subtitle || new Date().toLocaleDateString())}</p>
  </div>
  <div class="content">
    <div class="text">${escapeHtml(text)}</div>
  </div>
  <div class="footer">
    ${escapeHtml(options.account || '@universal-text-processor')}
  </div>
</body>
</html>
  `;
}

/**
 * Generate Infographic HTML
 */
function generateInfographic(text, options = {}) {
  const branding = { ...DEFAULT_BRANDING, ...options.branding };
  const { width, height } = IMAGE_SPECS.infographic;

  // Split text into bullet points (assume separated by newlines or periods)
  const points = text.split(/[.\n]/).filter(p => p.trim().length > 0).slice(0, 5);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: ${width}px;
      height: ${height}px;
      background: ${branding.colors.background};
      font-family: ${branding.fonts.body};
      padding: 60px 40px;
    }
    .title {
      font-size: 48px;
      font-weight: 700;
      color: ${branding.colors.primary};
      margin-bottom: 40px;
      text-align: center;
      font-family: ${branding.fonts.heading};
    }
    .points {
      display: flex;
      flex-direction: column;
      gap: 30px;
    }
    .point {
      background: linear-gradient(135deg, ${branding.colors.primary}15 0%, ${branding.colors.secondary}15 100%);
      border-left: 6px solid ${branding.colors.primary};
      padding: 30px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .point-number {
      width: 60px;
      height: 60px;
      background: ${branding.colors.primary};
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .point-text {
      font-size: 28px;
      line-height: 1.5;
      color: ${branding.colors.text};
      flex: 1;
    }
  </style>
</head>
<body>
  <h1 class="title">${escapeHtml(options.title || 'Key Points')}</h1>
  <div class="points">
    ${points.map((point, index) => `
      <div class="point">
        <div class="point-number">${index + 1}</div>
        <div class="point-text">${escapeHtml(point.trim())}</div>
      </div>
    `).join('')}
  </div>
</body>
</html>
  `;
}

/**
 * Generate Story Card HTML (Instagram/Facebook story format)
 */
function generateStoryCard(text, options = {}) {
  const branding = { ...DEFAULT_BRANDING, ...options.branding };
  const { width, height } = IMAGE_SPECS.story_card;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: ${width}px;
      height: ${height}px;
      background: linear-gradient(180deg, ${branding.colors.primary} 0%, ${branding.colors.secondary} 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: ${branding.fonts.body};
      padding: 80px 60px;
      position: relative;
    }
    .content {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 32px;
      padding: 80px 60px;
      text-align: center;
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.3);
    }
    .text {
      font-size: 48px;
      line-height: 1.5;
      color: ${branding.colors.text};
      font-weight: 600;
      font-family: ${branding.fonts.heading};
    }
    ${options.logo ? `
    .logo {
      position: absolute;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }
    ` : ''}
  </style>
</head>
<body>
  ${options.logo ? `<div class="logo">📱</div>` : ''}
  <div class="content">
    <div class="text">${escapeHtml(text)}</div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate Thumbnail HTML (YouTube/blog thumbnail)
 */
function generateThumbnail(text, options = {}) {
  const branding = { ...DEFAULT_BRANDING, ...options.branding };
  const { width, height } = IMAGE_SPECS.thumbnail;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: ${width}px;
      height: ${height}px;
      background: linear-gradient(135deg, ${branding.colors.primary} 0%, ${branding.colors.secondary} 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: ${branding.fonts.body};
      padding: 60px;
      position: relative;
    }
    .text-container {
      text-align: center;
    }
    .main-text {
      font-size: 72px;
      line-height: 1.2;
      color: white;
      font-weight: 900;
      font-family: ${branding.fonts.heading};
      text-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      text-transform: uppercase;
    }
    ${options.badge ? `
    .badge {
      position: absolute;
      top: 40px;
      right: 40px;
      background: ${branding.colors.secondary};
      color: white;
      padding: 20px 40px;
      border-radius: 12px;
      font-size: 32px;
      font-weight: 700;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
    }
    ` : ''}
  </style>
</head>
<body>
  <div class="text-container">
    <div class="main-text">${escapeHtml(text)}</div>
  </div>
  ${options.badge ? `<div class="badge">${escapeHtml(options.badge)}</div>` : ''}
</body>
</html>
  `;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Main generator function
 */
function generateTemplate(imageType, text, options = {}) {
  switch (imageType) {
    case 'quote_card':
      return generateQuoteCard(text, options);
    case 'screenshot_card':
      return generateScreenshotCard(text, options);
    case 'infographic':
      return generateInfographic(text, options);
    case 'story_card':
      return generateStoryCard(text, options);
    case 'thumbnail':
      return generateThumbnail(text, options);
    default:
      throw new Error(`Unknown image type: ${imageType}`);
  }
}

/**
 * Get image specifications
 */
function getImageSpec(imageType) {
  return IMAGE_SPECS[imageType];
}

/**
 * Get all available image types
 */
function getAvailableImageTypes() {
  return Object.keys(IMAGE_SPECS);
}
