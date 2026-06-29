"use client";

import { useMemo, useState } from "react";

import AppShell from "@/components/layout/AppShell";

type EventStatus = "Upcoming" | "Scheduled" | "Completed" | "Draft";
type SortOption = "newest" | "oldest" | "az" | "status";

type EventItem = {
  title: string;
  type: string;
  status: EventStatus;
  date: string;
  location: string;
  registrations: number;
  description: string;
  createdAt: string;
};

const statusChips: Array<"All" | EventStatus | "Scheduled/In Progress"> = [
  "All",
  "Upcoming",
  "Scheduled/In Progress",
  "Completed",
  "Draft",
];

const events: EventItem[] = [
  {
    title: "Wellness Weekend Camp",
    date: "Jun 18, 2026",
    location: "Chennai Wellness Center",
    status: "Upcoming",
    registrations: 84,
    type: "Community Event",
    description:
      "A weekend wellness camp with movement sessions, nutrition talks, and guided health screenings.",
    createdAt: "2026-06-18T09:00:00Z",
  },
  {
    title: "Nutrition Awareness Meet",
    date: "Jun 24, 2026",
    location: "Anna Nagar, Chennai",
    status: "Scheduled",
    registrations: 42,
    type: "Awareness Session",
    description: "A small group session focused on practical nutrition habits for families.",
    createdAt: "2026-06-24T09:00:00Z",
  },
  {
    title: "Fitness Checkup Drive",
    date: "Jun 30, 2026",
    location: "T. Nagar, Chennai",
    status: "Completed",
    registrations: 128,
    type: "Health Drive",
    description: "A public checkup drive with basic fitness assessments and wellness guidance.",
    createdAt: "2026-06-30T09:00:00Z",
  },
  {
    title: "Corporate Wellness Day",
    date: "Jul 08, 2026",
    location: "Remote / Online",
    status: "Draft",
    registrations: 0,
    type: "Corporate Event",
    description: "A planned corporate wellness event for partner teams and employees.",
    createdAt: "2026-07-08T09:00:00Z",
  },
];

function statusPillClass(status: string) {
  if (status === "Upcoming" || status === "Open") {
    return "bg-[#e8f6ee] text-[#16825b]";
  }

  if (status === "Scheduled" || status === "In Progress") {
    return "bg-[#eef4ff] text-[#2563eb]";
  }

  if (status === "Completed") {
    return "bg-[#f1f4f3] text-[#6b7f79]";
  }

  return "bg-[#fff7e5] text-[#b7791f]";
}

function isValidDate(value: string) {
  return Number.isFinite(Date.parse(value));
}

function matchesStatusFilter(status: EventStatus, filter: string) {
  if (filter === "All") {
    return true;
  }

  if (filter === "Scheduled/In Progress") {
    return status === "Scheduled";
  }

  return status === filter;
}

function sortEvents(items: EventItem[], sort: SortOption) {
  return [...items].sort((left, right) => {
    if (sort === "az") {
      return left.title.localeCompare(right.title);
    }

    if (sort === "status") {
      return left.status.localeCompare(right.status) || left.title.localeCompare(right.title);
    }

    const leftValid = isValidDate(left.createdAt);
    const rightValid = isValidDate(right.createdAt);

    if (leftValid && rightValid) {
      return sort === "oldest"
        ? Date.parse(left.createdAt) - Date.parse(right.createdAt)
        : Date.parse(right.createdAt) - Date.parse(left.createdAt);
    }

    if (leftValid) {
      return -1;
    }

    if (rightValid) {
      return 1;
    }

    return 0;
  });
}

function EventCard({ event }: { event: EventItem }) {
  return (
    <article className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c6ddd3] hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">
            {event.type}
          </p>
          <h3 className="mt-2 text-lg font-bold text-[#06201c]">{event.title}</h3>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${statusPillClass(event.status)}`}>
          {event.status}
        </span>
      </div>

      <p className="mt-4 text-sm leading-6 text-[#52736a]">{event.description}</p>

      <div className="mt-4 grid gap-3 border-t border-[#edf3f0] pt-4 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Date</p>
          <p className="mt-1 font-semibold text-[#06201c]">{event.date}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Location</p>
          <p className="mt-1 font-semibold text-[#06201c]">{event.location}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Registrations</p>
          <p className="mt-1 font-semibold text-[#06201c]">{event.registrations}</p>
        </div>
      </div>

      <div className="mt-4 border-t border-[#edf3f0] pt-4 text-sm font-semibold text-[#1f6a58]">
        View event details
      </div>
    </article>
  );
}

export default function AdminEventsPage() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [statusFilter, setStatusFilter] = useState<(typeof statusChips)[number]>("All");

  const visibleEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = events.filter((event) => {
      const searchable = [event.title, event.location, event.status, event.type]
        .join(" ")
        .toLowerCase();

      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
      return matchesQuery && matchesStatusFilter(event.status, statusFilter);
    });

    return sortEvents(filtered, sort);
  }, [query, sort, statusFilter]);

  return (
    <AppShell>
      <div className="w-full">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">
              ADMIN PORTAL
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#06201c] sm:text-3xl">Events</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#52736a] sm:text-base">
              Manage events hosted by your enterprise.
            </p>
          </div>

          <button
            type="button"
            className="inline-flex h-12 items-center justify-center rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#195646]"
          >
            + Create Event
          </button>
        </div>

        <section className="mt-6 rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm">
          <div className="grid gap-3 xl:grid-cols-[1fr_auto]">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">
                Search
              </span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, title, location, or status"
                className="mt-2 h-12 w-full rounded-2xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
              />
            </label>

            <label className="block xl:w-[220px]">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">
                Sort
              </span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortOption)}
                className="mt-2 h-12 w-full rounded-2xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm text-[#06201c] outline-none focus:border-[#1f6a58]"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="az">A-Z</option>
                <option value="status">Status</option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {statusChips.map((chip) => {
              const active = statusFilter === chip;

              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setStatusFilter(chip)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-[#e8f6ee] text-[#1f6a58]"
                      : "border border-[#d7e5df] bg-white text-[#52736a] hover:bg-[#f4faf7]"
                  }`}
                >
                  {chip}
                </button>
              );
            })}
          </div>
        </section>

        {visibleEvents.length === 0 ? (
          <section className="mt-6 rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm">
            <p className="text-base font-bold text-[#06201c]">No events found.</p>
            <p className="mt-2 text-sm text-[#52736a]">Try a different search or filter.</p>
          </section>
        ) : (
          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-2">
            {visibleEvents.map((event) => (
              <EventCard key={event.title} event={event} />
            ))}
          </section>
        )}
      </div>
    </AppShell>
  );
}
