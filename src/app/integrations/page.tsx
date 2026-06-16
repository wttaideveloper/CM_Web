import AppShell from "@/components/layout/AppShell";

const integrations = [
  {
    name: "Stripe",
    badge: "stripe",
    badgeClass: "bg-[#f4f0ff] text-[#635bff]",
    category: "Payments",
    connected: true,
    action: "Manage",
    description: "Accept card payments, subscriptions, and marketplace payouts.",
  },
  {
    name: "PayPal",
    badge: "P",
    badgeClass: "bg-[#e8f2ff] text-[#0070ba]",
    category: "Payments",
    connected: false,
    action: "Connect",
    description: "Enable PayPal checkout for enterprise marketplace purchases.",
  },
  {
    name: "Calendly",
    badge: "C",
    badgeClass: "bg-[#e8f6ee] text-[#16825b]",
    category: "Scheduling",
    connected: true,
    action: "Manage",
    description: "Sync bookings and service availability with Calendly events.",
  },
  {
    name: "Google Calendar",
    badge: "G",
    badgeClass: "bg-[#f1f7ff] text-[#1a73e8]",
    category: "Calendar",
    connected: true,
    action: "Manage",
    description: "Coordinate appointments, classes, and team calendars.",
  },
  {
    name: "Zoom",
    badge: "Z",
    badgeClass: "bg-[#e8f2ff] text-[#2563eb]",
    category: "Video",
    connected: false,
    action: "Connect",
    description: "Host virtual trainings, webinars, and consultation sessions.",
  },
  {
    name: "Microsoft Teams",
    badge: "T",
    badgeClass: "bg-[#f1edff] text-[#6264a7]",
    category: "Video",
    connected: false,
    action: "Connect",
    description: "Run enterprise meetings and live service sessions in Teams.",
  },
];

export default function IntegrationsPage() {
  return (
    <AppShell>
      <div>
        <h2 className="text-2xl font-bold text-[#06201c]">Integrations</h2>
        <p className="mt-1 text-sm text-[#52736a]">
          Connect third-party services to extend your platform capabilities.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {integrations.map((integration) => (
          <article
            key={integration.name}
            className="flex flex-col gap-4 rounded-2xl border border-[#e1ebe6] bg-white px-5 py-4 shadow-sm lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="flex gap-4">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-extrabold ${integration.badgeClass}`}
              >
                {integration.badge}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-[#06201c]">
                    {integration.name}
                  </h3>
                  <span className="rounded-full bg-[#f1f4f3] px-3 py-1 text-xs font-bold text-[#52736a]">
                    {integration.category}
                  </span>
                  {integration.connected ? (
                    <span className="rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-bold text-[#16825b]">
                      Connected
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-5 text-[#52736a]">
                  {integration.description}
                </p>
              </div>
            </div>
            <button
              className={`h-10 rounded-full px-5 text-sm font-bold lg:h-[38px] ${
                integration.connected
                  ? "border border-[#d7e5df] text-[#1f6a58]"
                  : "bg-[#1f6a58] text-white shadow-sm"
              }`}
            >
              {integration.action}
            </button>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
