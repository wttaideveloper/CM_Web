"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminBlogGovernance,
  getAdminBlogGovernanceAudit,
  resetAdminBlogGovernance,
  saveStoredGovernanceResponse,
  updateAdminBlogGovernanceModule,
  type BlogGovernanceAuditItem,
  type BlogGovernanceResponse,
  type BlogModuleKey,
} from "@ihp/shared";

interface ModuleConfigDef {
  key: BlogModuleKey;
  title: string;
  badge: string;
  description: string;
  impact: string;
}

const MODULES: ModuleConfigDef[] = [
  {
    key: "events",
    title: "Events Module",
    badge: "Core Module",
    description: "Governs Blogs & News for Events. Disabling immediately hides the Blogs & News tab in Event details and Customer Mobile without deleting past articles.",
    impact: "Controls event announcements, speaker highlights, and schedule updates.",
  },
  {
    key: "trainings",
    title: "Trainings Module",
    badge: "Core Module",
    description: "Governs Blogs & News for Trainings. Disabling immediately hides the Blogs & News tab in Training details and Customer Mobile without deleting past articles.",
    impact: "Controls syllabus updates, clinical lesson summaries, and faculty announcements.",
  },
  {
    key: "products",
    title: "Products Module",
    badge: "Core Module",
    description: "Governs Blogs & News for Products. Disabling immediately hides the Blogs & News tab in Product details and Customer Mobile without deleting past articles.",
    impact: "Controls product release notes, usage guides, and batch updates.",
  },
  {
    key: "services",
    title: "Services Module",
    badge: "Core Module",
    description: "Governs Blogs & News for Services. Disabling immediately hides the Blogs & News tab in Service details and Customer Mobile without deleting past articles.",
    impact: "Controls treatment procedure updates, specialist articles, and clinical guidelines.",
  },
  {
    key: "general",
    title: "General Platform Posts",
    badge: "Platform Default",
    description: "Governs platform-wide health tips, wellness editorial guides, and general news.",
    impact: "Controls standalone platform and enterprise articles not tied to a specific contextual module.",
  },
];

