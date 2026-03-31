import { useState } from 'react'
import { Copy, Check, ChevronDown, ChevronUp, AlertTriangle, User, Bot } from 'lucide-react'
import SourceCard from './SourceCard.jsx'

/**
 * Skeleton shimmer while the LLM is loading
 */
function LoadingSkeleton() {
  return (
    <div className="flex gap-3 px-4 py-4">
      <div
        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
        style={{ background: '#E8E4DC' }}
      >
        <Bot size={16} style={{ color: '#8A8784' }} />
      </div>
      <div className="flex-1 space-y-2 pt-1">
        <div className="shimmer h-3 w-3/4 rounded" />
        <div className="shimmer h-3 w-full rounded" />
        <div className="shimmer h-3 w-2/3 rounded" />
        <div className="shimmer h-3 w-1/2 rounded" />
      </div>
    </div>
  )
}

/**
 * Renders a simple markdown-like answer:
 * - **bold**
 * - bullet lists (- or *)
 * - numbered lists (1. 2. etc.)
 * - horizontal rules (---)
 * - headers (### or **)
 */
function AnswerText({ text }) {
  const lines = text.split('\n')
  const rendered = []
  let listBuf = []
  let listType = null // 'ul' | 'ol'

  const flushList = () => {
    if (listBuf.length === 0) return
    if (listType === 'ul') {
      rendered.push(
        <ul key={rendered.length} className="list-disc list-inside mb-2.5 space-y-1 text-sm" style={{ color: '#3A3835' }}>
          {listBuf.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
          ))}
        </ul>
      )
    } else {
      rendered.push(
        <ol key={rendered.length} className="list-decimal list-inside mb-2.5 space-y-1 text-sm" style={{ color: '#3A3835' }}>
          {listBuf.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
          ))}
        </ol>
      )
    }
    listBuf = []
    listType = null
  }

  const formatInline = (str) =>
    str
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#1A3A5C;font-weight:600">$1</strong>')
      .replace(/`(.+?)`/g, '<code style="background:#EAF0FB;color:#2C5FAD;padding:0.1rem 0.35rem;border-radius:3px;font-size:0.82em;font-family:monospace">$1</code>')

  for (const line of lines) {
    const trimmed = line.trim()

    // Horizontal rule
    if (/^-{3,}$/.test(trimmed)) {
      flushList()
      rendered.push(<hr key={rendered.length} style={{ borderColor: '#DDD9D1', margin: '0.6rem 0' }} />)
      continue
    }

    if (!trimmed) {
      flushList()
      continue
    }

    // Source note line (e.g. "Source: D1, D5")
    if (/^source\s*:/i.test(trimmed)) {
      flushList()
      rendered.push(
        <p
          key={rendered.length}
          className="text-xs mt-2 pt-2 border-t font-medium"
          style={{ color: '#7A7874', borderColor: '#DDD9D1' }}
          dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }}
        />
      )
      continue
    }

    const ulMatch = trimmed.match(/^[-*•]\s+(.+)/)
    const olMatch = trimmed.match(/^\d+\.\s+(.+)/)

    if (ulMatch) {
      if (listType === 'ol') flushList()
      listType = 'ul'
      listBuf.push(ulMatch[1])
    } else if (olMatch) {
      if (listType === 'ul') flushList()
      listType = 'ol'
      listBuf.push(olMatch[1])
    } else {
      flushList()
      rendered.push(
        <p
          key={rendered.length}
          className="text-sm mb-1.5 leading-relaxed"
          style={{ color: '#3A3835' }}
          dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }}
        />
      )
    }
  }
  flushList()
  return <div className="answer-prose">{rendered}</div>
}


/**
 * MessageBubble — renders a single Q&A exchange.
 *
 * message types:
 *   'user'     → simple user question bubble
 *   'exchange' → assistant answer with sources
 *   'error'    → error message
 */
export default function MessageBubble({ message }) {
  const [copied, setCopied] = useState(false)
  const [sourcesOpen, setSourcesOpen] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.answer || message.content || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore clipboard errors in non-HTTPS contexts
    }
  }

  // ── User message ──────────────────────────────────────────────────────
  if (message.type === 'user') {
    return (
      <div className="flex justify-end gap-3 px-4 py-2">
        <div className="max-w-[80%] bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm shadow-sm">
          {message.content}
        </div>
        <div className="w-8 h-8 rounded-full bg-blue-700 flex-shrink-0 flex items-center justify-center self-end">
          <User size={14} className="text-white" />
        </div>
      </div>
    )
  }

  // ── Error message ─────────────────────────────────────────────────────
  if (message.type === 'error') {
    return (
      <div className="flex gap-3 px-4 py-2">
        <div
          className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center self-start"
          style={{ background: '#FDECEA' }}
        >
          <AlertTriangle size={14} className="text-red-500" />
        </div>
        <div
          className="max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm border"
          style={{ background: '#FFF5F5', borderColor: '#FECACA', color: '#B91C1C' }}
        >
          {message.content}
        </div>
      </div>
    )
  }

  // ── Exchange (assistant answer) ───────────────────────────────────────
  const hasSources = message.sources && message.sources.length > 0

  return (
    <div className="flex gap-3 px-4 py-2">
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center self-start mt-1"
        style={{ background: '#DDE6F7' }}
      >
        <Bot size={14} style={{ color: '#2C5FAD' }} />
      </div>

      <div className="flex-1 min-w-0">
        {/* Fallback warning banner */}
        {message.fallback_flag && (
          <div
            className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg text-xs border"
            style={{ background: '#FFFBEB', borderColor: '#FCD34D', color: '#92400E' }}
          >
            <AlertTriangle size={13} />
            <span>Showing relevant excerpts (synthesis unavailable — Ollama offline)</span>
          </div>
        )}

        {/* Answer bubble */}
        <div
          className="rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border"
          style={{ background: '#FFFFFF', borderColor: '#E8E4DC' }}
        >
          <AnswerText text={message.answer} />

          {/* Timestamp + copy row */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t" style={{ borderColor: '#EDE9E2' }}>
            <span className="text-xs" style={{ color: '#B5B3B0' }}>
              {message.timestamp
                ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : ''}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs rounded transition-colors px-2 py-1"
              style={{ color: '#9A9894' }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#3A3835'
                e.currentTarget.style.background = '#EDE9E2'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = '#9A9894'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Sources accordion */}
        {hasSources && (
          <div className="mt-2">
            <button
              onClick={() => setSourcesOpen(o => !o)}
              className="flex items-center gap-1.5 text-xs py-1 transition-colors"
              style={{ color: '#9A9894' }}
              onMouseEnter={e => e.currentTarget.style.color = '#4A4845'}
              onMouseLeave={e => e.currentTarget.style.color = '#9A9894'}
            >
              {sourcesOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {sourcesOpen ? 'Hide' : 'Show'} {message.sources.length} source{message.sources.length !== 1 ? 's' : ''}
            </button>

            {sourcesOpen && (
              <div className="space-y-2 mt-1">
                {message.sources.map((source, i) => (
                  <SourceCard key={i} source={source} index={i} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export { LoadingSkeleton }
