"use client";
import { useState, useEffect } from "react";
import { Search, Radio, ChevronDown } from "lucide-react";
import type { Channel } from "@/types";
import { ChannelCard } from "./ChannelCard";
import { useSearchParams, useRouter } from "next/navigation";

export function SearchClient({ initialChannels }: { initialChannels: Channel[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [sortBy, setSortBy] = useState<"name" | "popular" | "new">("popular");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Sync state with URL if it changes externally (e.g. typing in header)
  useEffect(() => {
    const urlQ = searchParams.get("q") || "";
    if (urlQ !== q) {
      setQ(urlQ);
    }
  }, [searchParams]);

  // Update URL query parameters on type so bookmarking works
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (q.trim()) {
      params.set("q", q);
    } else {
      params.delete("q");
    }
    router.replace(`/search?${params.toString()}`, { scroll: false });
  }, [q]);

  // Extract categories dynamically for filter options
  const categories = Array.from(
    new Set(initialChannels.map((c) => c.category?.name).filter(Boolean))
  ) as string[];

  // Filter channels client side
  const filtered = initialChannels.filter((c) => {
    const term = q.toLowerCase().trim();
    const matchesSearch = !term ||
      c.name.toLowerCase().includes(term) ||
      c.language?.toLowerCase().includes(term) ||
      (c.category?.name && c.category.name.toLowerCase().includes(term)) ||
      (c.country?.name && c.country.name.toLowerCase().includes(term));

    const matchesCategory = categoryFilter === "all" || c.category?.name === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Sort channels client side
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "new") {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    }
    // popular
    return (b.view_count || 0) - (a.view_count || 0);
  });

  const inputClass = "w-full bg-card border border-border rounded-full pl-12 pr-4 py-3 text-sm focus:border-primary focus:outline-none transition duration-200";

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto px-4 sm:px-6">
      {/* Search Input Container */}
      <div className="relative max-w-2xl mx-auto">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-dim" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
          placeholder="Search channels, languages, categories..."
          className={inputClass}
        />
      </div>

      {/* Filter and Sort bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div className="text-sm text-text-dim font-medium">
          Found {sorted.length} channels
        </div>

        <div className="flex items-center gap-3">
          {/* Category Filter */}
          <div className="relative inline-block text-left">
            <div className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-full text-xs font-semibold text-text hover:border-primary/50 transition cursor-pointer select-none">
              <span>Category: {categoryFilter === "all" ? "All" : categoryFilter}</span>
              <select
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
            </div>
          </div>

          {/* Sort Filter */}
          <div className="relative inline-block text-left">
            <div className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-full text-xs font-semibold text-text hover:border-primary/50 transition cursor-pointer select-none">
              <span>Sort By: {sortBy === "name" ? "Alphabetical" : sortBy === "new" ? "Newest" : "Popularity"}</span>
              <select
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="popular">Popularity (Views)</option>
                <option value="new">Date Added (Newest)</option>
                <option value="name">Alphabetical (A-Z)</option>
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
            </div>
          </div>
        </div>
      </div>

      {/* Grid rendering */}
      {sorted.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-card/10 border border-border/30 rounded-2xl">
          <Radio className="h-12 w-12 text-text-dim mx-auto animate-pulse" />
          <h3 className="font-semibold text-lg">No channels found</h3>
          <p className="text-sm text-text-dim">Try typing a different keyword or removing filters</p>
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
