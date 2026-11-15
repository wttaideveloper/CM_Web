"use client";
import { BlogAuthoringDrawer } from "./BlogAuthoringDrawer";
import { BlogConfirmationModal } from "./BlogConfirmationModal";
import { BlogFiltersToolbar } from "./BlogFiltersToolbar";
import { BlogPostCardGrid } from "./BlogPostCardGrid";
import { BlogPostReaderPreviewModal } from "./BlogPostReaderPreviewModal";
import { useBlogManagement } from "./useBlogManagement";

export default function EnterpriseMyBlogsScreen() {
  const {
    posts,
    visiblePosts,
    categories,
    isLoading,
    isLoadingEnterprise,
    enterpriseId,
    enterpriseUnavailable,
    enterpriseErrorMessage,
    error,
    notice,
    counts,
    search,
    setSearch,
    activeFilter,
    setActiveFilter,
    typeFilter,
    setTypeFilter,
    selectedCategory,
    setSelectedCategory,
    detailsBasePath,
    openCreate,
    openEdit,
    unpublish,
    removeDraft,
    isDrawerOpen,
    closeDrawer,
    editing,
    form,
    setForm,
    activeForm,
    activeFormLoading,
    authoringContext,
    customFields,
    setCustomFields,
    handleUploadMedia,
    handleRemoveMedia,
    uploadingKeys,
    save,
    isSaving,
    isPreviewOpen,
    setIsPreviewOpen,
    confirmDialog,
    setConfirmDialog,
  } = useBlogManagement();

  return (
    <main className="min-h-screen bg-[#f8fafc] p-5 text-[#06201c] sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7f9d94]">Content management</p>
            <h1 className="mt-1 text-3xl font-bold">My Posts</h1>
            <p className="mt-2 text-sm text-[#52736a]">Create Blog and News posts, save drafts, and submit them for Super Admin review.</p>
          </div>
          <button
            type="button"
            disabled={isLoadingEnterprise || !enterpriseId}
            onClick={() => openCreate()}
            className="rounded-xl bg-[#1f6a58] px-5 py-3 text-sm font-semibold text-white shadow-xs hover:bg-[#175245] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create post
          </button>
        </header>
        {enterpriseErrorMessage && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{enterpriseErrorMessage}</p>
        )}
        {error && !isDrawerOpen && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}
        {notice && (
          <div role="status" className="rounded-xl border border-[#b6dfce] bg-[#eff8f3] px-4 py-3 text-sm text-[#175245]">{notice}</div>
        )}
        <section className="rounded-2xl border border-[#e1ebe6] bg-white shadow-sm">
          <BlogFiltersToolbar
            search={search}
            onSearchChange={setSearch}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            counts={counts}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
          <BlogPostCardGrid
            posts={posts}
            visiblePosts={visiblePosts}
            isLoading={isLoading}
            isLoadingEnterprise={isLoadingEnterprise}
            enterpriseUnavailable={enterpriseUnavailable}
            totalCount={posts.length}
            categories={categories}
            detailsBasePath={detailsBasePath}
            onOpenEdit={openEdit}
            onUnpublish={unpublish}
            onRemoveDraft={removeDraft}
            onOpenCreate={() => openCreate()}
          />
        </section>
      </div>
      <BlogAuthoringDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        editing={editing}
        form={form}
        onFormChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        activeForm={activeForm}
        activeFormLoading={activeFormLoading}
        authoringContext={authoringContext}
        categories={categories}
        customFields={customFields}
        onCustomFieldChange={(key, val) => setCustomFields((prev) => ({ ...prev, [key]: val }))}
        onUploadMedia={handleUploadMedia}
        onRemoveMedia={handleRemoveMedia}
        uploadingKeys={uploadingKeys}
        onSave={(submit) => save(submit)}
        onOpenPreview={() => setIsPreviewOpen(true)}
        isSaving={isSaving}
        error={error}
      />
      <BlogPostReaderPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        form={form}
        activeForm={activeForm}
        customFields={customFields}
        categories={categories}
      />
      {confirmDialog && (
        <BlogConfirmationModal
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          destructive={confirmDialog.destructive}
          isPending={confirmDialog.isPending}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </main>
  );
}