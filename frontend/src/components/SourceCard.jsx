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
      ? { bar: 'bg-emerald-500', text: 'text-emerald-400' }
      : source.score >= 0.4
      ? { bar: 'bg-amber-400', text: 'text-amber-400' }
      : { bar: 'bg-red-500', text: 'text-red-400' }

  const scoreWidth = `${Math.round(source.score * 100)}%`

  return (
    <div className="border border-slate-700 rounded-lg bg-slate-800/60 overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-700/50 transition-colors"
      >
        <div className="w-6 h-6 bg-blue-600/20 border border-blue-500/30 rounded flex items-center justify-center flex-shrink-0">
          <FileText size={11} className="text-blue-400" />
        </div>

        {/* Doc label */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-blue-400 font-mono font-bold text-xs">{source.doc_id}</span>
            <span className="text-slate-500 text-xs">—</span>
            <span className="text-slate-300 text-xs font-medium truncate">{source.title}</span>
          </div>
          <div className="text-slate-500 text-xs truncate">
            Section: <span className="text-slate-400">{source.section}</span>
          </div>
        </div>

        {/* Score pill */}
        <div className={`flex-shrink-0 text-xs font-semibold ${scoreColor.text}`}>
          {source.score.toFixed(2)}
        </div>

        {/* Expand toggle */}
        <div className="flex-shrink-0 text-slate-500">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {/* Score bar */}
      <div className="h-0.5 bg-slate-700">
        <div
          className={`h-full ${scoreColor.bar} transition-all duration-500`}
          style={{ width: scoreWidth }}
        />
      </div>

      {/* Expanded excerpt */}
      {expanded && (
        <div className="px-3 py-3 border-t border-slate-700/50">
          <blockquote className="text-xs text-slate-300 font-mono leading-relaxed border-l-2 border-blue-500/40 pl-3 italic bg-slate-900/40 py-2 pr-2 rounded-r">
            "{source.excerpt}"
          </blockquote>
        </div>
      )}
    </div>
  )
}
