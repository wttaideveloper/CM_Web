"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCurrentEnterprise } from "@ihp/enterprise-runtime";
import {
  isBlogModuleEnabled,
  listBlogCategories,
  listMyBlogPosts,
  subscribeToBlogGovernance,
  syncBlogGovernanceFromServer,
  type BlogCategory,
  type BlogManageItem,
} from "@ihp/shared";

export interface ContextualModuleBlogsTabProps {
  module: "events" | "trainings" | "products" | "services";
  entityId: string;
  entityTitle: string;
}

const MODULE_LABELS = {
  events: "Event",
  trainings: "Training",
  products: "Product",
  services: "Service",
} as const;

function statusLabel(status: BlogManageItem["status"]): string {
  return status.replaceAll("_", " ");
}

/** Displays tenant-scoped articles linked to one Enterprise listing. */
export default function ContextualModuleBlogsTab({
  module,
  entityId,
  entityTitle,
}: ContextualModuleBlogsTabProps) {
  const router = useRouter();
  const { enterpriseId, isLoadingEnterprise } = useCurrentEnterprise();
  const [posts, setPosts] = useState<BlogManageItem[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModuleActive, setIsModuleActive] = useState(() => isBlogModuleEnabled(module));

  const loadData = async () => {
    if (isLoadingEnterprise || !enterpriseId) return;
    setLoading(true);
    setError("");
    try {
      const [postsResponse, categoryResponse] = await Promise.all([
        listMyBlogPosts({ pageSize: 100, enterpriseId }),
        listBlogCategories(),
      ]);
      setPosts(postsResponse.items.filter((post) => post.module === module && post.linked_entity?.type === module.slice(0, -1) && post.linked_entity.id === entityId));
      setCategories(categoryResponse);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Unable to load linked articles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsModuleActive(isBlogModuleEnabled(module));
    void syncBlogGovernanceFromServer().then(() => setIsModuleActive(isBlogModuleEnabled(module))).catch(() => {});
    return subscribeToBlogGovernance((governance) => setIsModuleActive(governance[module] ?? true));
  }, [module]);

  useEffect(() => {
    void loadData();
  }, [entityId, entityTitle, enterpriseId, isLoadingEnterprise]);

  if (!isModuleActive) return null;

  const moduleLabel = MODULE_LABELS[module];
  const createHref = `/admin/my-blogs?context_module=${encodeURIComponent(module)}&context_entity_id=${encodeURIComponent(entityId)}&context_entity_title=${encodeURIComponent(entityTitle)}`;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
        <div>
          <span className="rounded-full bg-[#f0faf5] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[#1f6a58]">Blogs &amp; News</span>
          <h2 className="mt-2 text-xl font-bold text-[#06201c]">Articles for {entityTitle}</h2>
          <p className="mt-1 text-sm text-[#52736a]">Add an article linked to this {moduleLabel.toLowerCase()}. The standard My Posts authoring form applies all configured fields and validation.</p>
        </div>
        <button type="button" disabled={isLoadingEnterprise || !enterpriseId} onClick={() => router.push(createHref)} className="rounded-xl bg-[#1f6a58] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#175245] disabled:cursor-not-allowed disabled:opacity-50">Add Article</button>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}

      <div className="overflow-hidden rounded-2xl border border-[#e1ebe6] bg-white shadow-sm">
        <div className="border-b border-[#edf3f0] px-6 py-4"><h3 className="font-bold text-[#06201c]">Linked Articles ({posts.length})</h3></div>
        {loading ? <div className="p-8 text-center text-sm text-[#52736a]">Loading linked articles…</div> : posts.length === 0 ? (
          <div className="p-12 text-center"><p className="text-sm font-semibold text-[#06201c]">No articles linked to this {moduleLabel.toLowerCase()} yet.</p><p className="mt-1 text-xs text-[#52736a]">Use Add Article to create the first linked draft.</p></div>
        ) : (
          <div className="divide-y divide-[#edf3f0]">
            {posts.map((post) => {
              const category = categories.find((item) => item.id === post.category_id)?.name ?? post.category ?? "Uncategorized";
              return <div key={post.id} className="flex flex-wrap items-center justify-between gap-4 p-5 transition-colors hover:bg-[#f9fcfa]">
                <div className="min-w-[280px] flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#f0faf5] px-2 py-0.5 text-[11px] font-bold uppercase text-[#1f6a58]">{post.kind}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold capitalize text-slate-700">{statusLabel(post.status)}</span><span className="text-xs text-[#7f9d94]">{category}</span></div>
                  <h4 className="mt-1 text-base font-bold text-[#06201c]">{post.title || "Untitled post"}</h4>
                  {post.excerpt && <p className="mt-1 line-clamp-2 text-xs text-[#52736a]">{post.excerpt}</p>}
                </div>
                <div className="flex items-center gap-4 text-right"><time dateTime={post.updated_at} className="text-xs text-[#7f9d94]">Updated {new Date(post.updated_at).toLocaleDateString()}</time><Link href={`/admin/my-blogs/${encodeURIComponent(post.id)}`} className="text-sm font-semibold text-[#1f6a58] hover:underline">View</Link></div>
              </div>;
            })}
          </div>
        )}
      </div>
    </section>
  );
}
