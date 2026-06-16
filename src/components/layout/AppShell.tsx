import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";

type AppShellProps = {
  children: React.ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <main className="min-h-screen bg-[#f6fbf8] text-[#06201c]">
      <AppSidebar />
      <AppHeader />
      <section className="px-5 py-5 lg:ml-[240px] lg:px-6 lg:py-6">
        {children}
      </section>
    </main>
  );
}
