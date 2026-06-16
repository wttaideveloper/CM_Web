"use client";

import { useState } from "react";

import AppShell from "@/components/layout/AppShell";

const tabs = ["Product Info", "Pricing", "Images", "Review"];

const summary = [
  ["Product Name", "Premium Yoga Mat"],
  ["Category", "Equipment"],
  ["Enterprise", "Pinnacle Wellness Co."],
  ["Price", "$89.99"],
  ["Stock", "100 units"],
  ["Status", "Ready to publish"],
];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-sm font-bold text-[#06201c]">{children}</span>;
}

function controlClass() {
  return "h-[46px] w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]";
}

function inputClass() {
  return `mt-1.5 ${controlClass()}`;
}

export default function CreateProductPage() {
  const [activeTab, setActiveTab] = useState(tabs[0]);

  return (
    <AppShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            aria-label="Back"
            className="mt-1 flex h-10 w-10 items-center justify-center rounded-full border border-[#d7e5df] text-[#52736a]"
          >
            &larr;
          </button>
          <div>
            <h2 className="text-2xl font-bold text-[#06201c]">Create Product</h2>
            <p className="mt-1 text-sm text-[#52736a]">
              Add a new product to the marketplace
            </p>
          </div>
        </div>
        <button className="h-12 rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a]">
          Save Draft
        </button>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto rounded-2xl border border-[#e1ebe6] bg-white p-2 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`h-10 whitespace-nowrap rounded-xl px-4 text-sm font-bold ${
              activeTab === tab
                ? "bg-[#e9f4ee] text-[#1f6a58]"
                : "text-[#52736a] hover:bg-[#f4faf7]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <section className="mt-4 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
        {activeTab === "Product Info" ? (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#06201c]">Product Information</h3>
              <p className="mt-1 text-sm text-[#52736a]">
                Enter marketplace details and product identifiers.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <FieldLabel>Product Name*</FieldLabel>
                <input
                  type="text"
                  placeholder="Premium Yoga Mat"
                  className={inputClass()}
                />
              </label>
              <label className="block">
                <FieldLabel>Category*</FieldLabel>
                <select className={inputClass()} defaultValue="Equipment">
                  {["Equipment", "Supplements", "Recovery", "Digital", "Accessories"].map(
                    (option) => (
                      <option key={option}>{option}</option>
                    ),
                  )}
                </select>
              </label>
              <label className="block">
                <FieldLabel>Enterprise*</FieldLabel>
                <select className={inputClass()} defaultValue="Pinnacle Wellness Co.">
                  {["Pinnacle Wellness Co.", "NutriCore Studio", "FlexFit Academy"].map(
                    (option) => (
                      <option key={option}>{option}</option>
                    ),
                  )}
                </select>
              </label>
              <label className="block">
                <FieldLabel>SKU</FieldLabel>
                <input type="text" placeholder="PYM-001" className={inputClass()} />
              </label>
              <label className="block">
                <FieldLabel>Barcode/UPC</FieldLabel>
                <input
                  type="text"
                  placeholder="012345678905"
                  className={inputClass()}
                />
              </label>
              <label className="block">
                <FieldLabel>Weight (kg)</FieldLabel>
                <input type="text" placeholder="1.2" className={inputClass()} />
              </label>
              <label className="block md:col-span-2">
                <FieldLabel>Dimensions (L x W x H cm)</FieldLabel>
                <input
                  type="text"
                  placeholder="183 x 61 x 0.6"
                  className={inputClass()}
                />
              </label>
              <label className="block md:col-span-2">
                <FieldLabel>Description*</FieldLabel>
                <textarea
                  placeholder="Describe product benefits, materials, and use cases."
                  className="mt-1.5 min-h-24 w-full resize-none rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 py-3 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
                />
              </label>
            </div>
          </>
        ) : null}

        {activeTab === "Pricing" ? (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#06201c]">Pricing &amp; Inventory</h3>
              <p className="mt-1 text-sm text-[#52736a]">
                Configure product pricing, tax, and stock controls.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <FieldLabel>Base Price*</FieldLabel>
                <input type="text" placeholder="89.99" className={inputClass()} />
              </label>
              <label className="block">
                <FieldLabel>Sale / Promo Price</FieldLabel>
                <input
                  type="text"
                  placeholder="79.99 (optional)"
                  className={inputClass()}
                />
              </label>
              <label className="block">
                <FieldLabel>Cost Price (internal)</FieldLabel>
                <input type="text" placeholder="32.00" className={inputClass()} />
              </label>
              <label className="block">
                <FieldLabel>Tax Class</FieldLabel>
                <select className={inputClass()} defaultValue="Standard (8%)">
                  {["Standard (8%)", "Reduced (4%)", "Zero Rate (0%)"].map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <FieldLabel>Stock Quantity*</FieldLabel>
                <input type="text" placeholder="100" className={inputClass()} />
              </label>
              <label className="block">
                <FieldLabel>Low Stock Alert Threshold</FieldLabel>
                <input type="text" placeholder="10" className={inputClass()} />
              </label>
              <label className="block">
                <FieldLabel>Stock Management</FieldLabel>
                <select className={inputClass()} defaultValue="Track inventory">
                  {["Track inventory", "No tracking (unlimited)", "Preorder"].map(
                    (option) => (
                      <option key={option}>{option}</option>
                    ),
                  )}
                </select>
              </label>
              <label className="block">
                <FieldLabel>Currency</FieldLabel>
                <select className={inputClass()} defaultValue="USD ($)">
                  {["USD ($)", "INR (₹)", "EUR (€)"].map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>
          </>
        ) : null}

        {activeTab === "Images" ? (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#06201c]">Product Images</h3>
              <p className="mt-1 text-sm text-[#52736a]">
                Upload marketplace-ready product images.
              </p>
            </div>

            <div className="rounded-2xl border border-dashed border-[#b8d1c7] bg-[#f9fcfa] p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f6ee] text-[#1f6a58]">
                <svg
                  aria-hidden="true"
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 16V4m0 0-4 4m4-4 4 4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4 16v3h16v-3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="mt-3 text-sm font-bold text-[#06201c]">
                Drag &amp; drop product images here
              </p>
              <p className="mt-1 text-sm text-[#52736a]">
                PNG, JPG up to 5MB each &middot; Up to 10 images &middot; First
                image becomes primary
              </p>
              <button className="mt-4 h-[46px] rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#1f6a58]">
                Browse Files
              </button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {["Primary image", "Gallery image"].map((image, index) => (
                <div
                  key={image}
                  className="relative h-28 rounded-2xl border border-[#e1ebe6] bg-gradient-to-br from-[#e8f6ee] to-[#c8d8d3]"
                >
                  {index === 0 ? (
                    <span className="absolute right-3 top-3 rounded-full bg-[#1f6a58] px-3 py-1 text-xs font-bold text-white">
                      Primary
                    </span>
                  ) : null}
                  <span className="absolute bottom-3 left-3 text-sm font-bold text-[#1f6a58]">
                    {image}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {activeTab === "Review" ? (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#06201c]">Review &amp; Publish</h3>
              <p className="mt-1 text-sm text-[#52736a]">
                Confirm product details before publishing.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
              <div className="rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  {summary.map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">
                        {label}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#06201c]">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[#edf3f0] bg-white p-5">
                <h4 className="text-base font-bold text-[#06201c]">
                  All fields complete
                </h4>
                <p className="mt-2 text-sm leading-5 text-[#52736a]">
                  Product is ready to publish to the marketplace.
                </p>
                <label className="mt-4 block">
                  <FieldLabel>Publish Status</FieldLabel>
                  <select className={inputClass()} defaultValue="Publish immediately">
                    {["Publish immediately", "Save as draft", "Schedule for later"].map(
                      (option) => (
                        <option key={option}>{option}</option>
                      ),
                    )}
                  </select>
                </label>
              </div>
            </div>
          </>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 border-t border-[#edf3f0] pt-4 sm:flex-row sm:justify-end">
          <button className="h-[46px] rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a]">
            Save Draft
          </button>
          <button className="h-[46px] rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm">
            {activeTab === "Review" ? "Publish Product" : "Continue →"}
          </button>
        </div>
      </section>
    </AppShell>
  );
}
