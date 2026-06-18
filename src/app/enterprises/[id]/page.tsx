"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import { getEnterpriseById, getEnterprises } from "@/services/enterprise.service";
import type { EnterpriseDto } from "@/types/enterprise.types";

const tabs = ["Overview", "Products", "Services", "Events", "Trainings"];

const stats = [
  { label: "Members", value: "N/A" },
  { label: "Products", value: "N/A" },
  { label: "Services", value: "N/A" },
  { label: "Revenue", value: "N/A" },
];

const performance = [
  { label: "Member Growth", value: "↑ 18%", tone: "text-[#16825b]" },
  { label: "Average Rating", value: "4.8 ★", tone: "text-[#d97706]" },
  { label: "Response Rate", value: "97%", tone: "text-[#2563eb]" },
  { label: "Completion Rate", value: "84%", tone: "text-[#7c3aed]" },
  { label: "Retention Rate", value: "91%", tone: "text-[#14532d]" },
];

function SectionLabel({ children }: { children: string }) {
  return <p className="text-sm font-bold text-[#06201c]">{children}</p>;
}

function resolveEnterpriseName(enterprise: EnterpriseDto) {
  return (
    enterprise.business_legal_name ||
    enterprise.business_short_name ||
    enterprise.name ||
    "Unnamed Enterprise"
  );
}

function formatAddress(address: string | null | undefined) {
  if (!address) {
    return "N/A";
  }

  return address.trim() || "N/A";
}

