"use client";

import { useState } from "react";

export default function PasscodeGate({ onUnlock }: { onUnlock: () => void }) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Incorrect passcode.");
        return;
      }
      onUnlock();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-ink flex items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-xs">
        <p className="text-xs uppercase tracking-wide text-paper/40 mb-2 font-body">Web3 Junkies</p>
        <h1 className="font-display text-2xl text-paper mb-8">Enter the console</h1>

        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="Passcode"
          className="w-full bg-panel border border-line rounded-sm px-4 py-3 text-paper tracking-[0.3em] text-center font-mono mb-4 focus:border-gold outline-none"
        />

        {error && <p className="text-alert text-sm mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading || passcode.length === 0}
          className="w-full py-3 rounded-sm bg-gold text-ink font-medium hover:bg-gold2 transition-colors disabled:opacity-50"
        >
          {loading ? "Checking..." : "Unlock"}
        </button>
      </form>
    </main>
  );
}
