import { useEffect, useMemo, useState } from 'react'
import { supa } from './lib/supabase'

type Tx = { id: string; date: string; merchant: string; category: string; amount: number }

function normalizeMerchant(raw: string): string {
  if (!raw) return 'Unknown'
  let m = raw.trim()
  m = m.replace(/\*|#|POS\s*\d+|PAYMENT|AUTH|PENDING/gi, '')
  m = m.replace(/\s{2,}/g, ' ').trim()
  return m[0].toUpperCase() + m.slice(1).toLowerCase()
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

function daysBetween(a: Date, b: Date) { return Math.abs((+a - +b) / 86400000) }

function looksMonthly(dates: Date[]) {
  if (dates.length < 2) return false
  const sorted = [...dates].sort((a,b) => +b - +a)
  const gaps: number[] = []
  for (let i=0; i<sorted.length-1; i++) gaps.push(daysBetween(sorted[i], sorted[i+1]))
  const nearMonthly = gaps.filter(g => g >= 25 && g <= 35).length
  if (nearMonthly >= 1 && dates.length >= 2) return true
  if (gaps.length >= 2) {
    const avg = gaps.reduce((a,b)=>a+b,0)/gaps.length
    const variance = gaps.reduce((a,b)=>a+Math.pow(b-avg,2),0)/gaps.length
    const std = Math.sqrt(variance)
    if (avg >= 25 && avg <= 35 && std <= 6) return true
  }
  return false
}

export default function Subs({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true)
  const [txs, setTxs] = useState<Tx[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      setLoading(true); setError(null)
      const today = new Date()
      const since = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 120)
      const sinceISO = since.toISOString().slice(0,10)
      const { data, error } = await supa
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('date', sinceISO)
        .order('date', { ascending: false })
      if (error) { setError(error.message); setLoading(false); return }
      const rows = (data ?? []).map((r:any) => ({
        id: r.id, date: r.date, merchant: r.merchant, category: r.category, amount: Number(r.amount)
      }))
      setTxs(rows); setLoading(false)
    })()
  }, [userId])

  const subs = useMemo(() => {
    const byMerchant = new Map<string, Tx[]>()
    for (const t of txs) {
      if (t.amount <= 0) continue
      const m = normalizeMerchant(t.merchant)
      if (!byMerchant.has(m)) byMerchant.set(m, [])
      byMerchant.get(m)!.push(t)
    }
    const findings: Array<{merchant:string; count:number; avg:number; last:string}> = []
    for (const [m, list] of byMerchant) {
      if (list.length < 2) continue
      const dates = list.map(t => new Date(t.date))
      if (!looksMonthly(dates)) continue
      const avg = list.reduce((a,b)=>a+b.amount,0)/list.length
      const last = list.sort((a,b)=> +new Date(b.date) - +new Date(a.date))[0].date
      findings.push({ merchant: m, count: list.length, avg, last })
    }
    findings.sort((a,b) => +new Date(b.last) - +new Date(a.last) || b.avg - a.avg)
    return findings.slice(0, 12)
  }, [txs])

  if (loading) return <div className="p-4 bg-white rounded-xl border">Scanning subscriptions…</div>
  if (error) return <div className="p-4 bg-white rounded-xl border text-red-600">Error: {error}</div>
  if (!subs.length) return (
    <div className="p-4 bg-white rounded-xl border">
      <h2 className="font-semibold mb-2">Subscriptions</h2>
      <div className="text-sm text-gray-500">No recurring charges detected over ~4 months.</div>
    </div>
  )

  return (
    <div className="p-4 bg-white rounded-xl border">
      <h2 className="font-semibold mb-2">Subscriptions</h2>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b">
            <th className="py-2 pr-2">Merchant</th>
            <th className="py-2 pr-2">Approx.</th>
            <th className="py-2 pr-2">Last charge</th>
            <th className="py-2 pr-2">Matches</th>
          </tr>
        </thead>
        <tbody>
          {subs.map((s,i)=>(
            <tr key={i} className="border-b">
              <td className="py-2 pr-2">{s.merchant}</td>
              <td className="py-2 pr-2">{fmt(s.avg)}</td>
              <td className="py-2 pr-2">{s.last}</td>
              <td className="py-2 pr-2">{s.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-500 mt-2">
        Tip: create a budget category “Subscriptions” and use merchant rules to auto-categorize these.
      </p>
    </div>
  )
}
