import { useEffect, useRef, useState } from 'react'
import MessageBubble, { LoadingSkeleton } from './MessageBubble.jsx'
import { Send, FlaskConical } from 'lucide-react'

const EXAMPLE_QUERIES = [
  'What is the kinematic viscosity specification for Engine Oil 15W-40?',
  'What are the SCADA OPC-UA security policies used?',
  'What are the cybersecurity risk zones defined in IEC 62443?',
  'Describe the batch manufacturing steps for 15W-40.',
  'What LIMS integrations are required for the lab?',
  'What were the pain points in the As-Is process map?',
]

/**
 * ChatWindow — the main scrollable chat area + input bar.
 */
export default function ChatWindow({ messages, isLoading, onSubmit }) {
  const [inputValue, setInputValue] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSubmit = (e) => {
    e.preventDefault()
    const q = inputValue.trim()
    if (!q || isLoading) return
    onSubmit(q)
    setInputValue('')
  }

  const handleExampleClick = (query) => {
    onSubmit(query)
  }

  const isEmpty = messages.length === 0 && !isLoading

  return (
    <div className="flex flex-col h-full">

      {/* ── Message list ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-4 space-y-1">

        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full px-8 text-center">
            <div className="w-16 h-16 bg-blue-600/15 border border-blue-500/20 rounded-2xl flex items-center justify-center mb-4">
              <FlaskConical size={28} className="text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-200 mb-1">LOBP Document Assistant</h2>
            <p className="text-sm text-slate-500 mb-8 max-w-md">
              Ask questions about operations, maintenance, safety, QC procedures, SCADA architecture, or any topic covered in the knowledge base documents.
            </p>

            {/* Example queries */}
            <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EXAMPLE_QUERIES.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleExampleClick(q)}
                  className="text-left text-xs text-slate-400 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 hover:border-slate-600 rounded-xl px-3 py-2.5 transition-all hover:text-slate-200 leading-snug"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Loading skeleton */}
        {isLoading && <LoadingSkeleton />}

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ────────────────────────────────────────────── */}
      <div className="border-t border-slate-800 bg-slate-900/80 backdrop-blur-sm p-4">
        <form onSubmit={handleSubmit} className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
            placeholder="Ask about operations, maintenance, QC procedures, SCADA, cybersecurity..."
            rows={1}
            disabled={isLoading}
            className="flex-1 bg-slate-800 border border-slate-700 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 resize-none outline-none transition-colors disabled:opacity-50 min-h-[44px] max-h-[120px]"
            style={{ fieldSizing: 'content' }}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="w-11 h-11 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
          >
            <Send size={16} />
          </button>
        </form>
        <p className="text-xs text-slate-600 mt-2 text-center">
          Shift+Enter for new line · Enter to send
        </p>
      </div>
    </div>
  )
}
