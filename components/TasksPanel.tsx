"use client";

import { useEffect, useState } from "react";

type CollabToken = { id: string; symbol: string; name: string };
type Task = {
  id: string;
  name: string;
  description: string | null;
  link: string;
  reward_type: "WJP" | "COLLAB";
  collab_token_id: string | null;
  reward_amount: number;
  active: boolean;
  collab_tokens?: { symbol: string; name: string } | null;
};

const emptyForm = {
  id: null as string | null,
  name: "",
  description: "",
  link: "",
  reward_type: "WJP" as "WJP" | "COLLAB",
  collab_token_id: "",
  reward_amount: 0,
  active: true,
};

export default function TasksPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tokens, setTokens] = useState<CollabToken[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [tRes, kRes] = await Promise.all([fetch("/api/admin/tasks"), fetch("/api/admin/tokens")]);
    const tData = await tRes.json();
    const kData = await kRes.json();
    if (tData.ok) setTasks(tData.tasks);
    if (kData.ok) setTokens(kData.tokens);
  }

  useEffect(() => {
    load();
  }, []);

  function edit(task: Task) {
    setForm({
      id: task.id,
      name: task.name,
      description: task.description || "",
      link: task.link,
      reward_type: task.reward_type,
      collab_token_id: task.collab_token_id || "",
      reward_amount: task.reward_amount,
      active: task.active,
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const method = form.id ? "PUT" : "POST";
      const url = form.id ? `/api/admin/tasks/${form.id}` : "/api/admin/tasks";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error);
        return;
      }
      setForm(emptyForm);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this task? Members' generated links for it will stop working.")) return;
    await fetch(`/api/admin/tasks/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <h2 className="font-display text-2xl mb-6">Tasks</h2>

      <form onSubmit={submit} className="border border-line rounded-sm p-5 mb-10 bg-panel">
        <p className="text-sm text-paper/50 mb-4">{form.id ? "Edit task" : "New task"}</p>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <Field label="Task name">
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Destination link">
            <input className="input" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} required placeholder="https://..." />
          </Field>
        </div>
        <Field label="Description">
          <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <div className="grid sm:grid-cols-3 gap-4 mt-4">
          <Field label="Reward type">
            <select
              className="input"
              value={form.reward_type}
              onChange={(e) => setForm({ ...form, reward_type: e.target.value as "WJP" | "COLLAB" })}
            >
              <option value="WJP">WJP</option>
              <option value="COLLAB">Collab token</option>
            </select>
          </Field>
          {form.reward_type === "COLLAB" && (
            <Field label="Token">
              <select
                className="input"
                value={form.collab_token_id}
                onChange={(e) => setForm({ ...form, collab_token_id: e.target.value })}
                required
              >
                <option value="">Select token</option>
                {tokens.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.symbol}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Reward amount">
            <input
              type="number"
              step="any"
              className="input"
              value={form.reward_amount}
              onChange={(e) => setForm({ ...form, reward_amount: Number(e.target.value) })}
              required
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 mt-4 text-sm text-paper/70">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
          Active (visible to members)
        </label>

        {error && <p className="text-alert text-sm mt-4">{error}</p>}

        <div className="flex gap-3 mt-5">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving..." : form.id ? "Update task" : "Create task"}
          </button>
          {form.id && (
            <button type="button" onClick={() => setForm(emptyForm)} className="btn-ghost">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="border border-line rounded-sm bg-panel divide-y divide-line">
        {tasks.length === 0 && <p className="p-5 text-paper/50 text-sm">No tasks yet.</p>}
        {tasks.map((t) => (
          <div key={t.id} className="p-4 flex items-start justify-between gap-4">
            <div>
              <p className="font-medium">
                {t.name} {!t.active && <span className="text-xs text-paper/40">(inactive)</span>}
              </p>
              <p className="text-sm text-paper/50">{t.description}</p>
              <p className="text-sm text-gold mt-1 font-mono">
                {t.reward_amount} {t.reward_type === "COLLAB" ? t.collab_tokens?.symbol : "WJP"}
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <button onClick={() => edit(t)} className="text-sm text-paper/60 hover:text-gold">
                Edit
              </button>
              <button onClick={() => remove(t.id)} className="text-sm text-alert/80 hover:text-alert">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          background: #12130f;
          border: 1px solid #2b2e24;
          border-radius: 2px;
          padding: 0.6rem 0.8rem;
          color: #efebdd;
          font-size: 0.9rem;
        }
        .input:focus {
          outline: none;
          border-color: #c9a34e;
        }
        .btn-primary {
          background: #c9a34e;
          color: #12130f;
          padding: 0.6rem 1.2rem;
          border-radius: 2px;
          font-weight: 500;
          font-size: 0.9rem;
        }
        .btn-primary:hover {
          background: #e4c878;
        }
        .btn-primary:disabled {
          opacity: 0.5;
        }
        .btn-ghost {
          color: #efebdd99;
          padding: 0.6rem 1.2rem;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-paper/50 mb-1">{label}</span>
      {children}
    </label>
  );
}
