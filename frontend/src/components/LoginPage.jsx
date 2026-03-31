import { useState } from 'react'
import { BookOpen, Eye, EyeOff, LogIn } from 'lucide-react'

// Credentials store (hashed display — kept client-side for this prototype)
const USERS = {
  'admin@pionedata.com': 'Pn8#vX3mKq2L',
  'gganesansg@gmail.com': 'Gg5$wR7tNj4Y',
}

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Simulate a brief auth check
    setTimeout(() => {
      const expected = USERS[email.trim().toLowerCase()]
      if (expected && expected === password) {
        onLogin({ email: email.trim().toLowerCase() })
      } else {
        setError('Invalid email or password.')
      }
      setLoading(false)
    }, 400)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#FAF7F2' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border p-8 shadow-sm"
        style={{ background: '#FFFFFF', borderColor: '#DDD9D1' }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-4">
            <BookOpen size={26} className="text-white" />
          </div>
          <h1 className="text-xl font-bold" style={{ color: '#2A2825' }}>OmniGuide</h1>
          <p className="text-sm mt-1" style={{ color: '#9A9894' }}>LOBP Document Assistant</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#5A5855' }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none border transition-colors"
              style={{ background: '#FAFAF8', borderColor: '#DDD9D1', color: '#2A2825' }}
              onFocus={e => {
                e.currentTarget.style.borderColor = '#93AADE'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(147,170,222,0.18)'
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = '#DDD9D1'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#5A5855' }}>
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                autoComplete="current-password"
                className="w-full rounded-xl px-4 py-2.5 pr-11 text-sm outline-none border transition-colors"
                style={{ background: '#FAFAF8', borderColor: '#DDD9D1', color: '#2A2825' }}
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
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5"
                style={{ color: '#9A9894' }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p
              className="text-xs rounded-lg px-3 py-2 border"
              style={{ color: '#B91C1C', background: '#FFF5F5', borderColor: '#FECACA' }}
            >
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity"
            style={{ background: '#2563EB', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={15} />
                Sign in
              </>
            )}
          </button>
        </form>

        <p className="text-xs text-center mt-6" style={{ color: '#C5C1B9' }}>
          Access restricted to authorised users only.
        </p>
      </div>
    </div>
  )
}
