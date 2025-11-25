/**
 * Embeddings utility for semantic search
 * Uses OpenRouter API to generate text embeddings
 */

import type { Env } from '../types';

/**
 * Generate embeddings for text using OpenRouter API
 * Uses text-embedding-3-small model (1536 dimensions, $0.02 per 1M tokens)
 */
export async function generateEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  try {
    if (!text || text.trim().length === 0) {
      return null;
    }

    // Truncate text to max 8000 characters to stay within token limits
    const truncatedText = text.substring(0, 8000);

    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://text-processor-api.kureckamichal.workers.dev',
        'X-Title': 'Universal Text Processor'
      },
      body: JSON.stringify({
        model: 'openai/text-embedding-3-small',
        input: truncatedText
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Embeddings] API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();

    if (data.data && data.data[0] && data.data[0].embedding) {
      return data.data[0].embedding;
    }

    return null;
  } catch (error) {
    console.error('[Embeddings] Error generating embedding:', error);
    return null;
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have same dimensions');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Extract keywords from text for basic search fallback
 */
export function extractKeywords(text: string): string[] {
  if (!text) return [];

  // Remove common words and extract meaningful keywords
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'this', 'but', 'they', 'have', 'had',
    'what', 'when', 'where', 'who', 'which', 'why', 'how'
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));

  // Get unique words
  return [...new Set(words)].slice(0, 20);
}

/**
 * Search for similar content using embeddings
 * Falls back to keyword search if embeddings not available
 */
export async function semanticSearch(
  env: Env,
  queryEmbedding: number[],
  table: 'posts' | 'memory',
  userId: string,
  limit: number = 10,
  minSimilarity: number = 0.7
): Promise<any[]> {
  try {
    // Get all records with embeddings
    const query = table === 'posts'
      ? env.DB.prepare(`
          SELECT id, type, original_text, generated_output, embedding_vector, search_keywords, created_at
          FROM posts
          WHERE user_id = ? AND embedding_vector IS NOT NULL
          ORDER BY created_at DESC
          LIMIT 100
        `).bind(userId)
      : env.DB.prepare(`
          SELECT id, text, context_json, embedding_vector, search_keywords, created_at, tags
          FROM memory
          WHERE user_id = ? AND embedding_vector IS NOT NULL
          ORDER BY created_at DESC
          LIMIT 100
        `).bind(userId);

    const results = await query.all();

    if (!results.results || results.results.length === 0) {
      return [];
    }

    // Calculate similarities
    const scored = results.results.map((row: any) => {
      const embedding = JSON.parse(row.embedding_vector);
      const similarity = cosineSimilarity(queryEmbedding, embedding);
      return { ...row, similarity };
    });

    // Filter by minimum similarity and sort
    return scored
      .filter(item => item.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

  } catch (error) {
    console.error('[Embeddings] Search error:', error);
    return [];
  }
}