export default function EnterpriseDetailsPage() {
  const params = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [enterprise, setEnterprise] = useState<EnterpriseDto | null>(null);
  const [enterpriseOptions, setEnterpriseOptions] = useState<EnterpriseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSelector, setShowSelector] = useState(false);

  async function fetchEnterpriseOptions() {
    try {
      setIsLoading(true);
      setError(null);

      const data = await getEnterprises();
      setEnterpriseOptions(data);
      setShowSelector(true);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load enterprise.");
      setShowSelector(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchEnterprise() {
    if (!params.id) {
      await fetchEnterpriseOptions();
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await getEnterpriseById(params.id);
      setEnterprise(data);
      setShowSelector(false);
    } catch {
      try {
        const data = await getEnterprises();
        setEnterpriseOptions(data);
        setShowSelector(true);
        setError(null);
      } catch (selectorError) {
        setError(selectorError instanceof Error ? selectorError.message : "Unable to load enterprise.");
        setShowSelector(false);
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void fetchEnterprise();
  }, [params.id]);

  const enterpriseName = enterprise ? resolveEnterpriseName(enterprise) : "Unnamed Enterprise";
  const enterpriseStatus = enterprise?.status === false ? "Inactive" : "Active";
  const aboutText = enterprise?.business_description || enterprise?.description || "N/A";
  const contactItems = [
    { label: "Email", value: enterprise?.business_email || "N/A" },
    { label: "Phone", value: enterprise?.business_phone || "N/A" },
    { label: "Website", value: "N/A" },
    {
      label: "Address",
      value: formatAddress(
        enterprise?.registered_address ||
          enterprise?.business_address ||
          enterprise?.communication_address,
      ),
    },
  ];

  if (isLoading) {
    return (
      <AppShell>
        <section className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm">
          <p className="text-base font-bold text-[#06201c]">Loading enterprise...</p>
          <p className="mt-2 text-sm text-[#52736a]">Please wait while we fetch the latest data.</p>
        </section>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <section className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm">
          <p className="text-base font-bold text-[#06201c]">Unable to load enterprise.</p>
          <p className="mt-2 text-sm text-[#52736a]">Please try again.</p>
          <button
            type="button"
            onClick={() => void fetchEnterprise()}
            className="mt-5 h-11 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm"
          >
            Retry
          </button>
        </section>
      </AppShell>
    );
  }

  if (showSelector) {
    return (
      <AppShell>
        <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-[#06201c]">Select an enterprise</h2>
          <p className="mt-2 text-sm text-[#52736a]">Choose an enterprise to view its details.</p>

          {enterpriseOptions.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] px-5 py-16 text-center">
              <p className="text-base font-bold text-[#06201c]">
                No enterprises found. Create an enterprise to get started.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {enterpriseOptions.map((item) => (
                <Link
                  key={item.id}
                  href={`/enterprises/${item.id}`}
                  className="rounded-2xl border border-[#e1ebe6] bg-[#f9fcfa] p-5 transition-colors hover:bg-[#f4faf7]"
                >
                  <p className="text-base font-bold text-[#06201c]">{resolveEnterpriseName(item)}</p>
                  <p className="mt-2 text-sm text-[#52736a]">{item.business_email || "N/A"}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="enterprise-hero-card overflow-hidden rounded-3xl border border-[#d9e8e1] bg-white shadow-sm dark:!bg-[#0b211b]">
        <div className="relative bg-[#1f6a58] px-6 py-7 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.2)_0_1px,transparent_1px),linear-gradient(135deg,rgba(31,106,88,0.96),rgba(54,133,108,0.86))] bg-[length:36px_36px,auto]" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/95 text-2xl font-extrabold text-[#1f6a58]">
                {enterpriseName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-bold">{enterpriseName}</h2>
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
                    {enterpriseStatus}
                  </span>
                </div>
                <p className="mt-1 text-sm text-white/80">Enterprise · {enterpriseStatus}</p>
              </div>
            </div>
            <button className="h-12 rounded-full bg-white px-5 text-sm font-bold text-[#1f6a58]">
              Edit
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <div
              key={item.label}
              className="group rounded-2xl border border-[#e1ebe6] bg-[#f9fcfa] p-5 transition-all duration-200 hover:bg-gradient-to-br hover:from-[#1f6a58] hover:to-[#8fc9a8] hover:shadow-md dark:!border-[#21463c] dark:!bg-[#0b211b] dark:hover:!from-[#1f6a58] dark:hover:!to-[#38b98f]"
            >
              <p className="text-sm text-[#52736a] transition-colors duration-200 group-hover:text-white dark:!text-[#bdd2cb] dark:group-hover:!text-white">{item.label}</p>
              <p className="mt-2 text-2xl font-extrabold text-[#06201c] transition-colors duration-200 group-hover:text-white dark:!text-[#f8fffc] dark:group-hover:!text-white">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-5 flex gap-2 overflow-x-auto rounded-2xl border border-[#e1ebe6] bg-white p-2 shadow-sm dark:!border-[#21463c] dark:!bg-[#0b211b]">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`h-10 whitespace-nowrap rounded-xl px-4 text-sm font-bold ${
              activeTab === tab
                ? "bg-[#e9f4ee] text-[#1f6a58] dark:!bg-[#103329] dark:!text-[#5ad2a8]"
                : "text-[#52736a] hover:bg-[#f4faf7] dark:!text-[#bdd2cb] dark:hover:!bg-[#103329] dark:hover:!text-[#f8fffc]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Overview" ? (
        <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[#06201c]">Overview</h3>
            <div className="mt-5">
              <SectionLabel>About</SectionLabel>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#52736a]">
                {aboutText}
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {contactItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] p-4"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#06201c]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[#06201c]">Performance</h3>
            <div className="mt-4">
              {performance.map((item, index) => (
                <div
                  key={item.label}
                  className={`flex items-center justify-between py-3 ${
                    index === 0
                      ? ""
                      : "border-t border-[#edf3f0] dark:!border-[rgba(167,195,186,0.06)]"
                  }`}
                >
                  <span className="text-sm font-semibold text-[#52736a]">
                    {item.label}
                  </span>
                  <span className="text-sm font-extrabold text-[#52736a]">
                    N/A
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "Products" ? (
        <section className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <input
              type="search"
              placeholder="Search products..."
              className="h-12 w-full rounded-2xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58] sm:max-w-sm"
            />
            <Link
              href="/products/create"
              className="inline-flex h-12 items-center rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm"
            >
              + Add Product
            </Link>
          </div>

          <div className="mt-5 rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] px-5 py-16 text-center">
            <p className="text-base font-bold text-[#06201c]">No products available yet.</p>
          </div>
        </section>
      ) : null}

      {activeTab === "Services" ? (
        <section className="mt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-bold text-[#06201c]">Services</h3>
            <Link
              href="/services/create"
              className="inline-flex h-12 items-center rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm"
            >
              + Add Service
            </Link>
          </div>
          <div className="mt-4 rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] px-5 py-16 text-center">
            <p className="text-base font-bold text-[#06201c]">No services available yet.</p>
          </div>
        </section>
      ) : null}

      {activeTab === "Events" ? (
        <div className="mt-5 rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] px-5 py-16 text-center">
          <p className="text-base font-bold text-[#06201c]">No events available yet.</p>
        </div>
      ) : null}

      {activeTab === "Trainings" ? (
        <div className="mt-5 rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] px-5 py-16 text-center">
          <p className="text-base font-bold text-[#06201c]">No trainings available yet.</p>
        </div>
      ) : null}
    </AppShell>
  );
}
