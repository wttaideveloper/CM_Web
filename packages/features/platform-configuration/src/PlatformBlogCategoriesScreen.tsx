"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  createAdminBlogCategory,
  deleteAdminBlogCategory,
  listAdminBlogCategories,
  listAdminBlogPosts,
  reorderAdminBlogCategories,
  updateAdminBlogCategory,
  type BlogCategory,
  type BlogManageItem,
} from "@ihp/shared";
import { listEventTaxonomyCategories } from "./event-category-taxonomy.service";
import { listTrainingTaxonomyCategories } from "./training-category-taxonomy.service";

type CategorySource = "Blog" | "Event" | "Training";

interface Category {
  id: string;
  name: string;
  active: boolean;
  postCount: number;
  sortOrder: number;
  source: CategorySource;
  managedInModule: boolean;
}

const formatDate = (isoString?: string): string => {
  if (!isoString) return "—";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString || "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const mapFromApi = (item: BlogCategory, fallbackIndex: number): Category => ({
  id: item.id,
  name: item.name,
  active: item.is_active,
  postCount: item.post_count ?? 0,
  sortOrder: item.sort_order != null ? item.sort_order : fallbackIndex + 1,
  source: "Blog",
  managedInModule: false,
});

function mapModuleCategory(source: Exclude<CategorySource, "Blog">, id: string, name: string, fallbackIndex: number): Category {
  return { id: `${source.toLowerCase()}:${id}`, name, active: true, postCount: 0, sortOrder: fallbackIndex + 1, source, managedInModule: true };
}

/**
 * Super Admin Category Management Screen.
 * Governs platform Blog & News categories: view, add, rename, enable/disable, and reorder.
 */
