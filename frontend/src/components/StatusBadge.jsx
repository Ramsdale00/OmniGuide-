/**
 * StatusBadge — shows LLM connectivity status.
 * status: 'online' | 'fallback' | 'unknown'
 */
export default function StatusBadge({ status }) {
  const configs = {
    online: {
      dot: 'bg-emerald-400 shadow-emerald-400/50',
      label: 'LLM Active',
      text: 'text-emerald-400',
      bg: 'bg-emerald-400/10 border border-emerald-400/20',
    },
    fallback: {
      dot: 'bg-amber-400 shadow-amber-400/50',
      label: 'Fallback Mode',
      text: 'text-amber-400',
      bg: 'bg-amber-400/10 border border-amber-400/20',
    },
    unknown: {
      dot: 'bg-slate-500',
      label: 'Connecting...',
      text: 'text-slate-400',
      bg: 'bg-slate-700/40 border border-slate-700',
    },
  }

  const cfg = configs[status] || configs.unknown

  return (
    <div className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot} shadow-sm`} />
      {cfg.label}
    </div>
  )
}
