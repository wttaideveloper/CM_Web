"use client";

import AppShell from "@/components/layout/AppShell";
import { useMemo, useState } from "react";

type CategoryNode = {
  id: string;
  name: string;
  emoji: string;
  subtitle: string;
  listings: number;
  expanded?: boolean;
  children?: Array<{
    id: string;
    name: string;
    subtitle: string;
    listings?: number;
    expanded?: boolean;
    children?: Array<{
      id: string;
      name: string;
    }>;
  }>;
};

const categories: CategoryNode[] = [
  {
    id: "home-services",
    name: "Home Services",
    emoji: "🏠",
    subtitle: "2 subcategories · 24 listings",
    listings: 24,
    expanded: true,
    children: [
      {
        id: "plumbing",
        name: "Plumbing",
        subtitle: "3 types · 8 listings",
        listings: 8,
        expanded: true,
        children: [
          { id: "emergency-plumbing", name: "Emergency Plumbing" },
          { id: "pipe-repair", name: "Pipe Repair" },
          { id: "drain-cleaning", name: "Drain Cleaning" },
        ],
      },
      {
        id: "electrical",
        name: "Electrical",
        subtitle: "3 types · 6 listings",
        listings: 6,
        expanded: false,
      },
    ],
  },
  {
    id: "fitness-wellness",
    name: "Fitness & Wellness",
    emoji: "💪",
    subtitle: "2 subcategories · 42 listings",
    listings: 42,
    expanded: true,
    children: [
      {
        id: "personal-training",
        name: "Personal Training",
        subtitle: "4 types · 18 listings",
        listings: 18,
      },
      {
        id: "group-classes",
        name: "Group Classes",
        subtitle: "4 types · 12 listings",
        listings: 12,
      },
    ],
  },
  {
    id: "healthcare",
    name: "Healthcare",
    emoji: "🏥",
    subtitle: "2 subcategories · 31 listings",
    listings: 31,
    expanded: false,
  },
  {
    id: "electronics",
    name: "Electronics",
    emoji: "📱",
    subtitle: "1 subcategories · 15 listings",
    listings: 15,
    expanded: false,
  },
  {
    id: "nutrition",
    name: "Nutrition",
    emoji: "🥗",
    subtitle: "2 subcategories · 19 listings",
    listings: 19,
    expanded: false,
  },
];

