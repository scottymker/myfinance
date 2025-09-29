import { useEffect, useMemo, useState } from "react";
import { usePC } from "../data/store";
import { fromCents, toCents, type Budget as B } from "../data/db";
import { spentByCategoryMap } from "../data/queries";

export default function Budget() {
  const month = usePC(s => s.month);
  const categories = usePC(s => s.categories);
  const budgets = usePC(s => s.budgets).filter(b => b.month === month);
  const addBudget = usePC(s => s.addBudget);
  const updateBudget = usePC(s => s.updateBudget);
  const deleteBudget = usePC(s => s.deleteBudget);
  const refreshAll = usePC(s => s.refreshAll);

  const [spentMap, setSpentMap] = useState<Map<string, number>>(new Map());
  const [newCatId, setNewCatId] = useState<string>("");
  const [newAmt, setNewAmt] = useState<string>("");

  useEffect(() => {
    (async () => setSpentMap(await spentByCategoryMap(month)))();
  }, [month, budgets.length]);

  const catName = (id?: string) => categories.find(c => c.id === id)?.name || "—";

  const remaining = (b: B) => {
    const spent = spentMap.get(b.categoryId) || 0;
    return b.planned - spent;
  };

  const availableCats = useMemo(() => {
    const used = new Set(budgets.map(b => b.categoryId));
    return categories.filter(c => !used.has(c.id));
  }, [categories, budgets]);

  const totalPlanned = budgets.reduce((a,b)=>a+b.planned,0);
  const totalSpent = [...spentMap.values()].reduce((a,b)=>a+b,0);
  const totalRemain = totalPlanned - totalSpent;

  const onAdd = async () => {
    if (!newCatId) return alert("Pick a category");
    const cents = toCents(Number(newAmt || 0));
    await addBudget({ month, categoryId: newCatId, planned: cents, rollover: false });
    setNewCatId(""); setNewAmt("");
    await refreshAll();
  };

  return (
    <main className="container">
      <h1>Budget</h1>

      <section className="section">
        <table className="table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Planned</th>
              <th>Spent</th>
              <th>Remaining</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {budgets.map(b => {
              const spent = spentMap.get(b.categoryId) || 0;
              return (
                <tr key={b.id}>
                  <td>{catName(b.categoryId)}</td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={(b.planned/100).toFixed(2)}
                      onBlur={async (e)=>{
                        const cents = toCents(Number(e.currentTarget.value || 0));
                        if (cents !== b.planned) await updateBudget(b.id, { planned: cents });
                      }}
                      style={{width:120}}
                    />
                  </td>
                  <td>{fromCents(spent)}</td>
                  <td style={{fontWeight:600}}>{fromCents(remaining(b))}</td>
                  <td>
                    <button onClick={()=>deleteBudget(b.id)}>Delete</button>
                  </td>
                </tr>
              );
            })}

            <tr>
              <td>
                <select value={newCatId} onChange={e=>setNewCatId(e.target.value)} style={{minWidth:180}}>
                  <option value="">Add category…</option>
                  {availableCats.map(c=>(
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </td>
              <td>
                <input type="number" step="0.01" value={newAmt} onChange={e=>setNewAmt(e.target.value)} placeholder="0.00" style={{width:120}}/>
              </td>
              <td colSpan={2}></td>
              <td><button onClick={onAdd}>Add</button></td>
            </tr>
          </tbody>

          <tfoot>
            <tr>
              <th>Total</th>
              <th>{fromCents(totalPlanned)}</th>
              <th>{fromCents(totalSpent)}</th>
              <th>{fromCents(totalRemain)}</th>
              <th></th>
            </tr>
          </tfoot>
        </table>
      </section>
    </main>
  );
}
