import { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import { supa } from './lib/supabase'
import Auth from './Auth'
import RuleButton from './RuleButton'
import Subs from './Subs'
import SubscriptionsList from './SubscriptionsList'

type Transaction = { id: string; date: string; merchant: string; category: string; amount: number }
type BudgetMap = Record<string, number>

const DEFAULT_BUDGETS: BudgetMap = {
  Groceries: 400, Dining: 200, Fuel: 150, Shopping: 200,
  Utilities: 300, Rent: 1200, Entertainment: 120, Misc: 100,
}
const CATEGORIES = Object.keys(DEFAULT_BUDGETS)

function normalizeMerchant(raw: string): string {
  if (!raw) return 'Unknown'
  let m = raw.trim()
  m = m.replace(/\*|#|POS\s*\d+|PAYMENT|AUTH|PENDING/gi, '')
  m = m.replace(/\s{2,}/g, ' ').trim()
  return m[0].toUpperCase() + m.slice(1).toLowerCase()
}
function startOfMonth(d = new Date()): Date { return new Date(d.getFullYear(), d.getMonth(), 1) }
function endOfMonth(d = new Date()): Date { return new Date(d.getFullYear(), d.getMonth()+1, 0) }
function formatCurrency(n: number): string { return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) }
function daysInMonth(d = new Date()): number { return endOfMonth(d).getDate() }
function todayDayOfMonth(): number { return new Date().getDate() }

type Insight = { title: string, detail: string }

export default function App() {
  const [session, setSession] = useState<import('@supabase/supabase-js').Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [txs, setTxs] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<BudgetMap>(DEFAULT_BUDGETS)
  const [insights, setInsights] = useState<Insight[]>([])
  const [rules, setRules] = useState<Record<string, string>>({})

  // Auth session
  useEffect(() => {
    supa.auth.getSession().then(({ data }) => setSession(data.session ?? null))
    const { data: sub } = supa.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // Load data
  useEffect(() => {
    if (!session) return
    ;(async () => {
      setLoading(true)
      const userId = session.user.id
      const now = new Date(); const month = now.getMonth() + 1; const year = now.getFullYear()

      // Budgets
      const { data: b } = await supa
        .from('budgets')
        .select('category, limit_amount')
        .eq('user_id', userId).eq('month', month).eq('year', year)

      if (b && b.length) {
        const map: BudgetMap = {}; for (const row of b) map[row.category] = Number(row.limit_amount); setBudgets(map)
      } else {
        const seed = Object.entries(DEFAULT_BUDGETS).map(([category, limit_amount]) => ({ user_id: userId, category, limit_amount, month, year }))
        await supa.from('budgets').insert(seed)
        setBudgets({ ...DEFAULT_BUDGETS })
      }

      // Transactions (this month)
      const start = startOfMonth().toISOString().slice(0,10)
      const end = endOfMonth().toISOString().slice(0,10)
      const { data: t } = await supa
        .from('transactions')
        .select('*')
        .eq('user_id', userId).gte('date', start).lte('date', end)
        .order('date', { ascending: false })

      if (t) setTxs(t.map(row => ({
        id: row.id, date: row.date, merchant: row.merchant, category: row.category, amount: Number(row.amount)
      })))

      // Merchant rules
      const { data: r } = await supa
        .from('merchant_rules')
        .select('merchant, category')
        .eq('user_id', userId)
      if (r) {
        const map: Record<string,string> = {}
        for (const row of r) map[row.merchant] = row.category
        setRules(map)
      }

      setLoading(false)
    })()
  }, [session])

  const monthStart = startOfMonth(), monthEnd = endOfMonth()
  const monthTxs = useMemo(() => txs.filter(t => {
    const d = new Date(t.date); return d >= monthStart && d <= monthEnd
  }), [txs])

  const spentByCat = useMemo(() => {
    const agg: Record<string, number> = {}; for (const c of CATEGORIES) agg[c] = 0
    for (const t of monthTxs) { const cat = CATEGORIES.includes(t.category) ? t.category : 'Misc'
      const amt = t.amount > 0 ? t.amount : 0; agg[cat] = (agg[cat] ?? 0) + amt }
    return agg
  }, [monthTxs])

  const totalOutflow = Object.values(spentByCat).reduce((a, b) => a + b, 0)
  const totalBudget = Object.values(budgets).reduce((a, b) => a + b, 0)

  // Coach (client-side)
  useEffect(() => {
    const list: Insight[] = []
    const day = todayDayOfMonth(), dim = daysInMonth(), pace = day / dim
    for (const cat of CATEGORIES) {
      const spent = spentByCat[cat] ?? 0, limit = budgets[cat] ?? 0, expected = limit * pace
      if (limit > 0 && spent > expected + 10) {
        const over = spent - expected
        const perDayCap = Math.max(0, (limit - spent) / Math.max(1, dim - day))
        list.push({ title: `${cat}: you're ahead of pace by ${formatCurrency(over)}`,
          detail: `To finish on budget (${formatCurrency(limit)}), keep daily spend near ${formatCurrency(perDayCap)} for the rest of the month.` })
      }
    }
    if (totalOutflow < totalBudget * pace - 20) {
      list.push({ title: `Spending is under pace`,
        detail: `You've spent ${formatCurrency(totalOutflow)} vs expected ${formatCurrency(totalBudget * pace)}. Consider moving $50–$150 to savings.` })
    }
    const seen = new Map<string, number>()
    for (const t of monthTxs) { if (t.amount <= 0) continue
      const key = `${normalizeMerchant(t.merchant)}|${t.amount.toFixed(2)}`; seen.set(key, (seen.get(key) ?? 0) + 1) }
    for (const [key, count] of seen.entries()) if (count >= 2) {
      const [m, a] = key.split('|')
      list.push({ title: `Possible duplicate charges`,
        detail: `Saw ${count} charges of ${formatCurrency(Number(a))} at ${m}. Verify one isn't a duplicate.` })
    }
    setInsights(list.slice(0, 5))
  }, [spentByCat, budgets, monthTxs, totalOutflow, totalBudget])

  if (!session) {
    return (
      <div className="max-w-lg mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-bold">PennyCoach — Sign in</h1>
        <Auth />
        <p className="text-xs text-gray-500">Add http://localhost:5173 and your Netlify URL in Supabase → Auth → Redirect URLs.</p>
      </div>
    )
  }

  const userId = session.user.id

  async function handleCSV(file: File) {
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (res: any) => {
        const rows = (res.data as any[]).map((r) => {
          const merchant = normalizeMerchant(String(r.merchant ?? r.Merchant ?? r.description ?? r.Description ?? 'Unknown'))
          const guessed = rules[merchant] ?? String(r.category ?? r.Category ?? 'Misc')
          const rawAmt = Number(r.amount ?? r.Amount ?? r.amt ?? 0)
          const dateStr = String(r.date ?? r.Date ?? '').trim()
          const parsedDate = dateStr ? new Date(dateStr) : new Date()
          const iso = !isNaN(parsedDate as any) ? parsedDate.toISOString().slice(0,10) : new Date().toISOString().slice(0,10)
          return { user_id: userId, date: iso, merchant, category: guessed, amount: Math.max(0, Math.abs(rawAmt)) }
        })
        const { error } = await supa.from('transactions').insert(rows)
        if (error) { alert(error.message); return }
        const start = startOfMonth().toISOString().slice(0,10), end = endOfMonth().toISOString().slice(0,10)
        const { data: t } = await supa.from('transactions').select('*')
          .eq('user_id', userId).gte('date', start).lte('date', end).order('date', { ascending: false })
        if (t) setTxs(t.map(row => ({ id: row.id, date: row.date, merchant: row.merchant, category: row.category, amount: Number(row.amount) })))
      }
    })
  }

  async function addManual() {
    const row = { user_id: userId, date: new Date().toISOString().slice(0,10), merchant: 'Manual Entry', category: 'Misc', amount: 0 }
    const { data, error } = await supa.from('transactions').insert(row).select().single()
    if (error) { alert(error.message); return }
    if (data) setTxs(prev => [{ ...data, amount: Number(data.amount) }, ...prev])
  }

  async function updateTx(id: string, field: keyof Transaction, value: string) {
    const patch: any = {}; patch[field] = (field === 'amount') ? Number(value) : value
    if (field === 'merchant') {
      const m = normalizeMerchant(String(value))
      if (rules[m]) patch['category'] = rules[m]
    }
    const { error } = await supa.from('transactions').update(patch).eq('id', id).eq('user_id', userId)
    if (!error) setTxs(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
  }

  async function removeTx(id: string) {
    const { error } = await supa.from('transactions').delete().eq('id', id).eq('user_id', userId)
    if (!error) setTxs(prev => prev.filter(t => t.id !== id))
  }

  async function setBudget(cat: string, val: number) {
    setBudgets(b => ({ ...b, [cat]: val }))
    const now = new Date(); const month = now.getMonth() + 1; const year = now.getFullYear()
    await supa.from('budgets').upsert(
      { user_id: userId, category: cat, limit_amount: val, month, year },
      { onConflict: 'user_id,category,month,year' }
    )
  }

  if (loading) return <div className="p-6 text-gray-600">Loading…</div>

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">PennyCoach — Personal Finance</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium px-3 py-2 bg-white border rounded cursor-pointer hover:bg-gray-50">
            Import CSV
            <input type="file" accept=".csv,text/csv" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCSV(f) }} />
          </label>
          <button onClick={addManual} className="text-sm px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Add Manual</button>
          <button onClick={() => supa.auth.signOut()} className="text-sm px-3 py-2 bg-gray-200 rounded hover:bg-gray-300">Sign out</button>
        </div>
      </header>

      <section className="grid md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border"><div className="text-gray-500 text-sm">This month spent</div><div className="text-3xl font-semibold">{formatCurrency(totalOutflow)}</div></div>
        <div className="p-4 bg-white rounded-xl border"><div className="text-gray-500 text-sm">Monthly budget</div><div className="text-3xl font-semibold">{formatCurrency(totalBudget)}</div></div>
        <div className="p-4 bg-white rounded-xl border"><div className="text-gray-500 text-sm">Progress</div><div className="text-3xl font-semibold">{todayDayOfMonth()} / {daysInMonth()}</div></div>
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
                <input className="ml-2 w-24 border rounded px-2 py-1 text-right" type="number" value={limit}
                  onChange={(e) => setBudget(cat, Number(e.target.value || 0))} />
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

        <Subs userId={userId} />
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
                    <input className="border rounded px-2 py-1" type="date" value={t.date}
                      onChange={(e) => updateTx(t.id, 'date', e.target.value)} />
                  </td>
                  <td className="py-2 pr-2">
                    <input className="border rounded px-2 py-1 w-56" value={t.merchant}
                      onChange={(e) => updateTx(t.id, 'merchant', e.target.value)} />
                  </td>
                  <td className="py-2 pr-2">
                    <select className="border rounded px-2 py-1" value={t.category}
                      onChange={(e) => updateTx(t.id, 'category', e.target.value)}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    <input className="border rounded px-2 py-1 text-right w-28" type="number" step="0.01" value={t.amount}
                      onChange={(e) => updateTx(t.id, 'amount', e.target.value)} />
                  </td>
                  <td className="py-2 pr-2 text-right space-x-2">
                    <RuleButton userId={userId} merchant={normalizeMerchant(t.merchant)} category={t.category} />
                    <button onClick={() => removeTx(t.id)} className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="text-xs text-gray-500 text-center py-6">
        Supabase-backed demo. Sign out to switch accounts.
      </footer>
    </div>
  )
}
