// Configuration
let appSettings = null;
let selectedText = '';
let selectionContext = {};
let selectedImage = null;

console.log('[Universal Text Processor] Content script loaded on:', window.location.href);

// Fetch settings on script load
(async () => {
  try {
    const response = await fetch(chrome.runtime.getURL('settings.json'));
    appSettings = await response.json();
    console.log('[Universal Text Processor] Settings loaded successfully');
  } catch (error) {
    console.error('[Universal Text Processor] Failed to load settings:', error);
  }
})();

// Create floating action button
function createFloatingButton() {
  // Check if button already exists
  if (document.getElementById('utp-floating-button')) return;

  const fab = document.createElement('div');
  fab.id = 'utp-floating-button';
  fab.className = 'utp-fab utp-fab-hidden';
  fab.innerHTML = `
    <div class="utp-fab-main" title="Process Selected Text">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="17 8 12 3 7 8"></polyline>
        <line x1="12" y1="3" x2="12" y2="15"></line>
      </svg>
    </div>
    <div class="utp-fab-menu">
      <button class="utp-fab-action" data-action="process" title="Process with AI">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 1v6m0 6v6m5.5-10.5l-1.5 1.5m-6 6l-1.5 1.5m10.5 0l-1.5-1.5m-6-6L8.5 5.5"></path>
        </svg>
        <span>Process</span>
      </button>
      <button class="utp-fab-action" data-action="create-image" title="Create Visual Content">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
        <span>Create Image</span>
      </button>
      <button class="utp-fab-action" data-action="memory" title="Save to Memory">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
          <polyline points="17 21 17 13 7 13 7 21"></polyline>
          <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
        <span>Memory</span>
      </button>
      <button class="utp-fab-action" data-action="database" title="View Database">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
        </svg>
        <span>Database</span>
      </button>
      <button class="utp-fab-action" data-action="settings" title="Settings">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 1v6m0 6v6"></path>
          <path d="M17 7l-5 5m0 0l-5-5"></path>
        </svg>
        <span>Settings</span>
      </button>
    </div>
  `;

  document.body.appendChild(fab);

  // Toggle menu
  const mainButton = fab.querySelector('.utp-fab-main');

  mainButton.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    fab.classList.toggle('utp-fab-menu-open');
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!fab.contains(e.target) && fab.classList.contains('utp-fab-menu-open')) {
      fab.classList.remove('utp-fab-menu-open');
      // Also hide FAB if no text is currently selected
      const selection = window.getSelection();
      if (!selection.toString().trim()) {
        selectedText = ''; // Clear stored text
        fab.classList.remove('utp-fab-visible');
        fab.classList.add('utp-fab-hidden');
      }
    }
  });

  // Handle action clicks
  fab.querySelectorAll('.utp-fab-action').forEach(button => {
    button.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      const action = button.dataset.action;

      // Close menu
      fab.classList.remove('utp-fab-menu-open');

      // Handle action
      switch(action) {
        case 'process':
          if (selectedText && selectedText.length > 0) {
            openProcessModal(selectedText, selectionContext);
          } else {
            showFloatingNotification('Please select some text first', 'warning');
          }
          break;

        case 'create-image':
          if (selectedText && selectedText.length > 0) {
            openVisualContentModal(selectedText, selectionContext);
          } else {
            showFloatingNotification('Please select some text first', 'warning');
          }
          break;

        case 'memory':
          if (selectedText && selectedText.length > 0) {
            await saveToMemoryQuick(selectedText, selectionContext);
          } else {
            showFloatingNotification('Please select some text first', 'warning');
          }
          break;

        case 'database':
          openDatabaseViewer();
          break;

        case 'settings':
          openSettingsModal();
          break;
      }
    });
  });

  return fab;
}

