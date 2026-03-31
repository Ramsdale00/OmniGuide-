/**
 * StatusBadge — shows LLM connectivity status.
 * status: 'online' | 'fallback' | 'unknown'
 */
export default function StatusBadge({ status }) {
  const configs = {
    online: {
      dot: 'bg-emerald-500',
      label: 'LLM Active',
      style: { color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0' },
    },
    fallback: {
      dot: 'bg-amber-400',
      label: 'Fallback Mode',
      style: { color: '#B45309', background: '#FFFBEB', border: '1px solid #FCD34D' },
    },
    unknown: {
      dot: 'bg-stone-400',
      label: 'Connecting...',
      style: { color: '#7A7874', background: '#EDE9E2', border: '1px solid #DDD9D1' },
    },
  }

  const cfg = configs[status] || configs.unknown

  return (
    <div
      className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium"
      style={cfg.style}
    >
      <span className={`w-2 h-2 rounded-full ${cfg.dot} shadow-sm`} />
      {cfg.label}
    </div>
  )
}
