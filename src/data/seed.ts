import Dexie from "dexie";
import { nanoid } from "nanoid";
import { db, toCents, type Category, type Budget, type Subscription, type Transaction } from "./db";

/** Wipe all tables (soft reset) */
export async function resetDB() {
  await Promise.all(db.tables.map(t => t.clear()));
}

/** Delete and recreate the IndexedDB (hard reset) */
export async function nukeDB() {
  try {
    db.close();
    await Dexie.delete("pennycoach");
  } finally {
    await db.open();
  }
}

/** Seed a richer demo dataset */
export async function seedDemo() {
  const categories: Category[] = [
    { id: nanoid(), name: "Groceries", group: "Everyday" },
    { id: nanoid(), name: "Fuel", group: "Everyday" },
    { id: nanoid(), name: "Dining", group: "Everyday" },
    { id: nanoid(), name: "Utilities", group: "Bills" },
    { id: nanoid(), name: "Rent/Mortgage", group: "Bills" },
    { id: nanoid(), name: "Subscriptions", group: "Bills" },
    { id: nanoid(), name: "Income", group: "Income" },
    { id: nanoid(), name: "Savings", group: "Savings" },
  ];
  await db.categories.bulkAdd(categories);

  const idOf = (name:string) => categories.find(c => c.name === name)!.id;
  const month = new Date().toISOString().slice(0,7);

  const budgets: Budget[] = [
    { id: nanoid(), month, categoryId: idOf("Groceries"),     planned: toCents(450),  rollover: false },
    { id: nanoid(), month, categoryId: idOf("Fuel"),          planned: toCents(180),  rollover: false },
    { id: nanoid(), month, categoryId: idOf("Dining"),        planned: toCents(120),  rollover: false },
    { id: nanoid(), month, categoryId: idOf("Utilities"),     planned: toCents(220),  rollover: false },
    { id: nanoid(), month, categoryId: idOf("Rent/Mortgage"), planned: toCents(1450), rollover: false },
    { id: nanoid(), month, categoryId: idOf("Subscriptions"), planned: toCents(85),   rollover: false },
    { id: nanoid(), month, categoryId: idOf("Savings"),       planned: toCents(150),  rollover: true  },
  ];
  await db.budgets.bulkAdd(budgets);

  const subs: Subscription[] = [
    { id: nanoid(), merchant: "Netflix", approx: toCents(15.49), lastCharge: `${month}-05`, matchCount: 7,  active: true },
    { id: nanoid(), merchant: "Spotify", approx: toCents(9.99),  lastCharge: `${month}-12`, matchCount: 9,  active: true },
    { id: nanoid(), merchant: "iCloud",  approx: toCents(2.99),  lastCharge: `${month}-01`, matchCount: 12, active: true },
  ];
  await db.subscriptions.bulkAdd(subs);

  const today = new Date().toISOString().slice(0,10);
  const tx: Transaction[] = [
    { id: nanoid(), date: `${month}-03`, merchant: "Costco",        amount: -toCents(89.12), categoryId: idOf("Groceries") },
    { id: nanoid(), date: `${month}-05`, merchant: "Netflix",       amount: -toCents(15.49), categoryId: idOf("Subscriptions"), isSubscription: true },
    { id: nanoid(), date: `${month}-08`, merchant: "Shell",         amount: -toCents(42.10), categoryId: idOf("Fuel") },
    { id: nanoid(), date: `${month}-12`, merchant: "Spotify",       amount: -toCents(9.99),  categoryId: idOf("Subscriptions"), isSubscription: true },
    { id: nanoid(), date: `${month}-15`, merchant: "Trader Joe's",  amount: -toCents(61.96), categoryId: idOf("Groceries") },
    { id: nanoid(), date: `${month}-01`, merchant: "iCloud",        amount: -toCents(2.99),  categoryId: idOf("Subscriptions"), isSubscription: true },
    { id: nanoid(), date: today,          merchant: "Paycheck",     amount:  toCents(2450),  categoryId: idOf("Income") },
  ];
  await db.transactions.bulkAdd(tx);
}

/** Expose helpers in DevTools for emergencies */
declare global { interface Window { pennycoach?: any } }
if (typeof window !== "undefined") {
  (window as any).pennycoach = { resetDB, nukeDB, seedDemo };
}