// Show floating notification
function showFloatingNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `utp-notification utp-notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  // Trigger animation
  setTimeout(() => notification.classList.add('utp-notification-show'), 10);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.classList.remove('utp-notification-show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Wake up service worker if needed
async function wakeUpServiceWorker() {
  try {
    await chrome.runtime.sendMessage({ action: "ping" });
    return true;
  } catch (error) {
    console.warn('[Universal Text Processor] Service worker not responding:', error.message);
    return false;
  }
}

// Quick save to memory from FAB
async function saveToMemoryQuick(text, context) {
  try {
    // Wake up service worker first
    await wakeUpServiceWorker();

    await chrome.runtime.sendMessage({
      action: "saveToMemory",
      data: {
        text: text,
        context: context,
        savedAt: new Date().toISOString()
      }
    });

    showFloatingNotification('✓ Saved to memory', 'success');
    console.log('[Universal Text Processor] Quick saved to memory');
  } catch (error) {
    console.error('[Universal Text Processor] Failed to save:', error);
    showFloatingNotification('Failed to save', 'error');
  }
}

// Initialize FAB when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createFloatingButton);
} else {
  createFloatingButton();
}

// Listen for text selection
document.addEventListener('mouseup', handleTextSelection);
document.addEventListener('keyup', handleTextSelection);

// Listen for image clicks
document.addEventListener('click', handleImageClick, true);

function handleImageClick(event) {
  const target = event.target;

  // Check if clicked element is an image
  if (target.tagName === 'IMG') {
    // Don't interfere with normal image interactions
    // Only capture the image data
    selectedImage = {
      src: target.src,
      alt: target.alt || '',
      width: target.naturalWidth,
      height: target.naturalHeight
    };

    selectedText = `[Image: ${target.alt || target.src}]`;
    selectionContext = {
      url: window.location.href,
      pageTitle: document.title,
      timestamp: new Date().toISOString(),
      type: 'image',
      imageSrc: target.src
    };

    // Show FAB for image
    const fab = document.getElementById('utp-floating-button');
    if (fab) {
      fab.classList.remove('utp-fab-hidden');
      fab.classList.add('utp-fab-visible');
    }

    console.log('[Universal Text Processor] Image selected:', selectedImage.src);
  }
}

function handleTextSelection(event) {
  const selection = window.getSelection();
  const text = selection.toString().trim();
  const fab = document.getElementById('utp-floating-button');

  if (text.length > 0) {
    selectedText = text;
    selectedImage = null; // Clear image selection
    selectionContext = {
      url: window.location.href,
      pageTitle: document.title,
      timestamp: new Date().toISOString(),
      selector: getSelectionContext(selection)
    };

    // Show FAB when text is selected
    if (fab) {
      fab.classList.remove('utp-fab-hidden');
      fab.classList.add('utp-fab-visible');
    }
  } else {
    // DON'T hide FAB if menu is open or if we still have stored text/image
    if (fab && !fab.classList.contains('utp-fab-menu-open') && !selectedText && !selectedImage) {
      fab.classList.remove('utp-fab-visible');
      fab.classList.add('utp-fab-hidden');
    }
  }
}

function getSelectionContext(selection) {
  if (!selection.rangeCount) return null;

  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer;
  const element = container.nodeType === 3 ? container.parentElement : container;

  return {
    tagName: element.tagName,
    className: element.className,
    id: element.id
  };
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSelectedText") {
    sendResponse({
      text: selectedText,
      context: selectionContext
    });
  }

  if (request.action === "openProcessModal") {
    openProcessModal(selectedText, selectionContext);
    sendResponse({ success: true });
  }

  return true;
});

// Get language options for dropdown
function getLanguageOptions() {
  if (!appSettings || !appSettings.languages) {
    return '<option value="cs">Czech (Čeština)</option>';
  }

  const defaultLang = appSettings.ui?.defaultLanguage || 'cs';

  return appSettings.languages
    .map(lang => `<option value="${lang.code}" ${lang.code === defaultLang ? 'selected' : ''}>${lang.name}</option>`)
    .join('');
}

// Get mode options for radio buttons
function getModeOptions(defaultMode = null) {
  if (!appSettings || !appSettings.modes) {
    return `
      <label style="margin-bottom: 8px; cursor: pointer; display: block;">
        <input type="radio" name="plugin-mode" value="rewrite_twitter" checked> Rewrite for Twitter
      </label>
    `;
  }

  return Object.entries(appSettings.modes)
    .map(([key, mode], index) => {
      const isDefault = defaultMode ? key === defaultMode : index === 0;
      return `
        <label style="margin-bottom: 8px; cursor: pointer; display: block;">
          <input type="radio" name="plugin-mode" value="${key}" ${isDefault ? 'checked' : ''}>
          <strong>${mode.name}</strong> - <span style="font-size: 11px; color: #666;">${mode.description}</span>
        </label>
      `;
    }).join('');
}

// Get action-specific fields based on selected mode
async function getActionSpecificFields(mode) {
  // Load saved image model for describe_image mode
  let imageModelDisplay = 'google/gemini-2.0-flash-001'; // default
  if (mode === 'describe_image') {
    const savedModels = await new Promise((resolve) => {
      chrome.storage.local.get(['imageModel'], (result) => {
        resolve(result);
      });
    });
    imageModelDisplay = savedModels.imageModel || appSettings?.modes?.describe_image?.model || 'google/gemini-2.0-flash-001';
  }

  const fields = {
    rewrite_twitter: `
      <label><strong>Twitter Profile:</strong></label>
      <div style="margin-bottom: 15px;" id="account-options">
        ${getAccountOptions()}
      </div>
    `,
    article: `
      <label><strong>Target Website/Platform:</strong></label>
      <select id="plugin-target-platform" class="my-plugin-select" style="margin-bottom: 15px;">
        <option value="medium">Medium</option>
        <option value="substack">Substack</option>
        <option value="wordpress">WordPress</option>
        <option value="dev.to">Dev.to</option>
        <option value="hashnode">Hashnode</option>
        <option value="linkedin">LinkedIn Article</option>
        <option value="personal_blog">Personal Blog</option>
        <option value="general">General</option>
      </select>

      <label><strong>Article Style:</strong></label>
      <select id="plugin-article-style" class="my-plugin-select" style="margin-bottom: 15px;">
        <option value="tutorial">Tutorial/How-to</option>
        <option value="analysis">Analysis/Opinion</option>
        <option value="case_study">Case Study</option>
        <option value="news">News/Update</option>
        <option value="listicle">Listicle</option>
        <option value="story">Story/Narrative</option>
      </select>
    `,
    summarize: `
      <label><strong>Summary Length:</strong></label>
      <select id="plugin-summary-length" class="my-plugin-select" style="margin-bottom: 15px;">
        <option value="brief">Brief (1-2 sentences)</option>
        <option value="short" selected>Short (1 paragraph)</option>
        <option value="medium">Medium (2-3 paragraphs)</option>
        <option value="detailed">Detailed (4+ paragraphs)</option>
      </select>

      <label><strong>Summary Format:</strong></label>
      <select id="plugin-summary-format" class="my-plugin-select" style="margin-bottom: 15px;">
        <option value="paragraph">Paragraph</option>
        <option value="bullets">Bullet Points</option>
        <option value="numbered">Numbered List</option>
      </select>
    `,
    translate: `
      <label><strong>Target Language:</strong></label>
      <select id="plugin-target-language" class="my-plugin-select" style="margin-bottom: 15px;">
        ${getLanguageOptions()}
      </select>

      <label><strong>Translation Style:</strong></label>
      <select id="plugin-translation-style" class="my-plugin-select" style="margin-bottom: 15px;">
        <option value="literal">Literal (Word-for-word)</option>
        <option value="natural" selected>Natural (Localized)</option>
        <option value="formal">Formal</option>
        <option value="casual">Casual</option>
      </select>
    `,
    extract_insights: `
      <label><strong>Number of Insights:</strong></label>
      <select id="plugin-insights-count" class="my-plugin-select" style="margin-bottom: 15px;">
        <option value="3">Top 3 Insights</option>
        <option value="5" selected>Top 5 Insights</option>
        <option value="7">Top 7 Insights</option>
        <option value="10">Top 10 Insights</option>
      </select>

      <label><strong>Focus On:</strong></label>
      <select id="plugin-insights-focus" class="my-plugin-select" style="margin-bottom: 15px;">
        <option value="all" selected>All Insights</option>
        <option value="actionable">Actionable Items</option>
        <option value="lessons">Key Lessons</option>
        <option value="data">Data/Statistics</option>
        <option value="quotes">Important Quotes</option>
      </select>
    `,
    memory: `
      <label><strong>Category/Tag:</strong></label>
      <input type="text" id="plugin-memory-tag" class="my-plugin-input" placeholder="e.g., research, quotes, ideas..." style="margin-bottom: 15px;">

      <label><strong>Priority:</strong></label>
      <select id="plugin-memory-priority" class="my-plugin-select" style="margin-bottom: 15px;">
        <option value="low">Low - Reference</option>
        <option value="medium" selected>Medium - Important</option>
        <option value="high">High - Critical</option>
      </select>
    `,
    describe_image: `
      <div style="padding: 12px; background: rgba(102, 126, 234, 0.08); border-radius: 12px; margin-bottom: 15px;">
        <div style="font-size: 13px; font-weight: 600; color: #667eea; margin-bottom: 8px;">
          🤖 AI Vision Analysis
        </div>
        <div style="font-size: 12px; color: #666; line-height: 1.5;">
          Using <strong>${imageModelDisplay}</strong> to analyze the image and generate a detailed recreation prompt for AI image generators.
        </div>
      </div>

      <label><strong>Analysis Detail Level:</strong></label>
      <select id="plugin-image-detail" class="my-plugin-select" style="margin-bottom: 15px;">
        <option value="standard" selected>Standard Analysis</option>
        <option value="detailed">Detailed Analysis</option>
        <option value="technical">Technical (for photographers)</option>
        <option value="artistic">Artistic (for designers)</option>
      </select>
    `
  };

  return fields[mode] || `
    <label><strong>Profile/Account:</strong></label>
    <div style="margin-bottom: 15px;" id="account-options">
      ${getAccountOptions()}
    </div>
  `;
}

// Get account options
function getAccountOptions() {
  if (!appSettings || !appSettings.accounts) {
    return `
      <label style="margin-right: 15px; cursor: pointer;">
        <input type="radio" name="plugin-account" value="default" checked> Default Profile
      </label>
    `;
  }

  return appSettings.accounts
    .filter(acc => acc.enabled)
    .map((acc, index) => `
      <label style="margin-right: 15px; cursor: pointer;">
        <input type="radio" name="plugin-account" value="${acc.id}" ${index === 0 ? 'checked' : ''}> ${acc.displayName}
      </label>
    `).join('');
}

// Collect action-specific parameters based on mode
function collectActionParameters(mode) {
  const params = { mode };

  switch(mode) {
    case 'rewrite_twitter':
      const twitterAccount = document.querySelector('input[name="plugin-account"]:checked');
      params.account = twitterAccount ? twitterAccount.value : 'default';
      break;

    case 'article':
      params.targetPlatform = document.getElementById('plugin-target-platform')?.value || 'general';
      params.articleStyle = document.getElementById('plugin-article-style')?.value || 'tutorial';
      break;

    case 'summarize':
      params.summaryLength = document.getElementById('plugin-summary-length')?.value || 'short';
      params.summaryFormat = document.getElementById('plugin-summary-format')?.value || 'paragraph';
      break;

    case 'translate':
      params.targetLanguage = document.getElementById('plugin-target-language')?.value || 'en';
      params.translationStyle = document.getElementById('plugin-translation-style')?.value || 'natural';
      break;

    case 'extract_insights':
      params.insightsCount = document.getElementById('plugin-insights-count')?.value || '5';
      params.insightsFocus = document.getElementById('plugin-insights-focus')?.value || 'all';
      break;

    case 'memory':
      params.memoryTag = document.getElementById('plugin-memory-tag')?.value || '';
      params.memoryPriority = document.getElementById('plugin-memory-priority')?.value || 'medium';
      break;

    case 'describe_image':
      params.detailLevel = document.getElementById('plugin-image-detail')?.value || 'standard';
      break;

    default:
      const defaultAccount = document.querySelector('input[name="plugin-account"]:checked');
      params.account = defaultAccount ? defaultAccount.value : 'default';
  }

  return params;
}

// Open the processing modal
async function openProcessModal(text, context) {
  console.log('[Universal Text Processor] Opening modal with text:', text?.substring(0, 50));

  if (!text || text.length === 0) {
    console.warn('[Universal Text Processor] No text provided to modal');
    alert('No text selected. Please select some text first.');
    return;
  }

  // Check if API key is configured
  let keyStatus;
  try {
    keyStatus = await checkApiKey();
    console.log('[Universal Text Processor] API key status:', keyStatus.hasKey);
  } catch (error) {
    console.error('[Universal Text Processor] Error checking API key:', error);
    keyStatus = { hasKey: false };
  }

  // Check if processing an image
  const isImage = context.type === 'image' && selectedImage;

  // Get initial action-specific fields (async)
  const initialMode = isImage ? 'describe_image' : 'rewrite_twitter';
  const initialFields = await getActionSpecificFields(initialMode);

  // HTML Template for the Modal
  const modalHtml = `
    <div class="my-plugin-overlay" id="my-plugin-overlay">
      <div class="my-plugin-modal" style="max-height: 85vh; overflow-y: auto;">
        <h3>${isImage ? '🖼️ Process Image' : '📝 Process Selected Text'}</h3>

        <div style="background: #f5f5f5; padding: 10px; border-radius: 5px; margin-bottom: 15px; max-height: ${isImage ? '250px' : '120px'}; overflow-y: auto;">
          <div style="font-size: 11px; color: #666; margin-bottom: 5px;">
            <strong>From:</strong> ${context.pageTitle || context.url}
          </div>
          ${isImage ? `
            <img src="${selectedImage.src}" style="max-width: 100%; max-height: 200px; object-fit: contain; border-radius: 8px; margin: 8px 0;" alt="Selected image">
            <div style="font-size: 10px; color: #999; margin-top: 5px;">
              ${selectedImage.width} × ${selectedImage.height}px
            </div>
          ` : `
            <div style="font-size: 12px; color: #333;">
              ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}
            </div>
            <div style="font-size: 10px; color: #999; margin-top: 5px;">
              ${text.length} characters
            </div>
          `}
        </div>

        ${!keyStatus.hasKey ? '<div style="padding: 10px; background: #fff3cd; border-radius: 5px; margin-bottom: 15px; font-size: 12px;"><strong>⚠️ API Key Required:</strong> Please <a href="#" id="setup-api-key" style="color: #0066cc; text-decoration: underline;">configure your OpenRouter API key</a> to use AI processing.</div>' : ''}

        <label><strong>Action:</strong></label>
        <div style="margin-bottom: 15px; padding: 10px; background: #fafafa; border-radius: 5px;">
          ${isImage ? getModeOptions('describe_image') : getModeOptions()}
        </div>

        <div id="action-specific-fields">
          ${initialFields}
        </div>

        <label id="language-label"><strong>Output Language:</strong></label>
        <select id="plugin-language" class="my-plugin-select" style="margin-bottom: 15px;">
          ${getLanguageOptions()}
        </select>

        <label><strong>Additional Instructions (optional):</strong></label>
        <textarea id="plugin-comment" class="my-plugin-input" rows="2" placeholder="Add any additional instructions or context..."></textarea>

        <div style="margin-top: 10px; margin-bottom: 10px;">
          <label style="cursor: pointer; font-size: 12px;">
            <input type="checkbox" id="plugin-send-webhook" ${appSettings?.webhook?.enabled ? 'checked' : ''}>
            Send to webhook
          </label>
          <span style="font-size: 10px; color: #666; margin-left: 5px;">
            (${appSettings?.webhook?.url || 'Not configured'})
          </span>
        </div>

        <div id="plugin-status" style="margin-top:10px; font-size:12px;"></div>

        <div id="plugin-response" style="margin-top:15px; padding:10px; background:#f5f5f5; border-radius:5px; display:none;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <strong>Generated Content:</strong>
            <button id="plugin-copy" class="btn-copy" style="padding: 4px 12px; font-size: 11px; cursor: pointer; background: #1da1f2; color: white; border: none; border-radius: 4px;">
              📋 Copy
            </button>
          </div>
          <div id="plugin-response-text" style="margin-top:8px; white-space:pre-wrap; max-height: 300px; overflow-y: auto; padding: 8px; background: white; border-radius: 4px; border: 1px solid #ddd;"></div>

          <div id="plugin-actions" style="display: flex; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid #ddd;">
            <button id="plugin-approve" class="btn-approve" style="flex: 1; padding: 6px 12px; background: #17bf63; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">
              ✓ Approve
            </button>
            <button id="plugin-reject" class="btn-reject" style="flex: 1; padding: 6px 12px; background: #e0245e; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">
              ✗ Reject
            </button>
          </div>
        </div>

        <div class="my-plugin-actions">
          <button id="plugin-cancel" class="btn-cancel">Cancel</button>
          <button id="plugin-save-memory" class="btn-settings">💾 Save to Memory</button>
          <button id="plugin-send" class="btn-send" ${!keyStatus.hasKey ? 'disabled' : ''}>Process</button>
        </div>
      </div>
    </div>
  `;

  // Inject Modal into body
  const wrapper = document.createElement("div");
  wrapper.innerHTML = modalHtml;
  document.body.appendChild(wrapper);

  // Event Listeners for Modal
  document.getElementById("plugin-cancel").addEventListener("click", closePopup);

  // Close modal when clicking on overlay (outside the modal)
  const overlay = document.getElementById("my-plugin-overlay");
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      closePopup();
    }
  });

  // Handle mode change to update action-specific fields
  document.querySelectorAll('input[name="plugin-mode"]').forEach(radio => {
    radio.addEventListener('change', async (e) => {
      const selectedMode = e.target.value;
      const fieldsContainer = document.getElementById('action-specific-fields');
      const languageLabel = document.getElementById('language-label');
      const languageSelect = document.getElementById('plugin-language');

      // Update action-specific fields (await because it's now async)
      const newFields = await getActionSpecificFields(selectedMode);
      fieldsContainer.innerHTML = newFields;

      // Hide language selector for translate (has its own target language)
      if (selectedMode === 'translate') {
        languageLabel.style.display = 'none';
        languageSelect.style.display = 'none';
      } else {
        languageLabel.style.display = 'block';
        languageSelect.style.display = 'block';
      }

      // Hide webhook and comment for memory mode
      const webhookDiv = document.querySelector('#plugin-send-webhook')?.parentElement;
      const commentLabel = document.querySelector('label[for="plugin-comment"]')?.previousElementSibling;
      const commentTextarea = document.getElementById('plugin-comment');

      if (selectedMode === 'memory') {
        if (webhookDiv) webhookDiv.style.display = 'none';
      } else {
        if (webhookDiv) webhookDiv.style.display = 'block';
      }

      console.log('[Universal Text Processor] Mode changed to:', selectedMode);
    });
  });

  document.getElementById("plugin-send").addEventListener("click", () => {
    const mode = document.querySelector('input[name="plugin-mode"]:checked').value;

    // Collect action-specific parameters
    const actionParams = collectActionParameters(mode);

    const language = document.getElementById("plugin-language")?.value || 'en';
    const comment = document.getElementById("plugin-comment").value;
    const sendWebhook = document.getElementById("plugin-send-webhook")?.checked || false;

    processText(text, context, mode, actionParams, language, comment, sendWebhook);
  });

  document.getElementById("plugin-save-memory").addEventListener("click", () => {
    saveToMemoryOnly(text, context);
  });

  // Setup API key link if shown
  const setupLink = document.getElementById("setup-api-key");
  if (setupLink) {
    setupLink.addEventListener("click", (e) => {
      e.preventDefault();
      openSettingsModal();
    });
  }

  // ESC key to close popup
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closePopup();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

// Check if API key is configured
async function checkApiKey() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "getApiKey" }, (response) => {
      resolve(response || { hasKey: false });
    });
  });
}

function closePopup() {
  const overlay = document.getElementById("my-plugin-overlay");
  if (overlay) overlay.remove();
}

// Save to memory only (no processing)
async function saveToMemoryOnly(text, context) {
  const statusDiv = document.getElementById("plugin-status");
  statusDiv.innerText = "Saving to memory...";
  statusDiv.style.color = "blue";

  try {
    const savedEntry = await chrome.runtime.sendMessage({
      action: "saveToMemory",
      data: {
        text: text,
        context: context,
        savedAt: new Date().toISOString()
      }
    });

    statusDiv.innerText = "✓ Saved to memory successfully!";
    statusDiv.style.color = "green";

    setTimeout(() => {
      statusDiv.innerText = "";
    }, 2000);

    console.log("Saved to memory:", savedEntry);
  } catch (error) {
    console.error("Failed to save to memory:", error);
    statusDiv.innerText = "Failed to save to memory";
    statusDiv.style.color = "red";
  }
}

// Save to memory with parameters (from memory mode)
async function saveToMemoryWithParams(text, context, actionParams) {
  const statusDiv = document.getElementById("plugin-status");
  statusDiv.innerText = "Saving to memory...";
  statusDiv.style.color = "blue";

  try {
    const savedEntry = await chrome.runtime.sendMessage({
      action: "saveToMemory",
      data: {
        text: text,
        context: {
          ...context,
          tag: actionParams.memoryTag,
          priority: actionParams.memoryPriority
        },
        savedAt: new Date().toISOString()
      }
    });

    statusDiv.innerText = `✓ Saved to memory ${actionParams.memoryTag ? `(${actionParams.memoryTag})` : ''}`;
    statusDiv.style.color = "green";

    setTimeout(() => {
      closePopup();
    }, 1500);

    console.log("Saved to memory with params:", savedEntry);
  } catch (error) {
    console.error("Failed to save to memory:", error);
    statusDiv.innerText = "Failed to save to memory";
    statusDiv.style.color = "red";
  }
}

// Process text with AI
async function processText(text, context, mode, actionParams, language, comment, sendWebhook) {
  const statusDiv = document.getElementById("plugin-status");
  const responseDiv = document.getElementById("plugin-response");
  const responseText = document.getElementById("plugin-response-text");

  // Check if mode is "memory" - just save without processing
  if (mode === "memory") {
    saveToMemoryWithParams(text, context, actionParams);
    return;
  }

  statusDiv.innerText = "Processing with AI...";
  statusDiv.style.color = "blue";
  responseDiv.style.display = "none";

  // Use image URL directly for image mode (no base64 conversion needed)
  let imageData = null;
  if (mode === 'describe_image' && selectedImage && selectedImage.src) {
    imageData = selectedImage.src;

    // Extract actual image URL from CDN proxies (Substack, Cloudinary, etc.)
    if (imageData.includes('substackcdn.com/image/fetch/')) {
      // Extract the actual URL from Substack CDN format
      const match = imageData.match(/https:\/\/substackcdn\.com\/image\/fetch\/[^/]+\/(https?%3A%2F%2F[^?]+)/);
      if (match && match[1]) {
        const actualUrl = decodeURIComponent(match[1]);
        console.log('[Universal Text Processor] Extracted actual URL from Substack CDN:', actualUrl);
        console.log('[Universal Text Processor] Original CDN URL:', imageData);
        imageData = actualUrl;
      }
    }

    statusDiv.innerText = "Processing with AI Vision...";
    console.log('[Universal Text Processor] Final image URL being sent:', imageData);
  }

  // Send message to background.js
  chrome.runtime.sendMessage(
    {
      action: "processText",
      data: {
        text: text,
        context: context,
        mode: mode,
        actionParams: actionParams,
        account: actionParams.account || 'default',
        language: language,
        comment: comment,
        sendWebhook: sendWebhook,
        imageData: imageData
      }
    },
    async (response) => {
      if (response && response.success) {
        statusDiv.innerText = "Content generated successfully!";
        statusDiv.style.color = "green";

        // Display the generated content
        responseDiv.style.display = "block";
        responseText.innerText = response.content;

        // Save to database
        let savedPost = null;
        try {
          savedPost = await chrome.runtime.sendMessage({
            action: "saveProcessedText",
            data: {
              originalText: text,
              generatedOutput: response.content,
              mode: mode,
              account: actionParams.account || 'default',
              language: language,
              comment: comment,
              context: context
            }
          });
          console.log("Processed text saved to database:", savedPost);
        } catch (err) {
          console.error("Failed to save to database:", err);
        }

        // Set up copy to clipboard functionality
        setupCopyButton(response.content);

        // Set up approve/reject buttons
        setupApproveRejectButtons(savedPost, statusDiv);
      } else {
        statusDiv.innerText = "Error: " + (response.error || "Unknown error");
        statusDiv.style.color = "red";
      }
    }
  );
}

// Setup copy button functionality
function setupCopyButton(content) {
  const copyBtn = document.getElementById("plugin-copy");
  if (copyBtn) {
    const newCopyBtn = copyBtn.cloneNode(true);
    copyBtn.parentNode.replaceChild(newCopyBtn, copyBtn);

    newCopyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(content);

        const originalText = newCopyBtn.innerHTML;
        newCopyBtn.innerHTML = "✓ Copied!";
        newCopyBtn.style.background = "#17bf63";

        setTimeout(() => {
          newCopyBtn.innerHTML = originalText;
          newCopyBtn.style.background = "#1da1f2";
        }, 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
        newCopyBtn.innerHTML = "❌ Failed";
        newCopyBtn.style.background = "#e0245e";

        setTimeout(() => {
          newCopyBtn.innerHTML = "📋 Copy";
          newCopyBtn.style.background = "#1da1f2";
        }, 2000);
      }
    });
  }
}

// Setup approve/reject buttons
function setupApproveRejectButtons(savedPost, statusDiv) {
  const approveBtn = document.getElementById("plugin-approve");
  const rejectBtn = document.getElementById("plugin-reject");

  if (approveBtn && savedPost) {
    approveBtn.addEventListener("click", async () => {
      await chrome.runtime.sendMessage({
        action: "updatePostStatus",
        data: { id: savedPost.id, status: "approved" }
      });
      statusDiv.innerText = "Post approved and saved!";
      statusDiv.style.color = "green";
      approveBtn.disabled = true;
      rejectBtn.disabled = true;
    });
  }

  if (rejectBtn && savedPost) {
    rejectBtn.addEventListener("click", async () => {
      await chrome.runtime.sendMessage({
        action: "updatePostStatus",
        data: { id: savedPost.id, status: "rejected" }
      });
      statusDiv.innerText = "Post rejected";
      statusDiv.style.color = "orange";
      approveBtn.disabled = true;
      rejectBtn.disabled = true;
    });
  }
}

// Visual Content Modal
async function openVisualContentModal(text, context) {
  console.log('[Visual Content] Opening modal with text:', text?.substring(0, 50));

  if (!text || text.length === 0) {
    showFloatingNotification('No text selected', 'warning');
    return;
  }

  const visualSettings = appSettings?.visualContent || {};
  const imageTypes = visualSettings.imageTypes || {};

  const modalHtml = `
    <div class="my-plugin-overlay" id="visual-content-overlay">
      <div class="my-plugin-modal" style="max-height: 85vh; overflow-y: auto;">
        <h3>🎨 Create Visual Content</h3>

        <div style="background: #f5f5f5; padding: 10px; border-radius: 5px; margin-bottom: 15px; max-height: 120px; overflow-y: auto;">
          <div style="font-size: 11px; color: #666; margin-bottom: 5px;">
            <strong>From:</strong> ${context.pageTitle || context.url}
          </div>
          <div style="font-size: 12px; color: #333;">
            ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}
          </div>
        </div>

        <label><strong>Generation Mode:</strong></label>
        <div style="margin-bottom: 15px;">
          <label style="display: block; padding: 8px; margin: 5px 0; background: #fafafa; border-radius: 5px; cursor: pointer; border: 2px solid transparent;">
            <input type="radio" name="gen-mode" value="template" checked style="margin-right: 8px;">
            <span>📄 Template-based</span>
            <span style="font-size: 11px; color: #666; display: block; margin-left: 24px;">
              Generate images from HTML templates (fast, consistent)
            </span>
          </label>
          <label style="display: block; padding: 8px; margin: 5px 0; background: #e8f4fd; border-radius: 5px; cursor: pointer; border: 2px solid transparent;">
            <input type="radio" name="gen-mode" value="ai" style="margin-right: 8px;">
            <span>🤖 AI Generated</span>
            <span style="font-size: 11px; color: #666; display: block; margin-left: 24px;">
              Generate images using AI (DALL-E, creative, unique)
            </span>
          </label>
        </div>

        <div id="template-options">
          <label><strong>Image Types:</strong></label>
          <div id="image-types-selector" style="margin-bottom: 15px;">
            ${Object.entries(imageTypes).map(([key, spec]) => `
              <label style="display: block; padding: 8px; margin: 5px 0; background: #fafafa; border-radius: 5px; cursor: pointer; border: 2px solid transparent;">
                <input type="checkbox" class="image-type-checkbox" value="${key}" style="margin-right: 8px;">
                <span>${spec.icon} ${spec.name}</span>
                <span style="font-size: 11px; color: #666; display: block; margin-left: 24px;">
                  ${spec.description}
                </span>
              </label>
            `).join('')}
          </div>
        </div>

        <div id="ai-options" style="display: none;">
          <div style="margin-bottom: 10px;">
            <label><strong>AI Model:</strong></label>
            <select id="ai-model" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
              <option value="">Loading models...</option>
            </select>
          </div>
          <label><strong>AI Image Prompt:</strong></label>
          <textarea id="ai-prompt" style="width: 100%; height: 80px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 10px; resize: vertical;" placeholder="Describe the image you want to generate based on the text above..."></textarea>
          <div style="margin-bottom: 10px;">
            <label><strong>Style:</strong></label>
            <select id="ai-style" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
              <option value="vivid">Vivid (dramatic, hyper-real)</option>
              <option value="natural">Natural (realistic, subtle)</option>
            </select>
          </div>
          <div style="margin-bottom: 15px;">
            <label><strong>Aspect Ratio:</strong></label>
            <select id="ai-size" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
              <option value="1:1">Square (1:1)</option>
              <option value="16:9">Landscape (16:9)</option>
              <option value="9:16">Portrait (9:16)</option>
              <option value="4:3">Standard (4:3)</option>
              <option value="3:4">Portrait Standard (3:4)</option>
            </select>
          </div>
          <button id="ai-suggest-prompt" type="button" style="padding: 8px 12px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 5px; cursor: pointer; margin-bottom: 15px;">
            ✨ Suggest prompt from text
          </button>
        </div>

        <label style="cursor: pointer; margin-bottom: 15px; display: block;">
          <input type="checkbox" id="carousel-mode" ${visualSettings.carousel?.enabled ? 'checked' : ''}>
          <strong>Carousel Mode</strong>
          <span style="font-size: 11px; color: #666;">(Generate multiple images)</span>
        </label>

        <label style="cursor: pointer; margin-bottom: 15px; display: block;">
          <input type="checkbox" id="generate-caption" ${visualSettings.captionGeneration?.enabled ? 'checked' : ''}>
          <strong>Generate Caption</strong>
        </label>

        <div id="visual-status" style="margin-top:10px; font-size:12px;"></div>

        <div id="visual-preview" style="margin-top:15px; display:none;">
          <strong>Generated Images:</strong>
          <div id="visual-images" style="margin-top:10px; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;"></div>
          <div id="visual-caption" style="margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 5px; display: none;"></div>
        </div>

        <div class="modal-actions">
          <button id="visual-generate" class="btn-primary" style="flex: 1; padding: 10px; background: #1da1f2; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">
            🎨 Generate Images
          </button>
          <button id="visual-close" class="btn-secondary" style="padding: 10px 20px; background: #ccc; color: #333; border: none; border-radius: 4px; cursor: pointer;">
            Close
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  const overlay = document.getElementById('visual-content-overlay');

  // Mode switching event handlers
  const modeRadios = document.querySelectorAll('input[name="gen-mode"]');
  const templateOptions = document.getElementById('template-options');
  const aiOptions = document.getElementById('ai-options');
  const generateBtn = document.getElementById('visual-generate');
  const aiModelSelect = document.getElementById('ai-model');
  let imageModelsLoaded = false;

  // Function to load image models from API
  async function loadImageModels() {
    if (imageModelsLoaded) return;

    try {
      const backendUrl = appSettings?.backend?.baseUrl || 'https://text-processor-api.kureckamichal.workers.dev';
      const response = await fetch(`${backendUrl}/api/proxy/image-models`);
      const data = await response.json();

      if (data.success && data.data?.length > 0) {
        aiModelSelect.innerHTML = data.data.map(model => {
          const price = model.pricing !== 'unknown' ? ` ($${parseFloat(model.pricing).toFixed(4)}/img)` : '';
          return `<option value="${model.id}">${model.name}${price}</option>`;
        }).join('');
        imageModelsLoaded = true;
      } else {
        aiModelSelect.innerHTML = '<option value="google/gemini-2.5-flash-image">Gemini 2.5 Flash Image</option>';
      }
    } catch (error) {
      console.error('Failed to load image models:', error);
      aiModelSelect.innerHTML = '<option value="google/gemini-2.5-flash-image">Gemini 2.5 Flash Image</option>';
    }
  }

  modeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'template') {
        templateOptions.style.display = 'block';
        aiOptions.style.display = 'none';
        generateBtn.innerHTML = '🎨 Generate Images';
      } else {
        templateOptions.style.display = 'none';
        aiOptions.style.display = 'block';
        generateBtn.innerHTML = '🤖 Generate AI Image';
        // Load models when AI mode is selected
        loadImageModels();
      }
    });
  });

  // Suggest prompt from text button
  document.getElementById('ai-suggest-prompt').addEventListener('click', async () => {
    const promptTextarea = document.getElementById('ai-prompt');
    const suggestBtn = document.getElementById('ai-suggest-prompt');

    suggestBtn.disabled = true;
    suggestBtn.innerHTML = '⏳ Generating...';

    try {
      await wakeUpServiceWorker();

      const response = await chrome.runtime.sendMessage({
        action: 'suggestImagePrompt',
        text: text
      });

      if (response.success && response.prompt) {
        promptTextarea.value = response.prompt;
      } else {
        showFloatingNotification(response.error || 'Failed to generate prompt suggestion', 'error');
      }
    } catch (error) {
      console.error('Suggest prompt error:', error);
      showFloatingNotification('Failed to suggest prompt', 'error');
    } finally {
      suggestBtn.disabled = false;
      suggestBtn.innerHTML = '✨ Suggest prompt from text';
    }
  });

  // Generate button handler
  document.getElementById('visual-generate').addEventListener('click', async () => {
    const selectedMode = document.querySelector('input[name="gen-mode"]:checked').value;
    const generateCaption = document.getElementById('generate-caption').checked;
    const statusDiv = document.getElementById('visual-status');

    // AI Mode
    if (selectedMode === 'ai') {
      const aiModel = document.getElementById('ai-model').value;
      const aiPrompt = document.getElementById('ai-prompt').value.trim();
      const aiStyle = document.getElementById('ai-style').value;
      const aiSize = document.getElementById('ai-size').value;

      if (!aiPrompt) {
        showFloatingNotification('Please enter an image prompt or click "Suggest prompt from text"', 'warning');
        return;
      }

      statusDiv.innerHTML = '⏳ Generating AI image...';
      statusDiv.style.color = '#1da1f2';

      try {
        await wakeUpServiceWorker();

        const response = await chrome.runtime.sendMessage({
          action: 'generateAIImage',
          model: aiModel,
          prompt: aiPrompt,
          style: aiStyle,
          aspectRatio: aiSize,
          generateCaption,
          originalText: text,
          context
        });

        if (response.success) {
          statusDiv.innerHTML = '✅ AI image generated successfully!';
          statusDiv.style.color = 'green';

          const previewDiv = document.getElementById('visual-preview');
          const imagesDiv = document.getElementById('visual-images');
          previewDiv.style.display = 'block';

          imagesDiv.innerHTML = `
            <div style="border: 1px solid #ddd; border-radius: 5px; overflow: hidden;">
              <img src="${response.imageUrl}" style="width: 100%; height: auto;" alt="AI Generated">
              <div style="padding: 5px; font-size: 11px; background: #f5f5f5;">
                AI Generated (${aiSize})
              </div>
            </div>
          `;

          if (response.caption) {
            const captionDiv = document.getElementById('visual-caption');
            captionDiv.innerHTML = `<strong>Caption:</strong><br>${response.caption}`;
            captionDiv.style.display = 'block';
          }

          showFloatingNotification('AI image generated successfully!', 'success');
        } else {
          statusDiv.innerHTML = `❌ Error: ${response.error}`;
          statusDiv.style.color = 'red';
          showFloatingNotification(response.error || 'Failed to generate AI image', 'error');
        }
      } catch (error) {
        console.error('AI image error:', error);
        statusDiv.innerHTML = `❌ Error: ${error.message}`;
        statusDiv.style.color = 'red';
        showFloatingNotification('Failed to generate AI image', 'error');
      }
      return;
    }

    // Template Mode (existing logic)
    const selectedTypes = Array.from(document.querySelectorAll('.image-type-checkbox:checked'))
      .map(cb => cb.value);

    if (selectedTypes.length === 0) {
      showFloatingNotification('Please select at least one image type', 'warning');
      return;
    }

    const carouselMode = document.getElementById('carousel-mode').checked;

    statusDiv.innerHTML = '⏳ Generating images...';
    statusDiv.style.color = '#1da1f2';

    try {
      // Wake up service worker
      await wakeUpServiceWorker();

      // Send to background script
      const response = await chrome.runtime.sendMessage({
        action: 'createVisualContent',
        text,
        imageTypes: selectedTypes,
        carouselMode,
        generateCaption,
        context
      });

      if (response.success) {
        statusDiv.innerHTML = '✅ Images generated successfully!';
        statusDiv.style.color = 'green';

        // Show preview
        const previewDiv = document.getElementById('visual-preview');
        const imagesDiv = document.getElementById('visual-images');
        previewDiv.style.display = 'block';

        imagesDiv.innerHTML = response.images.map(img => `
          <div style="border: 1px solid #ddd; border-radius: 5px; overflow: hidden;">
            <img src="${img.url}" style="width: 100%; height: auto;" alt="${img.type}">
            <div style="padding: 5px; font-size: 11px; background: #f5f5f5;">
              ${img.type} (${img.width}×${img.height})
            </div>
          </div>
        `).join('');

        if (response.caption) {
          const captionDiv = document.getElementById('visual-caption');
          captionDiv.innerHTML = `<strong>Caption:</strong><br>${response.caption}`;
          captionDiv.style.display = 'block';
        }

        showFloatingNotification('Visual content created successfully!', 'success');
      } else {
        statusDiv.innerHTML = `❌ Error: ${response.error}`;
        statusDiv.style.color = 'red';
        showFloatingNotification(response.error || 'Failed to generate images', 'error');
      }
    } catch (error) {
      console.error('Visual content error:', error);
      statusDiv.innerHTML = `❌ Error: ${error.message}`;
      statusDiv.style.color = 'red';
      showFloatingNotification('Failed to generate images', 'error');
    }
  });

  // Close button
  document.getElementById('visual-close').addEventListener('click', () => {
    overlay.remove();
  });

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
}

// Settings Modal
async function openSettingsModal() {
  const keyStatus = await checkApiKey();
  const maskedKey = keyStatus.apiKey ? `${keyStatus.apiKey.substring(0, 10)}...${keyStatus.apiKey.substring(keyStatus.apiKey.length - 4)}` : 'Not configured';

  // Load saved model settings and prompts
  const savedSettings = await new Promise((resolve) => {
    chrome.storage.local.get(['contentModel', 'imageModel', 'customPrompts'], (result) => {
      resolve(result);
    });
  });

  const contentModel = savedSettings.contentModel || appSettings?.api?.model || 'openai/gpt-4o-mini';
  const imageModel = savedSettings.imageModel || appSettings?.modes?.describe_image?.model || 'google/gemini-2.0-flash-001';
  const customPrompts = savedSettings.customPrompts || {};

  const webhookConfig = appSettings?.webhook || {};

  // Get default prompts from settings.json
  const defaultPrompts = {};
  if (appSettings?.modes) {
    Object.entries(appSettings.modes).forEach(([key, mode]) => {
      defaultPrompts[key] = mode.promptTemplate || '';
    });
  }

  const settingsHtml = `
    <div class="my-plugin-overlay" id="settings-overlay">
      <div class="my-plugin-modal" style="max-height: 90vh; overflow-y: auto;">
        <h3>⚙️ Extension Settings</h3>

        <label>OpenRouter API Key:</label>
        <p style="font-size: 11px; color: #666; margin: 5px 0 10px 0;">
          Get your API key from <a href="https://openrouter.ai/keys" target="_blank" style="color: #0066cc;">openrouter.ai/keys</a>
        </p>

        <div style="margin-bottom: 15px;">
          <div style="font-size: 12px; color: #555; margin-bottom: 5px;">
            Current: <code>${maskedKey}</code>
          </div>
          <input type="password" id="settings-api-key" class="my-plugin-input"
                 placeholder="sk-or-v1-..." style="width: 100%; font-family: monospace;">
        </div>

        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">

        <label>AI Model Configuration:</label>
        <p style="font-size: 11px; color: #666; margin: 5px 0 10px 0;">
          Configure which models to use for text processing and image analysis
        </p>

        <div style="margin-bottom: 15px;">
          <label>Text Processing Model:</label>
          <input type="text" id="settings-content-model" class="my-plugin-input"
                 placeholder="openai/gpt-4o-mini"
                 value="${contentModel}"
                 style="width: 100%; font-family: monospace; font-size: 11px;">
          <div style="font-size: 10px; color: #888; margin-top: 3px;">
            Examples: openai/gpt-4o-mini, anthropic/claude-3.5-sonnet, google/gemini-pro
          </div>
        </div>

        <div style="margin-bottom: 15px;">
          <label>Image Analysis Model:</label>
          <input type="text" id="settings-image-model" class="my-plugin-input"
                 placeholder="google/gemini-2.0-flash-001"
                 value="${imageModel}"
                 style="width: 100%; font-family: monospace; font-size: 11px;">
          <div style="font-size: 10px; color: #888; margin-top: 3px;">
            Examples: google/gemini-2.0-flash-001, openai/gpt-4o, anthropic/claude-3.5-sonnet
          </div>
        </div>

        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">

        <label>Prompt Templates:</label>
        <p style="font-size: 11px; color: #666; margin: 5px 0 10px 0;">
          Customize prompts for each action. Leave empty to use defaults.
        </p>

        <div style="margin-bottom: 15px;">
          <label>Rewrite for Twitter Prompt:</label>
          <textarea id="settings-prompt-rewrite-twitter" class="my-plugin-input" rows="3"
                    placeholder="Default: ${defaultPrompts.rewrite_twitter?.substring(0, 100)}..."
                    style="width: 100%; font-size: 11px; font-family: monospace;">${customPrompts.rewrite_twitter || ''}</textarea>
        </div>

        <div style="margin-bottom: 15px;">
          <label>Create Article Prompt:</label>
          <textarea id="settings-prompt-article" class="my-plugin-input" rows="3"
                    placeholder="Default: ${defaultPrompts.article?.substring(0, 100)}..."
                    style="width: 100%; font-size: 11px; font-family: monospace;">${customPrompts.article || ''}</textarea>
        </div>

        <div style="margin-bottom: 15px;">
          <label>Summarize Prompt:</label>
          <textarea id="settings-prompt-summarize" class="my-plugin-input" rows="3"
                    placeholder="Default: ${defaultPrompts.summarize?.substring(0, 100)}..."
                    style="width: 100%; font-size: 11px; font-family: monospace;">${customPrompts.summarize || ''}</textarea>
        </div>

        <div style="margin-bottom: 15px;">
          <label>Translate Prompt:</label>
          <textarea id="settings-prompt-translate" class="my-plugin-input" rows="3"
                    placeholder="Default: ${defaultPrompts.translate?.substring(0, 100)}..."
                    style="width: 100%; font-size: 11px; font-family: monospace;">${customPrompts.translate || ''}</textarea>
        </div>

        <div style="margin-bottom: 15px;">
          <label>Extract Insights Prompt:</label>
          <textarea id="settings-prompt-extract-insights" class="my-plugin-input" rows="3"
                    placeholder="Default: ${defaultPrompts.extract_insights?.substring(0, 100)}..."
                    style="width: 100%; font-size: 11px; font-family: monospace;">${customPrompts.extract_insights || ''}</textarea>
        </div>

        <div style="margin-bottom: 15px;">
          <label>Describe Image Prompt:</label>
          <textarea id="settings-prompt-describe-image" class="my-plugin-input" rows="3"
                    placeholder="Default: ${defaultPrompts.describe_image?.substring(0, 100)}..."
                    style="width: 100%; font-size: 11px; font-family: monospace;">${customPrompts.describe_image || ''}</textarea>
        </div>

        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">

        <label>Webhook Configuration:</label>
        <p style="font-size: 11px; color: #666; margin: 5px 0 10px 0;">
          Send processed text to an external webhook URL
        </p>

        <div style="margin-bottom: 15px;">
          <label style="cursor: pointer; font-size: 12px;">
            <input type="checkbox" id="settings-webhook-enabled" ${webhookConfig.enabled ? 'checked' : ''}>
            Enable webhook integration
          </label>
        </div>

        <div style="margin-bottom: 15px;">
          <label>Webhook URL:</label>
          <input type="text" id="settings-webhook-url" class="my-plugin-input"
                 placeholder="https://your-webhook-url.com/endpoint"
                 value="${webhookConfig.url || ''}"
                 style="width: 100%; font-family: monospace; font-size: 11px;">
        </div>

        <div style="font-size: 12px; color: #666; background: #f0f0f0; padding: 10px; border-radius: 5px; margin-bottom: 15px;">
          <strong>Privacy Note:</strong> Your API key, model settings, custom prompts, and webhook URL are stored locally on your device. The webhook will receive: selected text, generated content, mode, account, and page context.
        </div>

        <div id="settings-status" style="margin-top:10px; font-size:12px;"></div>

        <div class="my-plugin-actions">
          <button id="settings-cancel" class="btn-cancel">Cancel</button>
          <button id="settings-save" class="btn-send">Save Settings</button>
        </div>
      </div>
    </div>
  `;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = settingsHtml;
  document.body.appendChild(wrapper);

  const closeSettings = () => {
    const overlay = document.getElementById("settings-overlay");
    if (overlay) {
      overlay.remove();
      document.removeEventListener('keydown', handleSettingsEscape);
    }
  };

  document.getElementById("settings-cancel").addEventListener("click", closeSettings);

  const handleSettingsEscape = (e) => {
    if (e.key === 'Escape') closeSettings();
  };
  document.addEventListener('keydown', handleSettingsEscape);

  document.getElementById("settings-save").addEventListener("click", async () => {
    const apiKey = document.getElementById("settings-api-key").value.trim();
    const contentModel = document.getElementById("settings-content-model").value.trim();
    const imageModel = document.getElementById("settings-image-model").value.trim();
    const webhookEnabled = document.getElementById("settings-webhook-enabled").checked;
    const webhookUrl = document.getElementById("settings-webhook-url").value.trim();
    const statusDiv = document.getElementById("settings-status");

    // Collect custom prompts
    const customPrompts = {
      rewrite_twitter: document.getElementById("settings-prompt-rewrite-twitter").value.trim(),
      article: document.getElementById("settings-prompt-article").value.trim(),
      summarize: document.getElementById("settings-prompt-summarize").value.trim(),
      translate: document.getElementById("settings-prompt-translate").value.trim(),
      extract_insights: document.getElementById("settings-prompt-extract-insights").value.trim(),
      describe_image: document.getElementById("settings-prompt-describe-image").value.trim()
    };

    if (apiKey && !apiKey.startsWith("sk-or-v1-")) {
      statusDiv.innerText = "Invalid API key format. OpenRouter keys start with 'sk-or-v1-'";
      statusDiv.style.color = "red";
      return;
    }

    if (!contentModel) {
      statusDiv.innerText = "Text Processing Model is required";
      statusDiv.style.color = "red";
      return;
    }

    if (!imageModel) {
      statusDiv.innerText = "Image Analysis Model is required";
      statusDiv.style.color = "red";
      return;
    }

    statusDiv.innerText = "Saving...";
    statusDiv.style.color = "blue";

    chrome.runtime.sendMessage(
      {
        action: "saveSettings",
        data: {
          apiKey: apiKey || null,
          contentModel: contentModel,
          imageModel: imageModel,
          customPrompts: customPrompts,
          webhook: {
            enabled: webhookEnabled,
            url: webhookUrl
          }
        }
      },
      (response) => {
        if (response && response.success) {
          statusDiv.innerText = "Settings saved successfully!";
          statusDiv.style.color = "green";

          setTimeout(() => {
            closeSettings();
            location.reload();
          }, 1500);
        } else {
          statusDiv.innerText = "Failed to save settings";
          statusDiv.style.color = "red";
        }
      }
    );
  });
}

