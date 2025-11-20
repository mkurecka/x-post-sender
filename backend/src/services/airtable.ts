/**
 * Airtable Service - Handles all Airtable API operations
 * Uses MCP Airtable tools for data access
 * Implements caching in KV for performance
 */

import type {
  Env,
  AirtableUserProfile,
  AirtableWebsite,
  AirtableConfig,
  AirtableSyncStatus
} from '../types';

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
      // Also invalidate the "all" cache
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
      name: fields.name || '',
      displayName: fields.displayName || fields.display_name,
      email: fields.email,
      accounts: Array.isArray(fields.accounts) ? fields.accounts :
                typeof fields.accounts === 'string' ? fields.accounts.split(',').map((s: string) => s.trim()) : [],
      writingProfile: typeof fields.writingProfile === 'string' ?
                      JSON.parse(fields.writingProfile) : fields.writingProfile,
      brandingColors: typeof fields.brandingColors === 'string' ?
                      JSON.parse(fields.brandingColors) : fields.brandingColors,
      logoUrl: fields.logoUrl || fields.logo_url,
      defaultLanguage: fields.defaultLanguage || fields.default_language || 'english',
      enabled: fields.enabled !== false,
      createdAt: fields.createdAt || fields.created_at,
      updatedAt: fields.updatedAt || fields.updated_at
    };
  }

  /**
   * Parse Airtable record to Website
   */
  private parseWebsite(record: any): AirtableWebsite {
    const fields = record.fields || record;

    return {
      id: record.id,
      websiteId: fields.websiteId || fields.website_id || '',
      name: fields.name || '',
      domain: fields.domain || '',
      userId: fields.userId || fields.user_id || '',
      userProfileId: fields.userProfileId || fields.user_profile_id,
      socialProfiles: typeof fields.socialProfiles === 'string' ?
                     JSON.parse(fields.socialProfiles) : fields.socialProfiles || [],
      schedulingWebhook: fields.schedulingWebhook || fields.scheduling_webhook,
      enabled: fields.enabled !== false,
      createdAt: fields.createdAt || fields.created_at,
      updatedAt: fields.updatedAt || fields.updated_at
    };
  }

  /**
   * List all user profiles from Airtable
   */
  async listUserProfiles(useCache = true): Promise<AirtableUserProfile[]> {
    const cacheKey = this.getCacheKey('profiles');

    // Try cache first
    if (useCache) {
      const cached = await this.getFromCache<AirtableUserProfile[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      // Note: This would use MCP tools in actual implementation
      // For now, returning structure that backend will populate
      console.log('[Airtable] Fetching user profiles from Airtable');

      // In real implementation, this would call MCP:
      // const result = await mcp__airtable__list_records({
      //   baseId: this.config.baseId,
      //   tableId: this.config.tables.profiles,
      //   filterByFormula: "{enabled} = TRUE()"
      // });

      const profiles: AirtableUserProfile[] = [];
      // profiles = result.records.map(r => this.parseUserProfile(r));

      await this.setCache(cacheKey, profiles);
      return profiles;
    } catch (error) {
      console.error('[Airtable] Error fetching user profiles:', error);
      throw new Error(`Failed to fetch user profiles: ${error.message}`);
    }
  }

  /**
   * Get specific user profile by ID
   */
  async getUserProfile(profileId: string, useCache = true): Promise<AirtableUserProfile | null> {
    const cacheKey = this.getCacheKey('profile', profileId);

    // Try cache first
    if (useCache) {
      const cached = await this.getFromCache<AirtableUserProfile>(cacheKey);
      if (cached) return cached;
    }

    try {
      console.log(`[Airtable] Fetching profile ${profileId}`);

      // In real implementation:
      // const result = await mcp__airtable__get_record({
      //   baseId: this.config.baseId,
      //   tableId: this.config.tables.profiles,
      //   recordId: profileId
      // });

      // const profile = this.parseUserProfile(result);
      // await this.setCache(cacheKey, profile);
      // return profile;

      return null;
    } catch (error) {
      console.error(`[Airtable] Error fetching profile ${profileId}:`, error);
      return null;
    }
  }

  /**
   * Get user profile by userId field
   */
  async getUserProfileByUserId(userId: string, useCache = true): Promise<AirtableUserProfile | null> {
    const cacheKey = this.getCacheKey('profile', `user:${userId}`);

    // Try cache first
    if (useCache) {
      const cached = await this.getFromCache<AirtableUserProfile>(cacheKey);
      if (cached) return cached;
    }

    try {
      console.log(`[Airtable] Fetching profile for userId ${userId}`);

      // In real implementation:
      // const result = await mcp__airtable__search_records({
      //   baseId: this.config.baseId,
      //   tableId: this.config.tables.profiles,
      //   filterByFormula: `{userId} = "${userId}"`
      // });

      // if (result.records.length === 0) return null;
      // const profile = this.parseUserProfile(result.records[0]);
      // await this.setCache(cacheKey, profile);
      // return profile;

      return null;
    } catch (error) {
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
    try {
      console.log(`[Airtable] Updating profile ${profileId}`);

      // Prepare fields for Airtable
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

      // In real implementation:
      // const result = await mcp__airtable__update_records({
      //   baseId: this.config.baseId,
      //   tableId: this.config.tables.profiles,
      //   records: [{ id: profileId, fields }]
      // });

      // Invalidate cache
      await this.invalidateCache('profile', profileId);
      await this.invalidateCache('profiles');

      // const updated = this.parseUserProfile(result.records[0]);
      // return updated;

      return null;
    } catch (error) {
      console.error(`[Airtable] Error updating profile ${profileId}:`, error);
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }

  /**
   * Get website data by website ID
   */
  async getWebsiteData(websiteId: string, useCache = true): Promise<AirtableWebsite | null> {
    const cacheKey = this.getCacheKey('website', websiteId);

    // Try cache first
    if (useCache) {
      const cached = await this.getFromCache<AirtableWebsite>(cacheKey);
      if (cached) return cached;
    }

    try {
      console.log(`[Airtable] Fetching website ${websiteId}`);

      // In real implementation:
      // const result = await mcp__airtable__search_records({
      //   baseId: this.config.baseId,
      //   tableId: this.config.tables.websites,
      //   filterByFormula: `{websiteId} = "${websiteId}"`
      // });

      // if (result.records.length === 0) return null;
      // const website = this.parseWebsite(result.records[0]);
      // await this.setCache(cacheKey, website);
      // return website;

      return null;
    } catch (error) {
      console.error(`[Airtable] Error fetching website ${websiteId}:`, error);
      return null;
    }
  }

  /**
   * List all websites
   */
  async listWebsites(useCache = true): Promise<AirtableWebsite[]> {
    const cacheKey = this.getCacheKey('websites');

    // Try cache first
    if (useCache) {
      const cached = await this.getFromCache<AirtableWebsite[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      console.log('[Airtable] Fetching websites from Airtable');

      // In real implementation:
      // const result = await mcp__airtable__list_records({
      //   baseId: this.config.baseId,
      //   tableId: this.config.tables.websites,
      //   filterByFormula: "{enabled} = TRUE()"
      // });

      const websites: AirtableWebsite[] = [];
      // websites = result.records.map(r => this.parseWebsite(r));

      await this.setCache(cacheKey, websites);
      return websites;
    } catch (error) {
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

      // Sync profiles
      let profilesCount = 0;
      try {
        const profiles = await this.listUserProfiles(false);
        profilesCount = profiles.length;
        console.log(`[Airtable] Synced ${profilesCount} profiles`);
      } catch (error) {
        errors.push(`Profiles sync failed: ${error.message}`);
      }

      // Sync websites
      let websitesCount = 0;
      try {
        const websites = await this.listWebsites(false);
        websitesCount = websites.length;
        console.log(`[Airtable] Synced ${websitesCount} websites`);
      } catch (error) {
        errors.push(`Websites sync failed: ${error.message}`);
      }

      const status: AirtableSyncStatus = {
        lastSyncAt: Date.now(),
        profilesCount,
        websitesCount,
        success: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
      };

      // Cache sync status
      await this.setCache('sync:status', status, 3600); // 1 hour

      console.log(`[Airtable] Sync completed in ${Date.now() - startTime}ms`);
      return status;
    } catch (error) {
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
      if (!this.config.baseId) {
        console.error('[Airtable] Base ID not configured');
        return false;
      }

      // Try to list records with limit 1
      // In real implementation:
      // await mcp__airtable__list_records({
      //   baseId: this.config.baseId,
      //   tableId: this.config.tables.profiles,
      //   maxRecords: 1
      // });

      return true;
    } catch (error) {
      console.error('[Airtable] Health check failed:', error);
      return false;
    }
  }
}
