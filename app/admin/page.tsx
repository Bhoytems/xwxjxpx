"use client";

import { useEffect, useState } from "react";
import PasscodeGate from "@/components/PasscodeGate";
import OverviewPanel from "@/components/OverviewPanel";
import TasksPanel from "@/components/TasksPanel";
import TokensPanel from "@/components/TokensPanel";
import MembersPanel from "@/components/MembersPanel";
import DistributePanel from "@/components/DistributePanel";
import SettingsPanel from "@/components/SettingsPanel";

type Tab = "overview" | "tasks" | "tokens" | "members" | "distribute" | "settings";

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    // Try a harmless authenticated call to see if the session cookie is still valid.
    fetch("/api/admin/members")
      .then((r) => setUnlocked(r.status !== 401))
      .catch(() => setUnlocked(false))
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return <main className="min-h-screen bg-ink" />;
  }

  if (!unlocked) {
    return <PasscodeGate onUnlock={() => setUnlocked(true)} />;
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "tasks", label: "Tasks" },
    { id: "tokens", label: "Collab tokens" },
    { id: "members", label: "Members" },
    { id: "distribute", label: "Distribute" },
    { id: "settings", label: "Ads settings" },
  ];

  return (
    <main className="min-h-screen bg-ink text-paper flex">
      <aside className="w-56 shrink-0 border-r border-line px-5 py-8 hidden sm:block">
        <h1 className="font-display text-xl mb-1">Web3 Junkies</h1>
        <p className="text-xs text-paper/45 mb-8">Admin console</p>
        <nav className="space-y-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full text-left px-3 py-2 rounded-sm text-sm transition-colors ${
                tab === t.id ? "bg-panel text-gold border border-line" : "text-paper/60 hover:text-paper"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="border-b border-line px-6 py-4 flex sm:hidden gap-2 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-sm text-sm whitespace-nowrap ${
                tab === t.id ? "bg-panel text-gold border border-line" : "text-paper/60"
              }`}
            >
              {t.label}
            </button>
          ))}
        </header>

        <div className="p-6 sm:p-10 max-w-5xl">
          {tab === "overview" && <OverviewPanel />}
          {tab === "tasks" && <TasksPanel />}
          {tab === "tokens" && <TokensPanel />}
          {tab === "members" && <MembersPanel />}
          {tab === "distribute" && <DistributePanel />}
          {tab === "settings" && <SettingsPanel />}
        </div>
      </div>
    </main>
  );
}
