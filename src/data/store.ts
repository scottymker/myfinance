import { create } from "zustand";
import { nanoid } from "nanoid";
import { db, type ID, type Category, type Budget, type Transaction, type Subscription, type Rule, toCents } from "./db";

/** Utility: "YYYY-MM" for now unless provided */
export const monthKey = (d = new Date()) => d.toISOString().slice(0, 7);

type New<T> = Omit<T, "id">;

interface PCState {
  // UI / scope
  month: string;
  setMonth: (m: string) => void;
  loading: boolean;

  // Cached entities for quick rendering
  categories: Category[];
  budgets: Budget[];
  transactions: Transaction[];
  subscriptions: Subscription[];
  rules: Rule[];

  // Loaders
  refreshAll: () => Promise<void>;

  // Mutations
  addCategory: (c: New<Category>) => Promise<Category>;
  addBudget: (b: New<Budget>) => Promise<Budget>;
  addTx: (t: New<Transaction>) => Promise<Transaction>;
  addSub: (s: New<Subscription>) => Promise<Subscription>;
  addRule: (r: New<Rule>) => Promise<Rule>;

  deleteTx: (id: ID) => Promise<void>;
  deleteSub: (id: ID) => Promise<void>;

  // Helpers
  seedIfEmpty: () => Promise<void>;
}

export const usePC = create<PCState>((set, get) => ({
  month: monthKey(),
  setMonth: (m) => set({ month: m }),

  loading: false,

  categories: [],
  budgets: [],
  transactions: [],
  subscriptions: [],
  rules: [],

  refreshAll: async () => {
    set({ loading: true });
    try {
      const [categories, budgets, transactions, subscriptions, rules] = await Promise.all([
        db.categories.toArray(),
        db.budgets.toArray(),
        db.transactions.orderBy("date").reverse().toArray(),
        db.subscriptions.toArray(),
        db.rules.toArray(),
      ]);
      set({ categories, budgets, transactions, subscriptions, rules });
    } finally {
      set({ loading: false });
    }
  },

  addCategory: async (c) => {
    const row: Category = { id: nanoid(), ...c };
    await db.categories.add(row);
    set({ categories: [row, ...get().categories] });
    return row;
  },

  addBudget: async (b) => {
    const row: Budget = { id: nanoid(), ...b };
    await db.budgets.add(row);
    set({ budgets: [row, ...get().budgets] });
    return row;
  },

  addTx: async (t) => {
    const row: Transaction = { id: nanoid(), ...t };
    await db.transactions.add(row);
    set({ transactions: [row, ...get().transactions] });
    return row;
  },

  addSub: async (s) => {
    const row: Subscription = { id: nanoid(), ...s };
    await db.subscriptions.add(row);
    set({ subscriptions: [row, ...get().subscriptions] });
    return row;
  },

  addRule: async (r) => {
    const row: Rule = { id: nanoid(), ...r };
    await db.rules.add(row);
    set({ rules: [row, ...get().rules] });
    return row;
  },

  deleteTx: async (id) => {
    await db.transactions.delete(id);
    set({ transactions: get().transactions.filter((x) => x.id !== id) });
  },

  deleteSub: async (id) => {
    await db.subscriptions.delete(id);
    set({ subscriptions: get().subscriptions.filter((x) => x.id !== id) });
  },

  /** Add a couple defaults so the UI isn't empty on first run */
  seedIfEmpty: async () => {
    const [catCount, txCount] = await Promise.all([
      db.categories.count(),
      db.transactions.count(),
    ]);
    if (catCount === 0) {
      const cats: Category[] = [
        { id: nanoid(), name: "Groceries", group: "Everyday" },
        { id: nanoid(), name: "Fuel", group: "Everyday" },
        { id: nanoid(), name: "Subscriptions", group: "Bills" },
        { id: nanoid(), name: "Income", group: "Income" },
      ];
      await db.categories.bulkAdd(cats);
    }
    if (txCount === 0) {
      const cats = await db.categories.toArray();
      const groceries = cats.find(c => c.name === "Groceries")?.id;
      const fuel = cats.find(c => c.name === "Fuel")?.id;
      const seed: Transaction[] = [
        { id: nanoid(), date: new Date().toISOString().slice(0,10), merchant: "Costco", amount: -toCents(61.96), categoryId: groceries },
        { id: nanoid(), date: new Date().toISOString().slice(0,10), merchant: "Shell", amount: -toCents(0), categoryId: fuel },
      ];
      await db.transactions.bulkAdd(seed);
    }
  },
}));
