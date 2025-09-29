import { useState } from "react";
import { usePC } from "../data/store";
import { fromCents, toCents } from "../data/db";
import { parseCSV, mapRow } from "../utils/csv";

export default function SubsTx() {
  const transactions = usePC(s=>s.transactions);
  const subscriptions = usePC(s=>s.subscriptions);
  const addTx = usePC(s=>s.addTx);
  const refreshAll = usePC(s=>s.refreshAll);
  const [busy, setBusy] = useState(false);

  const onCSV = async (file: File) => {
    setBusy(true);
    try {
      const rows = await parseCSV(file);
      let inserted = 0;
      for (const r of rows) {
        const m = mapRow(r);
        if (!m.date || !m.merchant || !Number.isFinite(m.amount)) continue;
        await addTx({ date: m.date, merchant: m.merchant, amount: m.amount });
        inserted++;
      }
      await refreshAll();
      alert(`Imported ${inserted} transactions ✔`);
    } catch (e:any) {
      alert(`Import failed: ${e?.message || e}`);
    } finally { setBusy(false); }
  };

  const manualAdd = async () => {
    const merchant = prompt("Merchant? (e.g., Costco)")?.trim();
    if (!merchant) return;
    const date = prompt("Date (YYYY-MM-DD)?", new Date().toISOString().slice(0,10))?.trim()!;
    const amt = prompt("Amount (e.g., -61.96 for spend, 100 for income)")?.trim()!;
    const amount = toCents(Number(amt));
    await addTx({ date, merchant, amount });
    await refreshAll();
  };

  return (
    <main className="container">
      <h1>Subscriptions &amp; Transactions</h1>

      <section className="section" style={{display:"flex", gap:8}}>
        <input id="csv-import" type="file" accept=".csv" style={{display:"none"}}
               onChange={async (e)=>{ const f = e.currentTarget.files?.[0]; if (f) await onCSV(f); e.currentTarget.value=""; }} />
        <button onClick={() => document.getElementById("csv-import")?.click()}>Import CSV</button>
        <button onClick={manualAdd}>Add Manual</button>
        {busy && <span className="muted">Working…</span>}
      </section>

      <section className="section">
        <h2>Transactions</h2>
        <table className="table">
          <thead><tr><th>Date</th><th>Merchant</th><th>Amount</th></tr></thead>
          <tbody>
            {transactions.map(t=>(
              <tr key={t.id}>
                <td>{t.date}</td>
                <td>{t.merchant}</td>
                <td>{fromCents(t.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="section">
        <h2>Subscriptions</h2>
        <table className="table">
          <thead><tr><th>Merchant</th><th>Approx.</th><th>Last charge</th><th>Matches</th></tr></thead>
          <tbody>
            {subscriptions.map(s=>(
              <tr key={s.id}>
                <td>{s.merchant}</td>
                <td>{fromCents(s.approx)}</td>
                <td>{s.lastCharge || "—"}</td>
                <td>{s.matchCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted">Tip: create a budget category “Subscriptions” and use rules to auto-categorize.</p>
      </section>
    </main>
  );
}
