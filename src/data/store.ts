import { create } from "zustand";
import { nanoid } from "nanoid";
import {
  db,
  type ID,
  type Category,
  type Budget,
  type Transaction,
  type Subscription,
  type Rule,
  toCents,
} from "./db";

export const monthKey = (d = new Date()) => d.toISOString().slice(0, 7);
type New<T> = Omit<T, "id">;

export interface PCState {
  // scope
  month: string;
  setMonth: (m: string) => void;

  // loading
  loading: boolean;

  // entity caches
  categories: Category[];
  budgets: Budget[];
  transactions: Transaction[];
  subscriptions: Subscription[];
  rules: Rule[];

  // loaders
  refreshAll: () => Promise<void>;

  // budgets
  addBudget: (b: New<Budget>) => Promise<Budget>;
  updateBudget: (id: ID, patch: Partial<Budget>) => Promise<void>;
  deleteBudget: (id: ID) => Promise<void>;

  // categories
  addCategory: (c: New<Category>) => Promise<Category>;

  // transactions
  addTx: (t: New<Transaction>) => Promise<Transaction>;
  deleteTx: (id: ID) => Promise<void>;

  // subscriptions
  addSub: (s: New<Subscription>) => Promise<Subscription>;
  deleteSub: (id: ID) => Promise<void>;

  // rules
  addRule: (r: New<Rule>) => Promise<Rule>;

  // seed
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
      const [categories, budgets, transactions, subscriptions, rules] =
        await Promise.all([
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

  // ---- Budgets
  addBudget: async (b) => {
    const row: Budget = { id: nanoid(), ...b };
    await db.budgets.add(row);
    set({ budgets: [row, ...get().budgets] });
    return row;
  },

  updateBudget: async (id, patch) => {
    await db.budgets.update(id, patch);
    set({
      budgets: get().budgets.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    });
  },

  deleteBudget: async (id) => {
    await db.budgets.delete(id);
    set({ budgets: get().budgets.filter((x) => x.id !== id) });
  },

  // ---- Categories
  addCategory: async (c) => {
    const row: Category = { id: nanoid(), ...c };
    await db.categories.add(row);
    set({ categories: [row, ...get().categories] });
    return row;
  },

  // ---- Transactions
  addTx: async (t) => {
    const row: Transaction = { id: nanoid(), ...t };
    await db.transactions.add(row);
    set({ transactions: [row, ...get().transactions] });
    return row;
  },

  deleteTx: async (id) => {
    await db.transactions.delete(id);
    set({ transactions: get().transactions.filter((x) => x.id !== id) });
  },

  // ---- Subscriptions
  addSub: async (s) => {
    const row: Subscription = { id: nanoid(), ...s };
    await db.subscriptions.add(row);
    set({ subscriptions: [row, ...get().subscriptions] });
    return row;
  },

  deleteSub: async (id) => {
    await db.subscriptions.delete(id);
    set({ subscriptions: get().subscriptions.filter((x) => x.id !== id) });
  },

  // ---- Rules
  addRule: async (r) => {
    const row: Rule = { id: nanoid(), ...r };
    await db.rules.add(row);
    set({ rules: [row, ...get().rules] });
    return row;
  },

  // ---- Seed
  seedIfEmpty: async () => {
    const [catCount] = await Promise.all([db.categories.count()]);
    if (catCount === 0) {
      const cats: Category[] = [
        { id: nanoid(), name: "Groceries", group: "Everyday" },
        { id: nanoid(), name: "Fuel", group: "Everyday" },
        { id: nanoid(), name: "Subscriptions", group: "Bills" },
        { id: nanoid(), name: "Income", group: "Income" },
      ];
      await db.categories.bulkAdd(cats);
    }
  },
}));
