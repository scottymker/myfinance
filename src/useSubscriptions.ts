import { useEffect, useState, useCallback } from 'react'
import { supa } from './lib/supabase'

export type Sub = {
  id: string
  merchant: string
  amount: number
  last_charge: string | null
  matches: number | null
  status: 'Active' | 'Paused'
}

export function useSubscriptions() {
  const [subs, setSubs] = useState<Sub[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    const { data: session } = await supa.auth.getSession()
    if (!session?.session) { setSubs([]); setLoading(false); return }
    const { data, error } = await supa
      .from('subscriptions')
      .select('id, merchant, amount, last_charge, matches, status')
      .order('merchant', { ascending: true })
    if (error) setError(error.message)
    setSubs((data ?? []) as any)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const create = useCallback(async (merchant: string, amount: number) => {
    const { data: userRes } = await supa.auth.getUser()
    const user_id = userRes.user?.id
    if (!user_id) throw new Error('Not signed in')
    const payload = { user_id, merchant, amount, status: 'Active' as const }
    const optimisticId = crypto.randomUUID()
    setSubs(prev => [{ id: optimisticId, merchant, amount, last_charge: null, matches: null, status: 'Active' }, ...prev])
    const { data, error } = await supa.from('subscriptions').insert(payload).select().single()
    if (error) { setError(error.message); await load(); return }
    setSubs(prev => [data as any, ...prev.filter(s => s.id !== optimisticId)])
  }, [load])

  const toggle = useCallback(async (id: string) => {
    const current = subs.find(s => s.id === id)
    if (!current) return
    const next = current.status === 'Active' ? 'Paused' : 'Active'
    setSubs(prev => prev.map(s => s.id === id ? { ...s, status: next } : s))
    const { error } = await supa.from('subscriptions').update({ status: next }).eq('id', id)
    if (error) { setError(error.message); await load() }
  }, [subs, load])

  const remove = useCallback(async (id: string) => {
    const prev = subs
    setSubs(p => p.filter(s => s.id !== id))
    const { error } = await supa.from('subscriptions').delete().eq('id', id)
    if (error) { setError(error.message); setSubs(prev) }
  }, [subs])

  return { subs, loading, error, create, toggle, remove, reload: load }
}
