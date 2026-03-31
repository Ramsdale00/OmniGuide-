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
    <div className="flex flex-col h-full" style={{ background: '#FAF7F2' }}>

      {/* ── Message list ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-4 space-y-1">

        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full px-8 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border"
              style={{ background: '#EAF0FB', borderColor: '#BFCFEE' }}
            >
              <FlaskConical size={28} className="text-blue-500" />
            </div>
            <h2 className="text-lg font-semibold mb-1" style={{ color: '#2A2825' }}>
              LOBP Document Assistant
            </h2>
            <p className="text-sm mb-8 max-w-md" style={{ color: '#9A9894' }}>
              Ask questions about operations, maintenance, safety, QC procedures, SCADA architecture, or any topic covered in the knowledge base documents.
            </p>

            {/* Example queries */}
            <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EXAMPLE_QUERIES.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleExampleClick(q)}
                  className="text-left text-xs rounded-xl px-3 py-2.5 transition-all leading-snug border"
                  style={{
                    color: '#6A6865',
                    background: '#F9F7F0',
                    borderColor: '#DDD9D1',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#EDE9E2'
                    e.currentTarget.style.color = '#3A3835'
                    e.currentTarget.style.borderColor = '#C5C1B9'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#F9F7F0'
                    e.currentTarget.style.color = '#6A6865'
                    e.currentTarget.style.borderColor = '#DDD9D1'
                  }}
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
      <div
        className="border-t p-4 backdrop-blur-sm"
        style={{ borderColor: '#DDD9D1', background: 'rgba(249,247,240,0.92)' }}
      >
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
            className="flex-1 rounded-xl px-4 py-3 text-sm resize-none outline-none transition-colors disabled:opacity-50 min-h-[44px] max-h-[120px] border"
            style={{
              background: '#FFFFFF',
              borderColor: '#DDD9D1',
              color: '#2A2825',
              fieldSizing: 'content',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = '#93AADE'
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(147,170,222,0.18)'
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = '#DDD9D1'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="w-11 h-11 text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
            style={(!inputValue.trim() || isLoading)
              ? { background: '#C5C1B9', color: '#8A8784', cursor: 'not-allowed' }
              : { background: '#2563EB' }
            }
          >
            <Send size={16} />
          </button>
        </form>
        <p className="text-xs mt-2 text-center" style={{ color: '#B5B3B0' }}>
          Shift+Enter for new line · Enter to send
        </p>
      </div>
    </div>
  )
}
