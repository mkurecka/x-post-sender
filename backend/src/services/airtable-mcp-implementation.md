# Airtable MCP Implementation Guide

## Overview

This document shows how to implement actual MCP Airtable tool calls in the AirtableService. The service currently has placeholder comments - this guide provides the real implementation.

## Available MCP Tools

From the MCP Airtable server, we have access to:

```javascript
mcp__airtable__list_records(params)
mcp__airtable__search_records(params)
mcp__airtable__get_record(params)
mcp__airtable__update_records(params)
mcp__airtable__create_record(params)
mcp__airtable__delete_records(params)
mcp__airtable__list_bases()
mcp__airtable__list_tables(params)
mcp__airtable__describe_table(params)
```

## Implementation Examples

### Example 1: List User Profiles

**Current Placeholder**:
```typescript
async listUserProfiles(useCache = true): Promise<AirtableUserProfile[]> {
  // ...cache logic...

  // In real implementation:
  // const result = await mcp__airtable__list_records({
  //   baseId: this.config.baseId,
  //   tableId: this.config.tables.profiles,
  //   filterByFormula: "{enabled} = TRUE()"
  // });

  const profiles: AirtableUserProfile[] = [];
  return profiles;
}
```

**Real Implementation** (to be added by Claude Code with MCP access):
```typescript
async listUserProfiles(useCache = true): Promise<AirtableUserProfile[]> {
  const cacheKey = this.getCacheKey('profiles');

  if (useCache) {
    const cached = await this.getFromCache<AirtableUserProfile[]>(cacheKey);
    if (cached) return cached;
  }

  try {
    console.log('[Airtable] Fetching user profiles from Airtable');

    // Call MCP tool
    const result = await mcp__airtable__list_records({
      baseId: this.config.baseId,
      tableId: this.config.tables.profiles,
      filterByFormula: "{enabled} = TRUE()"
    });

    // Parse records
    const profiles = result.records.map(r => this.parseUserProfile(r));

    // Cache results
    await this.setCache(cacheKey, profiles);

    return profiles;
  } catch (error) {
    console.error('[Airtable] Error fetching user profiles:', error);
    throw new Error(`Failed to fetch user profiles: ${error.message}`);
  }
}
```

### Example 2: Get Specific Profile

```typescript
async getUserProfile(profileId: string, useCache = true): Promise<AirtableUserProfile | null> {
  const cacheKey = this.getCacheKey('profile', profileId);

  if (useCache) {
    const cached = await this.getFromCache<AirtableUserProfile>(cacheKey);
    if (cached) return cached;
  }

  try {
    console.log(`[Airtable] Fetching profile ${profileId}`);

    const result = await mcp__airtable__get_record({
      baseId: this.config.baseId,
      tableId: this.config.tables.profiles,
      recordId: profileId
    });

    const profile = this.parseUserProfile(result);
    await this.setCache(cacheKey, profile);

    return profile;
  } catch (error) {
    console.error(`[Airtable] Error fetching profile ${profileId}:`, error);
    return null;
  }
}
```

### Example 3: Search Profile by UserId

```typescript
async getUserProfileByUserId(userId: string, useCache = true): Promise<AirtableUserProfile | null> {
  const cacheKey = this.getCacheKey('profile', `user:${userId}`);

  if (useCache) {
    const cached = await this.getFromCache<AirtableUserProfile>(cacheKey);
    if (cached) return cached;
  }

  try {
    console.log(`[Airtable] Fetching profile for userId ${userId}`);

    const result = await mcp__airtable__search_records({
      baseId: this.config.baseId,
      tableId: this.config.tables.profiles,
      searchTerm: userId,
      fieldIds: ['userId'] // Search only in userId field
    });

    if (result.records.length === 0) return null;

    const profile = this.parseUserProfile(result.records[0]);
    await this.setCache(cacheKey, profile);

    return profile;
  } catch (error) {
    console.error(`[Airtable] Error fetching profile for user ${userId}:`, error);
    return null;
  }
}
```

### Example 4: Update Profile

```typescript
async updateUserProfile(
  profileId: string,
  updates: Partial<AirtableUserProfile>
): Promise<AirtableUserProfile | null> {
  try {
    console.log(`[Airtable] Updating profile ${profileId}`);

    // Prepare fields
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

    // Call MCP tool
    const result = await mcp__airtable__update_records({
      baseId: this.config.baseId,
      tableId: this.config.tables.profiles,
      records: [{ id: profileId, fields }]
    });

    // Invalidate cache
    await this.invalidateCache('profile', profileId);
    await this.invalidateCache('profiles');

    const updated = this.parseUserProfile(result.records[0]);
    return updated;
  } catch (error) {
    console.error(`[Airtable] Error updating profile ${profileId}:`, error);
    throw new Error(`Failed to update profile: ${error.message}`);
  }
}
```

### Example 5: Get Website Data

```typescript
async getWebsiteData(websiteId: string, useCache = true): Promise<AirtableWebsite | null> {
  const cacheKey = this.getCacheKey('website', websiteId);

  if (useCache) {
    const cached = await this.getFromCache<AirtableWebsite>(cacheKey);
    if (cached) return cached;
  }

  try {
    console.log(`[Airtable] Fetching website ${websiteId}`);

    const result = await mcp__airtable__search_records({
      baseId: this.config.baseId,
      tableId: this.config.tables.websites,
      searchTerm: websiteId,
      fieldIds: ['websiteId']
    });

    if (result.records.length === 0) return null;

    const website = this.parseWebsite(result.records[0]);
    await this.setCache(cacheKey, website);

    return website;
  } catch (error) {
    console.error(`[Airtable] Error fetching website ${websiteId}:`, error);
    return null;
  }
}
```

### Example 6: List Websites

