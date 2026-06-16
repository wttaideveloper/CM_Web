const navItems = [
  "Dashboard",
  "Enterprises",
  "Create Enterprise",
  "Enterprise Details",
  "Products",
  "Create Product",
  "Services",
  "Create Service",
  "Events",
  "Trainings",
  "Integrations",
  "Attributes",
];

export default function AppSidebar() {
  return (
    <aside className="fixed left-0 top-[72px] hidden h-[calc(100vh-72px)] w-[240px] border-r border-[#e3eee9] bg-white lg:block">
      <nav className="px-3 py-4">
        <div className="space-y-1">
          {navItems.map((item) => (
            <div
              key={item}
              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                item === "Dashboard"
                  ? "bg-[#e9f4ee] text-[#1f6a58]"
                  : "text-[#4f6f67] hover:bg-[#f4faf7]"
              }`}
            >
              {item}
            </div>
          ))}
        </div>
      </nav>
    </aside>
  );
}
