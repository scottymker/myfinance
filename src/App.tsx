import { useMemo } from 'react'
import NamedBoundary from './NamedBoundary'
import { assertIsComponent } from './guards'

import Auth from './Auth'
import RuleButton from './RuleButton'
import UnifiedSubscriptions from './UnifiedSubscriptions'

// Guard that imports are real React components
assertIsComponent('Auth', Auth)
assertIsComponent('RuleButton', RuleButton)
assertIsComponent('UnifiedSubscriptions', UnifiedSubscriptions)

export default function App() {
  // ---- Minimal Budgets UI (static placeholder first) ----
  const budgets = useMemo(() => [
    { name: 'Groceries', spent: 61.96, limit: 120 },
    { name: 'Fuel',      spent:  0.00, limit: 150 },
  ], [])

  return (
    <div className="p-6 font-sans">
      <h1 className="text-2xl font-semibold mb-4">PennyCoach — Personal Finance</h1>

      <NamedBoundary name="Budgets">
        <section className="grid md:grid-cols-2 gap-4">
          {budgets.map(b => (
            <div key={b.name} className="p-4 bg-white rounded-xl border">
              <div className="flex justify-between mb-1">
                <span className="font-medium">{b.name}</span>
                <span>${b.spent.toFixed(2)} / ${b.limit.toFixed(0)}</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded">
                <div className="h-2 rounded bg-black" style={{width: `${Math.min(100, (b.spent/b.limit)*100)}%`}} />
              </div>
            </div>
          ))}
        </section>
      </NamedBoundary>
    </div>
  )
}
