"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AppShell from "@/components/layout/AppShell";
import { useCurrentEnterprise } from "@/contexts/CurrentEnterpriseContext";
import { getServices } from "@/services/service.service";
import { normalizeEnterpriseStatus } from "@ihp/enterprises";
import { getProducts } from "@ihp/products";

const quickActions = [
  "Create Product",
  "Create Service",
  "Schedule Event",
  "Add Training Course",
  "View Analytics",
  "Manage Integrations",
];

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthlyRevenue = Array.from({ length: 12 }, () => 0);

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

function ServiceIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M14 7 7 14M6 8l2-2a2.8 2.8 0 1 1 4 4l-2 2M12 14l2-2a2.8 2.8 0 1 1 4 4l-2 2M5 19l4-4"
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

function PlugIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M8 7v4m8-4v4M6 11h12M10 11v4a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2v-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

function ActivityIcon({ kind }: { kind: "package" | "service" | "grad" }) {
  const classes = {
    package: "bg-[#e8f6ee] text-[#1f6a58]",
    service: "bg-[#eef4ff] text-[#2563eb]",
    grad: "bg-[#f4f0ff] text-[#7c3aed]",
  }[kind];

  return (
    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${classes}`}>
      {kind === "package" ? <PackageIcon /> : kind === "service" ? <ServiceIcon /> : <GraduationIcon />}
    </span>
  );
}

export default function AdminDashboardPage() {
  const { currentEnterprise, enterpriseId, isLoadingEnterprise } = useCurrentEnterprise();
  const [productCount, setProductCount] = useState<number | null>(null);
  const [serviceCount, setServiceCount] = useState<number | null>(null);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);

  useEffect(() => {
    let active = true;

    const loadInventoryCounts = async () => {
      if (!enterpriseId) {
        if (active) {
          setProductCount(null);
          setServiceCount(null);
          setIsLoadingInventory(false);
        }
        return;
      }

      setIsLoadingInventory(true);
      const [productsResult, servicesResult] = await Promise.allSettled([getProducts(), getServices()]);

      if (!active) {
        return;
      }

      setProductCount(
        productsResult.status === "fulfilled"
          ? productsResult.value.filter((product) => product.enterprise_id === enterpriseId).length
          : null,
      );
      setServiceCount(
        servicesResult.status === "fulfilled"
          ? servicesResult.value.filter((service) => service.enterprise_id === enterpriseId).length
          : null,
      );
      setIsLoadingInventory(false);
    };

    void loadInventoryCounts();

    return () => {
      active = false;
    };
  }, [enterpriseId]);

  const enterpriseName = currentEnterprise
    ? currentEnterprise.business_legal_name || currentEnterprise.business_short_name || currentEnterprise.name || "Unnamed Enterprise"
    : isLoadingEnterprise
      ? "Loading enterprise..."
      : "Enterprise unavailable";
  const enterpriseStatus = currentEnterprise ? normalizeEnterpriseStatus(currentEnterprise.status) : null;
  const productCountValue = isLoadingInventory || productCount === null ? "—" : String(productCount);
  const serviceCountValue = isLoadingInventory || serviceCount === null ? "—" : String(serviceCount);
  const stats = [
    { label: "My Products", value: productCountValue },
    { label: "My Services", value: serviceCountValue },
    { label: "Bookings This Month", value: "0" },
    { label: "My Revenue", value: "$0" },
  ];

  return (
    <AppShell>
      <div className="w-full min-w-0 overflow-x-hidden">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">
              ENTERPRISE OWNER &middot; {enterpriseName.toUpperCase()}
            </p>
            <h2 className="mt-1 text-2xl font-bold text-[#06201c]">
              My Business Dashboard
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {enterpriseStatus ? (
              <span className="inline-flex items-center rounded-full bg-[#e8f6ee] px-4 py-2 text-sm font-semibold text-[#1f6a58]">
                {enterpriseStatus}
              </span>
            ) : null}
            <Link
              href="/admin/products/create"
              className="rounded-full bg-[#1f6a58] px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#195646]"
            >
              + Add Listing
            </Link>
          </div>
        </div>

        <div className="grid w-full min-w-0 gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((item, index) => (
            <div
              key={item.label}
              className="group min-h-[142px] w-full min-w-0 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm transition-all duration-200 hover:bg-gradient-to-br hover:from-[#1f6a58] hover:to-[#8fc9a8] hover:shadow-md"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f6ee] text-[#1f6a58] transition-all duration-200 group-hover:bg-white/20 group-hover:text-white">
                  {index === 0 ? (
                    <PackageIcon />
                  ) : index === 1 ? (
                    <ServiceIcon />
                  ) : index === 2 ? (
                    <CalendarIcon />
                  ) : (
                    <RevenueIcon />
                  )}
                </div>
              </div>
              <h3 className="text-2xl font-bold text-[#06201c] transition-colors duration-200 group-hover:text-white">
                {item.value}
              </h3>
              <p className="mt-1 text-sm font-normal text-[#52736a] transition-colors duration-200 group-hover:text-white">
                {item.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid w-full min-w-0 gap-5 xl:grid-cols-[1.6fr_0.8fr]">
          <section className="w-full min-w-0 rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#06201c]">Revenue Overview</h3>
                <p className="text-sm text-[#52736a]">Monthly revenue for 2026</p>
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
              {monthlyRevenue.map((value, index) => (
                <div key={index} className="flex min-w-0 flex-1 flex-col items-center gap-1.5 sm:gap-2">
                  <div
                    className={`w-full rounded-t-xl transition-colors duration-200 hover:bg-[#8fb0a8] ${
                      index === 11 ? "bg-[#1f6a58]" : "bg-[#c8d8d3]"
                    }`}
                    style={{ height: `${Math.round(value * 0.7)}px` }}
                  />
                  <span className="text-[10px] leading-none text-[#52736a] sm:text-xs">
                    {months[index]}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="w-full min-w-0 rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm sm:p-5">
            <h3 className="mb-4 text-lg font-bold text-[#06201c]">Quick Actions</h3>
            <div className="space-y-2.5">
              {quickActions.map((item) => (
                <Link
                  key={item}
                  href={
                    item === "Create Product"
                      ? "/admin/products/create"
                      : item === "Create Service"
                        ? "/admin/services/create"
                        : item === "Schedule Event"
                          ? "/admin/events"
                          : item === "Add Training Course"
                            ? "/admin/trainings"
                            : item === "View Analytics"
                              ? "#"
                              : "/integrations"
                  }
                  className="group flex min-w-0 cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 transition-all duration-200 hover:bg-gradient-to-r hover:from-[#1f6a58] hover:to-[#8fc9a8] hover:shadow-sm"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#eef8f2] text-[#1f6a58] transition-all duration-200 group-hover:bg-white/20 group-hover:text-white">
                    {item === "Create Product" ? (
                      <PackageIcon />
                    ) : item === "Create Service" ? (
                      <ServiceIcon />
                    ) : item === "Schedule Event" ? (
                      <CalendarIcon />
                    ) : item === "Add Training Course" ? (
                      <GraduationIcon />
                    ) : item === "View Analytics" ? (
                      <ChartIcon />
                    ) : (
                      <PlugIcon />
                    )}
                  </span>
                  <span className="min-w-0 text-sm font-medium text-[#06201c] transition-colors duration-200 group-hover:text-white">
                    {item}
                  </span>
                </Link>
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
              <div className="p-4 text-sm text-[#52736a]">No recent activity.</div>
            </div>
          </section>

          <section className="w-full min-w-0 rounded-2xl border border-[#e1ebe6] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#edf3f0] p-5">
              <h3 className="text-lg font-bold text-[#06201c]">Notifications</h3>
              <span className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-bold text-[#2563eb]">
                0 unread
              </span>
            </div>
            <div>
              <div className="p-4 text-sm text-[#52736a]">No notifications.</div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
