import AppShell from "@/components/layout/AppShell";

const notifications = [
  {
    title: "Pending Approval",
    description: "MindFlow Center is awaiting verification before publishing.",
    meta: "Enterprise onboarding",
    tone: "New",
  },
  {
    title: "Stripe Webhook Failed",
    description: "Pinnacle Wellness - check integration config and retry the event.",
    meta: "Integrations",
    tone: "Alert",
  },
  {
    title: "New 5-Star Review",
    description: "FlexFit Academy received a 5-star product review from a member.",
    meta: "Products",
    tone: "New",
  },
  {
    title: "Plan Renewal in 7 Days",
    description: "NutriCore Studio subscription renews on June 24, 2026.",
    meta: "Billing",
    tone: "Read",
  },
  {
    title: "Event Capacity Updated",
    description: "Summer Wellness Summit is now 82% full with 14 seats left.",
    meta: "Events",
    tone: "Read",
  },
  {
    title: "Training Course Published",
    description: "Mindful Movement Mastery is now live in the trainings library.",
    meta: "Trainings",
    tone: "New",
  },
];

function toneClass(tone: string) {
  if (tone === "Alert") {
    return "bg-[#fff1f0] text-[#b42318]";
  }

  if (tone === "New") {
    return "bg-[#e8f6ee] text-[#16825b]";
  }

  return "bg-[#eef4ff] text-[#2563eb]";
}

function Dot({ tone }: { tone: string }) {
  const dotColor =
    tone === "Alert" ? "bg-[#f04438]" : tone === "New" ? "bg-[#f59e0b]" : "bg-[#1f6a58]";

  return <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${dotColor}`} />;
}

export default function NotificationsPage() {
  return (
    <AppShell>
      <div>
        <h2 className="text-2xl font-bold text-[#06201c]">Notifications</h2>
        <p className="mt-1 text-sm text-[#52736a]">
          View platform updates, alerts, and account activity.
        </p>
      </div>

      <section className="mt-5 overflow-hidden rounded-2xl border border-[#e1ebe6] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#edf3f0] px-5 py-4">
          <h3 className="text-base font-bold text-[#06201c]">6 notifications</h3>
          <span className="text-sm text-[#52736a]">Updated just now</span>
        </div>

        <div className="divide-y divide-[#edf3f0]">
          {notifications.map((item) => (
            <article key={item.title} className="flex gap-4 px-5 py-4">
              <Dot tone={item.tone} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-bold text-[#06201c]">{item.title}</h4>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${toneClass(
                      item.tone,
                    )}`}
                  >
                    {item.tone}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-[#52736a]">{item.description}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#7f9d94]">
                  {item.meta}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
