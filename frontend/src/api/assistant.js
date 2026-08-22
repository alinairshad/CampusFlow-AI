/**
 * Assistant API wrappers.
 * All calls require a student JWT passed as the `token` argument.
 */
import axios from 'axios'

const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` }
}

/**
 * POST /assistant/query
 *
 * @param {string} query
 * @param {string} token
 * @param {string|null} [conversationId]
 * @returns {Promise<AssistantQueryResponse>}
 *
 * @typedef {Object} AssistantQueryResponse
 * @property {string}       conversation_id
 * @property {string}       type   - "knowledge" | "problem" | "application"
 * @property {string}       answer
 * @property {Source[]}     sources
 * @property {boolean}      found
 *
 * @typedef {Object} Source
 * @property {string} document_id
 * @property {string} category
 * @property {string} chunk_preview
 * @property {number} score
 */
export async function sendQuery(query, token, conversationId = null) {
  const body = { query }
  if (conversationId) body.conversation_id = conversationId

  const res = await axios.post(`${base}/assistant/query`, body, {
    headers: authHeaders(token),
  })
  return res.data
}

/**
 * GET /assistant/conversations
 * @param {string} token
 * @returns {Promise<{conversations: ConversationSummary[], total: number}>}
 */
export async function listConversations(token) {
  const res = await axios.get(`${base}/assistant/conversations`, {
    headers: authHeaders(token),
  })
  return res.data
}

/**
 * GET /assistant/conversations/{id}
 * @param {string} conversationId
 * @param {string} token
 * @returns {Promise<ConversationDetail>}
 */
export async function getConversation(conversationId, token) {
  const res = await axios.get(
    `${base}/assistant/conversations/${conversationId}`,
    { headers: authHeaders(token) },
  )
  return res.data
}
