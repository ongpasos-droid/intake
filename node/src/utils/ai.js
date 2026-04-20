/* ── Shared AI Utilities ─────────────────────────────────────── */

let Anthropic = null;

function getClient() {
  if (!Anthropic) Anthropic = require('@anthropic-ai/sdk');
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not configured');
  return new Anthropic({ apiKey: key });
}

/** Single-turn Claude call (system + one user message) */
async function callClaude(systemPrompt, userPrompt, maxTokens = 4096) {
  const client = getClient();
  const response = await client.messages.create({
    model: process.env.AI_MODEL || 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    temperature: 0.9,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });
  return response.content[0]?.text || '';
}

/** Multi-turn Claude call (system + message history) */
async function callClaudeChat(systemPrompt, messages, maxTokens = 2048) {
  const client = getClient();
  const response = await client.messages.create({
    model: process.env.AI_MODEL || 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    temperature: 0.7,
    system: systemPrompt,
    messages,
  });
  return response.content[0]?.text || '';
}

module.exports = { getClient, callClaude, callClaudeChat };
