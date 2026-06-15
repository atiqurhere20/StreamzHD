"use client";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/Toast";
import { Plus, Trash, Edit, Check, X, Search } from "lucide-react";

interface Collection {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  channel_count?: number;
}

interface Channel {
  id: string;
  name: string;
  language?: string | null;
  category?: { name: string } | null;
}

export default function CollectionsAdmin() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Form state
  const [name, setName] = useState("");
  const [order, setOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function loadCollections() {
    const res = await fetch("/api/collections").then((r) => r.json());
    setCollections(res.collections || []);
  }

  async function loadChannels() {
    const res = await fetch("/api/channels?limit=500").then((r) => r.json());
    setChannels(res.channels || []);
  }

  useEffect(() => {
    loadCollections();
    loadChannels();
  }, []);

  async function startEdit(col: Collection) {
    setEditingId(col.id);
    setName(col.name);
    setOrder(col.sort_order);
    setIsActive(col.is_active);
    
    // Load existing channel mappings for this collection
    const res = await fetch(`/api/collections/${col.id}`).then((r) => r.json());
    setSelectedChannelIds(res.channel_ids || []);
  }

  function cancelEdit() {
    setEditingId(null);
    setName("");
    setOrder(0);
    setIsActive(true);
    setSelectedChannelIds([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast("Name required", "error");

    const payload = {
      name,
      sort_order: order,
      is_active: isActive,
      channel_ids: editingId ? selectedChannelIds : undefined
    };

    const url = editingId ? `/api/collections/${editingId}` : "/api/collections";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      toast(editingId ? "Collection updated" : "Collection created", "success");
      cancelEdit();
      loadCollections();
    } else {
      toast("Action failed", "error");
    }
  }

  async function remove(id: string) {
    if (!confirm("Are you sure you want to delete this collection? This will not delete the channels themselves.")) return;
    const res = await fetch(`/api/collections/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Collection deleted", "success");
      if (editingId === id) cancelEdit();
      loadCollections();
    } else {
      toast("Failed to delete", "error");
    }
  }

  function toggleChannel(channelId: string) {
    setSelectedChannelIds((prev) =>
      prev.includes(channelId) ? prev.filter((id) => id !== channelId) : [...prev, channelId]
    );
  }

  const filteredChannels = channels.filter((ch) =>
    ch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const inputClass = "w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm";

  return (
    <div className="p-8 max-w-5xl space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold">Homepage Collections</h1>
          <p className="text-text-muted text-sm mt-1">
            Create custom collections (like &quot;FIFA World Cup Special&quot;) to showcase on your homepage and dedicated URLs.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr,400px] gap-6 items-start">
        {/* Left Column: List of Collections */}
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          <div className="p-4 font-semibold text-sm bg-card-hover/20">Active Collections</div>
          {collections.length === 0 ? (
            <div className="p-8 text-center text-text-dim text-sm">No collections created yet.</div>
          ) : (
            collections.map((col) => (
              <div key={col.id} className="p-4 flex items-center justify-between gap-4 hover:bg-card-hover/10 transition-all">
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    <span>{col.name}</span>
                    {!col.is_active && (
                      <span className="text-[10px] bg-red-950/50 text-red-400 border border-red-900 px-1.5 py-0.5 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-text-dim mt-1">
                    Slug: <code className="bg-bg px-1.5 py-0.5 rounded">/collection/{col.slug}</code> · {col.channel_count} channels
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(col)}
                    className="p-2 hover:bg-card rounded-lg text-text-dim hover:text-primary transition"
                    title="Edit name and map channels"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(col.id)}
                    className="p-2 hover:bg-card rounded-lg text-text-dim hover:text-error transition"
                    title="Delete collection"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Column: Add/Edit Panel */}
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
            <h2 className="text-md font-bold text-primary flex items-center gap-2">
              {editingId ? "✏️ Edit Collection Details" : "➕ Create New Collection"}
            </h2>

            <label className="block">
              <span className="block text-xs uppercase text-text-dim mb-1">Collection Name</span>
              <input
                required
                type="text"
                className={inputClass}
                placeholder="e.g. FIFA World Cup Special"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-xs uppercase text-text-dim mb-1">Sort Order</span>
                <input
                  type="number"
                  className={inputClass}
                  value={order}
                  onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                />
              </label>

              <label className="flex items-center gap-2 text-sm self-end pb-2">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                Active
              </label>
            </div>

            {/* If editing, show channel mapping */}
            {editingId && (
              <div className="border-t border-border pt-4 space-y-3">
                <span className="block text-xs uppercase text-text-dim">Map Channels to Collection ({selectedChannelIds.length} mapped)</span>
                
                {/* Channel Search Input */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-dim" />
                  <input
                    type="text"
                    placeholder="Search channels..."
                    className="w-full bg-bg border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Checklist container */}
                <div className="max-h-60 overflow-y-auto border border-border bg-bg/50 rounded-lg p-2 divide-y divide-border/50 text-xs">
                  {filteredChannels.length === 0 ? (
                    <div className="p-4 text-center text-text-dim">No channels found.</div>
                  ) : (
                    filteredChannels.map((ch) => {
                      const isSelected = selectedChannelIds.includes(ch.id);
                      return (
                        <div
                          key={ch.id}
                          onClick={() => toggleChannel(ch.id)}
                          className="flex items-center justify-between py-1.5 px-1 hover:bg-card cursor-pointer"
                        >
                          <div>
                            <span className="font-semibold">{ch.name}</span>
                            {ch.category?.name && (
                              <span className="text-[10px] text-text-dim ml-2 bg-card border border-border px-1.5 rounded">
                                {ch.category.name}
                              </span>
                            )}
                          </div>
                          <div className={`h-4 w-4 rounded border flex items-center justify-center transition-all ${
                            isSelected ? "bg-primary border-primary text-white" : "border-border"
                          }`}>
                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex-1 transition"
              >
                {editingId ? "Save Collection" : "Create Collection"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="bg-bg border border-border hover:bg-card-hover px-4 py-2 rounded-lg font-semibold text-sm transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