export default function PlatformBlogCategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | CategorySource>("all");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // Modal Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [toggleTarget, setToggleTarget] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [viewPostsTarget, setViewPostsTarget] = useState<Category | null>(null);
  const [categoryPosts, setCategoryPosts] = useState<BlogManageItem[]>([]);
  const [categoryPostsLoading, setCategoryPostsLoading] = useState(false);

  // Form Fields for Add / Rename
  const [formName, setFormName] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [formError, setFormError] = useState("");

  const loadCategories = async () => {
    setLoading(true);
    setError("");
    try {
      const [blogItems, eventItems, trainingItems] = await Promise.all([
        listAdminBlogCategories(),
        listEventTaxonomyCategories(),
        listTrainingTaxonomyCategories(),
      ]);
      const mapped = [
        ...blogItems.map((item, idx) => mapFromApi(item, idx)),
        ...eventItems.map((item, idx) => mapModuleCategory("Event", item.id, item.name, idx)),
        ...trainingItems.map((item, idx) => mapModuleCategory("Training", item.id, item.name, idx)),
      ];
      // Sort by sortOrder ascending
      mapped.sort((a, b) => a.sortOrder - b.sortOrder);
      setCategories(mapped);
    } catch (reason: unknown) {
      setError(
        reason instanceof Error ? reason.message : "Unable to load categories.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  // Global escape key handler to safely close open modals
  useEffect(() => {
    const hasOpenModal =
      isCreateOpen ||
      Boolean(editTarget) ||
      Boolean(toggleTarget) ||
      Boolean(deleteTarget) ||
      Boolean(viewPostsTarget);

    if (!hasOpenModal) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) {
        setIsCreateOpen(false);
        setEditTarget(null);
        setToggleTarget(null);
        setDeleteTarget(null);
        setViewPostsTarget(null);
        setFormError("");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isCreateOpen, editTarget, toggleTarget, deleteTarget, viewPostsTarget, pending]);

  // Open Assigned Posts in Modal
  const handleOpenViewPosts = async (category: Category) => {
    if (category.source !== "Blog") return;
    setViewPostsTarget(category);
    setCategoryPosts([]);
    setCategoryPostsLoading(true);
    try {
      const res = await listAdminBlogPosts({ categoryId: category.id, pageSize: 100 });
      let matched = res.items;
      if (matched.length === 0) {
        const allRes = await listAdminBlogPosts({ pageSize: 100 });
        matched = allRes.items.filter(
          (p) =>
            p.category_id === category.id ||
            p.category?.toLowerCase() === category.name.toLowerCase(),
        );
      }
      setCategoryPosts(matched);
    } catch {
      setCategoryPosts([]);
    } finally {
      setCategoryPostsLoading(false);
    }
  };

  // Filtered categories based on search and status tabs
  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    return categories.filter((category) => {
      const matchesSearch =
        !query || category.name.toLowerCase().includes(query);
      const matchesSource = sourceFilter === "all" || category.source === sourceFilter;
      const matchesFilter =
        filter === "all" ||
        (filter === "active" ? category.active : !category.active);
      return matchesSearch && matchesSource && matchesFilter;
    });
  }, [categories, filter, search, sourceFilter]);

  const activeCount = useMemo(
    () => categories.filter((c) => c.active).length,
    [categories],
  );
  const inactiveCount = useMemo(
    () => categories.filter((c) => !c.active).length,
    [categories],
  );

  // Open Add Category Modal
  const handleOpenCreate = () => {
    setFormName("");
    setFormActive(true);
    setFormError("");
    setIsCreateOpen(true);
  };

  // Open Rename / Edit Modal
  const handleOpenEdit = (category: Category) => {
    if (category.source !== "Blog") return;
    setEditTarget(category);
    setFormName(category.name);
    setFormActive(category.active);
    setFormError("");
  };

  // Submit Add Category
  const handleSaveCreate = async () => {
    const clean = formName.trim();
    if (!clean) {
      setFormError("Please enter a category name.");
      return;
    }
    if (clean.length > 80) {
      setFormError("Category name must be 80 characters or fewer.");
      return;
    }
    // Rule: Prevent duplicate active category names
    if (formActive) {
      const duplicateActive = categories.some(
        (c) => c.active && c.name.trim().toLowerCase() === clean.toLowerCase(),
      );
      if (duplicateActive) {
        setFormError(
          `An active category with the name “${clean}” already exists. Duplicate active category names are not permitted.`,
        );
        return;
      }
    }
    const duplicateSameStatus = categories.some(
      (c) =>
        c.active === formActive &&
        c.name.trim().toLowerCase() === clean.toLowerCase(),
    );
    if (duplicateSameStatus) {
      setFormError(
        formActive
          ? `An active category with the name “${clean}” already exists.`
          : `An inactive category with the name “${clean}” already exists.`,
      );
      return;
    }

    setPending(true);
    setFormError("");
    try {
      const created = await createAdminBlogCategory({
        name: clean,
        is_active: formActive,
      });
      const mapped = mapFromApi(created, categories.length);
      setCategories((current) => [...current, mapped]);
      setNotice(`Category “${clean}” created successfully.`);
      setIsCreateOpen(false);
    } catch (reason: unknown) {
      setFormError(
        reason instanceof Error
          ? reason.message
          : "Unable to create category.",
      );
    } finally {
      setPending(false);
    }
  };

  // Submit Edit Category
  const handleSaveEdit = async () => {
    if (!editTarget) return;
    const clean = formName.trim();
    if (!clean) {
      setFormError("Please enter a category name.");
      return;
    }
    if (clean.length > 80) {
      setFormError("Category name must be 80 characters or fewer.");
      return;
    }
    // Rule: Prevent duplicate active category names
    if (formActive) {
      const duplicateActive = categories.some(
        (c) =>
          c.id !== editTarget.id &&
          c.active &&
          c.name.trim().toLowerCase() === clean.toLowerCase(),
      );
      if (duplicateActive) {
        setFormError(
          `An active category with the name “${clean}” already exists. Duplicate active category names are not permitted.`,
        );
        return;
      }
    }
    const duplicateSameStatus = categories.some(
      (c) =>
        c.id !== editTarget.id &&
        c.active === formActive &&
        c.name.trim().toLowerCase() === clean.toLowerCase(),
    );
    if (duplicateSameStatus) {
      setFormError(
        formActive
          ? `An active category with the name “${clean}” already exists.`
          : `An inactive category with the name “${clean}” already exists.`,
      );
      return;
    }

    setPending(true);
    setFormError("");
    try {
      const updated = await updateAdminBlogCategory(editTarget.id, {
        name: clean,
        is_active: formActive,
      });
      setCategories((current) =>
        current.map((item) =>
          item.id === editTarget.id
            ? {
                ...item,
                name: updated.name,
                active: updated.is_active,
              }
            : item,
        ),
      );
      setNotice(`Category “${clean}” updated successfully.`);
      setEditTarget(null);
    } catch (reason: unknown) {
      setFormError(
        reason instanceof Error
          ? reason.message
          : "Unable to update category.",
      );
    } finally {
      setPending(false);
    }
  };

  // Move Category Up or Down
  const handleMoveCategory = async (categoryId: string, direction: -1 | 1) => {
    const movingCategory = categories.find((category) => category.id === categoryId);
    if (!movingCategory || movingCategory.source !== "Blog") return;
    const listIndex = categories.findIndex((c) => c.id === categoryId);
    const targetIndex = listIndex + direction;
    if (listIndex < 0 || targetIndex < 0 || targetIndex >= categories.length) {
      return;
    }

    const previousCategories = [...categories];
    const reordered = [...categories];
    const [moved] = reordered.splice(listIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    // Update sortOrder values (1-based)
    const updatedWithOrder = reordered.map((item, idx) => ({
      ...item,
      sortOrder: idx + 1,
    }));

    setCategories(updatedWithOrder);
    setPending(true);
    setError("");

    try {
      await reorderAdminBlogCategories(updatedWithOrder.map((item) => item.id));
      setNotice("Category display order updated and saved.");
    } catch (reason: unknown) {
      setCategories(previousCategories);
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to save category order.",
      );
    } finally {
      setPending(false);
    }
  };

  // Rule: Check if activating toggleTarget would create a duplicate active category
  const toggleConflict = useMemo(() => {
    if (!toggleTarget || toggleTarget.active) return false;
    const targetName = toggleTarget.name.trim().toLowerCase();
    return categories.some(
      (c) =>
        c.id !== toggleTarget.id &&
        c.active &&
        c.name.trim().toLowerCase() === targetName,
    );
  }, [toggleTarget, categories]);

  // Confirm and Execute Enable / Disable
  // Rules:
  // - Prevent duplicate active category names
  // - Disabled categories disappear from new selections and customer filters
  // - Existing articles remain intact
  const handleConfirmToggle = async () => {
    if (!toggleTarget) return;
    const nextActive = !toggleTarget.active;
    if (nextActive && toggleConflict) {
      setError(
        `Cannot activate “${toggleTarget.name}”: an active category with this name already exists. Duplicate active category names are not permitted.`,
      );
      setToggleTarget(null);
      return;
    }

    setPending(true);
    setError("");

    try {
      const updated = await updateAdminBlogCategory(toggleTarget.id, {
        is_active: nextActive,
      });
      setCategories((current) =>
        current.map((item) =>
          item.id === toggleTarget.id
            ? { ...item, active: updated.is_active }
            : item,
        ),
      );
      setNotice(
        nextActive
          ? `Category “${toggleTarget.name}” activated.`
          : `Category “${toggleTarget.name}” deactivated. Disabled categories disappear from new selections and customer filters. Existing articles remain intact.`,
      );
      setToggleTarget(null);
    } catch (reason: unknown) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to toggle category status.",
      );
    } finally {
      setPending(false);
    }
  };

  // Confirm and Execute Delete
  // Rule: Do not delete categories associated with posts
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.postCount > 0) {
      setError(
        `Cannot delete “${deleteTarget.name}”: this category is associated with ${deleteTarget.postCount} ${
          deleteTarget.postCount === 1 ? "post" : "posts"
        }. Categories associated with posts cannot be deleted.`,
      );
      setDeleteTarget(null);
      return;
    }

    setPending(true);
    setError("");

    try {
      await deleteAdminBlogCategory(deleteTarget.id);
      setCategories((current) =>
        current.filter((item) => item.id !== deleteTarget.id),
      );
      setNotice(`Category “${deleteTarget.name}” deleted.`);
      setDeleteTarget(null);
    } catch (reason: unknown) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to delete category.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] p-5 text-[#06201c] sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Navigation Breadcrumb and Page Header */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <nav
              aria-label="Breadcrumb"
              className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7f9d94]"
            >
              <span>Content Management</span>
              <span className="mx-2 text-slate-300">/</span>
              <span>Blogs &amp; News</span>
              <span className="mx-2 text-slate-300">/</span>
              <span className="text-[#175245]">Blog Categories</span>
            </nav>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#06201c]">
              Blog Categories
            </h1>
            <p className="mt-1 text-sm text-[#52736a]">
              Manage Blog categories and view the Event and Training taxonomies used across the platform.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1f6a58] px-5 py-3 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#185345]"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>Add Blog Category</span>
          </button>
        </header>

        {/* Dismissible Feedback Alerts */}
        {notice && (
          <div
            role="status"
            className="flex items-center justify-between rounded-xl border border-[#b6dfce] bg-[#eff8f3] px-4 py-3 text-sm text-[#175245]"
          >
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              className="text-xs font-bold uppercase tracking-wider text-[#175245] hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>{error}</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void loadCategories()}
                className="font-semibold underline"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => setError("")}
                className="text-xs font-bold uppercase tracking-wider text-red-700 hover:underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Search, Status Tabs, and Table Section */}
        <section className="rounded-2xl border border-[#e1ebe6] bg-white shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#edf3f0] p-5">
            <div className="flex w-full flex-wrap items-center gap-2" role="tablist" aria-label="Category sources">
              {(["all", "Blog", "Event", "Training"] as const).map((source) => (
                <button key={source} type="button" role="tab" aria-selected={sourceFilter === source} onClick={() => setSourceFilter(source)} className={`rounded-full px-4 py-2 text-sm font-medium ${sourceFilter === source ? "bg-[#e8f6ee] font-semibold text-[#175245]" : "border border-[#d7e5df] text-[#52736a] hover:bg-slate-50"}`}>
                  {source === "all" ? "All categories" : source}
                  <span className="ml-2 rounded-full bg-white/70 px-2 py-0.5 text-xs text-[#175245]">{source === "all" ? categories.length : categories.filter((category) => category.source === source).length}</span>
                </button>
              ))}
            </div>
            {/* Filter Tabs */}
            <div
              className="flex flex-wrap items-center gap-2"
              role="tablist"
              aria-label="Category Status Filters"
            >
              <button
                type="button"
                role="tab"
                aria-selected={filter === "all"}
                onClick={() => setFilter("all")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  filter === "all"
                    ? "bg-[#e8f6ee] font-semibold text-[#175245]"
                    : "border border-[#d7e5df] text-[#52736a] hover:bg-slate-50"
                }`}
              >
                All
                <span className="ml-2 rounded-full bg-white/70 px-2 py-0.5 text-xs text-[#175245]">
                  {categories.length}
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={filter === "active"}
                onClick={() => setFilter("active")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  filter === "active"
                    ? "bg-[#e8f6ee] font-semibold text-[#175245]"
                    : "border border-[#d7e5df] text-[#52736a] hover:bg-slate-50"
                }`}
              >
                Active
                <span className="ml-2 rounded-full bg-white/70 px-2 py-0.5 text-xs text-[#175245]">
                  {activeCount}
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={filter === "inactive"}
                onClick={() => setFilter("inactive")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  filter === "inactive"
                    ? "bg-[#e8f6ee] font-semibold text-[#175245]"
                    : "border border-[#d7e5df] text-[#52736a] hover:bg-slate-50"
                }`}
              >
                Inactive
                <span className="ml-2 rounded-full bg-white/70 px-2 py-0.5 text-xs text-[#175245]">
                  {inactiveCount}
                </span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full max-w-sm">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                aria-label="Search categories by name"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search categories by name..."
                className="w-full rounded-xl border border-[#d7e5df] pl-9 pr-4 py-2.5 text-sm focus:border-[#1f6a58] focus:outline-hidden"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Table / List */}
          {loading ? (
            <div
              className="flex flex-col items-center justify-center px-6 py-20 text-center text-sm text-[#52736a]"
              role="status"
            >
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#1f6a58] border-t-transparent" />
              <p className="mt-3 font-medium">Loading categories...</p>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <h2 className="text-lg font-semibold text-[#06201c]">
                {categories.length === 0
                  ? "No categories created yet"
                  : "No categories match your search"}
              </h2>
              <p className="mt-2 text-sm text-[#52736a]">
                {categories.length === 0
                  ? "Add categories to let platform and enterprise authors organize their articles consistently."
                  : "Try clearing your search term or selecting a different status filter."}
              </p>
              {categories.length === 0 && (
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1f6a58] px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#185345]"
                >
                  <span>Add First Category</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-[#06201c]">
                <thead className="border-b border-[#edf3f0] bg-slate-50/60 text-xs font-semibold uppercase tracking-wider text-[#52736a]">
                  <tr>
                    <th scope="col" className="w-16 px-4 py-3.5 text-center">
                      Order
                    </th>
                    <th scope="col" className="px-5 py-3.5">
                      Category Name
                    </th>
                    <th scope="col" className="w-32 px-4 py-3.5">
                      Source
                    </th>
                    <th scope="col" className="w-32 px-4 py-3.5">
                      Status
                    </th>
                    <th scope="col" className="w-36 px-4 py-3.5">
                      Assigned Posts
                    </th>
                    <th scope="col" className="w-32 px-4 py-3.5 text-center">
                      Reorder
                    </th>
                    <th scope="col" className="w-56 px-5 py-3.5 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf3f0]">
                  {filteredCategories.map((category) => {
                    const categoryIndex = categories.findIndex(
                      (item) => item.id === category.id,
                    );
                    const isFirst = categoryIndex === 0;
                    const isLast = categoryIndex === categories.length - 1;
                    const isReorderDisabled =
                      pending || Boolean(search.trim()) || filter !== "all";

                    return (
                      <tr
                        key={category.id}
                        className="transition-colors hover:bg-slate-50/50"
                      >
                        {/* Order Column - 1-indexed display */}
                        <td className="px-4 py-4 text-center font-mono text-xs font-semibold text-slate-400">
                          #{categoryIndex + 1}
                        </td>

                        {/* Category Name Column */}
                        <td className="px-5 py-4">
                          <span className="font-semibold text-[#06201c]">
                            {category.name}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${category.source === "Blog" ? "bg-[#e8f6ee] text-[#175245]" : "bg-slate-100 text-slate-700"}`}>
                            {category.source}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                              category.active
                                ? "bg-[#e8f6ee] text-[#175245]"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            <span
                              className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                                category.active
                                  ? "bg-[#1f6a58]"
                                  : "bg-slate-400"
                              }`}
                              aria-hidden="true"
                            />
                            {category.active ? "Active" : "Inactive"}
                          </span>
                        </td>

                        {/* Post Count */}
                        <td className="px-4 py-4 text-sm text-[#52736a]">
                          <div className="flex flex-col items-start gap-1">
                            <span className="font-semibold text-[#06201c] text-xs">
                              {category.postCount} {category.postCount === 1 ? "post" : "posts"}
                            </span>
                            {category.postCount > 0 ? (
                              <button
                                type="button"
                                onClick={() => void handleOpenViewPosts(category)}
                                disabled={category.source !== "Blog"}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-[#1f6a58] hover:text-[#175245] hover:underline transition-colors"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <span>View Posts</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400">No posts</span>
                            )}
                          </div>
                        </td>

                        {/* Reorder Buttons */}
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              title={
                                isReorderDisabled || category.source !== "Blog"
                                  ? "Reordering is only enabled when viewing all categories without a search query"
                                  : isFirst
                                  ? "Already at top"
                                  : "Move up"
                              }
                              disabled={isReorderDisabled || category.source !== "Blog" || isFirst}
                              onClick={() => void handleMoveCategory(category.id, -1)}
                              className="rounded-lg border border-[#d7e5df] p-1.5 text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                              aria-label={`Move ${category.name} up`}
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 15l7-7 7 7"
                                />
                              </svg>
                            </button>
                            <button
                              type="button"
                              title={
                                isReorderDisabled || category.source !== "Blog"
                                  ? "Reordering is only enabled when viewing all categories without a search query"
                                  : isLast
                                  ? "Already at bottom"
                                  : "Move down"
                              }
                              disabled={isReorderDisabled || category.source !== "Blog" || isLast}
                              onClick={() => void handleMoveCategory(category.id, 1)}
                              className="rounded-lg border border-[#d7e5df] p-1.5 text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                              aria-label={`Move ${category.name} down`}
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>

                        {/* Actions Column */}
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            {category.managedInModule ? (
                              <span className="text-xs font-medium text-[#52736a]">Manage in {category.source} Categories</span>
                            ) : (
                              <>
                            {/* Rename / Edit */}
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => handleOpenEdit(category)}
                              className="rounded-lg border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#175245] transition-colors hover:bg-[#eff8f3] disabled:opacity-50"
                            >
                              Rename
                            </button>

                            {/* Enable / Disable */}
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => setToggleTarget(category)}
                              className="rounded-lg border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
                            >
                              {category.active ? "Disable" : "Enable"}
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              disabled={pending || category.postCount > 0}
                              title={
                                category.postCount > 0
                                  ? `Cannot delete: category is currently referenced by ${category.postCount} ${
                                      category.postCount === 1 ? "post" : "posts"
                                    }.`
                                  : "Delete category"
                              }
                              onClick={() => setDeleteTarget(category)}
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Delete
                            </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* ==================================================================== */}
      {/* ADD CATEGORY MODAL                                                  */}
      {/* ==================================================================== */}
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#06201c]/45 p-4 backdrop-blur-xs"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !pending) {
              setIsCreateOpen(false);
              setFormError("");
            }
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-category-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#edf3f0] px-6 py-4">
              <h2
                id="add-category-title"
                className="text-lg font-bold text-[#06201c]"
              >
                Add Category
              </h2>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setIsCreateOpen(false);
                  setFormError("");
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                aria-label="Close dialog"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {formError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  {formError}
                </div>
              )}

              <div>
                <label
                  htmlFor="create-category-name"
                  className="block text-sm font-semibold text-[#06201c]"
                >
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="create-category-name"
                  autoFocus
                  type="text"
                  maxLength={80}
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    setFormError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && formName.trim() && !pending) {
                      void handleSaveCreate();
                    }
                  }}
                  placeholder="e.g., Clinical Trials, Preventive Wellness"
                  className="mt-1.5 w-full rounded-xl border border-[#d7e5df] px-4 py-2.5 text-sm focus:border-[#1f6a58] focus:outline-hidden"
                />
                <p className="mt-1 text-xs text-[#52736a]">
                  Max 80 characters. Must be unique across all categories.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  id="create-category-active"
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="h-4 w-4 rounded border-[#d7e5df] text-[#1f6a58] focus:ring-[#1f6a58]"
                />
                <label
                  htmlFor="create-category-active"
                  className="text-sm font-medium text-[#06201c]"
                >
                  Enable category immediately
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[#edf3f0] px-6 py-4">
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setIsCreateOpen(false);
                  setFormError("");
                }}
                className="rounded-xl border border-[#d7e5df] px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending || !formName.trim()}
                onClick={() => void handleSaveCreate()}
                className="rounded-xl bg-[#1f6a58] px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#185345] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? "Saving..." : "Save Category"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* RENAME / EDIT CATEGORY MODAL                                         */}
      {/* ==================================================================== */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#06201c]/45 p-4 backdrop-blur-xs"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !pending) {
              setEditTarget(null);
              setFormError("");
            }
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-category-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#edf3f0] px-6 py-4">
              <h2
                id="edit-category-title"
                className="text-lg font-bold text-[#06201c]"
              >
                Rename Category
              </h2>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setEditTarget(null);
                  setFormError("");
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                aria-label="Close dialog"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {formError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  {formError}
                </div>
              )}

              <div>
                <label
                  htmlFor="edit-category-name"
                  className="block text-sm font-semibold text-[#06201c]"
                >
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="edit-category-name"
                  autoFocus
                  type="text"
                  maxLength={80}
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    setFormError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && formName.trim() && !pending) {
                      void handleSaveEdit();
                    }
                  }}
                  className="mt-1.5 w-full rounded-xl border border-[#d7e5df] px-4 py-2.5 text-sm focus:border-[#1f6a58] focus:outline-hidden"
                />
                <p className="mt-1 text-xs text-[#52736a]">
                  Renaming will preserve all current post associations ({editTarget.postCount} posts).
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  id="edit-category-active"
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="h-4 w-4 rounded border-[#d7e5df] text-[#1f6a58] focus:ring-[#1f6a58]"
                />
                <label
                  htmlFor="edit-category-active"
                  className="text-sm font-medium text-[#06201c]"
                >
                  Category is Active
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[#edf3f0] px-6 py-4">
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setEditTarget(null);
                  setFormError("");
                }}
                className="rounded-xl border border-[#d7e5df] px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending || !formName.trim()}
                onClick={() => void handleSaveEdit()}
                className="rounded-xl bg-[#1f6a58] px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#185345] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ENABLE / DISABLE CONFIRMATION MODAL                                  */}
      {/* ==================================================================== */}
      {toggleTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#06201c]/45 p-4 backdrop-blur-xs"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !pending) {
              setToggleTarget(null);
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="toggle-category-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                  toggleTarget.active
                    ? "bg-amber-100 text-amber-700"
                    : "bg-[#e8f6ee] text-[#175245]"
                }`}
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h2
                  id="toggle-category-title"
                  className="text-lg font-bold text-[#06201c]"
                >
                  {toggleTarget.active
                    ? "Deactivate Category?"
                    : "Activate Category?"}
                </h2>
                <p className="mt-2 text-sm text-[#52736a] leading-relaxed">
                  {toggleTarget.active ? (
                    <>
                      Deactivating “
                      <strong className="text-[#06201c]">
                        {toggleTarget.name}
                      </strong>
                      ” will prevent authors from selecting it on new posts.
                      Existing articles assigned to this category will retain their
                      categorization.
                    </>
                  ) : (
                    <>
                      Activating “
                      <strong className="text-[#06201c]">
                        {toggleTarget.name}
                      </strong>
                      ” makes it available for platform and enterprise authors when
                      creating or editing posts.
                    </>
                  )}
                </p>

                {toggleConflict && (
                  <div
                    role="alert"
                    className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900"
                  >
                    Cannot activate: An active category with the name “
                    {toggleTarget.name}” already exists. Duplicate active
                    category names are not permitted. Please rename this category
                    or deactivate the duplicate active category first.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#edf3f0] pt-4">
              <button
                type="button"
                disabled={pending}
                onClick={() => setToggleTarget(null)}
                className="rounded-xl border border-[#d7e5df] px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending || (Boolean(!toggleTarget.active && toggleConflict))}
                onClick={() => void handleConfirmToggle()}
                className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-xs disabled:cursor-not-allowed disabled:opacity-40 ${
                  toggleTarget.active
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-[#1f6a58] hover:bg-[#185345]"
                }`}
              >
                {pending
                  ? "Updating..."
                  : toggleTarget.active
                  ? "Deactivate Category"
                  : "Activate Category"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* DELETE CONFIRMATION MODAL                                            */}
      {/* ==================================================================== */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#06201c]/45 p-4 backdrop-blur-xs"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !pending) {
              setDeleteTarget(null);
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-category-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h2
                  id="delete-category-title"
                  className="text-lg font-bold text-[#06201c]"
                >
                  Delete Category?
                </h2>
                <p className="mt-2 text-sm text-[#52736a] leading-relaxed">
                  Are you sure you want to delete category “
                  <strong className="text-[#06201c]">{deleteTarget.name}</strong>
                  ”? This category has{" "}
                  <strong className="text-[#06201c]">0 posts</strong> assigned.
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#edf3f0] pt-4">
              <button
                type="button"
                disabled={pending}
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-[#d7e5df] px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => void handleConfirmDelete()}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-red-700 disabled:opacity-50"
              >
                {pending ? "Deleting..." : "Delete Category"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW ASSIGNED POSTS MODAL */}
      {viewPostsTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#06201c]/40 p-4"
          onClick={() => setViewPostsTarget(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Assigned Posts"
        >
          <section
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <header className="border-b border-[#edf3f0] p-5 bg-[#fbfdfc]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#1f6a58]" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#7f9d94]">
                      Category Articles
                    </span>
                  </div>
                  <h3 className="mt-1 text-lg font-bold text-[#06201c]">
                    Assigned Posts in “{viewPostsTarget.name}”
                  </h3>
                  <p className="mt-0.5 text-xs text-[#52736a]">
                    Showing all articles currently associated with this category.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewPostsTarget(null)}
                  className="rounded-xl border border-[#d7e5df] p-2 text-[#52736a] hover:bg-slate-50 transition-colors"
                  aria-label="Close assigned posts dialog"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </header>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-5 text-sm">
              {categoryPostsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-[#52736a]">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#1f6a58] border-t-transparent" />
                  <p className="mt-3 text-xs font-medium">Loading assigned articles...</p>
                </div>
              ) : categoryPosts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#d7e5df] p-8 text-center">
                  <p className="text-sm font-semibold text-[#06201c]">No posts found</p>
                  <p className="mt-1 text-xs text-[#52736a]">
                    No articles are currently referencing this category.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {categoryPosts.map((post) => (
                    <div
                      key={post.id}
                      className="rounded-xl border border-[#edf3f0] bg-white p-4 transition-all hover:border-[#1f6a58]/30 hover:shadow-xs"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                post.kind === "news"
                                  ? "bg-sky-50 text-sky-800 border border-sky-200"
                                  : "bg-teal-50 text-teal-800 border border-teal-200"
                              }`}
                            >
                              {post.kind === "news" ? "News" : "Blog"}
                            </span>
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                post.status === "published"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : post.status === "pending_approval"
                                  ? "bg-blue-100 text-blue-800 border border-blue-200"
                                  : post.status === "rejected" || post.status === "changes_requested"
                                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              {post.status.replace(/_/g, " ")}
                            </span>
                            {post.is_pinned && (
                              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900 border border-amber-300">
                                Pinned
                              </span>
                            )}
                          </div>
                          <h4 className="mt-1.5 font-bold text-[#06201c] text-sm truncate">
                            {post.title}
                          </h4>
                          {post.excerpt && (
                            <p className="mt-1 text-xs text-[#52736a] line-clamp-1">
                              {post.excerpt}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#7f9d94]">
                            <span>{post.business_name || "Platform Super Admin"}</span>
                            <span>·</span>
                            <span>{post.author_name || "Platform Admin"}</span>
                            <span>·</span>
                            <span>{formatDate(post.updated_at || post.created_at)}</span>
                          </div>
                        </div>

                        <Link
                          href={`/blog-posts?details=${encodeURIComponent(post.id)}`}
                          onClick={() => setViewPostsTarget(null)}
                          className="shrink-0 rounded-lg border border-[#1f6a58] bg-white px-3 py-1.5 text-xs font-semibold text-[#175245] hover:bg-[#f4faf7] transition-colors inline-flex items-center gap-1.5 shadow-xs"
                        >
                          <span>Open Article</span>
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <footer className="flex items-center justify-between border-t border-[#edf3f0] p-4 bg-white">
              <span className="text-xs text-[#7f9d94]">
                Total: <strong>{categoryPosts.length}</strong> {categoryPosts.length === 1 ? "article" : "articles"}
              </span>
              <button
                type="button"
                onClick={() => setViewPostsTarget(null)}
                className="rounded-xl border border-[#d7e5df] px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
