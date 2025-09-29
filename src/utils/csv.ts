import Papa from "papaparse";
import { toCents } from "../data/db";

export type RawRow = Record<string,string>;

export function parseCSV(file: File): Promise<RawRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader(h) { return h.trim().toLowerCase(); },
      complete: (r) => resolve(r.data as RawRow[]),
      error: reject
    });
  });
}

/** Try to map a CSV row into {date, merchant, amount} */
export function mapRow(r: RawRow) {
  // Common headers across banks:
  // date, posted, transaction date, description, details, name, payee
  // amount, debit, credit
  const date = (r["date"] || r["transaction date"] || r["posted"] || "").slice(0,10);
  const merchant = r["description"] || r["details"] || r["name"] || r["payee"] || "Unknown";

  let amtStr = r["amount"] ?? "";
  if (!amtStr) {
    // separate debit/credit columns
    const debit = r["debit"] || r["withdrawal"];
    const credit = r["credit"] || r["deposit"];
    if (debit) amtStr = `-${debit}`;
    else if (credit) amtStr = `${credit}`;
  }

  // Normalize "$1,234.56" or "1,234.56" -> number
  const clean = (amtStr || "0").replace(/[^-0-9.]/g, "");
  const amountCents = toCents(parseFloat(clean || "0"));

  return { date, merchant: merchant.trim(), amount: amountCents };
}
