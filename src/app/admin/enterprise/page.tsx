"use client";

import { useState } from "react";

import AppShell from "@/components/layout/AppShell";

const tabs = ["Information", "Products", "Services", "Events", "Trainings"] as const;

const products = [
  {
    name: "Protein Starter Kit",
    category: "Supplements",
    price: "₹1,499",
    status: "Active",
    description: "A beginner-friendly nutrition kit for everyday wellness support.",
  },
  {
    name: "Wellness Tracker Band",
    category: "Wearables",
    price: "₹2,999",
    status: "Draft",
    description: "Lightweight activity tracker with sleep and recovery monitoring.",
  },
  {
    name: "Herbal Nutrition Pack",
    category: "Nutrition",
    price: "₹899",
    status: "Pending",
    description: "A curated pack of herbal supplements for daily balance.",
  },
];

const services = [
  {
    name: "Personal Wellness Consultation",
    duration: "45 min",
    price: "₹1,200",
    status: "Bookable",
    description: "One-on-one guidance for nutrition, habits, and lifestyle planning.",
  },
  {
    name: "Nutrition Planning Session",
    duration: "60 min",
    price: "₹1,800",
    status: "Limited slots",
    description: "A structured plan tailored to client goals and dietary preferences.",
  },
  {
    name: "Corporate Wellness Workshop",
    duration: "90 min",
    price: "₹8,000",
    status: "Available",
    description: "Interactive workplace session focused on health and productivity.",
  },
];

const events = [
  {
    name: "Wellness Weekend Camp",
    date: "Jun 18, 2026",
    location: "Chennai, India",
    status: "Upcoming",
    description: "A two-day community wellness camp with guided movement and nutrition talks.",
  },
  {
    name: "Nutrition Awareness Meet",
    date: "Jun 24, 2026",
    location: "Anna Nagar, Chennai",
    status: "Scheduled",
    description: "An educational event for families and wellness enthusiasts.",
  },
  {
    name: "Fitness Checkup Drive",
    date: "Jun 30, 2026",
    location: "T. Nagar, Chennai",
    status: "Confirmed",
    description: "A free screening drive for members and corporate partners.",
  },
];

const trainings = [
  {
    name: "Beginner Wellness Program",
    duration: "6 weeks",
    enrollment: "42 enrolled",
    status: "Open",
    description: "A foundational training program covering habits, recovery, and planning.",
  },
  {
    name: "Nutrition Basics Course",
    duration: "4 weeks",
    enrollment: "28 enrolled",
    status: "In progress",
    description: "Simple nutrition education for teams and community members.",
  },
  {
    name: "Workplace Health Training",
    duration: "3 sessions",
    enrollment: "16 enrolled",
    status: "Coming soon",
    description: "A practical learning series for healthier work routines.",
  },
];

