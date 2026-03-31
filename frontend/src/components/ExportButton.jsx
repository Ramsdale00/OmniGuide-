import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

/**
 * ExportButton — triggers GET /export and downloads the JSON file.
 */
export default function ExportButton() {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      const res = await fetch('/export')
      if (!res.ok) throw new Error('Export failed')

      // Extract filename from Content-Disposition header (if present)
      const cd = res.headers.get('content-disposition') || ''
      const match = cd.match(/filename="?([^"]+)"?/)
      const filename = match ? match[1] : 'chat_export.json'

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)

      // Trigger browser download
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors disabled:opacity-50"
      style={{ color: '#7A7874' }}
      onMouseEnter={e => {
        e.currentTarget.style.color = '#2C5FAD'
        e.currentTarget.style.background = '#EDE9E2'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color = '#7A7874'
        e.currentTarget.style.background = 'transparent'
      }}
    >
      {loading
        ? <Loader2 size={15} className="animate-spin" />
        : <Download size={15} />
      }
      Export Chat
    </button>
  )
}
