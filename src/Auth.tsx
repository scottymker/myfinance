import { useState } from 'react'
import { supa } from './lib/supabase'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supa.auth.signInWithOtp({ email })
    setLoading(false)
    if (error) alert(error.message)
    else setSent(true)
  }

  if (sent) {
    return (
      <div className="p-4 bg-white border rounded">
        <div className="font-medium">Check your email</div>
        <p className="text-sm text-gray-600">Click the magic link to finish signing in.</p>
      </div>
    )
  }

  return (
    <form onSubmit={signIn} className="p-4 bg-white border rounded flex gap-2">
      <input
        className="border rounded px-3 py-2 flex-1"
        placeholder="you@example.com"
        value={email}
        onChange={(e)=>setEmail(e.target.value)}
        type="email"
        required
      />
      <button disabled={loading} className="px-3 py-2 bg-blue-600 text-white rounded">
        {loading ? 'Sending…' : 'Send link'}
      </button>
    </form>
  )
}
