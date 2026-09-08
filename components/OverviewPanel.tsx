"use client";

import { useEffect, useState } from "react";

type TokenTotal = { id: string; symbol: string; name: string; total: number; usdValue: number; polValue: number };

export default function OverviewPanel() {
  const [wjpPrice, setWjpPrice] = useState("0");
  const [polPrice, setPolPrice] = useState("0");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [data, setData] = useState<{
    wjp: { total: number; usdValue: number; polValue: number };
    tokens: TokenTotal[];
    wallet: any;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/overview");
      const d = await res.json();
      if (d.ok) {
        setData(d);
        setWjpPrice(String(d.pricing.wjp_usd_price ?? 0));
        setPolPrice(String(d.pricing.pol_usd_price ?? 0));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function savePricing() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wjp_usd_price: Number(wjpPrice), pol_usd_price: Number(polPrice) }),
      });
      setSaved(true);
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="font-display text-2xl mb-6">Overview</h2>

      <div className="border border-line rounded-sm p-5 bg-panel mb-8 grid sm:grid-cols-3 gap-4 items-end">
        <label className="block">
          <span className="block text-xs text-paper/50 mb-1">Price per 1 WJP (USD)</span>
          <input className="input" type="number" step="any" value={wjpPrice} onChange={(e) => setWjpPrice(e.target.value)} />
        </label>
        <label className="block">
          <span className="block text-xs text-paper/50 mb-1">Price per 1 POL (USD)</span>
          <input className="input" type="number" step="any" value={polPrice} onChange={(e) => setPolPrice(e.target.value)} />
        </label>
        <div>
          <button onClick={savePricing} disabled={saving} className="btn-primary">
            {saving ? "Saving..." : "Save prices"}
          </button>
          {saved && <span className="ml-3 text-sm text-signal">Saved.</span>}
        </div>
      </div>

      {loading && <p className="text-paper/50 text-sm">Loading...</p>}

      {data && (
        <>
          <div className="border border-line rounded-sm bg-panel divide-y divide-line mb-8">
            <Row label="WJP outstanding across all members" mono={`${data.wjp.total.toLocaleString()} WJP`}>
              <span className="text-paper/50 text-sm">
                ≈ ${data.wjp.usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} ·{" "}
                {data.wjp.polValue.toLocaleString(undefined, { maximumFractionDigits: 4 })} POL
              </span>
            </Row>
            {data.tokens.map((t) => (
              <Row key={t.id} label={`${t.symbol} outstanding across all members`} mono={`${t.total.toLocaleString()} ${t.symbol}`}>
                <span className="text-paper/50 text-sm">
                  ≈ ${t.usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} ·{" "}
                  {t.polValue.toLocaleString(undefined, { maximumFractionDigits: 4 })} POL
                </span>
              </Row>
            ))}
            {data.tokens.length === 0 && (
              <p className="p-4 text-paper/40 text-sm">No collab tokens added yet.</p>
            )}
          </div>

          <h3 className="font-display text-lg mb-3">Distributor wallet (live)</h3>
          <div className="border border-line rounded-sm bg-panel">
            {!data.wallet.configured ? (
              <p className="p-4 text-paper/50 text-sm">
                Wallet not configured yet — set <code>DISTRIBUTOR_PRIVATE_KEY</code> and{" "}
                <code>POLYGON_RPC_URL</code> in your environment variables.
              </p>
            ) : (
              <div className="divide-y divide-line">
                <Row label="Native POL balance" mono={`${data.wallet.nativePol.toLocaleString(undefined, { maximumFractionDigits: 4 })} POL`}>
                  <span className="text-paper/50 text-sm">
                    ≈ ${data.wallet.nativeUsdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </Row>
                {data.wallet.tokenBalances.map((t: any, i: number) => (
                  <Row key={i} label={`${t.symbol} balance`} mono={t.balance != null ? `${t.balance.toLocaleString()} ${t.symbol}` : "—"}>
                    <span className="text-paper/50 text-sm">
                      {t.error ? t.error : `≈ $${t.usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                    </span>
                  </Row>
                ))}
                <Row label="Total wallet value" mono="">
                  <span className="text-gold font-mono text-sm">
                    ${data.wallet.totalUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} ·{" "}
                    {data.wallet.totalPol.toLocaleString(undefined, { maximumFractionDigits: 4 })} POL
                  </span>
                </Row>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, mono, children }: { label: string; mono: string; children?: React.ReactNode }) {
  return (
    <div className="p-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-paper/70">{label}</p>
        {mono && <p className="font-mono text-paper mt-0.5">{mono}</p>}
      </div>
      {children}
    </div>
  );
}
