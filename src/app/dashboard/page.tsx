"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";

const stats = [
  { label: "Total Revenue", value: "$284,521", change: "+18.4%" },
  { label: "Enterprises", value: "142", change: "+7" },
  { label: "Active Members", value: "8,294", change: "+12.3%" },
  { label: "Products Listed", value: "1,847", change: "+94" },
];

const quickActions = [
  "Add Enterprise",
  "Create Product",
  "Schedule Event",
  "Add Training Course",
  "View Analytics",
  "Manage Integrations",
];

const activities = [
  "Pinnacle Wellness added 3 new products",
  "NutriCore Studio scheduled a webinar",
  "New enterprise registered: MindFlow Center",
  "Revenue milestone: $280K reached",
  "FlexFit Academy published training course",
];

const notifications = [
  "Pending Approval",
  "Stripe Webhook Failed",
  "New 5-Star Review",
  "Plan Renewal in 7 Days",
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
  const router = useRouter();
  return (
    <AppShell>
      <div className="w-full min-w-0 overflow-x-hidden">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">
            OVERVIEW &middot; JUNE 2026
          </p>
          <h2 className="mt-1 text-2xl font-bold text-[#06201c]">
            Good morning, Sarah &#128075;
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
  onClick={() => router.refresh()}
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

      <div className="grid w-full min-w-0 gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item, index) => (
          <div
            key={item.label}
            className="group min-h-[142px] w-full min-w-0 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm transition-all duration-200 hover:bg-gradient-to-br hover:from-[#1f6a58] hover:to-[#8fc9a8] hover:shadow-md"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f6ee] text-[#1f6a58] transition-all duration-200 group-hover:bg-white/20 group-hover:text-white">
                {index === 0 ? <RevenueIcon /> : index === 1 ? <BuildingIcon /> : index === 2 ? <UsersIcon /> : <PackageIcon />}
              </div>
              <span className="flex items-center gap-1 text-xs font-bold text-[#08a36b] transition-all duration-200 group-hover:text-white">
                <MiniArrow />
                {item.change}
              </span>
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
              <h3 className="text-lg font-semibold">Revenue Overview</h3>
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
            {[42, 58, 49, 74, 65, 82, 76, 91, 84, 98, 93, 106].map(
              (height, index) => (
                <div key={index} className="flex min-w-0 flex-1 flex-col items-center gap-1.5 sm:gap-2">
                  <div
                    className={`w-full rounded-t-xl transition-colors duration-200 hover:bg-[#8fb0a8] ${
                      index === 11 ? "bg-[#1f6a58]" : "bg-[#c8d8d3]"
                    }`}
                    style={{ height: `${Math.max(24, Math.round(height * 0.7))}px` }}
                  />
                  <span className="text-[10px] leading-none text-[#52736a] sm:text-xs">
                    {
                      [
                        "Jan",
                        "Feb",
                        "Mar",
                        "Apr",
                        "May",
                        "Jun",
                        "Jul",
                        "Aug",
                        "Sep",
                        "Oct",
                        "Nov",
                        "Dec",
                      ][index]
                    }
                  </span>
                </div>
              ),
            )}
          </div>
        </section>

        <section className="w-full min-w-0 rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm sm:p-5">
          <h3 className="mb-4 text-lg font-bold">Quick Actions</h3>
          <div className="space-y-2.5">
            {quickActions.map((item) => (
              <Link
                key={item}
                href={
                  item === "Add Enterprise"
                    ? "/enterprises/create"
                    : item === "Create Product"
                      ? "/products/create"
                      : item === "Schedule Event"
                        ? "/events"
                        : item === "Add Training Course"
                          ? "/trainings"
                          : item === "View Analytics"
                            ? "#"
                            : "/integrations"
                }
                className="group flex min-w-0 cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 transition-all duration-200 hover:bg-gradient-to-r hover:from-[#1f6a58] hover:to-[#8fc9a8] hover:shadow-sm"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#eef8f2] text-[#1f6a58] transition-all duration-200 group-hover:bg-white/20 group-hover:text-white">
                  {item === "Add Enterprise" ? (
                    <BuildingIcon />
                  ) : item === "Create Product" ? (
                    <PackageIcon />
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
            <h3 className="text-lg font-bold">Recent Activity</h3>
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
                  <p className="text-sm font-medium">{item}</p>
                  <p className="text-xs text-[#52736a]">{index + 2} min ago</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="w-full min-w-0 rounded-2xl border border-[#e1ebe6] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#edf3f0] p-5">
            <h3 className="text-lg font-bold">Notifications</h3>
            <span className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-bold text-[#2563eb]">
              3 unread
            </span>
          </div>
          <div>
            {notifications.map((item) => (
              <div
                key={item}
                className="flex cursor-pointer items-start justify-between gap-4 border-b border-[#edf3f0] p-4 transition-colors duration-200 hover:bg-[#f4faf7] last:border-0"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                      item === "Pending Approval"
                        ? "bg-[#eab308]"
                        : item === "Stripe Webhook Failed"
                          ? "bg-[#ef4444]"
                          : item === "New 5-Star Review"
                            ? "bg-[#22c55e]"
                            : "bg-[#3b82f6]"
                    }`}
                  />
                  <div>
                  <p className="text-sm font-semibold">{item}</p>
                  <p className="mt-1 text-xs text-[#52736a]">
                    {item === "Pending Approval"
                      ? "MindFlow Center is awaiting verification"
                      : item === "Stripe Webhook Failed"
                        ? "Pinnacle Wellness — check integration config"
                        : item === "New 5-Star Review"
                          ? "FlexFit Academy received a ⭐⭐⭐⭐⭐ product review"
                          : "NutriCore Studio subscription renews Jun 24"}
                  </p>
                  </div>
                </div>
                <span className="rounded-full bg-[#1f6a58] px-3 py-1 text-xs font-bold text-white">
                  New
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
      </div>
    </AppShell>
  );
}
