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

export default function DashboardPage() {
  return (
    <AppShell>
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
          <button className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#1f6a58]">
            Refresh
          </button>
          <button className="rounded-full bg-[#1f6a58] px-5 py-2 text-sm font-bold text-white shadow-sm">
            + New Enterprise
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.label}
            className="min-h-[142px] rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f6ee] text-lg text-[#1f6a58]">
                <span className="h-3 w-3 rounded-full border-2 border-current" />
              </div>
              <span className="text-xs font-bold text-[#08a36b]">
                &uarr; {item.change}
              </span>
            </div>
            <h3 className="text-2xl font-extrabold text-[#06201c]">{item.value}</h3>
            <p className="mt-1 text-sm text-[#52736a]">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.6fr_0.8fr]">
        <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Revenue Overview</h3>
              <p className="text-sm text-[#52736a]">Monthly revenue for 2026</p>
            </div>
            <button className="rounded-xl border border-[#d7e5df] px-3 py-1.5 text-sm text-[#52736a]">
              2026
            </button>
          </div>

          <div className="flex h-48 items-end gap-3">
            {[42, 58, 49, 74, 65, 82, 76, 91, 84, 98, 93, 106].map(
              (height, index) => (
                <div key={index} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className={`w-full rounded-t-xl ${
                      index === 11 ? "bg-[#1f6a58]" : "bg-[#c8d8d3]"
                    }`}
                    style={{ height }}
                  />
                  <span className="text-xs text-[#52736a]">
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

        <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-bold">Quick Actions</h3>
          <div className="space-y-3">
            {quickActions.map((item) => (
              <div key={item} className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef8f2] text-[#1f6a58]">
                  +
                </span>
                <p className="text-sm font-semibold">{item}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-[#e1ebe6] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#edf3f0] p-5">
            <h3 className="text-lg font-bold">Recent Activity</h3>
            <button className="text-sm font-semibold text-[#1f6a58]">View all</button>
          </div>
          <div>
            {activities.map((item, index) => (
              <div
                key={item}
                className="flex gap-3 border-b border-[#edf3f0] p-4 last:border-0"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef8f2] text-[#1f6a58]">
                  <span className="h-3 w-3 rounded-full border-2 border-current" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{item}</p>
                  <p className="text-xs text-[#52736a]">{index + 2} min ago</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#e1ebe6] bg-white shadow-sm">
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
                className="flex items-start justify-between gap-4 border-b border-[#edf3f0] p-4 last:border-0"
              >
                <div>
                  <p className="text-sm font-bold">{item}</p>
                  <p className="mt-1 text-xs text-[#52736a]">
                    Invigorate Health platform notification
                  </p>
                </div>
                <span className="rounded-full bg-[#1f6a58] px-3 py-1 text-xs font-bold text-white">
                  New
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
