/** Provides an accessible route-level loading fallback for Event form configuration pages. */
export default function FormConfigurationsLoading() {
  return <div role="status" aria-label="Loading form configurations" className="animate-pulse space-y-5"><div className="h-10 w-72 rounded-xl bg-[#edf3f0]" /><div className="h-80 rounded-2xl bg-[#edf3f0]" /></div>;
}
