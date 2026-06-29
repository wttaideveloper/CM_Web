import AppShell from "@/components/layout/AppShell";

const items = ["Product list placeholder", "Create product", "Product status", "Inventory visibility"];

export default function AdminProductsPage() {
  return (
    <AppShell>
      <div className="w-full max-w-4xl">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">
          Admin Portal
        </p>
        <h2 className="mt-2 text-2xl font-bold text-[#06201c] sm:text-3xl">Products</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#52736a] sm:text-base">
          Manage products listed under your enterprise.
        </p>

        <section className="mt-6 overflow-hidden rounded-2xl border border-[#e1ebe6] bg-white shadow-sm">
          <div className="border-b border-[#edf3f0] px-5 py-4">
            <p className="text-sm font-bold text-[#06201c]">Placeholder Content</p>
            <p className="mt-1 text-xs text-[#7f9d94]">Basic admin shell content for this route.</p>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-2">
            {items.map((item) => (
              <button
                key={item}
                type="button"
                className="flex items-center gap-3 rounded-2xl border border-[#dbe8e3] bg-[#f8fbf9] px-4 py-3 text-left transition hover:border-[#b8d0c4] hover:bg-[#f2f8f5]"
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#1f6a58]" />
                <span className="text-sm font-medium text-[#06201c]">{item}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
