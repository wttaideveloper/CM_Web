"use client";

import { useState } from "react";
import AppShell from "@/components/layout/AppShell";

const tabs = ["Enterprise", "Product", "Service"];

const attributesByTab = {
  Enterprise: [
    {
      name: "Certification Level",
      type: "Select",
      required: true,
      usedBy: "Enterprise Profile",
    },
    {
      name: "Specializations",
      type: "Multi-select",
      required: false,
      usedBy: "Discovery Filters",
    },
    {
      name: "Founding Story",
      type: "Long Text",
      required: false,
      usedBy: "About Section",
    },
    {
      name: "Insurance Policy Number",
      type: "Text",
      required: true,
      usedBy: "Compliance",
    },
    {
      name: "Accreditation Body",
      type: "Text",
      required: false,
      usedBy: "Verification",
    },
  ],

  Product: [
    {
      name: "Allergen Information",
      type: "Multi-select",
      required: true,
      usedBy: "Product Details",
    },
    {
      name: "Certification",
      type: "Dropdown",
      required: false,
      usedBy: "Product Filters",
    },
    {
      name: "Color Options",
      type: "Multi-select",
      required: false,
      usedBy: "Product Variants",
    },
    {
      name: "Material Composition",
      type: "Text",
      required: false,
      usedBy: "Product Specs",
    },
  ],

  Service: [
    {
      name: "Certification Required",
      type: "Boolean",
      required: true,
      usedBy: "Service Setup",
    },
    {
      name: "Equipment Needed",
      type: "Multi-select",
      required: false,
      usedBy: "Service Details",
    },
    {
      name: "Modality",
      type: "Dropdown",
      required: false,
      usedBy: "Service Filters",
    },
    {
      name: "Contra-indications",
      type: "Rich Text",
      required: false,
      usedBy: "Safety Notes",
    },
  ],
};

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

function DeleteIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 7h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function AttributesPage() {
  const [activeTab, setActiveTab] =
  useState<keyof typeof attributesByTab>("Enterprise");

const attributes = attributesByTab[activeTab];
  return (
    <AppShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#06201c]">Dynamic Attributes</h2>
          <p className="mt-1 text-sm text-[#52736a]">
            Configure custom fields for enterprises, products, and services.
          </p>
        </div>
        <button className="h-12 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm">
          + Add Attribute
        </button>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto rounded-2xl border border-[#e1ebe6] bg-white p-2 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab}
           onClick={() =>
  setActiveTab(tab as keyof typeof attributesByTab)
}
className={`h-10 whitespace-nowrap rounded-xl px-4 text-sm font-bold transition ${
  activeTab === tab
    ? "bg-[#e9f4ee] text-[#1f6a58]"
    : "text-[#52736a] hover:bg-[#f4faf7]"
}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <section className="mt-5 overflow-hidden rounded-2xl border border-[#e1ebe6] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-[#f8fbf9] text-xs uppercase tracking-[0.12em] text-[#7f9d94]">
              <tr>
                {["Attribute Name", "Field Type", "Required", "Used By", "Actions"].map(
                  (heading) => (
                    <th key={heading} className="px-5 py-3 font-bold">
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf3f0] dark:divide-[rgba(167,195,186,0.10)]">
              {attributes.map((attribute) => (
                <tr key={attribute.name} className="h-[64px] text-sm transition-colors duration-150 hover:bg-emerald-50/60 dark:hover:bg-[#103329]">
                  <td className="px-5 font-semibold text-[#06201c]">
                    {attribute.name}
                  </td>
                  <td className="px-5">
                    <span className="rounded-full bg-[#f1f4f3] px-3 py-1 text-xs font-bold text-[#52736a]">
                      {attribute.type}
                    </span>
                  </td>
                  <td className="px-5">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        attribute.required
                          ? "bg-[#e8f6ee] text-[#16825b]"
                          : "bg-[#fff7e5] text-[#b7791f]"
                      }`}
                    >
                      {attribute.required ? "Required" : "Optional"}
                    </span>
                  </td>
                  <td className="px-5 text-[#52736a]">{attribute.usedBy}</td>
                  <td className="px-5">
                    <div className="flex gap-2 text-[#52736a]">
                      <button
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d7e5df] hover:bg-[#f4faf7] dark:border-[#21463c] dark:hover:bg-[#103329]"
                        aria-label={`Edit ${attribute.name}`}
                      >
                        <EditIcon />
                      </button>
                      <button
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d7e5df] hover:bg-[#fff1f0] hover:text-[#b42318] dark:border-[#21463c] dark:hover:bg-[#103329]"
                        aria-label={`Delete ${attribute.name}`}
                      >
                        <DeleteIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
