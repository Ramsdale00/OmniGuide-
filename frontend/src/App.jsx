import { useState, useCallback, useEffect } from 'react'
import ChatWindow from './components/ChatWindow.jsx'
import DocumentsView from './components/DocumentsView.jsx'
import StatusBadge from './components/StatusBadge.jsx'
import ExportButton from './components/ExportButton.jsx'
import { BookOpen, Trash2, Zap, MessageSquare, Library } from 'lucide-react'

const API_BASE = ''  // Vite proxy handles /query, /history, etc.

export default function App() {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [llmStatus, setLlmStatus] = useState('unknown') // 'online' | 'fallback' | 'unknown'
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('chat') // 'chat' | 'documents'

  // ── Restore history on mount ──────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/history`)
      .then(r => r.json())
      .then(entries => {
        if (entries.length > 0) {
          const restored = entries.map(e => ({
            id: crypto.randomUUID(),
            type: 'exchange',
            question: e.question,
            answer: e.answer,
            sources: e.sources || [],
            fallback_flag: e.fallback_flag,
            timestamp: e.timestamp,
          }))
          setMessages(restored)
          const last = entries[entries.length - 1]
          setLlmStatus(last.fallback_flag ? 'fallback' : 'online')
        }
      })
      .catch(() => {})
  }, [])

  // ── Submit query ──────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (query) => {
    if (!query.trim() || isLoading) return

    const userMsgId = crypto.randomUUID()
    setMessages(prev => [...prev, { id: userMsgId, type: 'user', content: query }])
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_query: query }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
        throw new Error(err.detail || `HTTP ${res.status}`)
      }

      const data = await res.json()
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: 'exchange',
          question: query,
          answer: data.answer,
          sources: data.sources || [],
          fallback_flag: data.fallback_flag,
          timestamp: data.timestamp,
        },
      ])
      setLlmStatus(data.fallback_flag ? 'fallback' : 'online')

    } catch (err) {
      setError(err.message)
      setMessages(prev => [
        ...prev,
        { id: crypto.randomUUID(), type: 'error', content: `Error: ${err.message}` },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [isLoading])

  // ── Clear history ─────────────────────────────────────────────────────
  const handleClear = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/clear-history`, { method: 'POST' })
      setMessages([])
      setLlmStatus('unknown')
      setError(null)
    } catch {
      setError('Failed to clear history')
    }
  }, [])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#FAF7F2', color: '#2A2825' }}>

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside
        className="w-64 flex-shrink-0 flex flex-col border-r"
        style={{ background: '#F9F7F0', borderColor: '#DDD9D1' }}
      >

        {/* Logo / Title */}
        <div className="p-5 border-b" style={{ borderColor: '#DDD9D1' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <BookOpen size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight" style={{ color: '#2A2825' }}>OmniGuide</h1>
              <p className="text-xs leading-tight" style={{ color: '#8A8784' }}>LOBP Document Assistant</p>
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="p-3 border-b" style={{ borderColor: '#DDD9D1' }}>
          <div
            className="flex rounded-lg p-0.5"
            style={{ background: '#EDE9E2' }}
          >
            {[
              { id: 'chat', label: 'Chat', icon: MessageSquare },
              { id: 'documents', label: 'Documents', icon: Library },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all"
                style={
                  activeTab === id
                    ? { background: '#FFFFFF', color: '#2A2825', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                    : { background: 'transparent', color: '#7A7874' }
                }
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="p-4 border-b" style={{ borderColor: '#DDD9D1' }}>
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: '#9A9894' }}>LLM Status</p>
          <StatusBadge status={llmStatus} />
        </div>

        {/* Knowledge Base list */}
        <div className="p-4 border-b" style={{ borderColor: '#DDD9D1' }}>
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: '#9A9894' }}>Knowledge Base</p>
          <div className="space-y-1">
            {[
              { id: 'D0', label: 'RAG Test Guide' },
              { id: 'D1', label: 'Batch Manufacturing' },
              { id: 'D2', label: 'SCADA / OPC-UA' },
              { id: 'D3', label: 'Cybersecurity (IEC 62443)' },
              { id: 'D4', label: 'Process Maps' },
              { id: 'D5', label: 'QC Procedures' },
              { id: 'D6', label: 'LIMS Spec' },
            ].map(doc => (
              <button
                key={doc.id}
                onClick={() => setActiveTab('documents')}
                className="w-full flex items-center gap-2 text-xs rounded-md px-1 py-0.5 transition-colors text-left"
                style={{ color: '#7A7874' }}
                onMouseEnter={e => e.currentTarget.style.color = '#2A2825'}
                onMouseLeave={e => e.currentTarget.style.color = '#7A7874'}
              >
                <span className="font-mono font-semibold w-6 text-blue-600">{doc.id}</span>
                <span className="truncate">{doc.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="p-4 space-y-2 border-t" style={{ borderColor: '#DDD9D1' }}>
          <ExportButton />
          <button
            onClick={handleClear}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors"
            style={{ color: '#7A7874' }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#DC2626'
              e.currentTarget.style.background = '#FFF5F5'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = '#7A7874'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <Trash2 size={15} />
            Clear History
          </button>
        </div>

        {/* Powered by */}
        <div className="px-4 pb-4 flex items-center gap-1.5 text-xs" style={{ color: '#B5B3B0' }}>
          <Zap size={11} />
          <span>Powered by Ollama</span>
        </div>
      </aside>

      {/* ── Main area ──────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0">
        {activeTab === 'chat' ? (
          <ChatWindow
            messages={messages}
            isLoading={isLoading}
            onSubmit={handleSubmit}
          />
        ) : (
          <DocumentsView onBack={() => setActiveTab('chat')} />
        )}
      </main>
    </div>
  )
}
