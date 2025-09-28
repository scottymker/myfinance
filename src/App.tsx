import { useMemo, useState } from 'react'

type Sub = {
  id: string
  merchant: string
  amount: number
  lastCharge?: string
  matches?: number
  status: 'Active' | 'Paused'
}

export default function App() {
  // ---- Budgets (same as before) ----
  const budgets = useMemo(() => [
    { name: 'Groceries', spent: 61.96, limit: 120 },
    { name: 'Fuel',      spent:  0.00, limit: 150 },
  ], [])

  // ---- Subscriptions (unified list: detected + user) ----
  // Start with one item to mirror your UI; we’ll wire to Supabase next.
  const [subs, setSubs] = useState<Sub[]>([
    { id: 'seed-1', merchant: 'Netflix', amount: 15.49, lastCharge: '2025-09-05', matches: 7, status: 'Active' }
  ])
  const [newMerchant, setNewMerchant] = useState('')
  const [newAmount, setNewAmount] = useState('')

  const monthlyTotal = subs
    .filter(s => s.status === 'Active')
    .reduce((sum, s) => sum + (Number.isFinite(s.amount) ? s.amount : 0), 0)

  function createSub() {
    const m = newMerchant.trim()
    const a = Number(newAmount)
    if (!m) return alert('Enter a merchant')
    if (!Number.isFinite(a) || a <= 0) return alert('Enter a valid amount')
    setSubs(prev => [
      ...prev,
      { id: crypto.randomUUID(), merchant: m, amount: a, status: 'Active' }
    ])
    setNewMerchant('')
    setNewAmount('')
  }

  function togglePause(id: string) {
    setSubs(prev => prev.map(s => s.id === id
      ? { ...s, status: s.status === 'Active' ? 'Paused' : 'Active' }
      : s))
  }

  function del(id: string) {
    setSubs(prev => prev.filter(s => s.id !== id))
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

      {/* Subscriptions (unified) */}
      <section className="p-4 bg-white rounded-xl border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Subscriptions</h2>
          <div className="text-sm">Monthly total: ${monthlyTotal.toFixed(2)}</div>
        </div>

        {/* Create new */}
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
          <button
            className="px-3 py-1 rounded bg-black text-white"
            onClick={createSub}
          >
            Create subscription
          </button>
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
                  <td className="py-2 pr-3">${s.amount.toFixed(2)}</td>
                  <td className="py-2 pr-3">{s.lastCharge ?? '—'}</td>
                  <td className="py-2 pr-3">{s.matches ?? '—'}</td>
                  <td className="py-2 pr-3">{s.status}</td>
                  <td className="py-2 flex gap-2">
                    <button
                      className="px-2 py-1 rounded border"
                      onClick={() => togglePause(s.id)}
                    >
                      {s.status === 'Active' ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      className="px-2 py-1 rounded border text-red-600"
                      onClick={() => del(s.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {subs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-3 text-gray-500">
                    No subscriptions yet.
                  </td>
                </tr>
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
