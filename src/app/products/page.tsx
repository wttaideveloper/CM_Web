"use client";

import Link from "next/link";
import { useState } from "react";

import AppShell from "@/components/layout/AppShell";

const products = [
  {
    name: "Premium Yoga Mat",
    enterprise: "Pinnacle Wellness Co.",
    category: "Fitness",
    price: "$68.00",
    stock: "124",
    sales: "842",
    status: "Active",
  },
  {
    name: "Whey Protein Blend",
    enterprise: "NutriCore Studio",
    category: "Supplements",
    price: "$42.00",
    stock: "78",
    sales: "621",
    status: "Active",
  },
  {
    name: "Resistance Band Set",
    enterprise: "FlexFit Academy",
    category: "Equipment",
    price: "$24.00",
    stock: "0",
    sales: "438",
    status: "Out of Stock",
  },
  {
    name: "Foam Roller Pro",
    enterprise: "Vital Sports Clinic",
    category: "Recovery",
    price: "$36.00",
    stock: "56",
    sales: "314",
    status: "Active",
  },
  {
    name: "Meditation App (Annual)",
    enterprise: "MindFlow Center",
    category: "Digital",
    price: "$99.00",
    stock: "Unlimited",
    sales: "205",
    status: "Draft",
  },
  {
    name: "Wellness Journal",
    enterprise: "GreenRoot Organics",
    category: "Lifestyle",
    price: "$18.00",
    stock: "212",
    sales: "156",
    status: "Active",
  },
];

const filters = ["Category", "Enterprise", "Status"];

function statusClass(status: string) {
  if (status === "Active") {
    return "bg-[#e8f6ee] text-[#16825b]";
  }

  if (status === "Out of Stock") {
    return "bg-[#fff1f0] text-[#b42318]";
  }

  return "bg-[#f1f4f3] text-[#6b7f79]";
}

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 20h4L18.5 9.5a2.8 2.8 0 0 0-4-4L4 16v4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m13.5 6.5 4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M8 6h12M8 12h12M8 18h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ProductsPage() {
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  return (
    <AppShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#06201c]">Product Management</h2>
          <p className="mt-1 text-sm text-[#52736a]">
            Manage all products across enterprise accounts
          </p>
        </div>
        <Link
          href="/products/create"
          className="inline-flex h-12 items-center rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm"
        >
          + Add Product
        </Link>
      </div>

      <div className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <input
            type="search"
            placeholder="Search products..."
            className="h-12 w-full rounded-2xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58] lg:max-w-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a]"
              >
                {filter}
              </button>
            ))}
            <div className="ml-1 flex rounded-full border border-[#d7e5df] bg-[#f9fcfa] p-1">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-label="List view"
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  viewMode === "list" ? "bg-[#e8f6ee] text-[#1f6a58]" : "text-[#52736a]"
                }`}
              >
                <ListIcon />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  viewMode === "grid" ? "bg-[#e8f6ee] text-[#1f6a58]" : "text-[#52736a]"
                }`}
              >
                <GridIcon />
              </button>
            </div>
          </div>
        </div>
      </div>

      {viewMode === "list" ? (
        <section className="mt-5 overflow-hidden rounded-2xl border border-[#e1ebe6] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] table-fixed text-left">
              <thead className="bg-[#f8fbf9] text-[11px] uppercase tracking-[0.1em] text-[#7f9d94]">
                <tr>
                  <th className="w-[24%] px-3 py-3 font-bold">Product</th>
                  <th className="w-[20%] px-3 py-3 font-bold">Enterprise</th>
                  <th className="w-[12%] px-3 py-3 font-bold">Category</th>
                  <th className="w-[9%] px-3 py-3 font-bold">Price</th>
                  <th className="w-[9%] px-3 py-3 font-bold">Stock</th>
                  <th className="w-[8%] px-3 py-3 font-bold">Sales</th>
                  <th className="w-[12%] px-3 py-3 font-bold">Status</th>
                  <th className="w-[8%] px-3 py-3 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf3f0]">
                {products.map((product, index) => (
                  <tr key={product.name} className="h-16 text-xs">
                    <td className="px-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8f6ee] text-xs font-bold text-[#1f6a58]">
                          P{index + 1}
                        </span>
                        <span className="truncate font-semibold text-[#06201c]">
                          {product.name}
                        </span>
                      </div>
                    </td>
                    <td className="truncate px-3 text-[#52736a]">{product.enterprise}</td>
                    <td className="truncate px-3 text-[#52736a]">{product.category}</td>
                    <td className="px-3 font-semibold text-[#06201c]">{product.price}</td>
                    <td className="truncate px-3 text-[#52736a]">{product.stock}</td>
                    <td className="px-3 text-[#52736a]">{product.sales}</td>
                    <td className="px-3">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass(
                          product.status,
                        )}`}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td className="px-3">
                      <div className="flex gap-1.5 text-[#52736a]">
                        <button
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d7e5df] hover:bg-[#f4faf7]"
                          aria-label={`View ${product.name}`}
                        >
                          <EyeIcon />
                        </button>
                        <button
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d7e5df] hover:bg-[#f4faf7]"
                          aria-label={`Edit ${product.name}`}
                        >
                          <EditIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="mt-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {products.map((product, index) => (
              <article
                key={product.name}
                className="overflow-hidden rounded-2xl border border-[#e1ebe6] bg-white shadow-sm"
              >
                <div className="relative h-[160px] bg-gradient-to-br from-[#1f6a58] via-[#5a9a76] to-[#d5e2db]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(255,255,255,0.22)_0_1px,transparent_1px)] bg-[length:28px_28px]" />
                  <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-[#1f6a58]">
                    {product.category}
                  </div>
                  <div className="absolute bottom-4 left-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-sm font-bold text-[#1f6a58]">
                    P{index + 1}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-bold text-[#06201c]">{product.name}</h3>
                  <p className="mt-1 text-sm text-[#52736a]">{product.enterprise}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-[#06201c]">{product.price}</span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        product.status === "Active"
                          ? "bg-[#e8f6ee] text-[#16825b]"
                          : product.status === "Out of Stock"
                            ? "bg-[#fff1f0] text-[#b42318]"
                            : "bg-[#f1f4f3] text-[#6b7f79]"
                      }`}
                    >
                      {product.status}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}
