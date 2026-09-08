"use client";

import { useEffect, useState } from "react";

type Member = {
  id: string;
  username: string | null;
  telegram_id: number;
  wallet_address: string | null;
  wjp_points: number;
  tasks_completed: number;
  verified: boolean;
  created_at: string;
};

type LookupBalance = { balance: number; token_id: string; collab_tokens: { id: string; symbol: string; name: string } };
type Token = { id: string; symbol: string };

export default function MembersPanel() {
  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState("");
  const [tokens, setTokens] = useState<Token[]>([]);

  // lookup + adjust
  const [lookupInput, setLookupInput] = useState("");
  const [lookupResult, setLookupResult] = useState<{ member: Member; balances: LookupBalance[] } | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const [adjustType, setAdjustType] = useState<"WJP" | string>("WJP");
  const [adjustMode, setAdjustMode] = useState<"add" | "set">("add");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [adjustMsg, setAdjustMsg] = useState<string | null>(null);

  function loadList() {
    fetch("/api/admin/members")
      .then((r) => r.json())
      .then((data) => data.ok && setMembers(data.members));
  }

  useEffect(() => {
    loadList();
    fetch("/api/admin/tokens")
      .then((r) => r.json())
      .then((d) => d.ok && setTokens(d.tokens));
  }, []);

  async function runLookup(e?: React.FormEvent) {
    e?.preventDefault();
    if (!lookupInput.trim()) return;
    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);
    setAdjustMsg(null);
    try {
      const clean = lookupInput.trim().replace(/^@/, "");
      const res = await fetch(`/api/admin/members/lookup?username=${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (!data.ok) {
        setLookupError(data.error);
        return;
      }
      setLookupResult(data);
    } finally {
      setLookupLoading(false);
    }
  }

  async function submitAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!lookupResult || !adjustAmount) return;
    setAdjustSaving(true);
    setAdjustMsg(null);
    try {
      const res = await fetch("/api/admin/members/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: lookupResult.member.username,
          type: adjustType === "WJP" ? "WJP" : "COLLAB",
          tokenId: adjustType === "WJP" ? undefined : adjustType,
          mode: adjustMode,
          amount: Number(adjustAmount),
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setAdjustMsg(data.error);
        return;
      }
      setAdjustMsg("Updated.");
      setAdjustAmount("");
      runLookup();
      loadList();
    } finally {
      setAdjustSaving(false);
    }
  }

  const filtered = members.filter((m) => (m.username || "").toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <h2 className="font-display text-2xl mb-6">Members</h2>

      {/* Lookup + adjust */}
      <div className="border border-line rounded-sm p-5 bg-panel mb-10">
        <p className="text-sm text-paper/50 mb-3">Check or adjust a member's balances</p>
        <form onSubmit={runLookup} className="flex gap-2 mb-4">
          <input
            className="input"
            placeholder="username (e.g. dayo)"
            value={lookupInput}
            onChange={(e) => setLookupInput(e.target.value)}
          />
          <button type="submit" disabled={lookupLoading} className="btn-primary shrink-0">
            {lookupLoading ? "Looking up..." : "Look up"}
          </button>
        </form>

        {lookupError && <p className="text-alert text-sm">{lookupError}</p>}

        {lookupResult && (
          <div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mb-5 text-sm">
              <span>
                <span className="text-paper/50">User:</span> @{lookupResult.member.username}
              </span>
              <span>
                <span className="text-paper/50">WJP:</span>{" "}
                <span className="font-mono">{lookupResult.member.wjp_points.toLocaleString()}</span>
              </span>
              <span>
                <span className="text-paper/50">Verified:</span>{" "}
                {lookupResult.member.verified ? (
                  <span className="text-signal">yes</span>
                ) : (
                  <span className="text-alert">no</span>
                )}
              </span>
              {lookupResult.balances.map((b) => (
                <span key={b.token_id}>
                  <span className="text-paper/50">{b.collab_tokens.symbol}:</span>{" "}
                  <span className="font-mono">{Number(b.balance).toLocaleString()}</span>
                </span>
              ))}
            </div>

            <form onSubmit={submitAdjust} className="grid sm:grid-cols-4 gap-3 items-end border-t border-line pt-4">
              <label className="block">
                <span className="block text-xs text-paper/50 mb-1">Balance</span>
                <select className="input" value={adjustType} onChange={(e) => setAdjustType(e.target.value)}>
                  <option value="WJP">WJP</option>
                  {tokens.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.symbol}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-xs text-paper/50 mb-1">Action</span>
                <select className="input" value={adjustMode} onChange={(e) => setAdjustMode(e.target.value as "add" | "set")}>
                  <option value="add">Add to balance</option>
                  <option value="set">Set exact balance</option>
                </select>
              </label>
              <label className="block">
                <span className="block text-xs text-paper/50 mb-1">Amount</span>
                <input
                  type="number"
                  step="any"
                  className="input"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  required
                />
              </label>
              <button type="submit" disabled={adjustSaving} className="btn-primary">
                {adjustSaving ? "Saving..." : "Apply"}
              </button>
            </form>
            {adjustMsg && <p className="text-sm mt-2 text-signal">{adjustMsg}</p>}
          </div>
        )}
      </div>

      {/* Full list */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg">All members</h3>
        <input
          className="input w-56"
          placeholder="Search username..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="border border-line rounded-sm bg-panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-paper/40 border-b border-line">
              <th className="p-3 font-normal">Username</th>
              <th className="p-3 font-normal">Verified</th>
              <th className="p-3 font-normal">WJP</th>
              <th className="p-3 font-normal">Tasks</th>
              <th className="p-3 font-normal">Wallet</th>
              <th className="p-3 font-normal">Joined</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="ledger-row">
                <td className="p-3">{m.username ? `@${m.username}` : "—"}</td>
                <td className="p-3">{m.verified ? <span className="text-signal">✓</span> : <span className="text-paper/30">—</span>}</td>
                <td className="p-3 font-mono">{m.wjp_points.toLocaleString("en-US")}</td>
                <td className="p-3 font-mono">{m.tasks_completed}</td>
                <td className="p-3 font-mono text-xs text-paper/60">
                  {m.wallet_address ? `${m.wallet_address.slice(0, 6)}...${m.wallet_address.slice(-4)}` : "not set"}
                </td>
                <td className="p-3 text-paper/40">{new Date(m.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="p-4 text-paper/50" colSpan={6}>
                  No members found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