export default function PlatformBlogGovernanceScreen() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"controls" | "audit">("controls");
  const [feedback, setFeedback] = useState<string>("");
  const [feedbackError, setFeedbackError] = useState<string>("");

  // Modals for safe confirmation (replacing window.confirm)
  const [confirmDisableTarget, setConfirmDisableTarget] =
    useState<ModuleConfigDef | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // Global Escape key listener
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setConfirmDisableTarget(null);
        setConfirmResetOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Query: Dedicated Module-Level Governance API with cache key ["cms", "governance"]
  const governanceQuery = useQuery<BlogGovernanceResponse>({
    queryKey: ["cms", "governance"],
    queryFn: getAdminBlogGovernance,
    staleTime: 30_000,
    retry: 1,
  });

  // Query: Audit Trail API
  const auditQuery = useQuery({
    queryKey: ["cms", "governance", "audit"],
    queryFn: getAdminBlogGovernanceAudit,
    staleTime: 15_000,
    enabled: activeTab === "audit",
  });

  // Mutation: Enable or disable one module (PATCH /api/v1/cms/blogs/admin/governance/{module})
  const toggleMutation = useMutation({
    mutationFn: ({
      module,
      enabled,
    }: {
      module: BlogModuleKey;
      enabled: boolean;
    }) => updateAdminBlogGovernanceModule(module, enabled),
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["cms", "governance"] });
      void queryClient.invalidateQueries({
        queryKey: ["cms", "governance", "audit"],
      });
      // Sync governance state to localStorage so Enterprise Admin (same browser) picks up the change
      if (data && typeof data === "object" && "modules" in data) {
        saveStoredGovernanceResponse(data as BlogGovernanceResponse);
      }
      const modDef = MODULES.find((m) => m.key === variables.module);
      setFeedback(
        variables.enabled
          ? `${modDef?.title ?? variables.module} Blogs & News restored immediately across Enterprise Admin and Customer Mobile.`
          : `${modDef?.title ?? variables.module} Blogs & News hidden immediately. Past articles remain intact.`,
      );
      setFeedbackError("");
      setConfirmDisableTarget(null);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to update module governance.";
      if (message.toLowerCase().includes("not authenticated") || message.toLowerCase().includes("unauthenticated")) {
        setFeedbackError("Your session has expired. Please sign in again.");
      } else {
        setFeedbackError(message);
      }
    },
  });

  // Mutation: Reset all modules (POST /api/v1/cms/blogs/admin/governance/reset)
  const resetMutation = useMutation({
    mutationFn: resetAdminBlogGovernance,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["cms", "governance"] });
      void queryClient.invalidateQueries({
        queryKey: ["cms", "governance", "audit"],
      });
      if (data && typeof data === "object" && "modules" in data) {
        saveStoredGovernanceResponse(data as BlogGovernanceResponse);
      }
      setFeedback(
        "All modules have been successfully restored to their default ENABLED state.",
      );
      setFeedbackError("");
      setConfirmResetOpen(false);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to reset module governance.";
      if (message.toLowerCase().includes("not authenticated") || message.toLowerCase().includes("unauthenticated")) {
        setFeedbackError("Your session has expired. Please sign in again.");
      } else {
        setFeedbackError(message);
      }
    },
  });

  const modulesState = governanceQuery.data?.modules ?? {
    events: true,
    trainings: true,
    products: true,
    services: true,
    general: true,
  };

  const handleRequestToggle = (item: ModuleConfigDef) => {
    const isCurrentlyEnabled = modulesState[item.key] ?? true;
    if (isCurrentlyEnabled) {
      // Disabling requires confirmation modal to explain customer & enterprise impact
      setConfirmDisableTarget(item);
    } else {
      // Re-enabling restores immediately
      toggleMutation.mutate({ module: item.key, enabled: true });
    }
  };

  const handleConfirmDisable = () => {
    if (!confirmDisableTarget) return;
    toggleMutation.mutate({
      module: confirmDisableTarget.key,
      enabled: false,
    });
  };

  const handleConfirmReset = () => {
    resetMutation.mutate();
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] p-5 text-[#06201c] sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Navigation Breadcrumb and Header */}
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
              <span className="text-[#175245]">Module Settings</span>
            </nav>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#06201c]">
              Module Settings
            </h1>
            <p className="mt-1 text-sm text-[#52736a] max-w-3xl leading-relaxed">
              Govern Blogs &amp; News availability across Events, Trainings, Products, and Services.
              Blogs &amp; News is enabled by default. Disabling a module immediately hides Blogs &amp; News
              for that module in Enterprise Admin and Customer Mobile without deleting past articles.
              Re-enabling restores visibility immediately.
            </p>
          </div>
          <Link
            href="/blog-posts"
            className="rounded-xl bg-[#1f6a58] px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#185345]"
          >
            All Posts
          </Link>
        </header>

        {/* Dismissible Feedback Notifications */}
        {feedback && (
          <div
            role="status"
            className="flex items-center justify-between rounded-xl border border-[#b6dfce] bg-[#eff8f3] p-4 text-sm font-semibold text-[#175245] shadow-xs"
          >
            <span>{feedback}</span>
            <button
              type="button"
              onClick={() => setFeedback("")}
              className="text-xs font-bold uppercase tracking-wider text-[#175245] hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {feedbackError && (
          <div
            role="alert"
            className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 shadow-xs"
          >
            <span>{feedbackError}</span>
            <button
              type="button"
              onClick={() => setFeedbackError("")}
              className="text-xs font-bold uppercase tracking-wider text-red-700 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="flex justify-end">
          <div className="flex items-center gap-3 rounded-xl border border-[#d7e5df] bg-white px-3 py-2 shadow-xs">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${governanceQuery.isFetching ? "text-amber-800" : "text-[#175245]"}`}>
              <span className={`h-2 w-2 rounded-full ${governanceQuery.isFetching ? "animate-pulse bg-amber-500" : "bg-[#1f6a58]"}`} aria-hidden="true" />
              {governanceQuery.isFetching ? "Syncing..." : "Connected"}
            </span>
            <button type="button" onClick={() => void governanceQuery.refetch()} className="text-xs font-semibold text-[#1f6a58] underline hover:text-[#175245]">Refresh</button>
          </div>
        </div>

        {/* Tabs: Controls vs Governance Audit Trail */}
        <div className="flex border-b border-[#edf3f0]">
          <button
            type="button"
            onClick={() => setActiveTab("controls")}
            className={`border-b-2 px-5 py-3 text-sm font-bold transition-all ${
              activeTab === "controls"
                ? "border-[#1f6a58] text-[#1f6a58]"
                : "border-transparent text-[#52736a] hover:text-[#06201c]"
            }`}
          >
            Module Controls
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-all ${
              activeTab === "audit"
                ? "border-[#1f6a58] text-[#1f6a58]"
                : "border-transparent text-[#52736a] hover:text-[#06201c]"
            }`}
          >
            <span>Governance Audit Trail</span>
            {auditQuery.data?.total !== undefined && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {auditQuery.data.total}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Module Controls */}
        {activeTab === "controls" && (
          <div className="space-y-4">
            {governanceQuery.isError && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {governanceQuery.error instanceof Error && governanceQuery.error.message.toLowerCase().includes("not authenticated")
                  ? "Your session has expired. Please sign in again to manage module settings."
                  : "Unable to load module governance settings. Please try again."}
                <button type="button" onClick={() => void governanceQuery.refetch()} className="ml-2 font-semibold underline">Retry</button>
              </div>
            )}
            <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#52736a]">Core Modules</h2>
                <p className="mt-1 text-xs text-[#7f9d94]">Govern Blogs &amp; News availability across Events, Trainings, Products, and Services.</p>
              </div>
              <button type="button" disabled={resetMutation.isPending} onClick={() => setConfirmResetOpen(true)} className="rounded-xl border border-[#d7e5df] bg-white px-3 py-2 text-xs font-semibold text-[#52736a] shadow-xs hover:bg-slate-50 disabled:opacity-50">
                {resetMutation.isPending ? "Resetting..." : "Reset All to Defaults"}
              </button>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {MODULES.filter((m) => m.key !== "general").map((item) => {
              const isEnabled = modulesState[item.key] ?? true;
              const isPending =
                toggleMutation.isPending &&
                toggleMutation.variables?.module === item.key;

              return (
                <div
                  key={item.key}
                  className={`flex flex-col justify-between rounded-2xl border bg-white p-6 shadow-xs transition-all ${
                    isEnabled
                      ? "border-[#e1ebe6]"
                      : "border-slate-200 bg-slate-50/70"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-[#06201c]">
                        {item.title}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                          isEnabled
                            ? "bg-[#e8f6ee] text-[#175245]"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isEnabled ? "bg-[#1f6a58]" : "bg-slate-400"
                          }`}
                          aria-hidden="true"
                        />
                        {isEnabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#52736a] leading-relaxed">
                      {item.description}
                    </p>

                    <div className="mt-4 border-t border-[#edf3f0] pt-3 text-xs text-[#52736a]">
                      <span className="font-semibold text-slate-700">Scope:</span>{" "}
                      {item.impact}
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-[#edf3f0] pt-4">
                    <span className="text-xs font-semibold text-slate-600">
                      {isEnabled ? "Active in Admin & Mobile" : "Hidden in Admin & Mobile"}
                    </span>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleRequestToggle(item)}
                      className={`rounded-xl px-4 py-2 text-xs font-bold transition-all disabled:opacity-50 ${
                        isEnabled
                          ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                          : "bg-[#1f6a58] text-white hover:bg-[#185345]"
                      }`}
                    >
                      {isPending
                        ? "Updating..."
                        : isEnabled
                        ? "Disable Module"
                        : "Enable Module"}
                    </button>
                  </div>
                </div>
              );
            })}
            <div className="col-span-full mb-2 mt-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#52736a]">
                Platform Default
              </h2>
            </div>
            {MODULES.filter((m) => m.key === "general").map((item) => {
              const isEnabled = modulesState[item.key] ?? true;
              const isPending =
                toggleMutation.isPending &&
                toggleMutation.variables?.module === item.key;

              return (
                <div
                  key={item.key}
                  className={`flex flex-col justify-between rounded-2xl border bg-white p-6 shadow-xs transition-all ${
                    isEnabled
                      ? "border-[#e1ebe6]"
                      : "border-slate-200 bg-slate-50/70"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-[#f0faf5] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#1f6a58]">
                        {item.badge}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                          isEnabled
                            ? "bg-[#e8f6ee] text-[#175245]"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isEnabled ? "bg-[#1f6a58]" : "bg-slate-400"
                          }`}
                          aria-hidden="true"
                        />
                        {isEnabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>

                    <h2 className="mt-3 text-lg font-bold text-[#06201c]">
                      {item.title}
                    </h2>
                    <p className="mt-1 text-xs text-[#52736a] leading-relaxed">
                      {item.description}
                    </p>

                    <div className="mt-4 border-t border-[#edf3f0] pt-3 text-xs text-[#52736a]">
                      <span className="font-semibold text-slate-700">Scope:</span>{" "}
                      {item.impact}
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-[#edf3f0] pt-4">
                    <span className="text-xs font-semibold text-slate-600">
                      {isEnabled ? "Active in Admin & Mobile" : "Hidden in Admin & Mobile"}
                    </span>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleRequestToggle(item)}
                      className={`rounded-xl px-4 py-2 text-xs font-bold transition-all disabled:opacity-50 ${
                        isEnabled
                          ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                          : "bg-[#1f6a58] text-white hover:bg-[#185345]"
                      }`}
                    >
                      {isPending
                        ? "Updating..."
                        : isEnabled
                        ? "Disable Module"
                        : "Enable Module"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

        {/* Tab 2: Governance Audit Trail */}
        {activeTab === "audit" && (
          <div className="rounded-2xl border border-[#e1ebe6] bg-white shadow-xs overflow-hidden">
            <div className="border-b border-[#edf3f0] p-5">
              <h2 className="text-lg font-bold text-[#06201c]">
                Governance Decision Trail
              </h2>
              <p className="mt-1 text-xs text-[#52736a]">
                Complete audit history of all Super Admin module-level activation,
                deactivation, and reset decisions.
              </p>
            </div>

            {auditQuery.isLoading ? (
              <div className="p-12 text-center text-sm text-[#52736a]">
                Loading audit trail...
              </div>
            ) : !auditQuery.data?.items?.length ? (
              <div className="p-12 text-center text-sm text-[#52736a]">
                No governance changes recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-[#06201c]">
                  <thead className="border-b border-[#edf3f0] bg-slate-50/60 text-xs font-semibold uppercase tracking-wider text-[#52736a]">
                    <tr>
                      <th scope="col" className="px-5 py-3.5">
                        Timestamp
                      </th>
                      <th scope="col" className="px-5 py-3.5">
                        Module
                      </th>
                      <th scope="col" className="px-5 py-3.5">
                        Action
                      </th>
                      <th scope="col" className="px-5 py-3.5">
                        Change
                      </th>
                      <th scope="col" className="px-5 py-3.5">
                        Actor
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf3f0]">
                    {auditQuery.data.items.map(
                      (entry: BlogGovernanceAuditItem) => (
                        <tr
                          key={entry.id}
                          className="transition-colors hover:bg-slate-50/50"
                        >
                          <td className="px-5 py-3.5 text-xs text-slate-500 font-mono">
                            {(() => { const v = entry.created_at; const n = /^\d{4}-\d{2}-\d{2}T/.test(v) && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(v) ? `${v}Z` : v; const d = new Date(n); return Number.isNaN(d.getTime()) ? v : d.toLocaleString(); })()}
                          </td>
                          <td className="px-5 py-3.5 font-bold uppercase text-xs tracking-wider text-[#06201c]">
                            {entry.module}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                entry.action === "enabled"
                                  ? "bg-[#e8f6ee] text-[#175245]"
                                  : entry.action === "disabled"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-blue-50 text-blue-700"
                              }`}
                            >
                              {entry.action.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-[#52736a]">
                            {entry.previous_value ? "Enabled" : "Disabled"}{" "}
                            &rarr; {entry.new_value ? "Enabled" : "Disabled"}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-700 font-medium">
                            {entry.actor_name} ({entry.actor_role})
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* CONFIRM DISABLE MODULE MODAL                                         */}
      {/* ==================================================================== */}
      {confirmDisableTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#06201c]/45 p-4 backdrop-blur-xs"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !toggleMutation.isPending) {
              setConfirmDisableTarget(null);
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="disable-module-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
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
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h2
                  id="disable-module-title"
                  className="text-lg font-bold text-[#06201c]"
                >
                  Disable {confirmDisableTarget.title}?
                </h2>
                <p className="mt-2 text-sm text-[#52736a] leading-relaxed">
                  Disabling will immediately hide Blogs &amp; News for{" "}
                  <strong className="text-[#06201c]">
                    {confirmDisableTarget.title}
                  </strong>{" "}
                  in Enterprise Admin and Customer Mobile.
                </p>
                <div className="mt-3 rounded-xl border border-[#b6dfce] bg-[#eff8f3] p-3 text-xs font-semibold text-[#175245]">
                  Past articles remain completely safe and will not be deleted.
                  Re-enabling this module will restore them immediately.
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#edf3f0] pt-4">
              <button
                type="button"
                disabled={toggleMutation.isPending}
                onClick={() => setConfirmDisableTarget(null)}
                className="rounded-xl border border-[#d7e5df] px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={toggleMutation.isPending}
                onClick={handleConfirmDisable}
                className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-amber-700 disabled:opacity-50"
              >
                {toggleMutation.isPending ? "Disabling..." : "Confirm Disable"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* CONFIRM RESET ALL TO DEFAULTS MODAL                                  */}
      {/* ==================================================================== */}
      {confirmResetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#06201c]/45 p-4 backdrop-blur-xs"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !resetMutation.isPending) {
              setConfirmResetOpen(false);
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-governance-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e8f6ee] text-[#175245]">
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h2
                  id="reset-governance-title"
                  className="text-lg font-bold text-[#06201c]"
                >
                  Reset All Modules to Defaults?
                </h2>
                <p className="mt-2 text-sm text-[#52736a] leading-relaxed">
                  This will reset all 4 modules (Events, Trainings, Products, and
                  Services) to their default <strong className="text-[#06201c]">ENABLED</strong> state.
                </p>
                <div className="mt-3 rounded-xl border border-[#b6dfce] bg-[#eff8f3] p-3 text-xs font-semibold text-[#175245]">
                  Existing articles, drafts, and categories remain completely intact.
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#edf3f0] pt-4">
              <button
                type="button"
                disabled={resetMutation.isPending}
                onClick={() => setConfirmResetOpen(false)}
                className="rounded-xl border border-[#d7e5df] px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resetMutation.isPending}
                onClick={handleConfirmReset}
                className="rounded-xl bg-[#1f6a58] px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#185345] disabled:opacity-50"
              >
                {resetMutation.isPending ? "Resetting..." : "Confirm Reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
