"use client";

import type { BlogCategory } from "@ihp/shared";

type PostStatus = "all" | "draft" | "pending_review" | "changes_requested" | "rejected" | "published" | "unpublished";
type PostType = "all" | "blog" | "news" | "both";

interface BlogFiltersToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  activeFilter: PostStatus;
  onFilterChange: (value: PostStatus) => void;
  counts: Record<PostStatus, number>;
  typeFilter: PostType;
  onTypeFilterChange: (value: PostType) => void;
  categories: BlogCategory[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

const STATUS_LABEL: Record<Exclude<PostStatus, "all">, string> = {
  draft: "Draft",
  pending_review: "Pending approval",
  changes_requested: "Changes requested",
  rejected: "Rejected",
  published: "Published",
  unpublished: "Unpublished",
};

export function BlogFiltersToolbar({
  search,
  onSearchChange,
  activeFilter,
  onFilterChange,
  counts,
  typeFilter,
  onTypeFilterChange,
  categories,
  selectedCategory,
  onCategoryChange,
}: BlogFiltersToolbarProps) {
  return (
    <div className="space-y-4 border-b border-[#edf3f0] p-5">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Post status">
        {(["all", "draft", "pending_review", "changes_requested", "rejected", "published", "unpublished"] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            role="tab"
            aria-selected={activeFilter === filter}
            onClick={() => onFilterChange(filter)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeFilter === filter
                ? "bg-[#e8f6ee] text-[#175245] font-semibold"
                : "border border-[#d7e5df] text-[#52736a] hover:bg-[#f8fafc]"
            }`}
          >
            <span>{filter === "all" ? "All posts" : STATUS_LABEL[filter]}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                activeFilter === filter ? "bg-[#1f6a58] text-white" : "bg-[#edf3f0] text-[#52736a]"
              }`}
            >
              {counts[filter]}
            </span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search title, summary, or category..."
            aria-label="Search posts"
            className="w-full rounded-xl border border-[#d7e5df] bg-white px-4 py-2.5 text-sm text-[#06201c] placeholder-[#7f9d94] outline-none transition-colors focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#52736a] whitespace-nowrap">Content type:</span>
          <select
            value={typeFilter}
            onChange={(event) => onTypeFilterChange(event.target.value as PostType)}
            aria-label="Filter by content type"
            className="rounded-xl border border-[#d7e5df] bg-white px-3 py-2.5 text-xs font-semibold text-[#175245] outline-none transition-colors focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/20 cursor-pointer"
          >
            <option value="all">All Content</option>
            <option value="blog">Blog Articles</option>
            <option value="news">News Bulletins</option>
            <option value="both">Blog &amp; News</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#52736a] whitespace-nowrap">Category:</span>
          <select
            value={selectedCategory}
            onChange={(event) => onCategoryChange(event.target.value)}
            aria-label="Filter by category"
            className="rounded-xl border border-[#d7e5df] bg-white px-3 py-2.5 text-xs font-semibold text-[#175245] outline-none transition-colors focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/20 cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}