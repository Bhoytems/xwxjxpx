"use client";

import { useEffect, useState } from "react";

const COUNTDOWN_SECONDS = 5;

export default function RedirectPage({ params }: { params: { code: string } }) {
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [taskName, setTaskName] = useState<string | null>(null);
  const [ads, setAds] = useState<{ mode: string; adsterra_code?: string; direct_link?: string } | null>(null);
  const [destination, setDestination] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    fetch(`/api/click/${params.code}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) {
          setStatus("error");
          return;
        }
        setTaskName(data.taskName);
        setAds(data.ads);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [params.code]);

  useEffect(() => {
    if (status !== "ready" || secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [status, secondsLeft]);

  async function handleClick() {
    if (secondsLeft > 0) return;
    const tgId = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id;
    const res = await fetch(`/api/click/${params.code}/reward`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId: tgId }),
    });
    const data = await res.json();
    if (data.destination) {
      setDestination(data.destination);
      window.location.href = data.destination;
    }
  }

  if (status === "error") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-ink px-6">
        <p className="text-paper/70 font-body">This link isn't valid, or the task has been removed.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-ink px-6">
      <div className="w-full max-w-sm text-center">
        <p className="text-paper/50 text-xs uppercase tracking-wide mb-3 font-body">
          {taskName || "Loading task"}
        </p>
        <h1 className="font-display text-2xl text-paper mb-8">
          {secondsLeft > 0 ? "Link will be ready soon" : "Your link is ready"}
        </h1>

        <button
          onClick={handleClick}
          disabled={secondsLeft > 0 || status !== "ready"}
          className={`w-full py-4 rounded-sm font-medium text-lg transition-colors ${
            secondsLeft > 0
              ? "bg-panel text-paper/40 cursor-not-allowed border border-line"
              : "bg-gold text-ink hover:bg-gold2"
          }`}
        >
          {secondsLeft > 0 ? secondsLeft : "Click"}
        </button>

        <div className="mt-10">
          <AdsSlot ads={ads} />
        </div>
      </div>
    </main>
  );
}

function AdsSlot({ ads }: { ads: { mode: string; adsterra_code?: string; direct_link?: string } | null }) {
  if (!ads || ads.mode === "none") return null;

  if (ads.mode === "direct" && ads.direct_link) {
    return (
      <a
        href={ads.direct_link}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-sm text-gold/80 hover:text-gold underline underline-offset-4"
      >
        Sponsored
      </a>
    );
  }

  if (ads.mode === "adsterra" && ads.adsterra_code) {
    // The Adsterra snippet is stored as raw HTML/JS and injected here.
    return <div dangerouslySetInnerHTML={{ __html: ads.adsterra_code }} />;
  }

  return null;
}
