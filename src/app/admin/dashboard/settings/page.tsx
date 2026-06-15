"use client";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/Toast";

export default function SettingsAdmin() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => {
      const map: Record<string, string> = {};
      for (const [k, v] of Object.entries(d.settings || {})) map[k] = v == null ? "" : String(v);
      setSettings(map);
    });
  }, []);

  function set(k: string, v: string) { setSettings((p) => ({ ...p, [k]: v })); }

  async function save() {
    setSaving(true);
    const r = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
    setSaving(false);
    if (r.ok) toast("Saved", "success"); else toast("Failed", "error");
  }

  const fields = [
    { key: "site_name", label: "Site name" },
    { key: "site_description", label: "Site description" },
    { key: "telegram_url", label: "Join Telegram URL" },
    { key: "channels_per_page", label: "Channels per page" },
    { key: "maintenance_mode", label: "Maintenance mode (true/false)" },
    { key: "player_autoplay", label: "Player autoplay (true/false)" },
    { key: "show_epg", label: "Show EPG (true/false)" },
  ];
  const input = "w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm";

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <h1 className="text-3xl font-display font-bold">Settings</h1>
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        {fields.map((f) => (
          <label key={f.key} className="block">
            <span className="block text-xs uppercase tracking-wider text-text-dim mb-1.5">{f.label}</span>
            <input className={input} value={settings[f.key] || ""} onChange={(e) => set(f.key, e.target.value)} />
          </label>
        ))}
        <button onClick={save} disabled={saving} className="bg-primary hover:bg-primary-dark disabled:opacity-50 px-6 py-2.5 rounded-lg font-semibold">{saving ? "Saving…" : "Save settings"}</button>
      </div>
    </div>
  );
}
