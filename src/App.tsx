import { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import { Transaction } from './types'
import { normalizeMerchant, startOfMonth, endOfMonth, formatCurrency, daysInMonth, todayDayOfMonth } from './utils'

type BudgetMap = Record<string, number>

const DEFAULT_BUDGETS: BudgetMap = {
  Groceries: 400,
  Dining: 200,
  Fuel: 150,
  Shopping: 200,
  Utilities: 300,
  Rent: 1200,
  Entertainment: 120,
  Misc: 100
}

const CATEGORIES = Object.keys(DEFAULT_BUDGETS)

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function loadLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function saveLS<T>(key: string, v: T) {
  localStorage.setItem(key, JSON.stringify(v))
}

type Insight = { title: string, detail: string }

export default function App() {
  const [txs, setTxs] = useState<Transaction[]>(() => loadLS('txs', [] as Transaction[]))
  const [budgets, setBudgets] = useState<BudgetMap>(() => loadLS('budgets', DEFAULT_BUDGETS))
  const [insights, setInsights] = useState<Insight[]>([])

  useEffect(() => saveLS('txs', txs), [txs])
  useEffect(() => saveLS('budgets', budgets), [budgets])

  const monthStart = startOfMonth()
  const monthEnd = endOfMonth()
  const monthTxs = useMemo(() => {
    return txs.filter(t => {
      const d = new Date(t.date)
      return d >= monthStart && d <= monthEnd
    })
  }, [txs])

  const spentByCat = useMemo(() => {
    const agg: Record<string, number> = {}
    for (const c of CATEGORIES) agg[c] = 0
    for (const t of monthTxs) {
      const cat = CATEGORIES.includes(t.category) ? t.category : 'Misc'
      // only count outflows
      const amt = t.amount > 0 ? t.amount : 0
      agg[cat] = (agg[cat] ?? 0) + amt
    }
    return agg
  }, [monthTxs])

  const totalOutflow = Object.values(spentByCat).reduce((a, b) => a + b, 0)
  const totalBudget = Object.values(budgets).reduce((a, b) => a + b, 0)

  useEffect(() => {
    // generate simple, deterministic insights
    const list: Insight[] = []
    const day = todayDayOfMonth()
    const dim = daysInMonth()
    const pace = day / dim // fraction of month elapsed

    for (const cat of CATEGORIES) {
      const spent = spentByCat[cat] ?? 0
      const limit = budgets[cat] ?? 0
      const expected = limit * pace
      if (limit > 0 && spent > expected + 10) {
        const over = spent - expected
        const perDayCap = Math.max(0, (limit - spent) / (dim - day + 1))
        list.push({
          title: `${cat}: you're ahead of pace by ${formatCurrency(over)}`,
          detail: `To finish on budget (${formatCurrency(limit)}), keep daily spend near ${formatCurrency(perDayCap)} for the rest of the month.`
        })
      }
    }

    // Surplus/deficit
    if (totalOutflow < totalBudget * pace - 20) {
      list.push({
        title: `Spending is under pace`,
        detail: `You've spent ${formatCurrency(totalOutflow)} vs expected ${formatCurrency(totalBudget * pace)}. Consider moving $50–$150 to savings.`
      })
    }

    // Duplicate charge check (very basic)
    const seen = new Map<string, number>()
    for (const t of monthTxs) {
      if (t.amount <= 0) continue
      const key = `${normalizeMerchant(t.merchant)}|${t.amount.toFixed(2)}`
      seen.set(key, (seen.get(key) ?? 0) + 1)
    }
    for (const [key, count] of seen.entries()) {
      if (count >= 2) {
        const [m, a] = key.split('|')
        list.push({
          title: `Possible duplicate charges`,
          detail: `Saw ${count} charges of ${formatCurrency(Number(a))} at ${m}. Verify one isn't a duplicate.`
        })
      }
    }

    setInsights(list.slice(0, 5))
  }, [spentByCat, budgets, monthTxs, totalOutflow, totalBudget])

  function handleCSV(file: File) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows = res.data as any[]
        const next: Transaction[] = rows.map((r) => {
          const merchant = normalizeMerchant(String(r.merchant ?? r.Merchant ?? r.description ?? r.Description ?? 'Unknown'))
          const category = String(r.category ?? r.Category ?? 'Misc')
          const rawAmt = Number(r.amount ?? r.Amount ?? r.amt ?? 0)
          const dateStr = String(r.date ?? r.Date ?? '').trim()
          const parsedDate = dateStr ? new Date(dateStr) : new Date()
          const iso = !isNaN(parsedDate as any) ? parsedDate.toISOString().slice(0,10) : new Date().toISOString().slice(0,10)
          return {
            id: uid(),
            date: iso,
            merchant,
            category,
            amount: Math.abs(rawAmt), // treat as outflow
          }
        })
        setTxs((prev) => [...next, ...prev].sort((a,b) => a.date < b.date ? 1 : -1))
      }
    })
  }

  function addManual() {
    setTxs(prev => [{
      id: uid(),
      date: new Date().toISOString().slice(0,10),
      merchant: 'Manual Entry',
      category: 'Misc',
      amount: 0
    }, ...prev])
  }

  function updateTx(id: string, field: keyof Transaction, value: string) {
    setTxs(prev => prev.map(t => t.id === id ? {
      ...t,
      [field]: field === 'amount' ? Number(value) : value
    } : t))
  }

  function removeTx(id: string) {
    setTxs(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">PennyCoach — Personal Finance MVP</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium px-3 py-2 bg-white border rounded cursor-pointer hover:bg-gray-50">
            Import CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleCSV(f)
              }}
            />
          </label>
          <button onClick={addManual} className="text-sm px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Add Manual</button>
        </div>
      </header>

      <section className="grid md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border">
          <div className="text-gray-500 text-sm">This month spent</div>
          <div className="text-3xl font-semibold">{formatCurrency(totalOutflow)}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border">
          <div className="text-gray-500 text-sm">Monthly budget</div>
          <div className="text-3xl font-semibold">{formatCurrency(totalBudget)}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border">
          <div className="text-gray-500 text-sm">Progress</div>
          <div className="text-3xl font-semibold">{todayDayOfMonth()} / {daysInMonth()}</div>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        {Object.entries(budgets).map(([cat, limit]) => {
          const spent = spentByCat[cat] ?? 0
          const pct = Math.min(100, Math.round((spent / Math.max(1, limit)) * 100))
          return (
            <div key={cat} className="p-4 bg-white rounded-xl border">
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium">{cat}</div>
                <div className="text-sm text-gray-500">{formatCurrency(spent)} / {formatCurrency(limit)}</div>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded">
                <div className="h-2 bg-blue-600 rounded" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-2 text-xs text-gray-500">Adjust:
                <input
                  className="ml-2 w-24 border rounded px-2 py-1 text-right"
                  type="number"
                  value={limit}
                  onChange={(e) => setBudgets(b => ({ ...b, [cat]: Number(e.target.value || 0)}))}
                />
              </div>
            </div>
          )
        })}
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="p-4 bg-white rounded-xl border">
          <h2 className="font-semibold mb-2">Coach</h2>
          {insights.length === 0 && <div className="text-sm text-gray-500">No alerts. Nice pace.</div>}
          <ul className="space-y-2">
            {insights.map((i, idx) => (
              <li key={idx} className="p-3 border rounded-lg bg-gray-50">
                <div className="font-medium">{i.title}</div>
                <div className="text-sm text-gray-600">{i.detail}</div>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4 bg-white rounded-xl border">
          <h2 className="font-semibold mb-2">How to format your CSV</h2>
          <p className="text-sm text-gray-600">Header row recommended. Supported columns (any casing): <code>date</code>, <code>merchant</code>, <code>category</code>, <code>amount</code>. Amounts are treated as spending (positive).</p>
          <pre className="mt-2 text-sm bg-black text-white rounded p-3 overflow-auto">
date,merchant,category,amount
2025-09-01,Costco,Groceries,142.33
2025-09-02,Shell,Fuel,42.10
2025-09-03,Chipotle,Dining,13.25
2025-09-04,Netflix,Entertainment,15.49
          </pre>
        </div>
      </section>

      <section className="p-4 bg-white rounded-xl border">
        <h2 className="font-semibold mb-3">Transactions (this month)</h2>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-2">Date</th>
                <th className="py-2 pr-2">Merchant</th>
                <th className="py-2 pr-2">Category</th>
                <th className="py-2 pr-2">Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {monthTxs.map(t => (
                <tr key={t.id} className="border-b">
                  <td className="py-2 pr-2">
                    <input className="border rounded px-2 py-1" type="date" value={t.date} onChange={(e) => updateTx(t.id, 'date', e.target.value)} />
                  </td>
                  <td className="py-2 pr-2">
                    <input className="border rounded px-2 py-1 w-56" value={t.merchant} onChange={(e) => updateTx(t.id, 'merchant', e.target.value)} />
                  </td>
                  <td className="py-2 pr-2">
                    <select className="border rounded px-2 py-1" value={t.category} onChange={(e) => updateTx(t.id, 'category', e.target.value)}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    <input className="border rounded px-2 py-1 text-right w-28" type="number" step="0.01" value={t.amount} onChange={(e) => updateTx(t.id, 'amount', e.target.value)} />
                  </td>
                  <td className="py-2 pr-2 text-right">
                    <button onClick={() => removeTx(t.id)} className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="text-xs text-gray-500 text-center py-6">
        Local-only demo. Deploy to Netlify, then connect a database later.
      </footer>
    </div>
  )
}
