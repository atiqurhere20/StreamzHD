import Link from "next/link";
import type { Category } from "@/types";

export function CategorySection({ categories }: { categories: Category[] }) {
  if (!categories.length) return null;
  return (
    <section className="max-w-[1600px] mx-auto px-4 sm:px-6">
      <h2 className="text-2xl sm:text-3xl font-display font-bold mb-5">Browse by Category</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {categories.map((c) => (
          <Link key={c.id} href={`/category/${c.slug}`}
            className="bg-card hover:bg-card-hover border border-border hover:border-primary/40 rounded-xl p-5 transition group min-w-0 flex flex-col justify-between"
          >
            <div className="font-semibold group-hover:text-primary transition truncate w-full" title={c.name}>
              {c.name}
            </div>
            <div className="text-xs text-text-dim mt-1 truncate w-full">{c.channel_count ?? 0} channels</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
