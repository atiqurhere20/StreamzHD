"use client";
import { useState } from "react";
import { Search, ChevronDown, Radio } from "lucide-react";
import type { Channel } from "@/types";
import { ChannelCard } from "./ChannelCard";

interface Props {
  initialChannels: Channel[];
  collectionName: string;
}

type SortOption = "name" | "popular" | "new";

export function CollectionBrowser({ initialChannels, collectionName }: Props) {
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("popular");

  // Filter and sort client side
  const filtered = initialChannels.filter((c) => {
    const term = q.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.language?.toLowerCase().includes(term) ||
      c.category?.name.toLowerCase().includes(term) ||
      c.country?.name.toLowerCase().includes(term)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === "new") {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    }
    // popular
    const viewsA = a.view_count || 0;
    const viewsB = b.view_count || 0;
    return viewsB - viewsA;
  });

  const inputClass = "w-full sm:max-w-md bg-card/60 border border-border/80 rounded-full pl-10 pr-4 py-2 text-sm focus:border-primary focus:bg-card focus:outline-none transition duration-200";

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto px-4 sm:px-6">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white">{collectionName}</h1>
          <p className="text-sm text-text-dim mt-1">{initialChannels.length} channels loaded</p>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim" />
            <input
              type="text"
              placeholder="Search in collection..."
              className={inputClass}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {/* Sort Filter */}
          <div className="relative inline-block text-left">
            <div className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-full text-sm font-medium text-text hover:border-primary/50 transition cursor-pointer select-none">
              <span>Sort: {sortBy === "name" ? "Alphabetical" : sortBy === "new" ? "Newest" : "Popularity"}</span>
              <select
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
              >
                <option value="popular">Popularity (Views)</option>
                <option value="new">Date Added (Newest)</option>
                <option value="name">Alphabetical (A-Z)</option>
              </select>
              <ChevronDown className="h-4 w-4 text-text-muted" />
            </div>
          </div>
        </div>
      </div>

      {/* Grid rendering */}
      {sorted.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-card/10 border border-border/30 rounded-2xl">
          <Radio className="h-12 w-12 text-text-dim mx-auto animate-pulse" />
          <h3 className="font-semibold text-lg">No channels match your filters</h3>
          <p className="text-sm text-text-dim">Try adjusting your search terms</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {sorted.map((c) => (
            <ChannelCard key={c.id} channel={c} />
          ))}
        </div>
      )}
    </div>
  );
}
