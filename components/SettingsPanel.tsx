"use client";

import { useEffect, useState } from "react";

export default function SettingsPanel() {
  const [mode, setMode] = useState<"none" | "direct" | "adsterra">("none");
  const [directLink, setDirectLink] = useState("");
  const [adsterraCode, setAdsterraCode] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setMode(d.ads.mode);
          setDirectLink(d.ads.direct_link || "");
          setAdsterraCode(d.ads.adsterra_code || "");
        }
      });
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, direct_link: directLink, adsterra_code: adsterraCode }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="font-display text-2xl mb-2">Ads settings</h2>
      <p className="text-sm text-paper/50 mb-6 max-w-lg">
        Controls what shows below the countdown button on every member's redirect page.
      </p>

      <div className="border border-line rounded-sm p-5 bg-panel max-w-lg">
        <div className="space-y-2 mb-5">
          {(["none", "direct", "adsterra"] as const).map((m) => (
            <label key={m} className="flex items-center gap-2 text-sm">
              <input type="radio" checked={mode === m} onChange={() => setMode(m)} />
              {m === "none" ? "No ad slot" : m === "direct" ? "Direct sponsor link" : "Adsterra (or similar) script"}
            </label>
          ))}
        </div>

        {mode === "direct" && (
          <label className="block mb-4">
            <span className="block text-xs text-paper/50 mb-1">Sponsor link</span>
            <input className="input" value={directLink} onChange={(e) => setDirectLink(e.target.value)} placeholder="https://..." />
          </label>
        )}

        {mode === "adsterra" && (
          <label className="block mb-4">
            <span className="block text-xs text-paper/50 mb-1">Ad script / embed code</span>
            <textarea
              className="input font-mono text-xs"
              rows={6}
              value={adsterraCode}
              onChange={(e) => setAdsterraCode(e.target.value)}
              placeholder="<script>...</script>"
            />
            <span className="block text-xs text-paper/40 mt-1">
              Pasted as-is into the redirect page. Only use a script from a network you trust.
            </span>
          </label>
        )}

        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? "Saving..." : "Save settings"}
        </button>
        {saved && <span className="ml-3 text-sm text-signal">Saved.</span>}
      </div>
    </div>
  );
}
