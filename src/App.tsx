import { useMemo, useState } from 'react'
import { useSubscriptions } from './useSubscriptions'

export default function App() {
  // Budgets
  const budgets = useMemo(() => [
    { name: 'Groceries', spent: 61.96, limit: 120 },
    { name: 'Fuel',      spent:  0.00, limit: 150 },
  ], [])

  // Subscriptions (Supabase-backed)
  const { subs, loading, error, create, toggle, remove } = useSubscriptions()
  const [newMerchant, setNewMerchant] = useState('')
  const [newAmount, setNewAmount] = useState('')

  const monthlyTotal = subs
    .filter(s => s.status === 'Active')
    .reduce((sum, s) => sum + (Number(s.amount) || 0), 0)

  function onCreate() {
    const m = newMerchant.trim()
    const a = Number(newAmount)
    if (!m) return alert('Enter a merchant')
    if (!Number.isFinite(a) || a <= 0) return alert('Enter a valid amount')
    create(m, a)
    setNewMerchant(''); setNewAmount('')
  }

  return (
    <div className="p-6 font-sans">
      <h1 className="text-2xl font-semibold mb-4">PennyCoach — Personal Finance</h1>

      {/* Budgets */}
      <section className="grid md:grid-cols-2 gap-4 mb-6">
        {budgets.map(b => (
          <div key={b.name} className="p-4 bg-white rounded-xl border">
            <div className="flex justify-between mb-1">
              <span className="font-medium">{b.name}</span>
              <span>${b.spent.toFixed(2)} / ${b.limit.toFixed(0)}</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded">
              <div
                className="h-2 rounded bg-black"
                style={{ width: `${Math.min(100, (b.spent / b.limit) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </section>

      {/* Subscriptions */}
      <section className="p-4 bg-white rounded-xl border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Subscriptions</h2>
          <div className="text-sm">Monthly total: ${monthlyTotal.toFixed(2)}</div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <input
            className="border rounded px-2 py-1"
            placeholder="Merchant"
            value={newMerchant}
            onChange={e => setNewMerchant(e.target.value)}
          />
          <input
            className="border rounded px-2 py-1"
            placeholder="Amount"
            inputMode="decimal"
            value={newAmount}
            onChange={e => setNewAmount(e.target.value)}
          />
          <button className="px-3 py-1 rounded bg-black text-white" onClick={onCreate}>
            Create subscription
          </button>
          {loading && <span className="text-sm text-gray-500">Loading…</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-3">Merchant</th>
                <th className="py-2 pr-3">Amount</th>
                <th className="py-2 pr-3">Last charge</th>
                <th className="py-2 pr-3">Matches</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subs.map(s => (
                <tr key={s.id} className="border-b">
                  <td className="py-2 pr-3">{s.merchant}</td>
                  <td className="py-2 pr-3">${Number(s.amount).toFixed(2)}</td>
                  <td className="py-2 pr-3">{s.last_charge ?? '—'}</td>
                  <td className="py-2 pr-3">{s.matches ?? '—'}</td>
                  <td className="py-2 pr-3">{s.status}</td>
                  <td className="py-2 flex gap-2">
                    <button className="px-2 py-1 rounded border" onClick={() => toggle(s.id)}>
                      {s.status === 'Active' ? 'Pause' : 'Resume'}
                    </button>
                    <button className="px-2 py-1 rounded border text-red-600" onClick={() => remove(s.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {subs.length === 0 && !loading && (
                <tr><td colSpan={6} className="py-3 text-gray-500">No subscriptions yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-500 mt-3">
          New recurring charges detected from recent transactions can be auto-added here. You can pause, reactivate, delete, or create subscriptions.
        </p>
      </section>
    </div>
  )
}
