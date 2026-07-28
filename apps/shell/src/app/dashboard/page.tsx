"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AppShell from "@/components/layout/AppShell";
import { getEnterprises } from "@/services/enterprise.service";
import { getProducts } from "@/services/product.service";

type KpiState = {
  enterprises: number | null;
  products: number | null;
  loading: boolean;
};

const activities = [
  "Pinnacle Wellness added 3 new products",
  "NutriCore Studio scheduled a webinar",
  "New enterprise registered: MindFlow Center",
  "Revenue milestone: $280K reached",
  "FlexFit Academy published training course",
];

const approvalQueue = [
  { name: "Sunrise Family Clinic", meta: "Healthcare · Jun 15, 2026", status: "Pending" },
  { name: "Dr. Alex Turner", meta: "Physiotherapy · Jun 14, 2026", status: "Pending" },
  { name: "MindFlow Center", meta: "Mental Health · Jun 13, 2026", status: "Info" },
  { name: "GreenLeaf Nutrition", meta: "Nutrition · Jun 12, 2026", status: "Pending" },
];

const platformHealth = [
  { label: "Enterprise Approval Rate", value: 94 },
  { label: "Form Completion Rate", value: 78 },
  { label: "Customer Satisfaction", value: 88 },
  { label: "Service Uptime", value: 99 },
];

function RevenueIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2v20M16.5 6.5c0-1.9-2-3.5-4.5-3.5S7.5 4.6 7.5 6.5 9.3 9 12 9s4.5 1.1 4.5 3-2 3.5-4.5 3.5-4.5 1.6-4.5 3.5S9.5 22 12 22s4.5-1.4 4.5-3.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 21V4h10v17M14 8h6v13M7 7h.01M10 7h.01M7 10h.01M10 10h.01M7 13h.01M10 13h.01M7 16h.01M10 16h.01M17 11h.01M17 14h.01M17 17h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M17 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm5 14v-2a4 4 0 0 0-3-3.87M17 4.13a4 4 0 0 1 0 7.74"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9ZM12 3v18M3 7.5l9 4.5 9-4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 3v4M17 3v4M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GraduationIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M2 9.5 12 4l10 5.5-10 5.5L2 9.5ZM6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M4 19.5h16M7 16v-4M12 16V8M17 16v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MiniArrow() {
  return (
    <svg aria-hidden="true" className="h-3 w-3" viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HealthBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-[#e8f2ed]">
      <div
        className="h-full rounded-full bg-[#1f6a58]"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function ActivityIcon({ kind }: { kind: "package" | "video" | "building" | "trend" | "grad" }) {
  const classes = {
    package: "bg-[#e8f6ee] text-[#1f6a58]",
    video: "bg-[#eef4ff] text-[#2563eb]",
    building: "bg-[#f1f4f3] text-[#52736a]",
    trend: "bg-[#e8f6ee] text-[#16825b]",
    grad: "bg-[#f4f0ff] text-[#7c3aed]",
  }[kind];

  return (
    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${classes}`}>
      {kind === "package" ? (
        <PackageIcon />
      ) : kind === "video" ? (
        <CalendarIcon />
      ) : kind === "building" ? (
        <BuildingIcon />
      ) : kind === "trend" ? (
        <ChartIcon />
      ) : (
        <GraduationIcon />
      )}
    </span>
  );
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KpiState>({
    enterprises: null,
    products: null,
    loading: true,
  });

  async function loadDashboardCounts() {
    setKpis((current) => ({ ...current, loading: true }));

    try {
      const [enterpriseData, productData] = await Promise.all([getEnterprises(), getProducts()]);

      setKpis({
        enterprises: enterpriseData.length,
        products: productData.length,
        loading: false,
      });
    } catch {
      setKpis({
        enterprises: null,
        products: null,
        loading: false,
      });
    }
  }

  useEffect(() => {
    void loadDashboardCounts();
  }, []);

  const stats = [
    {
      label: "Total Enterprises",
      value: kpis.loading ? "Loading" : String(kpis.enterprises ?? 0),
      change: "+7",
    },
    {
      label: "Platform Revenue",
      value: "$284,521",
      subtitle: "Platform Revenue",
      change: "+18.4%",
    },
    {
      label: "Active Users",
      value: "8,294",
      subtitle: "Active Users",
      change: "+12.3%",
    },
    {
      label: "Pending Approvals",
      value: "4",
      subtitle: "Needs your attention",
      change: "",
    },
  ] as const;

  return (
    <AppShell>
      <div className="w-full min-w-0 overflow-x-hidden">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">
              OVERVIEW &middot; JUNE 2026
            </p>
            <h2 className="mt-1 text-2xl font-bold text-[#06201c]">Good morning, Sarah &#128075;</h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void loadDashboardCounts()}
              className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58] transition hover:bg-[#f5faf7]"
            >
              Refresh
            </button>
            <Link
              href="/enterprises/create"
              className="rounded-full bg-[#1f6a58] px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#195646]"
            >
              + New Enterprise
            </Link>
          </div>
        </div>

        <div className="grid w-full min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((item, index) => (
            <div
              key={item.label}
              className="group min-h-[142px] w-full min-w-0 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm transition-all duration-200 hover:bg-gradient-to-br hover:from-[#1f6a58] hover:to-[#8fc9a8] hover:shadow-md"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f6ee] text-[#1f6a58] transition-all duration-200 group-hover:bg-white/20 group-hover:text-white">
                  {index === 0 ? <BuildingIcon /> : index === 1 ? <RevenueIcon /> : index === 2 ? <UsersIcon /> : <PackageIcon />}
                </div>
                {item.change ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-[#08a36b] transition-all duration-200 group-hover:text-white">
                    <MiniArrow />
                    {item.change}
                  </span>
                ) : null}
              </div>
              <h3 className="text-2xl font-bold text-[#06201c] transition-colors duration-200 group-hover:text-white">
                {item.value}
              </h3>
              <p className="mt-1 text-sm font-normal text-[#52736a] transition-colors duration-200 group-hover:text-white">
                {item.label}
              </p>
              {"subtitle" in item ? (
                <p className="mt-1 text-xs font-medium text-[#7f9d94] transition-colors duration-200 group-hover:text-white/90">
                  {item.subtitle}
                </p>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.6fr_0.8fr]">
          <section className="w-full min-w-0 rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#06201c]">Platform Revenue</h3>
                <p className="text-sm text-[#52736a]">Monthly GMV across all enterprises</p>
              </div>
              <select
                defaultValue="2026"
                className="h-9 rounded-full border border-[#d7e5df] bg-white px-3 text-sm text-[#52736a] outline-none transition hover:border-[#b9cfc7] focus:border-[#1f6a58]"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
              </select>
            </div>

            <div className="flex h-36 items-end gap-1.5 sm:h-48 sm:gap-3">
              {[42, 58, 49, 74, 65, 82, 76, 91, 84, 98, 93, 106].map((height, index) => (
                <div key={index} className="flex min-w-0 flex-1 flex-col items-center gap-1.5 sm:gap-2">
                  <div
                    className={`w-full rounded-t-xl transition-colors duration-200 hover:bg-[#8fb0a8] ${
                      index === 11 ? "bg-[#1f6a58]" : "bg-[#c8d8d3]"
                    }`}
                    style={{ height: `${Math.max(24, Math.round(height * 0.7))}px` }}
                  />
                  <span className="text-[10px] leading-none text-[#52736a] sm:text-xs">
                    {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][index]}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="w-full min-w-0 rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#06201c]">Approval Queue</h3>
              <Link
                href="/admin/enterprise"
                className="text-sm font-semibold text-[#1f6a58] transition-colors duration-200 hover:text-[#185746] hover:underline"
              >
                Review All &rarr;
              </Link>
            </div>
            <div className="space-y-2.5">
              {approvalQueue.map((item) => (
                <div
                  key={item.name}
                  className="flex min-w-0 items-center justify-between gap-3 rounded-2xl px-3 py-2.5 transition-all duration-200 hover:bg-[#f4faf7]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#06201c]">{item.name}</p>
                    <p className="truncate text-xs text-[#52736a]">{item.meta}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      item.status === "Pending"
                        ? "bg-[#fff7e5] text-[#b7791f]"
                        : "bg-[#eef4ff] text-[#2563eb]"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <section className="w-full min-w-0 rounded-2xl border border-[#e1ebe6] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#edf3f0] p-5">
              <h3 className="text-lg font-bold text-[#06201c]">Recent Activity</h3>
              <button
                type="button"
                className="text-sm font-semibold text-[#1f6a58] transition-colors duration-200 hover:text-[#185746] hover:underline"
              >
                View all
              </button>
            </div>
            <div>
              {activities.map((item, index) => (
                <div
                  key={item}
                  className="flex cursor-pointer gap-3 border-b border-[#edf3f0] p-4 transition-colors duration-200 hover:bg-[#f4faf7] last:border-0"
                >
                  <ActivityIcon
                    kind={
                      index === 0
                        ? "package"
                        : index === 1
                          ? "video"
                          : index === 2
                            ? "building"
                            : index === 3
                              ? "trend"
                              : "grad"
                    }
                  />
                  <div>
                    <p className="text-sm font-medium text-[#06201c]">{item}</p>
                    <p className="text-xs text-[#52736a]">{index + 2} min ago</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="w-full min-w-0 rounded-2xl border border-[#e1ebe6] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#edf3f0] p-5">
              <h3 className="text-lg font-bold text-[#06201c]">Platform Health</h3>
              <span className="rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-bold text-[#16825b]">
                Live
              </span>
            </div>
            <div className="space-y-4 p-5">
              {platformHealth.map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-medium text-[#06201c]">{item.label}</p>
                    <p className="text-sm font-bold text-[#06201c]">{item.value}%</p>
                  </div>
                  <HealthBar value={item.value} />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
