"use client";

import Link from "next/link";
import { useState } from "react";

import AppShell from "@/components/layout/AppShell";

const tabs = ["Overview", "Products", "Services", "Events", "Trainings"];

const stats = [
  { label: "Members", value: "284" },
  { label: "Products", value: "24" },
  { label: "Services", value: "12" },
  { label: "Revenue", value: "$12.4K" },
];

const contact = [
  { label: "Email", value: "hello@pinnaclewellness.com" },
  { label: "Phone", value: "+1 (512) 555-0184" },
  { label: "Website", value: "pinnaclewellness.com" },
  { label: "Address", value: "124 Wellness Ave, Austin, TX 78701" },
];

const performance = [
  { label: "Member Growth", value: "↑ 18%", tone: "text-[#16825b]" },
  { label: "Average Rating", value: "4.8 ★", tone: "text-[#d97706]" },
  { label: "Response Rate", value: "97%", tone: "text-[#2563eb]" },
  { label: "Completion Rate", value: "84%", tone: "text-[#7c3aed]" },
  { label: "Retention Rate", value: "91%", tone: "text-[#14532d]" },
];

const products = [
  {
    name: "Premium Yoga Mat",
    category: "Fitness",
    price: "$68.00",
    status: "Active",
    gradient: "from-[#1f6a58] via-[#5c9d7a] to-[#c8d8d3]",
  },
  {
    name: "Whey Protein Blend",
    category: "Supplements",
    price: "$42.00",
    status: "Active",
    gradient: "from-[#245f54] via-[#6f9e6a] to-[#d7b56d]",
  },
  {
    name: "Resistance Band Set",
    category: "Recovery",
    price: "$24.00",
    status: "Out of Stock",
    gradient: "from-[#173f3b] via-[#5c8878] to-[#adc7b9]",
  },
  {
    name: "Foam Roller Pro",
    category: "Recovery",
    price: "$36.00",
    status: "Active",
    gradient: "from-[#204f49] via-[#6c9b86] to-[#d5caa7]",
  },
];

const services = [
  {
    name: "Personal Training Session",
    instructor: "Maya Chen",
    duration: "60 min",
    category: "Fitness",
    bookings: "312 bookings",
    price: "$85",
  },
  {
    name: "Nutrition Coaching",
    instructor: "Samira Patel",
    duration: "75 min",
    category: "Nutrition",
    bookings: "184 bookings",
    price: "$120",
  },
  {
    name: "Group Yoga Class",
    instructor: "Elena Park",
    duration: "45 min",
    category: "Yoga",
    bookings: "529 bookings",
    price: "$28",
  },
  {
    name: "Sports Massage",
    instructor: "Jordan Miles",
    duration: "50 min",
    category: "Recovery",
    bookings: "146 bookings",
    price: "$95",
  },
];

const events = [
  {
    title: "Summer Wellness Summit",
    date: "Jun 24",
    location: "Austin Convention Center",
    registered: "342 registered",
    gradient: "from-[#1f6a58] via-[#37836c] to-[#8ac7a7]",
  },
  {
    title: "Nutrition Workshop",
    date: "Jul 02",
    location: "Virtual",
    registered: "128 registered",
    gradient: "from-[#245f54] via-[#4f946f] to-[#d7b56d]",
  },
  {
    title: "5K Wellness Run",
    date: "Jul 13",
    location: "Zilker Park",
    registered: "491 registered",
    gradient: "from-[#1f6a58] via-[#6aa86b] to-[#c8d8d3]",
  },
];

const trainings = [
  {
    title: "Foundation Fitness Program",
    level: "Beginner",
    lessons: "18 lessons",
    duration: "6 weeks",
    enrolled: "428 enrolled",
  },
  {
    title: "Advanced Strength Training",
    level: "Advanced",
    lessons: "24 lessons",
    duration: "8 weeks",
    enrolled: "219 enrolled",
  },
  {
    title: "Mindful Movement Mastery",
    level: "Intermediate",
    lessons: "16 lessons",
    duration: "5 weeks",
    enrolled: "301 enrolled",
  },
];

function SectionLabel({ children }: { children: string }) {
  return <p className="text-sm font-bold text-[#06201c]">{children}</p>;
}

