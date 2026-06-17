import Link from "next/link";
import AppShell from "@/components/layout/AppShell";

const services = [
  {
    name: "Personal Training Session",
    enterprise: "FlexFit Academy",
    category: "Fitness",
    price: "$85",
    duration: "60 min",
    bookings: "312",
    status: "Active",
  },
  {
    name: "Nutrition Coaching",
    enterprise: "NutriCore Studio",
    category: "Nutrition",
    price: "$120",
    duration: "75 min",
    bookings: "184",
    status: "Active",
  },
  {
    name: "Group Yoga Class",
    enterprise: "Pinnacle Wellness Co.",
    category: "Yoga",
    price: "$28",
    duration: "45 min",
    bookings: "529",
    status: "Active",
  },
  {
    name: "Sports Massage",
    enterprise: "Vital Sports Clinic",
    category: "Recovery",
    price: "$95",
    duration: "50 min",
    bookings: "146",
    status: "Pending",
  },
  {
    name: "Mental Health Consultation",
    enterprise: "MindFlow Center",
    category: "Mental Health",
    price: "$140",
    duration: "60 min",
    bookings: "98",
    status: "Active",
  },
  {
    name: "Guided Meditation Session",
    enterprise: "CalmSpace Retreat",
    category: "Meditation",
    price: "$36",
    duration: "30 min",
    bookings: "221",
    status: "Pending",
  },
];

const filters = ["Category", "Enterprise", "Status"];

function statusClass(status: string) {
  return status === "Active"
    ? "bg-[#e8f6ee] text-[#16825b]"
    : "bg-[#fff7e5] text-[#b7791f]";
}

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 20h4L18.5 9.5a2.8 2.8 0 0 0-4-4L4 16v4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m13.5 6.5 4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function ServicesPage() {
  return (
    <AppShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#06201c]">Service Management</h2>
          <p className="mt-1 text-sm text-[#52736a]">
            Manage all bookable services across enterprise accounts
          </p>
        </div>
        <Link
          href="/services/create"
          className="inline-flex h-12 items-center rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm"
        >
          + Add Service
        </Link>
      </div>

      <div className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <input
            type="search"
            placeholder="Search services..."
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

      <section className="mt-5 overflow-hidden rounded-2xl border border-[#e1ebe6] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] table-fixed text-left">
            <thead className="bg-[#f8fbf9] text-[11px] uppercase tracking-[0.1em] text-[#7f9d94]">
              <tr>
                <th className="w-[22%] px-3 py-3 font-bold">Service</th>
                <th className="w-[19%] px-3 py-3 font-bold">Enterprise</th>
                <th className="w-[12%] px-3 py-3 font-bold">Category</th>
                <th className="w-[9%] px-3 py-3 font-bold">Price</th>
                <th className="w-[10%] px-3 py-3 font-bold">Duration</th>
                <th className="w-[10%] px-3 py-3 font-bold">Bookings</th>
                <th className="w-[10%] px-3 py-3 font-bold">Status</th>
                <th className="w-[8%] px-3 py-3 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf3f0]">
              {services.map((service, index) => (
                <tr key={service.name} className="h-16 cursor-pointer text-xs transition-colors duration-150 hover:bg-emerald-50/60">
                  <td className="px-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8f6ee] text-xs font-bold text-[#1f6a58]">
                        S{index + 1}
                      </span>
                      <span className="truncate font-semibold text-[#06201c]">
                        {service.name}
                      </span>
                    </div>
                  </td>
                  <td className="truncate px-3 text-[#52736a]">{service.enterprise}</td>
                  <td className="truncate px-3 text-[#52736a]">{service.category}</td>
                  <td className="px-3 font-semibold text-[#06201c]">{service.price}</td>
                  <td className="px-3 text-[#52736a]">{service.duration}</td>
                  <td className="px-3 text-[#52736a]">{service.bookings}</td>
                  <td className="px-3">
                    <span
                      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass(
                        service.status,
                      )}`}
                    >
                      {service.status}
                    </span>
                  </td>
                  <td className="px-3">
                    <div className="flex gap-1.5 text-[#52736a]">
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d7e5df] hover:bg-[#f4faf7]"
                        aria-label={`View ${service.name}`}
                      >
                        <EyeIcon />
                      </button>
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d7e5df] hover:bg-[#f4faf7]"
                        aria-label={`Edit ${service.name}`}
                      >
                        <EditIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
