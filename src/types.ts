export type Transaction = {
  id: string
  date: string   // YYYY-MM-DD
  merchant: string
  category: string
  amount: number // positive = outflow, negative = inflow
}