// Database Viewer
async function openDatabaseViewer() {
  const posts = await chrome.runtime.sendMessage({ action: "getAllPosts" });
  const stats = await chrome.runtime.sendMessage({ action: "getStats" });

  const statusColors = {
    pending: '#ffa500',
    approved: '#17bf63',
    done: '#1da1f2',
    rejected: '#e0245e'
  };

  const postsHtml = posts.map(post => {
    const isMemory = post.type === 'memory';
    const isProcessed = post.type === 'processed';
    const displayText = isProcessed ? (post.generatedOutput || post.originalText) : post.originalText;

    let typeLabel = '📝 Saved';
    let typeColor = '#6c757d';

    if (isMemory) {
      typeLabel = '💾 Memory';
      typeColor = '#10a37f';
    } else if (isProcessed) {
      typeLabel = '🤖 Processed';
      typeColor = '#1da1f2';
    }

    return `
    <div style="border: 1px solid #ddd; border-radius: 8px; padding: 12px; margin-bottom: 12px; background: white;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
        <div style="flex: 1;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
            <strong>${post.context?.pageTitle || post.context?.url || 'Unknown source'}</strong>
          </div>
          <div style="font-size: 11px; color: #999;">${new Date(post.createdAt).toLocaleString()}</div>
          ${post.mode ? `<div style="font-size: 11px; color: #666;">Mode: ${post.mode} | Account: ${post.account || 'N/A'}</div>` : ''}
        </div>
        <div style="display: flex; gap: 6px; align-items: center;">
          <span style="padding: 4px 8px; background: ${typeColor}; color: white; border-radius: 4px; font-size: 11px; font-weight: 600;">
            ${typeLabel}
          </span>
          <span style="padding: 4px 8px; background: ${statusColors[post.status]}; color: white; border-radius: 4px; font-size: 11px; font-weight: 600;">
            ${post.status.toUpperCase()}
          </span>
        </div>
      </div>
      <div style="font-size: 13px; padding: 8px; background: #f5f5f5; border-radius: 4px; margin-bottom: 8px; max-height: 60px; overflow-y: auto;">
        ${displayText.substring(0, 150)}${displayText.length > 150 ? '...' : ''}
      </div>
      <div style="font-size: 11px; color: #666; margin-bottom: 8px;">
        <a href="${post.context?.url || '#'}" target="_blank" style="color: #1da1f2; text-decoration: none;">🔗 Source Page</a>
      </div>
      <div style="display: flex; gap: 6px; font-size: 11px;">
        <button class="db-status-btn" data-id="${post.id}" data-status="approved" style="padding: 4px 8px; background: #17bf63; color: white; border: none; border-radius: 3px; cursor: pointer;">✓ Approve</button>
        <button class="db-status-btn" data-id="${post.id}" data-status="done" style="padding: 4px 8px; background: #1da1f2; color: white; border: none; border-radius: 3px; cursor: pointer;">✓ Done</button>
        <button class="db-status-btn" data-id="${post.id}" data-status="rejected" style="padding: 4px 8px; background: #e0245e; color: white; border: none; border-radius: 3px; cursor: pointer;">✗ Reject</button>
        <button class="db-delete-btn" data-id="${post.id}" style="padding: 4px 8px; background: #ccc; color: #333; border: none; border-radius: 3px; cursor: pointer; margin-left: auto;">🗑️ Delete</button>
      </div>
    </div>
  `;
  }).join('');

  const dbHtml = `
    <div class="my-plugin-overlay" id="database-overlay">
      <div class="my-plugin-modal" style="width: 600px; max-height: 90vh; overflow-y: auto;">
        <h3>📊 Database</h3>

        <div style="display: flex; gap: 12px; margin-bottom: 15px; padding: 12px; background: #f5f5f5; border-radius: 8px;">
          <div style="flex: 1; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #0f1419;">${stats.total}</div>
            <div style="font-size: 11px; color: #666;">Total</div>
          </div>
          <div style="flex: 1; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: ${statusColors.pending}">${stats.pending}</div>
            <div style="font-size: 11px; color: #666;">Pending</div>
          </div>
          <div style="flex: 1; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: ${statusColors.approved}">${stats.approved}</div>
            <div style="font-size: 11px; color: #666;">Approved</div>
          </div>
          <div style="flex: 1; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: ${statusColors.done}">${stats.done}</div>
            <div style="font-size: 11px; color: #666;">Done</div>
          </div>
          <div style="flex: 1; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: ${statusColors.rejected}">${stats.rejected}</div>
            <div style="font-size: 11px; color: #666;">Rejected</div>
          </div>
        </div>

        <div style="max-height: 400px; overflow-y: auto;">
          ${posts.length > 0 ? postsHtml : '<div style="text-align: center; padding: 40px; color: #666;">No entries yet</div>'}
        </div>

        <div class="my-plugin-actions">
          <button id="db-export" class="btn-settings">📥 Export</button>
          <button id="db-close" class="btn-cancel">Close</button>
        </div>
      </div>
    </div>
  `;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = dbHtml;
  document.body.appendChild(wrapper);

  const closeDb = () => {
    const overlay = document.getElementById("database-overlay");
    if (overlay) {
      overlay.remove();
      document.removeEventListener('keydown', handleDbEscape);
    }
  };

  document.getElementById("db-close").addEventListener("click", closeDb);

  const handleDbEscape = (e) => {
    if (e.key === 'Escape') closeDb();
  };
  document.addEventListener('keydown', handleDbEscape);

  document.querySelectorAll('.db-status-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const status = btn.dataset.status;
      await chrome.runtime.sendMessage({
        action: "updatePostStatus",
        data: { id, status }
      });
      closeDb();
      setTimeout(() => openDatabaseViewer(), 300);
    });
  });

  document.querySelectorAll('.db-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('Delete this entry?')) {
        const id = btn.dataset.id;
        await chrome.runtime.sendMessage({
          action: "deletePost",
          data: { id }
        });
        closeDb();
        setTimeout(() => openDatabaseViewer(), 300);
      }
    });
  });

  document.getElementById("db-export").addEventListener("click", async () => {
    const json = await chrome.runtime.sendMessage({ action: "exportDatabase" });
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `text-processor-database-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

// ========================================
// X/Twitter Integration - Save Tweet Button
// ========================================

/**
 * Detects if current page is X/Twitter
 */
function isTwitterPage() {
  return window.location.hostname === 'twitter.com' ||
         window.location.hostname === 'x.com' ||
         window.location.hostname.endsWith('.twitter.com') ||
         window.location.hostname.endsWith('.x.com');
}

/**
 * Extract tweet data from a tweet article element
 */
function extractTweetData(tweetElement) {
  try {
    // Find the tweet text
    const tweetTextElement = tweetElement.querySelector('[data-testid="tweetText"]');
    const tweetText = tweetTextElement ? tweetTextElement.innerText : '';

    // Find the author
    const authorElement = tweetElement.querySelector('[data-testid="User-Name"]');
    const authorName = authorElement ? authorElement.innerText.split('\n')[0] : '';
    const authorHandle = authorElement ? authorElement.querySelector('a[href^="/"]')?.getAttribute('href')?.substring(1) : '';

    // Find timestamp link to get tweet URL
    const timeElement = tweetElement.querySelector('time');
    const timestamp = timeElement ? timeElement.getAttribute('datetime') : new Date().toISOString();
    const tweetLink = timeElement ? timeElement.closest('a')?.getAttribute('href') : '';
    const tweetUrl = tweetLink ? `https://x.com${tweetLink}` : window.location.href;

    // Extract tweet ID from URL
    const tweetIdMatch = tweetUrl.match(/\/status\/(\d+)/);
    const tweetId = tweetIdMatch ? tweetIdMatch[1] : '';

    // Find images
    const images = [];
    const imageElements = tweetElement.querySelectorAll('[data-testid="tweetPhoto"] img');
    imageElements.forEach(img => {
      if (img.src && !img.src.includes('profile_images')) {
        images.push(img.src);
      }
    });

    // Find videos
    const videos = [];
    const videoElements = tweetElement.querySelectorAll('video');
    videoElements.forEach(video => {
      if (video.src) {
        videos.push(video.src);
      }
    });

    // Check if it's a retweet
    const retweetElement = tweetElement.querySelector('[data-testid="socialContext"]');
    const isRetweet = retweetElement && retweetElement.innerText.includes('retweeted');

    // Check if it's a quote tweet
    const quoteTweetElement = tweetElement.querySelector('[data-testid="card.layoutLarge.media"]');
    const isQuoteTweet = !!quoteTweetElement;

    return {
      tweetId,
      text: tweetText,
      author: {
        name: authorName,
        handle: authorHandle,
        url: authorHandle ? `https://x.com/${authorHandle}` : ''
      },
      url: tweetUrl,
      timestamp,
      media: {
        images,
        videos,
        hasMedia: images.length > 0 || videos.length > 0
      },
      metadata: {
        isRetweet,
        isQuoteTweet,
        pageTitle: document.title,
        capturedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('[Universal Text Processor] Error extracting tweet data:', error);
    return null;
  }
}

/**
 * Create and inject save button for a tweet
 */
function injectSaveTweetButton(tweetElement) {
  // Check if button already exists
  if (tweetElement.querySelector('.utp-save-tweet-btn')) {
    return;
  }

  // Find the action bar (like, retweet, reply buttons)
  const actionBar = tweetElement.querySelector('[role="group"]');
  if (!actionBar) {
    return;
  }

  // Create save button
  const saveButton = document.createElement('div');
  saveButton.className = 'utp-save-tweet-btn';
  saveButton.style.cssText = `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    min-height: 32px;
    padding: 0 8px;
    margin-left: 8px;
    border-radius: 9999px;
    cursor: pointer;
    transition: background-color 0.2s;
    background-color: transparent;
  `;

  saveButton.innerHTML = `
    <svg viewBox="0 0 24 24" width="18" height="18" style="fill: rgb(83, 100, 113);">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
      <polyline points="17 21 17 13 7 13 7 21" style="fill: rgb(239, 243, 244);"></polyline>
      <polyline points="7 3 7 8 15 8"></polyline>
    </svg>
  `;

  saveButton.title = 'Save tweet to Universal Text Processor';

  // Hover effects
  saveButton.addEventListener('mouseenter', () => {
    saveButton.style.backgroundColor = 'rgba(29, 155, 240, 0.1)';
    const svg = saveButton.querySelector('svg');
    if (svg) svg.style.fill = 'rgb(29, 155, 240)';
  });

  saveButton.addEventListener('mouseleave', () => {
    saveButton.style.backgroundColor = 'transparent';
    const svg = saveButton.querySelector('svg');
    if (svg) svg.style.fill = 'rgb(83, 100, 113)';
  });

  // Click handler
  saveButton.addEventListener('click', async (e) => {
    e.stopPropagation();
    e.preventDefault();

    // Extract tweet data
    const tweetData = extractTweetData(tweetElement);

    if (!tweetData) {
      console.error('[Universal Text Processor] Failed to extract tweet data');
      return;
    }

    console.log('[Universal Text Processor] Saving tweet:', tweetData);

    // Show loading state
    const originalHTML = saveButton.innerHTML;
    saveButton.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" style="fill: rgb(29, 155, 240);">
        <circle cx="12" cy="12" r="10" style="fill: none; stroke: rgb(29, 155, 240); stroke-width: 2;"></circle>
        <path d="M12 6v6l4 2" style="stroke: rgb(29, 155, 240); stroke-width: 2; fill: none;"></path>
      </svg>
    `;
    saveButton.style.pointerEvents = 'none';

    try {
      // Send to background script
      const response = await chrome.runtime.sendMessage({
        action: 'saveTweet',
        data: tweetData
      });

      if (response && response.success) {
        // Show success state
        saveButton.innerHTML = `
          <svg viewBox="0 0 24 24" width="18" height="18" style="fill: rgb(0, 186, 124);">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path>
          </svg>
        `;

        // Reset after 2 seconds
        setTimeout(() => {
          saveButton.innerHTML = originalHTML;
          saveButton.style.pointerEvents = 'auto';
        }, 2000);
      } else {
        throw new Error(response?.error || 'Failed to save tweet');
      }
    } catch (error) {
      console.error('[Universal Text Processor] Error saving tweet:', error);

      // Show error state
      saveButton.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" style="fill: rgb(244, 33, 46);">
          <path d="M13.414 12l5.793-5.793c.39-.39.39-1.023 0-1.414s-1.023-.39-1.414 0L12 10.586 6.207 4.793c-.39-.39-1.023-.39-1.414 0s-.39 1.023 0 1.414L11.586 12l-5.793 5.793c-.39.39-.39 1.023 0 1.414.195.195.45.293.707.293s.512-.098.707-.293L12 13.414l5.793 5.793c.195.195.45.293.707.293s.512-.098.707-.293c.39-.39.39-1.023 0-1.414L13.414 12z"></path>
        </svg>
      `;

      // Reset after 2 seconds
      setTimeout(() => {
        saveButton.innerHTML = originalHTML;
        saveButton.style.pointerEvents = 'auto';
      }, 2000);
    }
  });

  // Inject button into action bar
  actionBar.appendChild(saveButton);
}

/**
 * Observer to watch for new tweets and inject save buttons
 */
function initTwitterObserver() {
  if (!isTwitterPage()) {
    return;
  }

  console.log('[Universal Text Processor] Initializing X/Twitter integration');

  // Process existing tweets
  const processTweets = () => {
    const tweets = document.querySelectorAll('article[data-testid="tweet"]');
    tweets.forEach(tweet => {
      injectSaveTweetButton(tweet);
    });
  };

  // Initial processing
  setTimeout(processTweets, 2000);

  // Watch for new tweets
  const observer = new MutationObserver((mutations) => {
    processTweets();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Also process on scroll (for lazy-loaded tweets)
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(processTweets, 500);
  });
}

// Initialize Twitter integration when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTwitterObserver);
} else {
  initTwitterObserver();
}

