import { useState } from 'react'
import { ChevronDown, ChevronUp, FileText } from 'lucide-react'

/**
 * SourceCard — displays one retrieved document chunk with attribution.
 *
 * source: { doc_id, title, section, excerpt, score }
 */
export default function SourceCard({ source, index }) {
  const [expanded, setExpanded] = useState(false)

  // Score colour: green ≥ 0.7, yellow 0.4–0.7, red < 0.4
  const scoreColor =
    source.score >= 0.7
      ? { bar: 'bg-emerald-500', text: 'text-emerald-600' }
      : source.score >= 0.4
      ? { bar: 'bg-amber-400', text: 'text-amber-600' }
      : { bar: 'bg-red-400', text: 'text-red-500' }

  const scoreWidth = `${Math.round(source.score * 100)}%`

  return (
    <div
      className="rounded-lg overflow-hidden border"
      style={{ background: '#F9F7F0', borderColor: '#DDD9D1' }}
    >
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors"
        onMouseEnter={e => e.currentTarget.style.background = '#EDE9E2'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div
          className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 border"
          style={{ background: '#EAF0FB', borderColor: '#BFCFEE' }}
        >
          <FileText size={11} className="text-blue-600" />
        </div>

        {/* Doc label */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-blue-600 font-mono font-bold text-xs">{source.doc_id}</span>
            <span className="text-xs" style={{ color: '#B5B3B0' }}>—</span>
            <span className="text-xs font-medium truncate" style={{ color: '#3A3835' }}>{source.title}</span>
          </div>
          <div className="text-xs truncate" style={{ color: '#9A9894' }}>
            Section: <span style={{ color: '#6A6865' }}>{source.section}</span>
          </div>
        </div>

        {/* Score pill */}
        <div className={`flex-shrink-0 text-xs font-semibold ${scoreColor.text}`}>
          {source.score.toFixed(2)}
        </div>

        {/* Expand toggle */}
        <div className="flex-shrink-0" style={{ color: '#9A9894' }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {/* Score bar */}
      <div className="h-0.5" style={{ background: '#E8E4DC' }}>
        <div
          className={`h-full ${scoreColor.bar} transition-all duration-500`}
          style={{ width: scoreWidth }}
        />
      </div>

      {/* Expanded excerpt */}
      {expanded && (
        <div className="px-3 py-3 border-t" style={{ borderColor: '#E8E4DC' }}>
          <blockquote
            className="text-xs font-mono leading-relaxed border-l-2 pl-3 italic py-2 pr-2 rounded-r"
            style={{
              color: '#4A4845',
              borderColor: '#93AADE',
              background: '#FAF7F2',
            }}
          >
            "{source.excerpt}"
          </blockquote>
        </div>
      )}
    </div>
  )
}