function StatusPill({
  children,
  tone = "success",
}: {
  children: string;
  tone?: "success" | "neutral" | "warning";
}) {
  const classes = {
    success: "bg-[#e8f6ee] text-[#16825b]",
    neutral: "bg-[#f1f4f3] text-[#6b7f79]",
    warning: "bg-[#fff7e5] text-[#b7791f]",
  }[tone];

  return <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${classes}`}>{children}</span>;
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-[#06201c]">{title}</h3>
      <p className="mt-1 text-sm text-[#52736a]">{subtitle}</p>
    </div>
  );
}

function InfoCard({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c6ddd3] hover:shadow-md">
      <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-[#7f9d94]">{title}</h4>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">{item.label}</p>
            <p className="mt-2 text-sm font-semibold text-[#06201c]">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductCard({
  name,
  category,
  price,
  status,
  description,
}: {
  name: string;
  category: string;
  price: string;
  status: string;
  description: string;
}) {
  const tone = status === "Active" ? "success" : status === "Pending" ? "warning" : "neutral";

  return (
    <article className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c6ddd3] hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">{category}</p>
          <h4 className="mt-2 truncate text-base font-bold text-[#06201c]">{name}</h4>
        </div>
        <StatusPill tone={tone}>{status}</StatusPill>
      </div>
      <p className="mt-4 text-sm leading-6 text-[#52736a]">{description}</p>
      <div className="mt-4 flex items-center justify-between border-t border-[#edf3f0] pt-4">
        <span className="text-sm font-bold text-[#06201c]">{price}</span>
        <span className="text-xs font-semibold text-[#7f9d94]">Listed under admin profile</span>
      </div>
    </article>
  );
}

function ServiceCard({
  name,
  duration,
  price,
  status,
  description,
}: {
  name: string;
  duration: string;
  price: string;
  status: string;
  description: string;
}) {
  const tone =
    status === "Available" || status === "Bookable"
      ? "success"
      : status === "Limited slots"
        ? "warning"
        : "neutral";

  return (
    <article className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c6ddd3] hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">{duration}</p>
          <h4 className="mt-2 text-base font-bold text-[#06201c]">{name}</h4>
        </div>
        <StatusPill tone={tone}>{status}</StatusPill>
      </div>
      <p className="mt-4 text-sm leading-6 text-[#52736a]">{description}</p>
      <div className="mt-4 flex items-center justify-between border-t border-[#edf3f0] pt-4">
        <span className="text-sm font-bold text-[#06201c]">{price}</span>
        <span className="text-xs font-semibold text-[#7f9d94]">Service offering</span>
      </div>
    </article>
  );
}

function EventCard({
  name,
  date,
  location,
  status,
  description,
}: {
  name: string;
  date: string;
  location: string;
  status: string;
  description: string;
}) {
  const tone = status === "Confirmed" ? "success" : status === "Upcoming" ? "warning" : "neutral";

  return (
    <article className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c6ddd3] hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">{date}</p>
          <h4 className="mt-2 text-base font-bold text-[#06201c]">{name}</h4>
        </div>
        <StatusPill tone={tone}>{status}</StatusPill>
      </div>
      <p className="mt-4 text-sm leading-6 text-[#52736a]">{description}</p>
      <div className="mt-4 flex items-center justify-between border-t border-[#edf3f0] pt-4">
        <span className="text-sm font-semibold text-[#06201c]">{location}</span>
        <span className="text-xs font-semibold text-[#7f9d94]">Event calendar</span>
      </div>
    </article>
  );
}

function TrainingCard({
  name,
  duration,
  enrollment,
  status,
  description,
}: {
  name: string;
  duration: string;
  enrollment: string;
  status: string;
  description: string;
}) {
  const tone = status === "Open" ? "success" : status === "Coming soon" ? "warning" : "neutral";

  return (
    <article className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c6ddd3] hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">{duration}</p>
          <h4 className="mt-2 text-base font-bold text-[#06201c]">{name}</h4>
        </div>
        <StatusPill tone={tone}>{status}</StatusPill>
      </div>
      <p className="mt-4 text-sm leading-6 text-[#52736a]">{description}</p>
      <div className="mt-4 flex items-center justify-between border-t border-[#edf3f0] pt-4">
        <span className="text-sm font-semibold text-[#06201c]">{enrollment}</span>
        <span className="text-xs font-semibold text-[#7f9d94]">Training program</span>
      </div>
    </article>
  );
}

export default function AdminEnterprisePage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Information");

  return (
    <AppShell>
      <div className="w-full">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">
            ADMIN PORTAL
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#06201c] sm:text-3xl">My Enterprise</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#52736a] sm:text-base">
            View your enterprise profile, offerings, events, trainings, and business information.
          </p>
        </div>

        <section className="enterprise-hero-card mt-6 overflow-hidden rounded-3xl border border-[#d9e8e1] bg-white shadow-sm">
          <div className="relative">
            <div
              className="h-[220px] w-full bg-[#1f6a58]"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, rgba(16,88,72,0.92), rgba(45,116,95,0.72)), url('https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1400&q=80')",
                backgroundPosition: "center",
                backgroundSize: "cover",
              }}
            />

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.16)_0_1px,transparent_1px)] bg-[length:36px_36px]" />

            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/25 to-transparent" />

            <div className="absolute bottom-0 left-6 translate-y-1/2">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-[#1f6a58] text-xl font-extrabold text-white shadow-lg">
                PW
              </div>
            </div>
          </div>

          <div className="px-6 pb-6 pt-14 sm:px-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-2xl font-bold text-[#06201c]">Pinnacle Wellness Co.</h3>
                  <StatusPill tone="warning">Pending Review</StatusPill>
                </div>
                <p className="mt-2 text-sm font-semibold text-[#52736a]">Wellness &amp; Health</p>
                <p className="mt-2 text-sm text-[#52736a]">Wellness made simple</p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm text-[#52736a]">
                  <span className="rounded-full bg-[#f8fbf9] px-3 py-1.5">Chennai, India</span>
                  <span className="rounded-full bg-[#f8fbf9] px-3 py-1.5">Founded 2021</span>
                  <span className="rounded-full bg-[#f8fbf9] px-3 py-1.5">pinnaclewellness.com</span>
                </div>
              </div>

              <div className="rounded-2xl border border-[#e1ebe6] bg-[#f9fcfa] px-4 py-3 text-sm text-[#06201c]">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Profile summary</p>
                <p className="mt-2 font-semibold text-[#06201c]">Enterprise onboarding in progress</p>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-5 flex gap-2 overflow-x-auto rounded-2xl border border-[#e1ebe6] bg-white p-2 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`h-10 whitespace-nowrap rounded-xl px-4 text-sm font-bold transition ${
                activeTab === tab
                  ? "bg-[#e9f4ee] text-[#1f6a58]"
                  : "text-[#52736a] hover:bg-[#f4faf7]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Information" ? (
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <InfoCard
              title="Business Overview"
              items={[
                {
                  label: "Description",
                  value:
                    "Pinnacle Wellness Co. delivers practical wellness experiences, healthy products, and guided programs for modern teams and families.",
                },
                { label: "Business Category", value: "Wellness & Health" },
                { label: "Registration Number", value: "PW-2021-4782" },
                { label: "Website", value: "pinnaclewellness.com" },
              ]}
            />

            <InfoCard
              title="Contact Information"
              items={[
                { label: "Business Email", value: "hello@pinnaclewellness.com" },
                { label: "Business Phone", value: "+91 98765 43210" },
                { label: "Primary Contact Name", value: "Sarah Johnson" },
                { label: "Primary Contact Title", value: "Founder & Director" },
              ]}
            />

            <InfoCard
              title="Address Information"
              items={[
                { label: "Registered Address", value: "12, Sterling Road, Chennai, India" },
                { label: "Business Address", value: "44, Green Park Avenue, Chennai, India" },
                { label: "Communication Address", value: "PO Box 1204, Chennai, India" },
                { label: "Office Hours", value: "Mon - Sat, 9:00 AM - 6:00 PM" },
              ]}
            />

            <div className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c6ddd3] hover:shadow-md">
              <SectionHeading title="Profile Status" subtitle="Current verification and completion snapshot." />

              <div className="mt-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-[#06201c]">Completion</span>
                  <span className="font-bold text-[#1f6a58]">72%</span>
                </div>
                <div className="mt-3 h-3 rounded-full bg-[#edf3f0]">
                  <div className="h-3 rounded-full bg-[#1f6a58]" style={{ width: "72%" }} />
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Verification</p>
                  <p className="mt-2 text-sm font-semibold text-[#06201c]">Pending Review</p>
                </div>
                <div className="rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Status</p>
                  <p className="mt-2 text-sm font-semibold text-[#06201c]">Active Profile Draft</p>
                </div>
                <div className="rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Last Updated</p>
                  <p className="mt-2 text-sm font-semibold text-[#06201c]">June 2026</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "Products" ? (
          <section className="mt-5">
            <SectionHeading title="Products" subtitle="Manage the products listed under your enterprise." />
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.name} {...product} />
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === "Services" ? (
          <section className="mt-5">
            <SectionHeading title="Services" subtitle="Review your service offerings and booking status." />
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {services.map((service) => (
                <ServiceCard key={service.name} {...service} />
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === "Events" ? (
          <section className="mt-5">
            <SectionHeading title="Events" subtitle="Track upcoming events and scheduled activations." />
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {events.map((event) => (
                <EventCard key={event.name} {...event} />
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === "Trainings" ? (
          <section className="mt-5">
            <SectionHeading title="Trainings" subtitle="Manage training programs and enrollment status." />
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {trainings.map((training) => (
                <TrainingCard key={training.name} {...training} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
