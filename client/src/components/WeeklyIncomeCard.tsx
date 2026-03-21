import { useState, useEffect } from "react";

const API = "https://nexa-finance-production.up.railway.app";

function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split("T")[0];
}

export default function WeeklyIncomeCard() {
  const [myIncome, setMyIncome] = useState("");
  const [spouseIncome, setSpouseIncome] = useState("");
  const [status, setStatus] = useState("");
  const [currentLog, setCurrentLog] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCurrent();
  }, []);

  async function loadCurrent() {
    try {
      const res = await fetch(`${API}/api/income/latest`);
      if (!res.ok) return;
      const d = await res.json();
      if (d && (d.myIncome || d.spouseIncome)) {
        setCurrentLog(d);
        if (d.carriedForward) {
          setMyIncome(parseFloat(d.myIncome || 0).toFixed(2));
          setSpouseIncome(parseFloat(d.spouseIncome || 0).toFixed(2));
        }
      }
    } catch (e) {}
  }

  async function handleLog() {
    const my = parseFloat(myIncome || "0");
    const spouse = parseFloat(spouseIncome || "0");
    if (!my && !spouse) { setStatus("⚠ Enter at least one amount"); return; }
    setLoading(true);
    setStatus("Logging...");
    try {
      const res = await fetch(`${API}/api/income`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStartDate: getWeekStart(),
          myIncome: my.toFixed(2),
          spouseIncome: spouse.toFixed(2),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setStatus(`✓ $${(my + spouse).toFixed(2)} logged for this week`);
      setMyIncome("");
      setSpouseIncome("");
      setTimeout(() => { setStatus(""); loadCurrent(); }, 2000);
    } catch (e) {
      setStatus("⚠ Could not log. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const weekStart = getWeekStart();
  const total = currentLog
    ? (parseFloat(currentLog.myIncome || 0) + parseFloat(currentLog.spouseIncome || 0)).toFixed(2)
    : null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-amber-400 tracking-wider uppercase">
          💰 Weekly Income
        </h3>
        <span className="text-xs text-muted-foreground">Week of {weekStart}</span>
      </div>

      {/* Current logged amount */}
      {currentLog && (
        <div className="flex gap-4 mb-3 p-2 rounded-lg bg-muted/30 text-xs font-mono">
          <span className="text-muted-foreground">Me: <span className="text-green-400">${parseFloat(currentLog.myIncome || 0).toFixed(2)}</span></span>
          <span className="text-muted-foreground">Wife: <span className="text-green-400">${parseFloat(currentLog.spouseIncome || 0).toFixed(2)}</span></span>
          <span className="text-muted-foreground">Total: <span className="text-amber-400 font-bold">${total}</span></span>
          {currentLog.carriedForward && <span className="text-muted-foreground italic">carried forward</span>}
        </div>
      )}

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs text-muted-foreground tracking-wider uppercase block mb-1">My Income</label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={myIncome}
            onChange={e => setMyIncome(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-amber-400/50"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground tracking-wider uppercase block mb-1">Wife's Income</label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={spouseIncome}
            onChange={e => setSpouseIncome(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-amber-400/50"
          />
        </div>
      </div>

      <button
        onClick={handleLog}
        disabled={loading}
        className="w-full py-2.5 rounded-lg bg-amber-400/15 border border-amber-400/30 text-amber-400 text-xs font-mono tracking-wider uppercase hover:bg-amber-400/25 transition-colors disabled:opacity-50"
      >
        ✓ Log This Week
      </button>

      {status && (
        <p className={`mt-2 text-xs text-center font-mono ${status.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>
          {status}
        </p>
      )}
    </div>
  );
}