const emojiChoices = ["🏠", "💪", "🏥", "📱", "🥗", "🎓", "🚗", "🐕", "🏆", "🧑‍⚕️"] as const;

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-4 w-4 transition ${open ? "rotate-90" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
    >
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4l1.5 2H19A1.5 1.5 0 0 1 20.5 9.5v7A1.5 1.5 0 0 1 19 18H5A1.5 1.5 0 0 1 3.5 16.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 12V5a1 1 0 0 1 1-1h7l8 8-8 8-8-8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8.25" cy="8.25" r="1" fill="currentColor" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function CategoriesPage() {
  const [query, setQuery] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState<(typeof emojiChoices)[number]>("🏠");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    "home-services": true,
    "fitness-wellness": true,
  });
  const [expandedChildren, setExpandedChildren] = useState<Record<string, boolean>>({
    plumbing: true,
  });

  const filteredCategories = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return categories;
    }

    return categories.filter((category) => {
      if (
        category.name.toLowerCase().includes(normalized) ||
        category.subtitle.toLowerCase().includes(normalized)
      ) {
        return true;
      }

      return category.children?.some((child) => {
        if (
          child.name.toLowerCase().includes(normalized) ||
          child.subtitle.toLowerCase().includes(normalized)
        ) {
          return true;
        }

        return child.children?.some((leaf) => leaf.name.toLowerCase().includes(normalized));
      });
    });
  }, [query]);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1220px]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">
              SUPER ADMIN · CONFIGURATION
            </p>
            <h2 className="text-2xl font-bold text-[#06201c] sm:text-3xl">
              Category & Subcategory Management
            </h2>
            <p className="max-w-3xl text-sm text-[#52736a]">
              Organize all products and services into a hierarchical category structure
            </p>
          </div>

          <button
            type="button"
            className="inline-flex h-9 items-center justify-center rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#175245]"
          >
            + Add Category
          </button>
        </div>

        <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="rounded-[20px] border border-[#e1ebe6] bg-white shadow-[0_8px_24px_rgba(15,61,51,0.06)]">
            <div className="flex flex-col gap-3 border-b border-[#edf3f0] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-[#355a51]">5 Categories · 8 Subcategories</p>
              <label className="relative block w-full sm:w-auto">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8ca69e]">
                  <SearchIcon />
                </span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search categories..."
                  className="h-10 w-full rounded-full border border-[#d7e5df] bg-[#f8fbf9] pl-10 pr-4 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58] sm:w-[300px]"
                />
              </label>
            </div>

            <div className="bg-[#fcfefd]">
              {filteredCategories.map((category, categoryIndex) => {
                const categoryOpen = expandedCategories[category.id] ?? !!category.expanded;
                return (
                  <div key={category.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedCategories((current) => ({
                          ...current,
                          [category.id]: !categoryOpen,
                        }))
                      }
                      className={`flex h-16 w-full items-center justify-between gap-4 px-5 text-left transition hover:bg-[#f4faf7] ${
                        categoryIndex < filteredCategories.length - 1 || categoryOpen ? "border-b border-[#edf3f0]" : ""
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="text-[#6c877f]">
                          <ChevronIcon open={categoryOpen} />
                        </span>
                        <span className="text-xl">{category.emoji}</span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[#06201c]">{category.name}</p>
                          <p className="mt-0.5 text-xs text-[#7f9d94]">{category.subtitle}</p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-[#eef6f2] px-2.5 py-1 text-[11px] font-semibold text-[#1f6a58]">
                        {category.listings} listings
                      </span>
                    </button>

                    {categoryOpen && category.children?.length ? (
                      <div className="border-b border-[#edf3f0] bg-[#f8fbf9]">
                        {category.children.map((child) => {
                          const childHasChildren = !!child.children?.length;
                          const childOpen = expandedChildren[child.id] ?? !!child.expanded;
                          return (
                            <div key={child.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!childHasChildren) {
                                    return;
                                  }
                                  setExpandedChildren((current) => ({
                                    ...current,
                                    [child.id]: !childOpen,
                                  }));
                                }}
                                className="flex h-12 w-full items-center justify-between gap-4 border-b border-[#edf3f0] pl-14 pr-5 text-left transition hover:bg-[#f2f7f4]"
                              >
                                <div className="flex min-w-0 items-center gap-3">
                                  <span className="text-[#90a59d]">
                                    {childHasChildren ? <ChevronIcon open={childOpen} /> : <span className="block w-4" />}
                                  </span>
                                  <span className="text-[#789088]">
                                    <FolderIcon />
                                  </span>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-[#17372f]">{child.name}</p>
                                    <p className="mt-0.5 text-xs text-[#7f9d94]">{child.subtitle}</p>
                                  </div>
                                </div>
                                {typeof child.listings === "number" ? (
                                  <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-[#5d7069]">
                                    {child.listings} listings
                                  </span>
                                ) : null}
                              </button>

                              {childOpen && child.children?.length ? (
                                <div className="bg-[#f8fbf9] pb-1">
                                  {child.children.map((leaf) => (
                                    <div
                                      key={leaf.id}
                                      className="flex h-9 items-center gap-3 pl-[92px] pr-5 text-sm text-[#4d655d]"
                                    >
                                      <span className="text-[#9bb0a8]">
                                        <TagIcon />
                                      </span>
                                      <span>{leaf.name}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-[20px] border border-[#e1ebe6] bg-white p-5 shadow-[0_8px_24px_rgba(15,61,51,0.06)]">
              <h3 className="text-base font-bold text-[#06201c]">Add New Category</h3>

              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="text-sm font-bold text-[#06201c]">Category Name *</span>
                  <input
                    type="text"
                    placeholder="e.g. Home Services"
                    className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f4faf7] px-3.5 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
                  />
                </label>

                <div>
                  <span className="text-sm font-bold text-[#06201c]">Icon / Emoji</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {emojiChoices.map((emoji) => {
                      const selected = emoji === selectedEmoji;
                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setSelectedEmoji(emoji)}
                          className={`flex h-9 w-9 items-center justify-center rounded-full text-base transition ${
                            selected
                              ? "bg-[#e8f6ee] ring-2 ring-[#c6ddd3]"
                              : "bg-[#f5f8f6] hover:bg-[#eef6f2]"
                          }`}
                        >
                          {emoji}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="block">
                  <span className="text-sm font-bold text-[#06201c]">Description</span>
                  <textarea
                    placeholder="Describe this category..."
                    className="mt-1.5 h-20 w-full resize-none rounded-xl border border-[#d7e5df] bg-[#f4faf7] px-3.5 py-3 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
                  />
                </label>

                <button
                  type="button"
                  className="inline-flex h-10 w-full items-center justify-center rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#175245]"
                >
                  Add Category
                </button>
              </div>
            </section>

            <section className="rounded-[20px] border border-[#e1ebe6] bg-white p-5 shadow-[0_8px_24px_rgba(15,61,51,0.06)]">
              <h3 className="text-base font-bold text-[#06201c]">Category Stats</h3>

              <div className="mt-4 space-y-3.5">
                {[
                  { emoji: "🏠", label: "Home Services", value: 24, width: "57%" },
                  { emoji: "💪", label: "Fitness & Wellness", value: 42, width: "100%" },
                  { emoji: "🏥", label: "Healthcare", value: 31, width: "74%" },
                  { emoji: "📱", label: "Electronics", value: 15, width: "36%" },
                  { emoji: "🥗", label: "Nutrition", value: 19, width: "45%" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="text-base">{item.emoji}</span>
                        <span className="truncate font-medium text-[#17372f]">{item.label}</span>
                      </div>
                      <span className="shrink-0 font-semibold text-[#355a51]">{item.value}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e8f1ed]">
                      <div
                        className="h-full rounded-full bg-[#1f6a58]"
                        style={{ width: item.width }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
