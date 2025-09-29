import React, { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import TopNav from "./components/TopNav";
import Overview from "./pages/Overview";
import Budget from "./pages/Budget";
import SubsTx from "./pages/SubsTx";
import { usePC } from "./data/store";
import { ensureDB } from "./data/db";

export default function App() {
  const loading = usePC(s => s.loading);
  const seedIfEmpty = usePC(s => s.seedIfEmpty);
  const refreshAll = usePC(s => s.refreshAll);

  useEffect(() => {
    (async () => {
      try {
        await ensureDB();
        await seedIfEmpty();
        await refreshAll();
      } catch (e) {
        console.error(e);
        alert("Your browser blocked local storage (IndexedDB). PennyCoach can still load, but data won't persist.");
      }
    })();
  }, [seedIfEmpty, refreshAll]);

  return (
    <>
      <TopNav />
      {loading && (
        <div style={{position:"fixed", inset:0, background:"rgba(255,255,255,.6)", backdropFilter:"blur(2px)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600}}>
          Loading…
        </div>
      )}
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/budget" element={<Budget />} />
        <Route path="/subs-tx" element={<SubsTx />} />
      </Routes>
    </>
  );
}
