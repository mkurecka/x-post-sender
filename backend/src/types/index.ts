// Environment bindings
export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  SESSIONS: KVNamespace;
  STORAGE: R2Bucket;
  JWT_SECRET: string;
  ENVIRONMENT: string;
  API_VERSION: string;
  AIRTABLE_API_KEY?: string;
  AIRTABLE_BASE_ID?: string;
  AIRTABLE_PROFILES_TABLE?: string;
  AIRTABLE_WEBSITES_TABLE?: string;
  // Proxy settings
  OPENROUTER_API_KEY?: string;
  HTML_TO_IMAGE_WORKER_URL?: string;
  HTML_TO_IMAGE_WORKER_API_KEY?: string;
  APP_URL?: string;
  // Service bindings
  HTML_TO_IMAGE_SERVICE?: Fetcher;
}

// User types
export interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: number;
  last_active?: number;
  settings_json?: string;
  subscription_tier: 'free' | 'pro' | 'enterprise';
  api_usage_count: number;
  api_usage_reset_at?: number;
}

export interface UserSettings {
  models?: {
    contentModel?: string;
    imageModel?: string;
  };
  customPrompts?: Record<string, string>;
  webhook?: {
    enabled: boolean;
    url?: string;
  };
  accounts?: any[];
}

// Post types
export interface Post {
  id: string;
  user_id: string;
  type: 'processed' | 'memory';
  mode?: string;
  account?: string;
  original_text: string;
  generated_output?: string;
  language?: string;
  status: 'pending' | 'approved' | 'done' | 'rejected';
  context_json?: string;
  created_at: number;
  updated_at?: number;
}

export interface PostContext {
  url?: string;
  pageTitle?: string;
  timestamp?: string;
  type?: string;
  imageSrc?: string;
}

// Memory types
export interface Memory {
  id: string;
  user_id: string;
  text: string;
  context_json?: string;
  tag?: string;
  priority: 'low' | 'medium' | 'high';
  created_at: number;
}

// API Request types
export interface ApiRequest {
  id: string;
  user_id: string;
  endpoint: string;
  model?: string;
  mode?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cost_usd?: number;
  response_time_ms?: number;
  status_code: number;
  error_message?: string;
  created_at: number;
}

// Webhook types
export interface Webhook {
  id: string;
  user_id: string;
  url: string;
  enabled: boolean;
  events_json?: string;
  secret?: string;
  last_triggered_at?: number;
  success_count: number;
  failure_count: number;
  created_at: number;
}

// Custom prompt types
export interface CustomPrompt {
  id: string;
  user_id: string;
  mode: string;
  prompt_template: string;
  created_at: number;
  updated_at?: number;
}

// Request/Response types
export interface ProcessTextRequest {
  text: string;
  mode: string;
  account?: string;
  language?: string;
  actionParams?: Record<string, any>;
  comment?: string;
  sendWebhook?: boolean;
  context?: PostContext;
}

export interface ProcessImageRequest {
  imageUrl: string;
  mode: string;
  actionParams?: Record<string, any>;
  context?: PostContext;
}

export interface ProcessResponse {
  success: boolean;
  content: string;
  postId: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  userId: string;
  token: string;
  user?: Partial<User>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// JWT Payload
export interface JWTPayload {
  userId: string;
  email: string;
  tier: string;
  iat: number;
  exp: number;
}

// Visual content types
export type ImageType = 'quote_card' | 'screenshot_card' | 'infographic' | 'story_card' | 'thumbnail';

export interface VisualContentImage {
  type: ImageType;
  url: string;
  width: number;
  height: number;
  filename?: string;
  filesize?: number;
}

export interface VisualContent {
  id: string;
  user_id: string;
  content_text: string;
  content_type: string;
  images_json: string;
  carousel_mode: number;
  caption?: string;
  metadata_json?: string;
  status: 'pending' | 'generated' | 'published' | 'failed';
  created_at: number;
  updated_at?: number;
}

export interface VisualContentMetadata {
  branding?: {
    logo?: string;
    colors?: {
      primary?: string;
      secondary?: string;
      background?: string;
      text?: string;
    };
    fonts?: {
      heading?: string;
      body?: string;
    };
  };
  customization?: Record<string, any>;
  sourceUrl?: string;
  account?: string;
}

export interface CreateVisualContentRequest {
  text: string;
  imageTypes: ImageType[];
  carouselMode?: boolean;
  branding?: VisualContentMetadata['branding'];
  customization?: Record<string, any>;
  generateCaption?: boolean;
  context?: PostContext;
}

export interface CreateVisualContentResponse {
  success: boolean;
  visualContentId: string;
  images: VisualContentImage[];
  caption?: string;
}

// OpenRouter types
export interface OpenRouterRequest {
  model: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string | Array<{
      type: 'text' | 'image_url';
      text?: string;
      imageUrl?: { url: string };
    }>;
  }>;
}

export interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  error?: {
    message: string;
    code: string;
  };
}

// Airtable types
export interface AirtableWritingProfile {
  language?: string;
  tone?: string;
  style?: string;
  personality?: string;
  guidelines?: string[];
  avoid?: string[];
  targetAudience?: string;
  contentFocus?: string[];
  voiceCharacteristics?: Record<string, any>;
}

export interface AirtableBrandingColors {
  primary?: string;
  secondary?: string;
  background?: string;
  text?: string;
  accent?: string;
}

export interface AirtableUserProfile {
  id: string;
  userId: string;
  name: string;
  displayName?: string;
  email?: string;
  accounts?: string[];
  writingProfile?: AirtableWritingProfile;
  brandingColors?: AirtableBrandingColors;
  logoUrl?: string;
  defaultLanguage?: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AirtableSocialProfile {
  platform: string;
  username?: string;
  url?: string;
  enabled: boolean;
}

export interface AirtableWebsite {
  id: string;
  websiteId: string;
  name: string;
  domain: string;
  userId: string;
  userProfileId?: string;
  socialProfiles?: AirtableSocialProfile[];
  schedulingWebhook?: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AirtableSyncStatus {
  lastSyncAt: number;
  profilesCount: number;
  websitesCount: number;
  success: boolean;
  errors?: string[];
}

export interface AirtableConfig {
  baseId: string;
  tables: {
    profiles: string;
    websites: string;
  };
  cacheTtl: number;
  syncInterval: number;
}