```typescript
async listWebsites(useCache = true): Promise<AirtableWebsite[]> {
  const cacheKey = this.getCacheKey('websites');

  if (useCache) {
    const cached = await this.getFromCache<AirtableWebsite[]>(cacheKey);
    if (cached) return cached;
  }

  try {
    console.log('[Airtable] Fetching websites from Airtable');

    const result = await mcp__airtable__list_records({
      baseId: this.config.baseId,
      tableId: this.config.tables.websites,
      filterByFormula: "{enabled} = TRUE()"
    });

    const websites = result.records.map(r => this.parseWebsite(r));
    await this.setCache(cacheKey, websites);

    return websites;
  } catch (error) {
    console.error('[Airtable] Error fetching websites:', error);
    throw new Error(`Failed to fetch websites: ${error.message}`);
  }
}
```

### Example 7: Health Check

```typescript
async healthCheck(): Promise<boolean> {
  try {
    if (!this.config.baseId) {
      console.error('[Airtable] Base ID not configured');
      return false;
    }

    // Try to list 1 record to verify connection
    await mcp__airtable__list_records({
      baseId: this.config.baseId,
      tableId: this.config.tables.profiles,
      maxRecords: 1
    });

    return true;
  } catch (error) {
    console.error('[Airtable] Health check failed:', error);
    return false;
  }
}
```

## Error Handling

### Rate Limiting

Airtable has rate limits (5 requests/second). Implement retry logic:

```typescript
private async callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        console.warn(`[Airtable] Rate limited, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
}

// Usage:
async listUserProfiles(useCache = true): Promise<AirtableUserProfile[]> {
  // ...cache logic...

  return await this.callWithRetry(async () => {
    const result = await mcp__airtable__list_records({
      baseId: this.config.baseId,
      tableId: this.config.tables.profiles,
      filterByFormula: "{enabled} = TRUE()"
    });

    return result.records.map(r => this.parseUserProfile(r));
  });
}
```

### Graceful Degradation

If Airtable is unavailable, fall back to local settings:

```typescript
async getUserProfileByUserId(userId: string, useCache = true): Promise<AirtableUserProfile | null> {
  try {
    // Try Airtable first
    const profile = await this.fetchFromAirtable(userId);
    if (profile) return profile;
  } catch (error) {
    console.error('[Airtable] Error, falling back to local settings:', error);
  }

  // Fallback to local settings.json
  return await this.getLocalProfile(userId);
}

private async getLocalProfile(userId: string): Promise<AirtableUserProfile | null> {
  // Load from settings.json
  // This ensures the app works even if Airtable is down
  return null; // Implementation depends on your local storage
}
```

## Testing MCP Integration

### Test Script

Create `/backend/test-airtable-mcp.ts`:

```typescript
import { AirtableService } from './src/services/airtable';

// Mock environment
const mockEnv = {
  CACHE: {
    get: async () => null,
    put: async () => {},
    delete: async () => {}
  },
  AIRTABLE_BASE_ID: 'appXXXXXXXXXXXXXX',
  AIRTABLE_PROFILES_TABLE: 'User Profiles',
  AIRTABLE_WEBSITES_TABLE: 'Websites'
} as any;

async function testAirtableService() {
  const service = new AirtableService(mockEnv);

  console.log('Testing health check...');
  const healthy = await service.healthCheck();
  console.log('Healthy:', healthy);

  console.log('\nTesting list profiles...');
  const profiles = await service.listUserProfiles(false);
  console.log('Profiles:', profiles.length);

  if (profiles.length > 0) {
    console.log('\nTesting get profile...');
    const profile = await service.getUserProfile(profiles[0].id);
    console.log('Profile:', profile?.name);
  }

  console.log('\nTesting sync...');
  const status = await service.syncAll();
  console.log('Sync status:', status);
}

testAirtableService().catch(console.error);
```

Run:
```bash
npx tsx backend/test-airtable-mcp.ts
```

## Deployment Checklist

Before deploying with real MCP integration:

- [ ] Verify all MCP tool calls are correct
- [ ] Test error handling for rate limits
- [ ] Implement retry logic with exponential backoff
- [ ] Add fallback to local settings
- [ ] Test cache invalidation
- [ ] Verify all environment variables are set
- [ ] Test with real Airtable base
- [ ] Monitor logs for errors
- [ ] Check cache hit rates
- [ ] Verify sync performance

## Performance Optimization

### Batch Operations

Instead of multiple individual calls:

```typescript
// Bad: Multiple calls
for (const userId of userIds) {
  await service.getUserProfileByUserId(userId);
}

// Good: Single call with filter
const profiles = await service.listUserProfiles();
const filtered = profiles.filter(p => userIds.includes(p.userId));
```

### Pagination

For large datasets:

```typescript
async listAllProfiles(): Promise<AirtableUserProfile[]> {
  const allProfiles: AirtableUserProfile[] = [];
  let offset: string | undefined;

  do {
    const result = await mcp__airtable__list_records({
      baseId: this.config.baseId,
      tableId: this.config.tables.profiles,
      maxRecords: 100,
      offset
    });

    allProfiles.push(...result.records.map(r => this.parseUserProfile(r)));
    offset = result.offset;
  } while (offset);

  return allProfiles;
}
```

## Security Considerations

1. **API Key Storage**
   - Never expose in client code
   - Use Cloudflare secrets in production
   - Rotate keys regularly

2. **Data Validation**
   - Validate all Airtable responses
   - Sanitize before storing in cache
   - Verify field types match expectations

3. **Cache Security**
   - KV cache is private to your worker
   - No sensitive data in cache keys
   - Implement cache invalidation on updates

---

**Next Steps**: Replace placeholder comments in `airtable.ts` with implementations from this guide.
