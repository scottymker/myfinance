import Dexie, { type Table } from "dexie";

export type ID = string;
export type Currency = number; // cents

export interface Category { id: ID; name: string; group: string; }
export interface Budget { id: ID; month: string; categoryId: ID; planned: Currency; rollover: boolean; }
export interface Transaction { id: ID; date: string; merchant: string; amount: Currency; account?: string; categoryId?: ID; note?: string; isSubscription?: boolean; importedHash?: string; }
export interface Subscription { id: ID; merchant: string; approx: Currency; lastCharge?: string; matchCount: number; active: boolean; }
export interface Rule { id: ID; match:{ merchant?:string; contains?:string; amountAbs?:Currency }; set:{ categoryId?:ID; subscription?:boolean }; }

class PCDB extends Dexie {
  categories!: Table<Category, ID>;
  budgets!: Table<Budget, ID>;
  transactions!: Table<Transaction, ID>;
  subscriptions!: Table<Subscription, ID>;
  rules!: Table<Rule, ID>;
  constructor() {
    super("pennycoach");
    // primary key then indexed fields:
    this.version(1).stores({
      categories: "id,name,group",
      budgets: "id,month,categoryId",
      transactions: "id,date,merchant,amount,categoryId",
      subscriptions: "id,merchant,active",
      rules: "id"
    });
  }
}
export const db = new PCDB();

/** Open DB and surface clear error if something blocks IndexedDB. */
export async function ensureDB() {
  try {
    if (!db.isOpen()) await db.open();
  } catch (e) {
    console.error("Dexie open failed:", e);
    throw e;
  }
}

export const toCents = (dollars: number | string) => Math.round(Number(dollars) * 100);
export const fromCents = (cents: number, currency = "USD") =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency });
