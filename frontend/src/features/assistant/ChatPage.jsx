/**
 * ChatPage — AI Campus Assistant chat interface.
 *
 * Layout:
 *   - Left sidebar: ConversationSidebar (past conversations + New Chat)
 *   - Right: scrollable message list + input bar (unchanged behaviour)
 *
 * State additions vs. original:
 *   conversations[]  — list from GET /assistant/conversations
 *   convLoading      — true while loading a past conversation
 *   sidebarOpen      — mobile drawer open/closed
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { sendQuery, listConversations, getConversation } from '../../api/assistant'
import ConversationSidebar from './ConversationSidebar'
import SourceChip from './SourceChip'
import ActionPlanCard from './ActionPlanCard'
import Navbar from '../../components/Navbar'

// ---------------------------------------------------------------------------
// Sub-components (unchanged)
// ---------------------------------------------------------------------------

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-4">
      <div className="w-7 h-7 rounded-full bg-lgu-100 flex items-center justify-center shrink-0">
        <span className="text-lgu-600 text-xs font-bold">AI</span>
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <span className="flex gap-1 items-center h-4">
          <span className="w-1.5 h-1.5 rounded-full bg-lgu-400 animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-lgu-400 animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-lgu-400 animate-bounce" />
        </span>
      </div>
    </div>
  )
}

function UserBubble({ content }) {
  return (
    <div className="flex justify-end mb-4">
      <div className="max-w-[90%] sm:max-w-[75%] bg-lgu-700 text-white rounded-2xl rounded-br-sm px-4 py-2.5 shadow-sm">
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>
      </div>
    </div>
  )
}

function AssistantBubble({ content, type, sources, found, actionPlan, conversationId }) {
  const isProblem = type === 'problem'

  return (
    <div className="flex items-end gap-2 mb-4">
      {/* Avatar */}
      <div className="w-7 h-7 rounded-full bg-lgu-100 flex items-center justify-center shrink-0 mb-0.5">
        <span className="text-lgu-600 text-xs font-bold">AI</span>
      </div>

      <div className="max-w-[92%] sm:max-w-[78%] space-y-1.5">
        {/* Bubble */}
        <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">

          {isProblem ? (
            <ActionPlanCard
              actionPlan={actionPlan}
              sources={sources}
              found={found}
              conversationId={conversationId}
            />
          ) : (
            <>
              {type === 'application' && (
                <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-1.5 bg-purple-100 text-purple-700">
                  Application
                </span>
              )}

              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {content}
              </p>

              {found === false && sources.length === 0 && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
                    <path fillRule="evenodd" d="M6.701 2.25c.577-1 2.02-1 2.598 0l5.196 9a1.5 1.5 0 0 1-1.299 2.25H2.804a1.5 1.5 0 0 1-1.3-2.25l5.197-9ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                  </svg>
                  No matching documents found in the knowledge base
                </div>
              )}
            </>
          )}
        </div>

        {/* Source chips — knowledge only */}
        {!isProblem && found === true && sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1">
            {sources.map((s, i) => (
              <SourceChip key={`${s.document_id}-${i}`} source={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Map a raw message from GET /assistant/conversations/{id} → local shape
// ---------------------------------------------------------------------------

function mapHistoryMessage(m) {
  return {
    role:       m.role,
    content:    m.content,
    type:       m.type   ?? null,
    sources:    m.sources ?? [],
    found:      m.found  ?? null,
    actionPlan: m.action_plan ?? null,
  }
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ChatPage() {
  const { token } = useAuth()

  // ── Chat state ────────────────────────────────────────────────────────────
  const [messages, setMessages]     = useState([])
  const [convId, setConvId]         = useState(null)
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(false)   // sending a new message
  const [error, setError]           = useState('')

  // ── Sidebar state ─────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState([])
  const [convLoading, setConvLoading]     = useState(false)  // loading a past conv
  const [sidebarOpen, setSidebarOpen]     = useState(false)  // mobile drawer

  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // ── Load conversation list on mount ──────────────────────────────────────
  const refreshConversations = useCallback(async () => {
    try {
      const data = await listConversations(token)
      setConversations(data.conversations || [])
    } catch {
      // Non-fatal — sidebar stays empty rather than crashing the page
    }
  }, [token])

  useEffect(() => {
    refreshConversations()
  }, [refreshConversations])

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, convLoading])

  // ── Focus input on mount ──────────────────────────────────────────────────
  useEffect(() => { inputRef.current?.focus() }, [])

  // ── Load a past conversation ──────────────────────────────────────────────
  async function handleSelectConversation(id) {
    if (id === convId) return   // already loaded
    setConvLoading(true)
    setMessages([])
    setConvId(id)
    setError('')
    try {
      const data = await getConversation(id, token)
      setMessages((data.messages || []).map(mapHistoryMessage))
    } catch {
      setError('Could not load that conversation. Please try again.')
      setConvId(null)
    } finally {
      setConvLoading(false)
      inputRef.current?.focus()
    }
  }

  // ── New Chat ──────────────────────────────────────────────────────────────
  function handleNewChat() {
    setMessages([])
    setConvId(null)
    setError('')
    inputRef.current?.focus()
  }

  // ── Send a message ────────────────────────────────────────────────────────
  async function handleSend() {
    const text = input.trim()
    if (!text || loading || convLoading) return

    const userMsg = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setError('')

    try {
      const res = await sendQuery(text, token, convId)
      setConvId(res.conversation_id)
      setMessages((prev) => [
        ...prev,
        {
          role:       'assistant',
          content:    res.answer,
          type:       res.type,
          sources:    res.sources || [],
          found:      res.found,
          actionPlan: res.action_plan || null,
        },
      ])
      // Refresh sidebar so new/updated conversation appears at top
      await refreshConversations()
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = typeof detail === 'string'
        ? detail
        : 'Something went wrong. Please try again.'
      setError(msg)
      setMessages((prev) => prev.slice(0, -1))
      setInput(text)
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isBlocked = loading || convLoading

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar />

      {/* ── Sidebar + chat row ───────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ────────────────────────────────────────────────── */}
        <ConversationSidebar
          conversations={conversations}
          activeConvId={convId}
          onSelect={handleSelectConversation}
          onNewChat={handleNewChat}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* ── Main chat column ───────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 h-full">

          {/* Chat sub-header: sidebar toggle (mobile) + context label */}
          <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center gap-2 shrink-0">
            {/* Hamburger for sidebar — mobile only */}
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open conversation history"
              className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
              </svg>
            </button>
            <span className="text-xs font-medium text-lgu-700 bg-lgu-50 px-2 py-0.5 rounded-full">
              Assistant
            </span>
          </div>

        {/* Message list */}
        <div className="flex-1 overflow-y-auto px-4 py-6">

          {/* Loading a past conversation */}
          {convLoading && (
            <div className="flex justify-center items-center h-full">
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <svg className="animate-spin w-6 h-6 text-lgu-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm">Loading conversation…</span>
              </div>
            </div>
          )}

          {/* Welcome state */}
          {!convLoading && messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-14 h-14 rounded-full bg-lgu-100 flex items-center justify-center mb-4">
                <span className="text-lgu-600 text-xl font-bold">AI</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-800 mb-1">
                How can I help you today?
              </h2>
              <p className="text-sm text-gray-400 max-w-sm">
                Ask me about fees, exams, scholarships, registration, or any
                university policy.
              </p>
            </div>
          )}

          {/* Messages */}
          {!convLoading && (
            <div className="max-w-2xl mx-auto w-full">
              {messages.map((m, i) =>
                m.role === 'user' ? (
                  <UserBubble key={i} content={m.content} />
                ) : (
                  <AssistantBubble
                    key={i}
                    content={m.content}
                    type={m.type}
                    sources={m.sources}
                    found={m.found}
                    actionPlan={m.actionPlan}
                    conversationId={convId}
                  />
                ),
              )}
              {loading && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Error bar */}
        {error && (
          <div className="px-4 pb-2 max-w-2xl mx-auto w-full">
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          </div>
        )}

        {/* Input bar */}
        <div className="bg-white border-t border-gray-200 px-3 sm:px-4 py-3 shrink-0">
          <div className="max-w-2xl mx-auto flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); setError('') }}
              onKeyDown={handleKeyDown}
              disabled={isBlocked}
              placeholder={convLoading ? 'Loading conversation…' : 'Ask a question…'}
              rows={1}
              className="flex-1 min-w-0 resize-none border border-gray-300 rounded-xl px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-lgu-400
                         disabled:opacity-50 leading-relaxed max-h-40 overflow-y-auto"
              style={{ minHeight: '42px' }}
              onInput={(e) => {
                e.target.style.height = 'auto'
                e.target.style.height = e.target.scrollHeight + 'px'
              }}
            />
            <button
              onClick={handleSend}
              disabled={isBlocked || !input.trim()}
              aria-label="Send message"
              className="shrink-0 w-10 h-10 rounded-xl bg-lgu-700 hover:bg-lgu-800
                         disabled:opacity-40 flex items-center justify-center transition-colors"
            >
              {loading ? (
                <svg className="animate-spin w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                  <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.908 6.859L10 12l-5.813 1.904-1.908 6.858a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.208-8.618.75.75 0 0 0 0-1.172A28.897 28.897 0 0 0 3.105 2.288Z" />
                </svg>
              )}
            </button>
          </div>
        </div>

      </div>{/* end main chat column */}
      </div>{/* end sidebar + chat row */}
    </div>
  )
}
