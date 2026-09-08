"use client";

import { useEffect, useState } from "react";

type Token = {
  id: string;
  symbol: string;
  name: string;
  contract_address: string;
  decimals: number;
  usd_price: number | null;
};

export default function TokensPanel() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [form, setForm] = useState({ symbol: "", name: "", contract_address: "", decimals: 18, usd_price: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/tokens");
    const data = await res.json();
    if (data.ok) setTokens(data.tokens);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, usd_price: form.usd_price ? Number(form.usd_price) : null }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error);
        return;
      }
      setForm({ symbol: "", name: "", contract_address: "", decimals: 18, usd_price: "" });
      load();
    } finally {
      setSaving(false);
    }
  }

  async function updatePrice(id: string, usd_price: string) {
    await fetch(`/api/admin/tokens/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usd_price: usd_price ? Number(usd_price) : null }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Remove this collab token? Tasks using it should be updated first.")) return;
    await fetch(`/api/admin/tokens/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <h2 className="font-display text-2xl mb-6">Collab tokens</h2>

      <form onSubmit={submit} className="border border-line rounded-sm p-5 mb-10 bg-panel grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-xs text-paper/50 mb-1">Symbol</span>
          <input
            className="input"
            value={form.symbol}
            onChange={(e) => setForm({ ...form, symbol: e.target.value })}
            placeholder="e.g. PEPE"
            required
          />
        </label>
        <label className="block">
          <span className="block text-xs text-paper/50 mb-1">Name</span>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>
        <label className="block sm:col-span-2">
          <span className="block text-xs text-paper/50 mb-1">Polygon contract address</span>
          <input
            className="input font-mono text-sm"
            value={form.contract_address}
            onChange={(e) => setForm({ ...form, contract_address: e.target.value })}
            placeholder="0x..."
            required
          />
        </label>
        <label className="block">
          <span className="block text-xs text-paper/50 mb-1">Decimals</span>
          <input
            type="number"
            className="input"
            value={form.decimals}
            onChange={(e) => setForm({ ...form, decimals: Number(e.target.value) })}
          />
        </label>
        <label className="block">
          <span className="block text-xs text-paper/50 mb-1">USD price (optional)</span>
          <input
            type="number"
            step="any"
            className="input"
            value={form.usd_price}
            onChange={(e) => setForm({ ...form, usd_price: e.target.value })}
          />
        </label>

        {error && <p className="text-alert text-sm sm:col-span-2">{error}</p>}

        <div className="sm:col-span-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Adding..." : "Add token"}
          </button>
        </div>
      </form>

      <div className="border border-line rounded-sm bg-panel divide-y divide-line">
        {tokens.length === 0 && <p className="p-5 text-paper/50 text-sm">No collab tokens added yet.</p>}
        {tokens.map((t) => (
          <div key={t.id} className="p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">
                {t.symbol} <span className="text-paper/40 font-normal">— {t.name}</span>
              </p>
              <p className="text-xs text-paper/40 font-mono">{t.contract_address}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <input
                type="number"
                step="any"
                defaultValue={t.usd_price ?? ""}
                placeholder="USD price"
                onBlur={(e) => updatePrice(t.id, e.target.value)}
                className="input w-28 text-sm"
              />
              <button onClick={() => remove(t.id)} className="text-sm text-alert/80 hover:text-alert">
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
