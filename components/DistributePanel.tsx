"use client";

import { useEffect, useState } from "react";

type Token = { id: string; symbol: string };
type Recipient = { username: string | null; wallet: string; amount: number; wjpAmount?: number };

export default function DistributePanel() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [tokenType, setTokenType] = useState<"WJP" | string>("WJP");
  const [minWjp, setMinWjp] = useState(0);
  const [savingMin, setSavingMin] = useState(false);
  const [preview, setPreview] = useState<{ recipients: Recipient[]; onchain: boolean; belowThreshold?: number } | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any[] | null>(null);
  const [confirmStep, setConfirmStep] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/tokens")
      .then((r) => r.json())
      .then((d) => d.ok && setTokens(d.tokens));
    fetch("/api/admin/distribution-settings")
      .then((r) => r.json())
      .then((d) => d.ok && setMinWjp(d.distribution.min_wjp_distribution));
  }, []);

  async function saveMin() {
    setSavingMin(true);
    try {
      await fetch("/api/admin/distribution-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ min_wjp_distribution: minWjp }),
      });
    } finally {
      setSavingMin(false);
    }
  }

  async function runPreview() {
    setLoading(true);
    setResult(null);
    setError(null);
    setConfirmStep(false);
    try {
      const body = tokenType === "WJP" ? { tokenType: "WJP" } : { tokenType: "COLLAB", tokenId: tokenType };
      const res = await fetch("/api/admin/distribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) setPreview(data);
      else setError(data.error);
    } finally {
      setLoading(false);
    }
  }

  async function confirmDistribute() {
    setLoading(true);
    try {
      const body =
        tokenType === "WJP" ? { tokenType: "WJP", confirm: true } : { tokenType: "COLLAB", tokenId: tokenType, confirm: true };
      const res = await fetch("/api/admin/distribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        setResult(data.details);
        setPreview(null);
      } else {
        setError(data.error);
      }
    } finally {
      setLoading(false);
    }
  }

  const totalAmount = preview?.recipients.reduce((s, r) => s + Number(r.amount), 0) ?? 0;

  return (
    <div>
      <h2 className="font-display text-2xl mb-2">Distribute</h2>
      <p className="text-sm text-paper/50 mb-6 max-w-lg">
        WJP balances convert to POL at send time, using the prices you set in Overview. Collab tokens send as
        themselves. This sends real tokens on Polygon — always review the preview before confirming.
      </p>

      <div className="border border-line rounded-sm p-5 bg-panel mb-6">
        <label className="block mb-4">
          <span className="block text-xs text-paper/50 mb-1">Token to distribute</span>
          <select className="input max-w-xs" value={tokenType} onChange={(e) => setTokenType(e.target.value)}>
            <option value="WJP">WJP (sent as POL)</option>
            {tokens.map((t) => (
              <option key={t.id} value={t.id}>
                {t.symbol}
              </option>
            ))}
          </select>
        </label>

        {tokenType === "WJP" && (
          <div className="flex items-end gap-3 mb-4">
            <label className="block">
              <span className="block text-xs text-paper/50 mb-1">Minimum WJP balance to qualify</span>
              <input
                type="number"
                className="input w-40"
                value={minWjp}
                onChange={(e) => setMinWjp(Number(e.target.value))}
              />
            </label>
            <button onClick={saveMin} disabled={savingMin} className="btn-ghost border border-line rounded-sm">
              {savingMin ? "Saving..." : "Save threshold"}
            </button>
          </div>
        )}

        <button onClick={runPreview} disabled={loading} className="btn-primary">
          {loading ? "Loading..." : "Preview distribution"}
        </button>
        {error && <p className="text-alert text-sm mt-3">{error}</p>}
      </div>

      {preview && (
        <div className="border border-line rounded-sm bg-panel mb-6">
          <div className="p-4 border-b border-line">
            <p className="text-sm text-paper/70">
              {preview.recipients.length} recipients ·{" "}
              {totalAmount.toLocaleString("en-US", { maximumFractionDigits: 4 })}{" "}
              {tokenType === "WJP" ? "POL" : "tokens"} total
            </p>
            {tokenType === "WJP" && !!preview.belowThreshold && (
              <p className="text-xs text-paper/40 mt-1">
                {preview.belowThreshold} member(s) below the {minWjp.toLocaleString()} WJP minimum were excluded —
                their balance is untouched.
              </p>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-line">
            {preview.recipients.map((r, i) => (
              <div key={i} className="p-3 flex justify-between text-sm">
                <span>{r.username ? `@${r.username}` : "—"}</span>
                <span className="font-mono text-paper/60">
                  {tokenType === "WJP" && r.wjpAmount != null && (
                    <span className="text-paper/40 mr-2">{r.wjpAmount.toLocaleString()} WJP →</span>
                  )}
                  {Number(r.amount).toLocaleString("en-US", { maximumFractionDigits: 6 })} → {r.wallet.slice(0, 6)}...
                  {r.wallet.slice(-4)}
                </span>
              </div>
            ))}
            {preview.recipients.length === 0 && (
              <p className="p-4 text-paper/50 text-sm">
                No eligible recipients (need a qualifying balance and a saved wallet).
              </p>
            )}
          </div>
          {preview.recipients.length > 0 && (
            <div className="p-4 border-t border-line">
              {!confirmStep ? (
                <button onClick={() => setConfirmStep(true)} className="btn-danger">
                  Review &amp; confirm
                </button>
              ) : (
                <div>
                  <p className="text-alert text-sm mb-3">
                    This will send real funds on-chain and cannot be undone. Confirm you want to distribute to all{" "}
                    {preview.recipients.length} recipients above.
                  </p>
                  <div className="flex gap-3">
                    <button onClick={confirmDistribute} disabled={loading} className="btn-danger">
                      {loading ? "Sending..." : "Distribute now"}
                    </button>
                    <button onClick={() => setConfirmStep(false)} className="btn-ghost">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="border border-line rounded-sm bg-panel divide-y divide-line">
          {result.map((r, i) => (
            <div key={i} className="p-3 flex justify-between text-sm">
              <span>{r.username ? `@${r.username}` : "—"}</span>
              <span className={`font-mono text-xs ${r.error ? "text-alert" : "text-signal"}`}>
                {r.error ? `Failed: ${r.error}` : r.tx ? `Sent · ${r.tx.slice(0, 10)}...` : "Recorded"}
              </span>
            </div>
          ))}
        </div>
      )}

      <style jsx global>{`
        .btn-danger {
          background: #b95e4a;
          color: #efebdd;
          padding: 0.6rem 1.2rem;
          border-radius: 2px;
          font-weight: 500;
          font-size: 0.9rem;
        }
        .btn-danger:hover {
          background: #c96e59;
        }
        .btn-danger:disabled {
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}
