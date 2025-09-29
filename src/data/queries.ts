import { db, ensureDB } from "./db";
import { startOfMonth, endOfMonth } from "date-fns";

const isISO = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isYM  = (s?: string) => !!s && /^\d{4}-\d{2}$/.test(s);

export function monthRange(ym: string) {
  let y: number, m: number;
  if (isYM(ym)) [y, m] = ym.split("-").map(Number);
  else { const d = new Date(); y = d.getFullYear(); m = d.getMonth()+1; }
  const start = startOfMonth(new Date(y, m-1, 1));
  const end   = endOfMonth(start);
  return { startISO: start.toISOString().slice(0,10), endISO: end.toISOString().slice(0,10) };
}

export async function sumSpentCents(ym: string) {
  try {
    await ensureDB();
    const { startISO, endISO } = monthRange(ym);
    const rows = await db.transactions.toArray();                 // no between()
    return rows.reduce((acc, t) => (
      isISO(t.date) && t.date >= startISO && t.date <= endISO && t.amount < 0
        ? acc + Math.abs(t.amount)
        : acc
    ), 0);
  } catch { return 0; }
}

export async function sumPlannedBudgetCents(ym: string) {
  try {
    await ensureDB();
    const key = isYM(ym) ? ym : new Date().toISOString().slice(0,7);
    const rows = await db.budgets.toArray();
    return rows.reduce((acc, b) => b.month === key ? acc + b.planned : acc, 0);
  } catch { return 0; }
}

export async function countActiveSubs() {
  try {
    await ensureDB();
    const rows = await db.subscriptions.toArray();
    return rows.reduce((n, s) => n + (s.active ? 1 : 0), 0);
  } catch { return 0; }
}

export async function spentByCategoryMap(ym: string) {
  try {
    await ensureDB();
    const { startISO, endISO } = monthRange(ym);
    const rows = await db.transactions.toArray();
    const map = new Map<string, number>();
    for (const t of rows) {
      if (!t.categoryId || t.amount >= 0 || !isISO(t.date)) continue;
      if (t.date < startISO || t.date > endISO) continue;
      map.set(t.categoryId, (map.get(t.categoryId) || 0) + Math.abs(t.amount));
    }
    return map;
  } catch { return new Map<string, number>(); }
}
