"use client";

import AppShell from "@/components/layout/AppShell";

function CalendarIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
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

function RevenueIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
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

function StarIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path
        d="m12 3 2.8 5.68 6.27.91-4.53 4.42 1.07 6.25L12 17.3l-5.62 2.96 1.07-6.25L2.92 9.6l6.27-.91L12 3Z"
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
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
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

const topMetrics = [
  {
    label: "Total Bookings",
    value: "1,284",
    change: "+22%",
    icon: <CalendarIcon />,
    iconTone: "bg-[#e8f6ee] text-[#1f6a58]",
  },
  {
    label: "Revenue",
    value: "$12,400",
    change: "+8.2%",
    icon: <RevenueIcon />,
    iconTone: "bg-[#eef4ff] text-[#2563eb]",
  },
  {
    label: "Avg Rating",
    value: "4.8 ★",
    change: null,
    icon: <StarIcon />,
    iconTone: "bg-[#fff7e8] text-[#d97706]",
  },
  {
    label: "Repeat Customers",
    value: "68%",
    change: "+5%",
    icon: <UsersIcon />,
    iconTone: "bg-[#f4f0ff] text-[#7c3aed]",
  },
] as const;

const topServices = [
  { label: "Group Yoga Class", value: "156 bookings", progress: 92 },
  { label: "Personal Training", value: "42 bookings", progress: 58 },
  { label: "Nutrition Coaching", value: "28 bookings", progress: 42 },
  { label: "Sports Massage", value: "18 bookings", progress: 28 },
] as const;

const topProducts = [
  { label: "Premium Yoga Mat", value: "$11,390", progress: 64 },
  { label: "Whey Protein Blend", value: "$17,748", progress: 96 },
  { label: "Resistance Band Set", value: "$3,289", progress: 24 },
  { label: "Foam Roller Pro", value: "$9,572", progress: 56 },
] as const;

function MetricCard({
  label,
  value,
  change,
  icon,
  iconTone,
}: (typeof topMetrics)[number]) {
  return (
    <div className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconTone}`}>
          {icon}
        </span>
        {change ? (
          <span className="rounded-full bg-[#e8f6ee] px-2.5 py-1 text-xs font-bold text-[#0f8a63]">
            {change}
          </span>
        ) : null}
      </div>
      <p className="text-2xl font-bold text-[#06201c]">{value}</p>
      <p className="mt-1 text-sm text-[#6b847c]">{label}</p>
    </div>
  );
}

function RankingCard({
  title,
  items,
}: {
  title: string;
  items: ReadonlyArray<{ label: string; value: string; progress: number }>;
}) {
  return (
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
      <h3 className="text-base font-bold text-[#06201c]">{title}</h3>
      <div className="mt-4 space-y-4">
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-[#06201c]">{item.label}</p>
              <span className="text-sm font-semibold text-[#1f6a58]">{item.value}</span>
            </div>
            <div className="h-2 rounded-full bg-[#ecf4ef]">
              <div
                className="h-2 rounded-full bg-[#1f6a58]"
                style={{ width: `${item.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <AppShell>
      <div className="min-h-[calc(100vh-72px)] bg-[#f7fbf8] px-6 py-6">
        <div className="mx-auto w-full max-w-7xl space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">
              ENTERPRISE OWNER · PINNACLE WELLNESS
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[#06201c]">My Analytics</h1>
            <p className="mt-1 text-sm text-[#5f7a71]">
              Track your enterprise performance and growth metrics
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {topMetrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <RankingCard title="Top Services by Bookings" items={topServices} />
            <RankingCard title="Top Products by Revenue" items={topProducts} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
