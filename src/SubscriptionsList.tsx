import { useEffect, useState } from 'react'
import { supa } from './lib/supabase'

type Sub = { id:string; merchant:string; amount:number; last_charge:string|null; is_active:boolean }

function fmt(n: number) {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

export default function SubscriptionsList({ userId }:{ userId:string }) {
  const [rows, setRows] = useState<Sub[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string|null>(null)

  async function load() {
    setLoading(true); setError(null)
    const { data, error } = await supa
      .from('subscriptions')
      .select('id, merchant, amount, last_charge, is_active')
      .eq('user_id', userId)
      .order('merchant')
    if (error) setError(error.message)
    setRows((data ?? []).map((r:any)=>({ ...r, amount: Number(r.amount) })))
    setLoading(false)
  }

  useEffect(() => { load() }, [userId])

  async function toggle(id:string, is_active:boolean) {
    const { error } = await supa.from('subscriptions').update({ is_active: !is_active }).eq('id', id)
    if (!error) load(); else alert(error.message)
  }
  async function remove(id:string) {
    const { error } = await supa.from('subscriptions').delete().eq('id', id)
    if (!error) load(); else alert(error.message)
  }

  const monthlyTotal = rows.filter(r=>r.is_active).reduce((a,b)=>a+b.amount,0)

  if (loading) return <div className="p-4 bg-white rounded-xl border">Loading subscriptions…</div>
  if (error) return <div className="p-4 bg-white rounded-xl border text-red-600">Error: {error}</div>

  return (
    <div className="p-4 bg-white rounded-xl border">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">My Subscriptions</h2>
        <div className="text-sm text-gray-600">Monthly total: <span className="font-medium">{fmt(monthlyTotal)}</span></div>
      </div>
      {rows.length === 0 ? (
        <div className="text-sm text-gray-500">No saved subscriptions yet. Use “Confirm” in the detector.</div>
      ) : (
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-2 pr-2">Merchant</th>
              <th className="py-2 pr-2">Amount</th>
              <th className="py-2 pr-2">Last charge</th>
              <th className="py-2 pr-2">Status</th>
              <th className="py-2 pr-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id} className="border-b">
                <td className="py-2 pr-2">{r.merchant}</td>
                <td className="py-2 pr-2">{fmt(r.amount)}</td>
                <td className="py-2 pr-2">{r.last_charge ?? '—'}</td>
                <td className="py-2 pr-2">{r.is_active ? 'Active' : 'Paused'}</td>
                <td className="py-2 pr-2 space-x-2">
                  <button onClick={()=>toggle(r.id, r.is_active)} className="text-xs px-2 py-1 border rounded hover:bg-gray-50">
                    {r.is_active ? 'Pause' : 'Reactivate'}
                  </button>
                  <button onClick={()=>remove(r.id)} className="text-xs px-2 py-1 border rounded text-red-600 hover:bg-red-50">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
