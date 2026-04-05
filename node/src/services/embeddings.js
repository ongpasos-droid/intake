/* ═══════════════════════════════════════════════════════════════
   Embeddings Service — local model, no API key needed
   Model: Xenova/all-MiniLM-L6-v2 (384 dimensions)
   ═══════════════════════════════════════════════════════════════ */

let pipeline = null;
let embedder = null;

/** Lazy-load the model on first call */
async function getEmbedder() {
  if (embedder) return embedder;
  if (!pipeline) {
    const mod = await import('@xenova/transformers');
    pipeline = mod.pipeline || mod.default.pipeline;
  }
  embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  console.log('[EMBEDDINGS] Model loaded');
  return embedder;
}

/**
 * Generate embedding vector for a text string
 * @param {string} text
 * @returns {Promise<number[]>} 384-dim vector
 */
async function generateEmbedding(text) {
  const embed = await getEmbedder();
  const output = await embed(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

/**
 * Cosine similarity between two vectors
 * @returns {number} between -1 and 1
 */
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

module.exports = { generateEmbedding, cosineSimilarity };
