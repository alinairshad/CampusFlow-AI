/**
 * ConversationSidebar — past conversation list for the AI Assistant page.
 *
 * Purely presentational: all data and callbacks come from ChatPage via props.
 *
 * Props:
 *   conversations  : ConversationSummary[]  — from GET /assistant/conversations
 *   activeConvId   : string | null          — currently loaded conversation id
 *   onSelect       : (id: string) => void   — load a past conversation
 *   onNewChat      : () => void             — reset to blank chat
 *   isOpen         : boolean                — mobile drawer open state
 *   onClose        : () => void             — close mobile drawer
 */

// ---------------------------------------------------------------------------
// Relative timestamp helper — no external library
// ---------------------------------------------------------------------------

export function formatRelativeTime(dateStr) {
  const date = new Date(dateStr)
  if (isNaN(date)) return ''

  const diffMs  = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffHr  = Math.floor(diffMs / 3_600_000)
  const diffDay = Math.floor(diffMs / 86_400_000)

  if (diffMin < 1)   return 'Just now'
  if (diffMin < 60)  return `${diffMin} min ago`
  if (diffHr  < 24)  return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`
  if (diffDay <  7)  return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

// ---------------------------------------------------------------------------
// ConversationItem
// ---------------------------------------------------------------------------

function ConversationItem({ conv, isActive, onSelect }) {
  return (
    <button
      onClick={() => onSelect(conv.id)}
      className={[
        'w-full text-left px-3 py-3 transition-colors',
        isActive
          ? 'bg-lgu-50 border-l-2 border-lgu-700'
          : 'border-l-2 border-transparent',
      ].join(' ')}
      style={!isActive ? { '--tw-bg-opacity': 1 } : undefined}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = '#E8EDE4' }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = '' }}
    >
      <p className={`text-sm truncate leading-snug ${isActive ? 'font-medium text-lgu-800' : 'text-gray-700'}`}>
        {conv.first_message_preview || 'New conversation'}
      </p>
      <p className="text-xs text-gray-400 mt-0.5">
        {formatRelativeTime(conv.updated_at)}
      </p>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Sidebar panel (shared between desktop and mobile drawer)
// ---------------------------------------------------------------------------

function SidebarPanel({ conversations, activeConvId, onSelect, onNewChat, onClose, isMobile }) {
  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 w-64">
      {/* Header row */}
      <div className="flex items-center justify-between px-3 pt-4 pb-2 shrink-0">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Conversations
        </span>
        {/* Close button — mobile only */}
        {isMobile && (
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="text-gray-400 hover:text-gray-600 p-1 rounded"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        )}
      </div>

      {/* New Chat button */}
      <div className="px-3 pb-3 shrink-0">
        <button
          onClick={() => { onNewChat(); if (isMobile) onClose() }}
          className="w-full flex items-center justify-center gap-1.5 bg-lgu-700 hover:bg-lgu-800
                     text-white text-sm font-medium rounded-lg py-2 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
          </svg>
          New Chat
        </button>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100 shrink-0" />

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {conversations.length === 0 ? (
          <p className="px-3 py-6 text-xs text-gray-400 text-center">
            No conversations yet.
            <br />Start by asking a question!
          </p>
        ) : (
          conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conv={conv}
              isActive={conv.id === activeConvId}
              onSelect={(id) => { onSelect(id); if (isMobile) onClose() }}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function ConversationSidebar({
  conversations,
  activeConvId,
  onSelect,
  onNewChat,
  isOpen,
  onClose,
}) {
  return (
    <>
      {/* ── Desktop sidebar (md+) ─────────────────────────────────────── */}
      <div className="hidden md:flex md:flex-col md:shrink-0 h-full">
        <SidebarPanel
          conversations={conversations}
          activeConvId={activeConvId}
          onSelect={onSelect}
          onNewChat={onNewChat}
          onClose={onClose}
          isMobile={false}
        />
      </div>

      {/* ── Mobile drawer ─────────────────────────────────────────────── */}
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer panel — slides in from left */}
      <div
        className={[
          'fixed inset-y-0 left-0 z-30 md:hidden transition-transform duration-200',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <SidebarPanel
          conversations={conversations}
          activeConvId={activeConvId}
          onSelect={onSelect}
          onNewChat={onNewChat}
          onClose={onClose}
          isMobile={true}
        />
      </div>
    </>
  )
}
