import AppShell from "@/components/layout/AppShell";

const filters = ["Upcoming", "Past", "Online"];

const events = [
  {
    title: "Summer Wellness Summit",
    date: "Jun 24",
    status: "Upcoming",
    location: "Austin Convention Center",
    attendees: "342 attendees",
    capacity: 76,
    gradient: "from-[#1f6a58] via-[#37836c] to-[#8ac7a7]",
  },
  {
    title: "Nutrition Workshop",
    date: "Jul 02",
    status: "Online",
    location: "Virtual",
    attendees: "128 attendees",
    capacity: 58,
    gradient: "from-[#245f54] via-[#4f946f] to-[#d7b56d]",
  },
  {
    title: "5K Wellness Run",
    date: "Jul 13",
    status: "Upcoming",
    location: "Zilker Park",
    attendees: "491 attendees",
    capacity: 82,
    gradient: "from-[#1f6a58] via-[#6aa86b] to-[#c8d8d3]",
  },
  {
    title: "Mind-Body Retreat",
    date: "Aug 08",
    status: "Upcoming",
    location: "Sedona Retreat Center",
    attendees: "74 attendees",
    capacity: 64,
    gradient: "from-[#204f49] via-[#7b9a79] to-[#d7c9a3]",
  },
  {
    title: "Virtual Yoga Series",
    date: "Aug 19",
    status: "Online",
    location: "Virtual",
    attendees: "216 attendees",
    capacity: 69,
    gradient: "from-[#1f6a58] via-[#5a8f86] to-[#91c7c1]",
  },
  {
    title: "Breathwork Intensive",
    date: "Sep 05",
    status: "Upcoming",
    location: "CalmSpace Studio",
    attendees: "96 attendees",
    capacity: 48,
    gradient: "from-[#164d43] via-[#5f9275] to-[#a9c98f]",
  },
];

export default function EventsPage() {
  return (
    <AppShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#06201c]">Event Management</h2>
          <p className="mt-1 text-sm text-[#52736a]">
            Create and manage events across all enterprises.
          </p>
        </div>
        <button className="h-12 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm">
          + Create Event
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <input
            type="search"
            placeholder="Search events..."
            className="h-12 w-full rounded-2xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58] lg:max-w-sm"
          />
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a]"
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {events.map((event) => (
          <article
            key={event.title}
            className="overflow-hidden rounded-2xl border border-[#e1ebe6] bg-white shadow-sm"
          >
            <div
              className={`relative h-[180px] bg-gradient-to-br ${event.gradient} p-5 text-white`}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.26)_0_1px,transparent_1px)] bg-[length:28px_28px]" />
              <span className="absolute right-4 top-4 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur">
                {event.status}
              </span>
              <div className="absolute bottom-5 left-5 right-5">
                <p className="text-sm font-bold text-white/80">{event.date}</p>
                <h3 className="mt-1 text-xl font-bold leading-tight">{event.title}</h3>
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between gap-4 text-sm text-[#52736a]">
                <span>{event.location}</span>
                <span>{event.attendees}</span>
              </div>
              <div className="mt-4 h-2 rounded-full bg-[#edf3f0]">
                <div
                  className="h-2 rounded-full bg-[#1f6a58]"
                  style={{ width: `${event.capacity}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-semibold text-[#52736a]">
                {event.capacity}% capacity filled
              </p>
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