// ============================================================================
// YOUTUBE INTEGRATION
// ============================================================================

/**
 * Detects if current page is YouTube
 */
function isYouTubePage() {
  return window.location.hostname === 'www.youtube.com' ||
         window.location.hostname === 'youtube.com' ||
         window.location.hostname === 'm.youtube.com';
}

/**
 * Checks if we're on a YouTube video page
 */
function isYouTubeVideoPage() {
  return isYouTubePage() && window.location.pathname === '/watch';
}

/**
 * Extract video ID from YouTube URL
 */
function getYouTubeVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

/**
 * Extract video title from page
 */
function getYouTubeVideoTitle() {
  // Try multiple selectors for video title
  const titleSelectors = [
    'h1.ytd-video-primary-info-renderer',
    'h1.title.ytd-video-primary-info-renderer',
    'yt-formatted-string.style-scope.ytd-video-primary-info-renderer',
    'h1 yt-formatted-string'
  ];

  for (const selector of titleSelectors) {
    const titleElement = document.querySelector(selector);
    if (titleElement?.textContent?.trim()) {
      return titleElement.textContent.trim();
    }
  }

  // Fallback to page title
  const pageTitle = document.title;
  if (pageTitle && pageTitle !== 'YouTube') {
    return pageTitle.replace(' - YouTube', '').trim();
  }

  return 'Unknown Video';
}

