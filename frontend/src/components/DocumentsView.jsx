import { useEffect, useState } from 'react'
import { FileText, ChevronDown, ChevronUp, BookOpen, Layers, AlignLeft, Hash } from 'lucide-react'

const DOC_COLORS = {
  D0: { accent: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  D1: { accent: '#0369A1', bg: '#F0F9FF', border: '#BAE6FD' },
  D2: { accent: '#0F766E', bg: '#F0FDFA', border: '#99F6E4' },
  D3: { accent: '#B91C1C', bg: '#FFF5F5', border: '#FECACA' },
  D4: { accent: '#B45309', bg: '#FFFBEB', border: '#FCD34D' },
  D5: { accent: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
  D6: { accent: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
}

function DocCard({ doc, selected, onClick }) {
  const colors = DOC_COLORS[doc.doc_id] || { accent: '#6B7280', bg: '#F9F7F0', border: '#DDD9D1' }
  const isSelected = selected === doc.doc_id

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl p-3.5 border transition-all"
      style={{
        background: isSelected ? colors.bg : '#FFFFFF',
        borderColor: isSelected ? colors.border : '#E8E4DC',
        boxShadow: isSelected ? `0 0 0 2px ${colors.border}` : 'none',
      }}
      onMouseEnter={e => {
        if (!isSelected) {
          e.currentTarget.style.background = colors.bg
          e.currentTarget.style.borderColor = colors.border
        }
      }}
      onMouseLeave={e => {
        if (!isSelected) {
          e.currentTarget.style.background = '#FFFFFF'
          e.currentTarget.style.borderColor = '#E8E4DC'
        }
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 font-mono font-bold text-sm mt-0.5"
          style={{ background: colors.bg, color: colors.accent, border: `1px solid ${colors.border}` }}
        >
          {doc.doc_id}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug" style={{ color: '#2A2825' }}>
            {doc.title}
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="flex items-center gap-1 text-xs" style={{ color: '#9A9894' }}>
              <Layers size={11} />
              {doc.chunk_count} chunks
            </span>
            <span className="flex items-center gap-1 text-xs" style={{ color: '#9A9894' }}>
              <Hash size={11} />
              {doc.sections.length} sections
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}

function SectionBlock({ section, docId }) {
  const [open, setOpen] = useState(true)
  const colors = DOC_COLORS[docId] || { accent: '#6B7280', bg: '#F9F7F0', border: '#DDD9D1' }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#E8E4DC' }}>
      {/* Section header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
        style={{ background: '#F9F7F0' }}
        onMouseEnter={e => e.currentTarget.style.background = '#EDE9E2'}
        onMouseLeave={e => e.currentTarget.style.background = '#F9F7F0'}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-1.5 h-5 rounded-full flex-shrink-0"
            style={{ background: colors.accent }}
          />
          <span className="text-sm font-semibold" style={{ color: '#2A2825' }}>
            {section.name}
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded-full"
            style={{ background: colors.bg, color: colors.accent, border: `1px solid ${colors.border}` }}
          >
            {section.chunks.length}
          </span>
        </div>
        <div style={{ color: '#9A9894' }}>
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </button>

      {/* Chunks */}
      {open && (
        <div className="divide-y" style={{ borderColor: '#EDE9E2' }}>
          {section.chunks.map((chunk, i) => (
            <div key={chunk.id} className="px-4 py-3" style={{ background: '#FFFFFF' }}>
              <div className="flex items-center gap-2 mb-2">
                <AlignLeft size={11} style={{ color: '#B5B3B0' }} />
                <span className="text-xs font-mono" style={{ color: '#B5B3B0' }}>
                  {chunk.id} · {chunk.char_count} chars
                </span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#3A3835' }}>
                {chunk.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DocumentsView() {
  const [docs, setDocs] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [docContent, setDocContent] = useState(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDoc, setLoadingDoc] = useState(false)
  const [error, setError] = useState(null)

  // Load document list on mount
  useEffect(() => {
    setLoadingList(true)
    fetch('/documents')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        setDocs(data)
        setError(null)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoadingList(false))
  }, [])

  // Load selected document content
  const selectDoc = (docId) => {
    if (selectedId === docId) return
    setSelectedId(docId)
    setDocContent(null)
    setLoadingDoc(true)
    fetch(`/documents/${docId}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => setDocContent(data))
      .catch(err => setError(err.message))
      .finally(() => setLoadingDoc(false))
  }

  const charTotal = docs.find(d => d.doc_id === selectedId)?.char_total

  return (
    <div className="flex h-full" style={{ background: '#FAF7F2' }}>

      {/* ── Document list panel ───────────────────────────────────── */}
      <div
        className="w-72 flex-shrink-0 flex flex-col border-r overflow-y-auto"
        style={{ borderColor: '#DDD9D1', background: '#F9F7F0' }}
      >
        <div className="p-4 border-b sticky top-0 z-10" style={{ borderColor: '#DDD9D1', background: '#F9F7F0' }}>
          <div className="flex items-center gap-2">
            <BookOpen size={15} style={{ color: '#7A7874' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#2A2825' }}>Knowledge Base</h2>
          </div>
          {!loadingList && (
            <p className="text-xs mt-0.5" style={{ color: '#9A9894' }}>
              {docs.length} documents · {docs.reduce((s, d) => s + d.chunk_count, 0)} total chunks
            </p>
          )}
        </div>

        <div className="p-3 space-y-2 flex-1">
          {loadingList && (
            <div className="space-y-2 pt-1">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="shimmer h-16 rounded-xl" />
              ))}
            </div>
          )}

          {error && !loadingList && (
            <div
              className="rounded-lg px-3 py-2.5 text-xs border"
              style={{ background: '#FFF5F5', borderColor: '#FECACA', color: '#B91C1C' }}
            >
              Failed to load documents: {error}
              <br />
              <span style={{ color: '#9A9894' }}>Make sure the backend is running and ingest has been run.</span>
            </div>
          )}

          {docs.map(doc => (
            <DocCard
              key={doc.doc_id}
              doc={doc}
              selected={selectedId}
              onClick={() => selectDoc(doc.doc_id)}
            />
          ))}
        </div>
      </div>

      {/* ── Document content panel ────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Empty / prompt state */}
        {!selectedId && (
          <div className="flex flex-col items-center justify-center h-full" style={{ color: '#9A9894' }}>
            <FileText size={40} style={{ color: '#C5C1B9', marginBottom: '1rem' }} />
            <p className="text-sm font-medium" style={{ color: '#6A6865' }}>Select a document to view its contents</p>
            <p className="text-xs mt-1" style={{ color: '#B5B3B0' }}>Full text and sections will appear here</p>
          </div>
        )}

        {/* Document content */}
        {selectedId && (
          <>
            {/* Doc header */}
            {docContent && (
              <div
                className="px-6 py-4 border-b flex-shrink-0"
                style={{ borderColor: '#DDD9D1', background: '#F9F7F0' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-sm flex-shrink-0"
                    style={{
                      background: DOC_COLORS[selectedId]?.bg || '#F9F7F0',
                      color: DOC_COLORS[selectedId]?.accent || '#6B7280',
                      border: `1px solid ${DOC_COLORS[selectedId]?.border || '#DDD9D1'}`,
                    }}
                  >
                    {selectedId}
                  </div>
                  <div>
                    <h1 className="text-base font-bold" style={{ color: '#2A2825' }}>{docContent.title}</h1>
                    <p className="text-xs mt-0.5" style={{ color: '#9A9894' }}>
                      {docContent.sections.length} sections ·{' '}
                      {docContent.sections.reduce((s, sec) => s + sec.chunks.length, 0)} chunks
                      {charTotal ? ` · ${(charTotal / 1000).toFixed(1)}k chars` : ''}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Loading */}
            {loadingDoc && (
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="shimmer h-10 rounded-xl w-full" />
                    <div className="shimmer h-24 rounded-xl w-full" />
                  </div>
                ))}
              </div>
            )}

            {/* Sections */}
            {docContent && !loadingDoc && (
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {docContent.sections.map(sec => (
                  <SectionBlock key={sec.name} section={sec} docId={selectedId} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