export default function EnterpriseDetailsPage() {
  const [activeTab, setActiveTab] = useState(tabs[0]);

  return (
    <AppShell>
      <section className="overflow-hidden rounded-3xl border border-[#d9e8e1] bg-white shadow-sm">
        <div className="relative bg-[#1f6a58] px-6 py-7 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.2)_0_1px,transparent_1px),linear-gradient(135deg,rgba(31,106,88,0.96),rgba(54,133,108,0.86))] bg-[length:36px_36px,auto]" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/95 text-2xl font-extrabold text-[#1f6a58]">
                P
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-bold">Pinnacle Wellness Co.</h2>
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
                    Active
                  </span>
                </div>
                <p className="mt-1 text-sm text-white/80">
                  Wellness Center · Austin, TX
                </p>
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
              className="group rounded-2xl border border-[#e1ebe6] bg-[#f9fcfa] p-5 transition-all duration-200 hover:bg-gradient-to-br hover:from-[#1f6a58] hover:to-[#8fc9a8] hover:shadow-md"
            >
              <p className="text-sm text-[#52736a] transition-colors duration-200 group-hover:text-white">{item.label}</p>
              <p className="mt-2 text-2xl font-extrabold text-[#06201c] transition-colors duration-200 group-hover:text-white">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-5 flex gap-2 overflow-x-auto rounded-2xl border border-[#e1ebe6] bg-white p-2 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`h-10 whitespace-nowrap rounded-xl px-4 text-sm font-bold ${
              activeTab === tab
                ? "bg-[#e9f4ee] text-[#1f6a58]"
                : "text-[#52736a] hover:bg-[#f4faf7]"
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
                Pinnacle Wellness Co. blends coaching, recovery services, and
                functional wellness products for modern teams and individuals. The
                enterprise focuses on sustainable routines, measurable health
                outcomes, and high-touch member support.
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {contact.map((item) => (
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
            <div className="mt-4 divide-y divide-[#edf3f0]">
              {performance.map((item) => (
                <div key={item.label} className="flex items-center justify-between py-3">
                  <span className="text-sm font-semibold text-[#52736a]">
                    {item.label}
                  </span>
                  <span className={`text-sm font-extrabold ${item.tone}`}>
                    {item.value}
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

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {products.map((product) => (
              <article
                key={product.name}
                className="overflow-hidden rounded-2xl border border-[#e1ebe6] bg-[#f9fcfa] shadow-sm"
              >
                <div
                  className={`relative h-32 bg-gradient-to-br ${product.gradient}`}
                />
                <div className="p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">
                    {product.category}
                  </p>
                  <h4 className="mt-2 text-sm font-bold text-[#06201c]">
                    {product.name}
                  </h4>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-[#06201c]">
                      {product.price}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        product.status === "Active"
                          ? "bg-[#e8f6ee] text-[#16825b]"
                          : "bg-[#fff1f0] text-[#b42318]"
                      }`}
                    >
                      {product.status}
                    </span>
                  </div>
                </div>
              </article>
            ))}
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
          <div className="mt-4 grid gap-4 md:grid-cols-2">
          {services.map((service) => (
            <article
              key={service.name}
              className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8f6ee] text-sm font-bold text-[#1f6a58]">
                    S
                  </div>
                  <div className="min-w-0">
                    <h4 className="truncate text-base font-bold text-[#06201c]">
                      {service.name}
                    </h4>
                    <p className="mt-1 text-sm text-[#52736a]">
                      {service.instructor} · {service.duration}
                    </p>
                  </div>
                </div>
                <span className="text-base font-bold text-[#06201c]">
                  {service.price}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#f1f4f3] px-3 py-1 text-xs font-bold text-[#52736a]">
                  {service.category}
                </span>
                <span className="rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-bold text-[#16825b]">
                  {service.bookings}
                </span>
              </div>
            </article>
          ))}
          </div>
        </section>
      ) : null}

      {activeTab === "Events" ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <article
              key={event.title}
              className="overflow-hidden rounded-2xl border border-[#e1ebe6] bg-white shadow-sm"
            >
              <div className={`h-40 bg-gradient-to-br ${event.gradient}`} />
              <div className="p-5">
                <p className="text-sm font-bold text-[#1f6a58]">{event.date}</p>
                <h4 className="mt-2 text-base font-bold text-[#06201c]">
                  {event.title}
                </h4>
                <p className="mt-2 text-sm text-[#52736a]">{event.location}</p>
                <p className="mt-3 text-sm font-semibold text-[#06201c]">
                  {event.registered}
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {activeTab === "Trainings" ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {trainings.map((training) => (
            <article
              key={training.title}
              className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8f6ee] text-sm font-bold text-[#1f6a58]">
                    T
                  </div>
                  <div>
                    <span className="rounded-full bg-[#f1f4f3] px-3 py-1 text-xs font-bold text-[#52736a]">
                      {training.level}
                    </span>
                    <h4 className="mt-3 text-base font-bold text-[#06201c]">
                      {training.title}
                    </h4>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#52736a]">
                <span>{training.lessons}</span>
                <span>{training.duration}</span>
              </div>
              <p className="mt-3 text-sm font-semibold text-[#06201c]">
                {training.enrolled}
              </p>
            </article>
          ))}
        </div>
      ) : null}
    </AppShell>
  );
}
