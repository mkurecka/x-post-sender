/**
 * API Response Types for Universal Text Processor Extension
 * These types help catch errors like accessing wrong nested properties
 */

/**
 * Base API response wrapper
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Proxy-wrapped API response (backend proxy adds extra wrapper)
 * When calling through /api/proxy/*, responses are wrapped twice
 */
interface ProxyWrappedResponse<T> {
  success: boolean;
  data?: ApiResponse<T>;
  error?: string;
}

/**
 * HTML-to-Image service response
 */
interface HtmlToImageResponse {
  url: string;
  key?: string;
  bucket?: string;
}

/**
 * Expected response from /api/proxy/html-to-image
 * IMPORTANT: The proxy wraps the response, so actual structure is:
 * { success: true, data: { success: true, data: { url: "..." } } }
 */
type HtmlToImageProxyResponse = ProxyWrappedResponse<HtmlToImageResponse>;

/**
 * OpenRouter API response
 */
interface OpenRouterChoice {
  message: {
    content: string;
    role: string;
  };
  finish_reason: string;
  index: number;
}

interface OpenRouterResponse {
  id: string;
  model: string;
  choices: OpenRouterChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Memory save response
 */
interface MemorySaveResponse {
  id: string;
  created_at: string;
}

/**
 * Webhook response
 */
interface WebhookResponse {
  success: boolean;
  message?: string;
  id?: string;
}

/**
 * Settings response
 */
interface SettingsResponse {
  accounts: Account[];
  modes: Record<string, ProcessingMode>;
  api: ApiSettings;
  ui: UiSettings;
  webhook: WebhookSettings;
  backend: BackendSettings;
}

interface Account {
  id: string;
  name: string;
  displayName: string;
  enabled: boolean;
  writingProfile: WritingProfile;
}

interface WritingProfile {
  language: string;
  tone: string;
  style: string;
  personality: string;
  guidelines: string[];
  avoid: string[];
  targetAudience: string;
  contentFocus: string[];
  voiceCharacteristics: Record<string, string>;
}

interface ProcessingMode {
  name: string;
  description: string;
  promptTemplate: string;
  model?: string;
}

interface ApiSettings {
  provider: string;
  endpoint: string;
  model: string;
}

interface UiSettings {
  defaultMode: string;
  defaultAccount: string;
  showPreview: boolean;
  autoClose: boolean;
  defaultLanguage: string;
}

interface WebhookSettings {
  enabled: boolean;
  url: string;
  events: Record<string, boolean>;
}

interface BackendSettings {
  baseUrl: string;
  apiVersion: string;
}

/**
 * Chrome extension message types
 */
interface ExtensionMessage {
  action: string;
  [key: string]: unknown;
}

interface ProcessTextMessage extends ExtensionMessage {
  action: 'processText';
  text: string;
  mode: string;
  account: string;
  language?: string;
  imageUrl?: string;
}

interface SaveToMemoryMessage extends ExtensionMessage {
  action: 'saveToMemory';
  text: string;
  context?: Record<string, unknown>;
}

interface GenerateImagesMessage extends ExtensionMessage {
  action: 'generateImages';
  generatedText: string;
  originalText: string;
  mode: string;
}

/**
 * Image generation result
 */
interface GeneratedImage {
  type: string;
  url: string;
}

/**
 * Helper function type for safely extracting data from potentially wrapped responses
 */
type ExtractData<T> = (response: ApiResponse<T> | ProxyWrappedResponse<T>) => T | undefined;
