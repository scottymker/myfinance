import { useEffect, useMemo, useState } from 'react'
import { supa } from './lib/supabase'

type Tx = { id:string; date:string; merchant:string; category:string; amount:number }
type Sub = { id:string; merchant:string; amount:number; last_charge:string|null; is_active:boolean }

function normalizeMerchant(raw: string): string {
  if (!raw) return 'Unknown'
  let m = raw.trim()
  m = m.replace(/\*|#|POS\s*\d+|PAYMENT|AUTH|PENDING/gi, '')
  m = m.replace(/\s{2,}/g, ' ').trim()
  return m[0].toUpperCase() + m.slice(1).toLowerCase()
}
function fmt(n:number){ return n.toLocaleString(undefined,{style:'currency',currency:'USD'}) }
function daysBetween(a:Date,b:Date){ return Math.abs((+a-+b)/86400000) }
function looksMonthly(dates: Date[]) {
  if (dates.length < 2) return false
  const sorted = [...dates].sort((a,b)=>+b-+a)
  const gaps:number[]=[]
  for (let i=0;i<sorted.length-1;i++) gaps.push(daysBetween(sorted[i], sorted[i+1]))
  const nearMonthly = gaps.filter(g=>g>=25 && g<=35).length
  if (nearMonthly>=1 && dates.length>=2) return true
  if (gaps.length>=2){
    const avg = gaps.reduce((a,b)=>a+b,0)/gaps.length
    const variance = gaps.reduce((a,b)=>a+Math.pow(b-avg,2),0)/gaps.length
    const std = Math.sqrt(variance)
    if (avg>=25 && avg<=35 && std<=6) return true
  }
  return false
}

export default function UnifiedSubscriptions({ userId }:{ userId:string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string|null>(null)
  const [txs, setTxs]       = useState<Tx[]>([])
  const [subs, setSubs]     = useState<Sub[]>([])
  const [autoAddedOnce, setAutoAddedOnce] = useState(false)

  // Create form
  const [openForm, setOpenForm] = useState(false)
  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState<string>('')
  const [lastCharge, setLastCharge] = useState<string>('') // YYYY-MM-DD
  const [submitting, setSubmitting] = useState(false)

  // Load saved subs + recent transactions
  useEffect(() => {
    ;(async () => {
      setLoading(true); setError(null)
      // Saved subs
      const { data: s, error: se } = await supa
        .from('subscriptions')
        .select('id, merchant, amount, last_charge, is_active')
        .eq('user_id', userId)
      if (se) { setError(se.message); setLoading(false); return }
      setSubs((s ?? []).map((r:any)=>({ ...r, amount:Number(r.amount) })))

      // Recent txs (~120 days)
      const today = new Date()
      const sinceISO = new Date(today.getFullYear(), today.getMonth(), today.getDate()-120).toISOString().slice(0,10)
      const { data: t, error: te } = await supa
        .from('transactions')
        .select('id, date, merchant, category, amount')
        .eq('user_id', userId)
        .gte('date', sinceISO)
        .order('date', { ascending:false })
      if (te) { setError(te.message); setLoading(false); return }
      const rows = (t ?? []).map((r:any)=>({ ...r, amount:Number(r.amount) }))
      setTxs(rows)

      setLoading(false)
    })()
  }, [userId])

  // Detect recurring from txs
  const detections = useMemo(() => {
    const byM = new Map<string, Tx[]>()
    for (const t of txs) {
      if (t.amount <= 0) continue
      const m = normalizeMerchant(t.merchant)
      if (!byM.has(m)) byM.set(m, [])
      byM.get(m)!.push(t)
    }
    const found: Array<{merchant:string; avg:number; last:string; count:number}> = []
    for (const [m, list] of byM) {
      if (list.length < 2) continue
      const dates = list.map(t=>new Date(t.date))
      if (!looksMonthly(dates)) continue
      const avg = list.reduce((a,b)=>a+b.amount,0)/list.length
      const last = list.sort((a,b)=>+new Date(b.date)-+new Date(a.date))[0].date
      found.push({ merchant:m, avg, last, count:list.length })
    }
    return found
  }, [txs])

  // Auto-add new detections into subscriptions (run once after both lists are fetched)
  useEffect(() => {
    if (loading || autoAddedOnce) return
    ;(async () => {
      const saved = new Set(subs.map(s=>normalizeMerchant(s.merchant)))
      const toAdd = detections.filter(d => !saved.has(normalizeMerchant(d.merchant)))
      if (toAdd.length === 0) { setAutoAddedOnce(true); return }
      const payload = toAdd.map(d => ({
        user_id: userId, merchant: d.merchant, amount: d.avg, last_charge: d.last, is_active: true
      }))
      const { error } = await supa.from('subscriptions').upsert(payload, { onConflict: 'user_id,merchant' })
      setAutoAddedOnce(true)
      if (!error) {
        // refresh saved subs
        const { data: s2 } = await supa
          .from('subscriptions')
          .select('id, merchant, amount, last_charge, is_active')
          .eq('user_id', userId)
          .order('merchant')
        setSubs((s2 ?? []).map((r:any)=>({ ...r, amount:Number(r.amount) })))
      }
    })()
  }, [loading, detections, subs, userId, autoAddedOnce])

  // Combined list for rendering (saved subs are the source of truth)
  // Add a "matches" column from detections if available.
  const combined = useMemo(() => {
    const counts = new Map<string, number>()
    const lastBy = new Map<string, string>()
    const avgBy  = new Map<string, number>()
    for (const d of detections) {
      const key = normalizeMerchant(d.merchant)
      counts.set(key, d.count); lastBy.set(key, d.last); avgBy.set(key, d.avg)
    }
    const list = subs
      .map(s => {
        const key = normalizeMerchant(s.merchant)
        return {
          id: s.id,
          merchant: s.merchant,
          amount: s.amount,
          last: s.last_charge ?? lastBy.get(key) ?? null,
          matches: counts.get(key) ?? 0,
          is_active: s.is_active,
          saved: true
        }
      })
      .sort((a,b)=> (b.matches - a.matches) || (a.merchant.localeCompare(b.merchant)))
    return list
  }, [subs, detections])

  async function toggle(id:string, is_active:boolean) {
    const { error } = await supa.from('subscriptions').update({ is_active: !is_active }).eq('id', id)
    if (!error) setSubs(prev => prev.map(r => r.id===id ? { ...r, is_active: !is_active } : r))
    else alert(error.message)
  }
  async function remove(id:string) {
    const { error } = await supa.from('subscriptions').delete().eq('id', id)
    if (!error) setSubs(prev => prev.filter(r => r.id !== id))
    else alert(error.message)
  }

  async function createSub() {
    if (!merchant.trim()) { alert('Merchant is required'); return }
    const amt = Number(amount)
    if (!isFinite(amt) || amt < 0) { alert('Enter a valid amount'); return }
    setSubmitting(true)
    const payload:any = { user_id: userId, merchant: merchant.trim(), amount: amt, is_active: true }
    if (lastCharge) payload.last_charge = lastCharge
    const { error, data } = await supa.from('subscriptions').upsert(payload, { onConflict:'user_id,merchant' }).select().single()
    setSubmitting(false)
    if (error) { alert(error.message); return }
    if (data) {
      setSubs(prev => {
        const exists = prev.find(p => normalizeMerchant(p.merchant)===normalizeMerchant(data.merchant))
        if (exists) return prev.map(p => normalizeMerchant(p.merchant)===normalizeMerchant(data.merchant) ? { ...p, amount:Number(data.amount), last_charge:data.last_charge ?? null, is_active:true } : p)
        return [...prev, { id:data.id, merchant:data.merchant, amount:Number(data.amount), last_charge:data.last_charge ?? null, is_active:true }]
      })
      setMerchant(''); setAmount(''); setLastCharge(''); setOpenForm(false)
    }
  }

  if (loading) return <div className="p-4 bg-white rounded-xl border">Loading subscriptions…</div>
  if (error)   return <div className="p-4 bg-white rounded-xl border text-red-600">Error: {error}</div>

  const monthlyTotal = combined.filter(r=>r.is_active).reduce((a,b)=>a+b.amount,0)

  return (
    <div className="p-4 bg-white rounded-xl border">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Subscriptions</h2>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600">Monthly total: <span className="font-medium">{fmt(monthlyTotal)}</span></div>
          <button
            onClick={()=>setOpenForm(v=>!v)}
            className="text-sm px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            {openForm ? 'Close' : 'Create subscription'}
          </button>
        </div>
      </div>

      {openForm && (
        <div className="mb-4 p-3 border rounded-lg bg-gray-50">
          <div className="grid md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Merchant</label>
              <input className="w-full border rounded px-2 py-2" placeholder="e.g., Netflix"
                     value={merchant} onChange={e=>setMerchant(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Amount</label>
              <input type="number" step="0.01" min="0"
                     className="w-full border rounded px-2 py-2 text-right" placeholder="15.49"
                     value={amount} onChange={e=>setAmount(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Last charge (optional)</label>
              <input type="date" className="w-full border rounded px-2 py-2"
                     value={lastCharge} onChange={e=>setLastCharge(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button onClick={createSub} disabled={submitting}
                      className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60">
                {submitting ? 'Saving…' : 'Save'}
              </button>
              <button onClick={()=>{ setOpenForm(false); setMerchant(''); setAmount(''); setLastCharge('') }}
                      className="px-3 py-2 border rounded">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {combined.length === 0 ? (
        <div className="text-sm text-gray-500">No subscriptions yet. Import a CSV or create one above.</div>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-2">Merchant</th>
                <th className="py-2 pr-2">Amount</th>
                <th className="py-2 pr-2">Last charge</th>
                <th className="py-2 pr-2">Matches</th>
                <th className="py-2 pr-2">Status</th>
                <th className="py-2 pr-2"></th>
              </tr>
            </thead>
            <tbody>
              {combined.map(row => (
                <tr key={row.id} className="border-b">
                  <td className="py-2 pr-2">{row.merchant}</td>
                  <td className="py-2 pr-2">{fmt(row.amount)}</td>
                  <td className="py-2 pr-2">{row.last ?? '—'}</td>
                  <td className="py-2 pr-2">{row.matches || 0}</td>
                  <td className="py-2 pr-2">{row.is_active ? 'Active' : 'Paused'}</td>
                  <td className="py-2 pr-2 space-x-2">
                    <button onClick={()=>toggle(row.id, row.is_active)}
                            className="text-xs px-2 py-1 border rounded hover:bg-gray-50">
                      {row.is_active ? 'Pause' : 'Reactivate'}
                    </button>
                    <button onClick={()=>remove(row.id)}
                            className="text-xs px-2 py-1 border rounded text-red-600 hover:bg-red-50">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-gray-500 mt-2">
        New recurring charges detected from recent transactions are auto-added. You can pause, reactivate, delete, or create subscriptions here.
      </p>
    </div>
  )
}