/**
 * Extract transcript from YouTube page if available
 * YouTube transcripts are loaded dynamically, so we look in the page source
 */
function getYouTubeTranscript() {
  try {
    // Check if transcript panel is open
    const transcriptSegments = document.querySelectorAll('ytd-transcript-segment-renderer');

    if (transcriptSegments && transcriptSegments.length > 0) {
      const transcriptText = Array.from(transcriptSegments)
        .map(segment => {
          const textElement = segment.querySelector('.segment-text');
          return textElement ? textElement.textContent.trim() : '';
        })
        .filter(text => text.length > 0)
        .join('\n');

      if (transcriptText) {
        return {
          available: true,
          text: transcriptText,
          source: 'transcript_panel'
        };
      }
    }

    // Check if transcript is available but not loaded
    const transcriptButton = document.querySelector('button[aria-label*="transcript" i], button[aria-label*="Show transcript" i]');
    if (transcriptButton) {
      return {
        available: true,
        text: null,
        source: 'button_found',
        message: 'Transcript available but not loaded. Click "Show transcript" button first.'
      };
    }

    return {
      available: false,
      text: null,
      source: 'not_found',
      message: 'No transcript available for this video'
    };
  } catch (error) {
    console.error('[YouTube] Error extracting transcript:', error);
    return {
      available: false,
      text: null,
      source: 'error',
      message: error.message
    };
  }
}

