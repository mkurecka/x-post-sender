/**
 * API Client for Universal Text Processor Backend
 * Handles all communication with the Cloudflare Workers backend
 */

class APIClient {
  constructor() {
    this.baseUrl = null;
    this.apiVersion = null;
    this.apiKey = null;
  }

  async init() {
    // Load settings to get backend configuration
    const settings = await this.loadSettings();
    this.baseUrl = settings?.backend?.baseUrl || 'https://text-processor-api.kureckamichal.workers.dev';
    this.apiVersion = settings?.backend?.apiVersion || 'v1';

    // Load API key from chrome.storage
    return new Promise((resolve) => {
      chrome.storage.local.get(['apiKey'], (result) => {
        this.apiKey = result.apiKey;
        console.log('[API Client] Initialized with base URL:', this.baseUrl);
        resolve();
      });
    });
  }

  async loadSettings() {
    try {
      const response = await fetch(chrome.runtime.getURL('settings.json'));
      return await response.json();
    } catch (error) {
      console.error('[API Client] Failed to load settings:', error);
      return null;
    }
  }

  getEndpoint(path) {
    return `${this.baseUrl}/api/${this.apiVersion}${path}`;
  }

  getHeaders(includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (includeAuth && this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  async saveToMemory(data) {
    try {
      const response = await fetch(this.getEndpoint('/memory'), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[API Client] Failed to save to memory:', error);
      throw error;
    }
  }

  async processText(data) {
    try {
      const response = await fetch(this.getEndpoint('/process'), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[API Client] Failed to process text:', error);
      throw error;
    }
  }

  async sendWebhook(eventType, data) {
    try {
      const settings = await this.loadSettings();
      const webhookUrl = settings?.webhook?.url;

      if (!webhookUrl || !settings?.webhook?.enabled) {
        console.log('[API Client] Webhook not configured or disabled');
        return null;
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: eventType,
          data: data,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        console.warn('[API Client] Webhook failed:', response.status);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('[API Client] Webhook error:', error);
      return null;
    }
  }

  async getSettings() {
    try {
      const response = await fetch(this.getEndpoint('/settings'), {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[API Client] Failed to get settings:', error);
      throw error;
    }
  }

  async updateSettings(settings) {
    try {
      const response = await fetch(this.getEndpoint('/settings'), {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[API Client] Failed to update settings:', error);
      throw error;
    }
  }

  // ========== Airtable Methods ==========

  async getUserProfile(userId, noCache = false) {
    try {
      const cacheKey = `airtable_profile_${userId}`;

      // Try local cache first unless noCache is true
      if (!noCache) {
        const cached = await this.getFromLocalCache(cacheKey);
        if (cached) {
          console.log('[API Client] Using cached user profile');
          return cached;
        }
      }

      const endpoint = this.getEndpoint(`/airtable/profiles/user/${userId}`) +
                      (noCache ? '?noCache=true' : '');

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.warn('[API Client] User profile not found in Airtable');
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // Cache the profile locally
      if (result.success && result.data) {
        await this.setLocalCache(cacheKey, result.data, 900000); // 15 minutes
      }

      return result.data || null;
    } catch (error) {
      console.error('[API Client] Failed to get user profile:', error);
      return null;
    }
  }

  async getWebsiteData(websiteId, noCache = false) {
    try {
      const cacheKey = `airtable_website_${websiteId}`;

      // Try local cache first unless noCache is true
      if (!noCache) {
        const cached = await this.getFromLocalCache(cacheKey);
        if (cached) {
          console.log('[API Client] Using cached website data');
          return cached;
        }
      }

      const endpoint = this.getEndpoint(`/airtable/websites/${websiteId}`) +
                      (noCache ? '?noCache=true' : '');

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.warn('[API Client] Website not found in Airtable');
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // Cache the website data locally
      if (result.success && result.data) {
        await this.setLocalCache(cacheKey, result.data, 900000); // 15 minutes
      }

      return result.data || null;
    } catch (error) {
      console.error('[API Client] Failed to get website data:', error);
      return null;
    }
  }

  async updateProfile(profileId, updates) {
    try {
      const response = await fetch(this.getEndpoint(`/airtable/profiles/${profileId}`), {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // Clear cached profile
      if (result.success && result.data) {
        await this.clearLocalCache(`airtable_profile_${result.data.userId}`);
      }

      return result.data || null;
    } catch (error) {
      console.error('[API Client] Failed to update profile:', error);
      throw error;
    }
  }

  async listProfiles(noCache = false) {
    try {
      const endpoint = this.getEndpoint('/airtable/profiles') +
                      (noCache ? '?noCache=true' : '');

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('[API Client] Failed to list profiles:', error);
      return [];
    }
  }

  async triggerSync() {
    try {
      const response = await fetch(this.getEndpoint('/airtable/sync'), {
        method: 'POST',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // Clear all cached profiles and websites
      await this.clearAirtableCache();

      return result.data || null;
    } catch (error) {
      console.error('[API Client] Failed to trigger sync:', error);
      throw error;
    }
  }

  // ========== Local Cache Helpers ==========

  async getFromLocalCache(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key, `${key}_expiry`], (result) => {
        const data = result[key];
        const expiry = result[`${key}_expiry`];

        if (!data || !expiry) {
          resolve(null);
          return;
        }

        // Check if expired
        if (Date.now() > expiry) {
          chrome.storage.local.remove([key, `${key}_expiry`]);
          resolve(null);
          return;
        }

        resolve(data);
      });
    });
  }

  async setLocalCache(key, data, ttlMs = 900000) {
    return new Promise((resolve) => {
      chrome.storage.local.set({
        [key]: data,
        [`${key}_expiry`]: Date.now() + ttlMs
      }, () => {
        console.log(`[API Client] Cached ${key} for ${ttlMs / 1000}s`);
        resolve();
      });
    });
  }

  async clearLocalCache(key) {
    return new Promise((resolve) => {
      chrome.storage.local.remove([key, `${key}_expiry`], () => {
        console.log(`[API Client] Cleared cache: ${key}`);
        resolve();
      });
    });
  }

  async clearAirtableCache() {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (items) => {
        const keysToRemove = Object.keys(items).filter(key =>
          key.startsWith('airtable_')
        );

        if (keysToRemove.length > 0) {
          chrome.storage.local.remove(keysToRemove, () => {
            console.log(`[API Client] Cleared ${keysToRemove.length} Airtable cache entries`);
            resolve();
          });
        } else {
          resolve();
        }
      });
    });
  }
}

// Create global instance
const apiClient = new APIClient();
