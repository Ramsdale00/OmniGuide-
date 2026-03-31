import { useState } from 'react'
import { Copy, Check, ChevronDown, ChevronUp, AlertTriangle, User, Bot } from 'lucide-react'
import SourceCard from './SourceCard.jsx'

/**
 * Skeleton shimmer while the LLM is loading
 */
function LoadingSkeleton() {
  return (
    <div className="flex gap-3 px-4 py-4">
      <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0 flex items-center justify-center">
        <Bot size={16} className="text-slate-400" />
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
 */
function AnswerText({ text }) {
  // Split into lines and apply basic formatting
  const lines = text.split('\n')
  const rendered = []
  let listBuf = []
  let listType = null // 'ul' | 'ol'

  const flushList = () => {
    if (listBuf.length === 0) return
    if (listType === 'ul') {
      rendered.push(
        <ul key={rendered.length} className="list-disc list-inside mb-2 space-y-0.5 text-slate-200 text-sm">
          {listBuf.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
          ))}
        </ul>
      )
    } else {
      rendered.push(
        <ol key={rendered.length} className="list-decimal list-inside mb-2 space-y-0.5 text-slate-200 text-sm">
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
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code class="bg-blue-900/30 px-1 rounded text-blue-300 text-xs">$1</code>')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      flushList()
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
          className="text-sm text-slate-200 mb-1.5 leading-relaxed"
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
        <div className="max-w-[80%] bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm shadow-lg">
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
        <div className="w-8 h-8 rounded-full bg-red-900/50 flex-shrink-0 flex items-center justify-center self-start">
          <AlertTriangle size={14} className="text-red-400" />
        </div>
        <div className="max-w-[80%] bg-red-900/20 border border-red-700/40 text-red-300 rounded-2xl rounded-tl-sm px-4 py-3 text-sm">
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
      <div className="w-8 h-8 rounded-full bg-indigo-700 flex-shrink-0 flex items-center justify-center self-start mt-1">
        <Bot size={14} className="text-white" />
      </div>

      <div className="flex-1 min-w-0">
        {/* Fallback warning banner */}
        {message.fallback_flag && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-amber-900/25 border border-amber-500/30 rounded-lg text-amber-400 text-xs">
            <AlertTriangle size={13} />
            <span>Showing relevant excerpts (synthesis unavailable — Ollama offline)</span>
          </div>
        )}

        {/* Answer bubble */}
        <div className="bg-slate-800 border border-slate-700/60 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
          <AnswerText text={message.answer} />

          {/* Timestamp + copy row */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-700/40">
            <span className="text-xs text-slate-600">
              {message.timestamp
                ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : ''}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded hover:bg-slate-700"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Sources accordion */}
        {hasSources && (
          <div className="mt-2">
            <button
              onClick={() => setSourcesOpen(o => !o)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors py-1"
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
