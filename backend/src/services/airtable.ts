/**
 * Airtable Service - Handles all Airtable API operations
 * Uses direct Airtable REST API calls
 * Implements caching in KV for performance
 */

import type {
  Env,
  AirtableUserProfile,
  AirtableWebsite,
  AirtableConfig,
  AirtableSyncStatus
} from '../types';

const AIRTABLE_API_BASE = 'https://api.airtable.com/v0';

export class AirtableService {
  private env: Env;
  private config: AirtableConfig;
  private readonly CACHE_PREFIX = 'airtable:';
  private readonly DEFAULT_TTL = 900; // 15 minutes

  constructor(env: Env) {
    this.env = env;
    this.config = {
      baseId: env.AIRTABLE_BASE_ID || '',
      tables: {
        profiles: env.AIRTABLE_PROFILES_TABLE || 'User Profiles',
        websites: env.AIRTABLE_WEBSITES_TABLE || 'Websites'
      },
      cacheTtl: this.DEFAULT_TTL,
      syncInterval: 3600000 // 1 hour
    };
  }

  /**
   * Check if Airtable is configured
   */
  isConfigured(): boolean {
    return Boolean(this.env.AIRTABLE_API_KEY && this.config.baseId);
  }

  /**
   * Make authenticated request to Airtable API
   */
  private async airtableFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.env.AIRTABLE_API_KEY) {
      throw new Error('Airtable API key not configured');
    }

    const url = `${AIRTABLE_API_BASE}/${this.config.baseId}/${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.env.AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[Airtable] API error: ${response.status}`, error);
      throw new Error(`Airtable API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get cache key for specific resource
   */
  private getCacheKey(type: string, id?: string): string {
    return id ? `${this.CACHE_PREFIX}${type}:${id}` : `${this.CACHE_PREFIX}${type}:all`;
  }

  /**
   * Get data from cache
   */
  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.env.CACHE.get(key, 'json');
      if (cached) {
        console.log(`[Airtable] Cache hit: ${key}`);
        return cached as T;
      }
      return null;
    } catch (error) {
      console.error(`[Airtable] Cache read error for ${key}:`, error);
      return null;
    }
  }

  /**
   * Set data in cache
   */
  private async setCache(key: string, data: any, ttl?: number): Promise<void> {
    try {
      await this.env.CACHE.put(
        key,
        JSON.stringify(data),
        { expirationTtl: ttl || this.config.cacheTtl }
      );
      console.log(`[Airtable] Cache set: ${key} (TTL: ${ttl || this.config.cacheTtl}s)`);
    } catch (error) {
      console.error(`[Airtable] Cache write error for ${key}:`, error);
    }
  }

  /**
   * Invalidate cache for specific resource
   */
  private async invalidateCache(type: string, id?: string): Promise<void> {
    try {
      const key = this.getCacheKey(type, id);
      await this.env.CACHE.delete(key);
      if (id) {
        await this.env.CACHE.delete(this.getCacheKey(type));
      }
      console.log(`[Airtable] Cache invalidated: ${key}`);
    } catch (error) {
      console.error(`[Airtable] Cache invalidation error:`, error);
    }
  }

  /**
   * Parse Airtable record to UserProfile
   */
  private parseUserProfile(record: any): AirtableUserProfile {
    const fields = record.fields || record;

    return {
      id: record.id,
      userId: fields.userId || fields.user_id || '',
      name: fields.name || fields.Name || '',
      displayName: fields.displayName || fields.display_name || fields.DisplayName,
      email: fields.email || fields.Email,
      accounts: Array.isArray(fields.accounts) ? fields.accounts :
                typeof fields.accounts === 'string' ? fields.accounts.split(',').map((s: string) => s.trim()) :
                Array.isArray(fields.Accounts) ? fields.Accounts : [],
      writingProfile: this.parseJSON(fields.writingProfile || fields.WritingProfile),
      brandingColors: this.parseJSON(fields.brandingColors || fields.BrandingColors),
      logoUrl: fields.logoUrl || fields.logo_url || fields.LogoUrl,
      defaultLanguage: fields.defaultLanguage || fields.default_language || fields.DefaultLanguage || 'english',
      enabled: fields.enabled !== false && fields.Enabled !== false,
      createdAt: fields.createdAt || fields.created_at || fields.Created,
      updatedAt: fields.updatedAt || fields.updated_at || fields.Modified
    };
  }

  /**
   * Parse Airtable record to Website
   */
  private parseWebsite(record: any): AirtableWebsite {
    const fields = record.fields || record;

    return {
      id: record.id,
      websiteId: fields.websiteId || fields.website_id || fields.WebsiteId || '',
      name: fields.name || fields.Name || '',
      domain: fields.domain || fields.Domain || '',
      userId: fields.userId || fields.user_id || fields.UserId || '',
      userProfileId: fields.userProfileId || fields.user_profile_id || fields.UserProfileId,
      socialProfiles: this.parseJSON(fields.socialProfiles || fields.SocialProfiles) || [],
      schedulingWebhook: fields.schedulingWebhook || fields.scheduling_webhook || fields.SchedulingWebhook,
      enabled: fields.enabled !== false && fields.Enabled !== false,
      createdAt: fields.createdAt || fields.created_at || fields.Created,
      updatedAt: fields.updatedAt || fields.updated_at || fields.Modified
    };
  }

  /**
   * Safely parse JSON string
   */
  private parseJSON(value: any): any {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  /**
   * List all user profiles from Airtable
   */
  async listUserProfiles(useCache = true): Promise<AirtableUserProfile[]> {
    if (!this.isConfigured()) {
      console.log('[Airtable] Not configured, returning empty profiles');
      return [];
    }

    const cacheKey = this.getCacheKey('profiles');

    if (useCache) {
      const cached = await this.getFromCache<AirtableUserProfile[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      console.log('[Airtable] Fetching user profiles from Airtable');
      const tableName = encodeURIComponent(this.config.tables.profiles);
      const result = await this.airtableFetch(`${tableName}?filterByFormula=NOT({enabled}=FALSE())`);

      const profiles = (result.records || []).map((r: any) => this.parseUserProfile(r));
      await this.setCache(cacheKey, profiles);

      console.log(`[Airtable] Fetched ${profiles.length} profiles`);
      return profiles;
    } catch (error: any) {
      console.error('[Airtable] Error fetching user profiles:', error);
      throw new Error(`Failed to fetch user profiles: ${error.message}`);
    }
  }

  /**
   * Get specific user profile by ID
   */
  async getUserProfile(profileId: string, useCache = true): Promise<AirtableUserProfile | null> {
    if (!this.isConfigured()) return null;

    const cacheKey = this.getCacheKey('profile', profileId);

    if (useCache) {
      const cached = await this.getFromCache<AirtableUserProfile>(cacheKey);
      if (cached) return cached;
    }

    try {
      console.log(`[Airtable] Fetching profile ${profileId}`);
      const tableName = encodeURIComponent(this.config.tables.profiles);
      const result = await this.airtableFetch(`${tableName}/${profileId}`);

      const profile = this.parseUserProfile(result);
      await this.setCache(cacheKey, profile);
      return profile;
    } catch (error: any) {
      console.error(`[Airtable] Error fetching profile ${profileId}:`, error);
      return null;
    }
  }

  /**
   * Get user profile by userId field
   */
  async getUserProfileByUserId(userId: string, useCache = true): Promise<AirtableUserProfile | null> {
    if (!this.isConfigured()) return null;

    const cacheKey = this.getCacheKey('profile', `user:${userId}`);

    if (useCache) {
      const cached = await this.getFromCache<AirtableUserProfile>(cacheKey);
      if (cached) return cached;
    }

    try {
      console.log(`[Airtable] Fetching profile for userId ${userId}`);
      const tableName = encodeURIComponent(this.config.tables.profiles);
      const formula = encodeURIComponent(`{userId}="${userId}"`);
      const result = await this.airtableFetch(`${tableName}?filterByFormula=${formula}&maxRecords=1`);

      if (!result.records || result.records.length === 0) return null;

      const profile = this.parseUserProfile(result.records[0]);
      await this.setCache(cacheKey, profile);
      return profile;
    } catch (error: any) {
      console.error(`[Airtable] Error fetching profile for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    profileId: string,
    updates: Partial<AirtableUserProfile>
  ): Promise<AirtableUserProfile | null> {
    if (!this.isConfigured()) return null;

    try {
      console.log(`[Airtable] Updating profile ${profileId}`);

      const fields: any = {};
      if (updates.name) fields.name = updates.name;
      if (updates.displayName) fields.displayName = updates.displayName;
      if (updates.email) fields.email = updates.email;
      if (updates.accounts) fields.accounts = updates.accounts;
      if (updates.writingProfile) fields.writingProfile = JSON.stringify(updates.writingProfile);
      if (updates.brandingColors) fields.brandingColors = JSON.stringify(updates.brandingColors);
      if (updates.logoUrl) fields.logoUrl = updates.logoUrl;
      if (updates.defaultLanguage) fields.defaultLanguage = updates.defaultLanguage;
      if (updates.enabled !== undefined) fields.enabled = updates.enabled;

      const tableName = encodeURIComponent(this.config.tables.profiles);
      const result = await this.airtableFetch(`${tableName}/${profileId}`, {
        method: 'PATCH',
        body: JSON.stringify({ fields })
      });

      await this.invalidateCache('profile', profileId);
      await this.invalidateCache('profiles');

      return this.parseUserProfile(result);
    } catch (error: any) {
      console.error(`[Airtable] Error updating profile ${profileId}:`, error);
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }

  /**
   * Get website data by website ID
   */
  async getWebsiteData(websiteId: string, useCache = true): Promise<AirtableWebsite | null> {
    if (!this.isConfigured()) return null;

    const cacheKey = this.getCacheKey('website', websiteId);

    if (useCache) {
      const cached = await this.getFromCache<AirtableWebsite>(cacheKey);
      if (cached) return cached;
    }

    try {
      console.log(`[Airtable] Fetching website ${websiteId}`);
      const tableName = encodeURIComponent(this.config.tables.websites);
      const formula = encodeURIComponent(`{websiteId}="${websiteId}"`);
      const result = await this.airtableFetch(`${tableName}?filterByFormula=${formula}&maxRecords=1`);

      if (!result.records || result.records.length === 0) return null;

      const website = this.parseWebsite(result.records[0]);
      await this.setCache(cacheKey, website);
      return website;
    } catch (error: any) {
      console.error(`[Airtable] Error fetching website ${websiteId}:`, error);
      return null;
    }
  }

  /**
   * List all websites
   */
  async listWebsites(useCache = true): Promise<AirtableWebsite[]> {
    if (!this.isConfigured()) {
      console.log('[Airtable] Not configured, returning empty websites');
      return [];
    }

    const cacheKey = this.getCacheKey('websites');

    if (useCache) {
      const cached = await this.getFromCache<AirtableWebsite[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      console.log('[Airtable] Fetching websites from Airtable');
      const tableName = encodeURIComponent(this.config.tables.websites);
      const result = await this.airtableFetch(`${tableName}?filterByFormula=NOT({enabled}=FALSE())`);

      const websites = (result.records || []).map((r: any) => this.parseWebsite(r));
      await this.setCache(cacheKey, websites);

      console.log(`[Airtable] Fetched ${websites.length} websites`);
      return websites;
    } catch (error: any) {
      console.error('[Airtable] Error fetching websites:', error);
      throw new Error(`Failed to fetch websites: ${error.message}`);
    }
  }

  /**
   * Trigger full sync from Airtable
   */
  async syncAll(): Promise<AirtableSyncStatus> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      console.log('[Airtable] Starting full sync...');

      let profilesCount = 0;
      try {
        const profiles = await this.listUserProfiles(false);
        profilesCount = profiles.length;
        console.log(`[Airtable] Synced ${profilesCount} profiles`);
      } catch (error: any) {
        errors.push(`Profiles sync failed: ${error.message}`);
      }

      let websitesCount = 0;
      try {
        const websites = await this.listWebsites(false);
        websitesCount = websites.length;
        console.log(`[Airtable] Synced ${websitesCount} websites`);
      } catch (error: any) {
        errors.push(`Websites sync failed: ${error.message}`);
      }

      const status: AirtableSyncStatus = {
        lastSyncAt: Date.now(),
        profilesCount,
        websitesCount,
        success: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
      };

      await this.setCache('sync:status', status, 3600);

      console.log(`[Airtable] Sync completed in ${Date.now() - startTime}ms`);
      return status;
    } catch (error: any) {
      console.error('[Airtable] Sync error:', error);
      return {
        lastSyncAt: Date.now(),
        profilesCount: 0,
        websitesCount: 0,
        success: false,
        errors: [error.message]
      };
    }
  }

  /**
   * Get last sync status
   */
  async getSyncStatus(): Promise<AirtableSyncStatus | null> {
    return await this.getFromCache<AirtableSyncStatus>('sync:status');
  }

  /**
   * Health check for Airtable connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.isConfigured()) {
        console.log('[Airtable] Not configured');
        return false;
      }

      const tableName = encodeURIComponent(this.config.tables.profiles);
      await this.airtableFetch(`${tableName}?maxRecords=1`);
      return true;
    } catch (error) {
      console.error('[Airtable] Health check failed:', error);
      return false;
    }
  }
}
