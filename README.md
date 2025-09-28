# PennyCoach — Personal Finance MVP (Static, Netlify-ready)

A simple, privacy-first starter you can deploy **now**. Upload a CSV, set budgets, and get basic coach insights (deterministic rules).

## 1) Run locally
```bash
npm install
npm run dev
```
Visit http://localhost:5173

## 2) Deploy to Netlify
- Push this folder to a new GitHub repo
- In Netlify: **Add new site → Import from Git → pick your repo**
- Build command: `npm run build`
- Publish directory: `dist`
- (We included a `netlify.toml` with defaults.)

## 3) CSV format
Header row recommended. Supported columns: `date`, `merchant`, `category`, `amount`.
- Dates like `2025-09-01`
- Amounts are treated as **spending** (positive numbers).

## 4) Next steps (optional, when ready)
- Hook up Supabase Postgres + Auth and move storage from localStorage to the database.
- Add categorization rules and subscription detection.
- Add Plaid/Teller for bank syncing (server-only tokens).

---

**Why this starter?** Next.js is great, but a Vite SPA is the simplest path to deploy on Netlify while you shape your data model. When you're ready for server code, you can keep this UI and add Netlify Functions (or migrate to Next.js).