/**
 * Extract all video data
 */
function extractYouTubeVideoData() {
  const videoId = getYouTubeVideoId();
  const title = getYouTubeVideoTitle();
  const transcript = getYouTubeTranscript();
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // Get channel info
  let channelName = 'Unknown Channel';
  let channelUrl = null;

  const channelLinkElement = document.querySelector('ytd-channel-name a, #owner a, #channel-name a');
  if (channelLinkElement) {
    channelName = channelLinkElement.textContent.trim();
    channelUrl = channelLinkElement.href;
  }

  // Get video description
  let description = '';
  const descriptionElement = document.querySelector('ytd-text-inline-expander #description-inline-expander, #description');
  if (descriptionElement) {
    description = descriptionElement.textContent.trim().substring(0, 500); // First 500 chars
  }

  return {
    videoId,
    url: videoUrl,
    title,
    channel: {
      name: channelName,
      url: channelUrl
    },
    description,
    transcript,
    metadata: {
      pageUrl: window.location.href,
      capturedAt: new Date().toISOString()
    }
  };
}

/**
 * Create and inject save button for YouTube videos
 */
function injectYouTubeSaveButton() {
  if (!isYouTubeVideoPage()) {
    return;
  }

  // Check if button already exists
  if (document.querySelector('.utp-youtube-save-btn')) {
    return;
  }

  // Wait for the right container to exist
  const targetContainer = document.querySelector('#actions, #top-level-buttons-computed');
  if (!targetContainer) {
    return;
  }

  // Create save button
  const saveButton = document.createElement('button');
  saveButton.className = 'utp-youtube-save-btn';
  saveButton.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    margin-left: 8px;
    background: #065fd4;
    color: white;
    border: none;
    border-radius: 18px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    font-family: "Roboto", "Arial", sans-serif;
  `;

  saveButton.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
      <polyline points="17 21 17 13 7 13 7 21"></polyline>
      <polyline points="7 3 7 8 15 8"></polyline>
    </svg>
    <span>Save Video</span>
  `;

  // Hover effects
  saveButton.addEventListener('mouseenter', () => {
    saveButton.style.background = '#0458b8';
  });
  saveButton.addEventListener('mouseleave', () => {
    saveButton.style.background = '#065fd4';
  });

  // Click handler
  saveButton.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Show loading state
    const originalHTML = saveButton.innerHTML;
    saveButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 6v6l4 2"></path>
      </svg>
      <span>Saving...</span>
    `;
    saveButton.style.background = '#065fd4';
    saveButton.disabled = true;

    try {
      // Extract video data
      const videoData = extractYouTubeVideoData();

      console.log('[YouTube] Extracted video data:', videoData);

      // Wake up service worker first
      await wakeUpServiceWorker();

      // Send to background script to save
      const response = await chrome.runtime.sendMessage({
        action: 'saveYouTubeVideo',
        data: videoData
      });

      if (response && response.success) {
        // Show success state
        saveButton.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Saved!</span>
        `;
        saveButton.style.background = '#0c8043';

        // Reset after 2 seconds
        setTimeout(() => {
          saveButton.innerHTML = originalHTML;
          saveButton.style.background = '#065fd4';
          saveButton.disabled = false;
        }, 2000);
      } else {
        throw new Error(response?.error || 'Failed to save video');
      }
    } catch (error) {
      console.error('[YouTube] Error saving video:', error);

      // Show error state
      saveButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        <span>Error</span>
      `;
      saveButton.style.background = '#c00';

      // Reset after 2 seconds
      setTimeout(() => {
        saveButton.innerHTML = originalHTML;
        saveButton.style.background = '#065fd4';
        saveButton.disabled = false;
      }, 2000);
    }
  });

  // Add CSS for spin animation
  if (!document.getElementById('utp-youtube-styles')) {
    const style = document.createElement('style');
    style.id = 'utp-youtube-styles';
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  targetContainer.appendChild(saveButton);
}

/**
 * Observer to watch for YouTube video page changes
 */
function initYouTubeObserver() {
  if (!isYouTubePage()) {
    return;
  }

  console.log('[YouTube] Initializing YouTube integration');

  // Process current video if on video page
  if (isYouTubeVideoPage()) {
    // Wait a bit for YouTube's dynamic content to load
    setTimeout(injectYouTubeSaveButton, 1000);
  }

  // Watch for navigation (YouTube is SPA)
  let lastUrl = window.location.href;
  const observer = new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      console.log('[YouTube] URL changed:', currentUrl);

      // Remove old button if exists
      const oldButton = document.querySelector('.utp-youtube-save-btn');
      if (oldButton) {
        oldButton.remove();
      }

      // Inject new button if on video page
      if (isYouTubeVideoPage()) {
        setTimeout(injectYouTubeSaveButton, 1000);
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log('[YouTube] Observer initialized');
}

// Initialize YouTube integration when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initYouTubeObserver);
} else {
  initYouTubeObserver();
}
