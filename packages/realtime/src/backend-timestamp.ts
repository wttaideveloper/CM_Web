export function parseBackendTimestamp(value: string): Date {
  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value);
  return new Date(hasTimezone ? value : `${value}Z`);
}

export function formatRelativeBackendTimestamp(value: string | null): string {
  if (!value) return "Just now";
  const date = parseBackendTimestamp(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  const elapsedSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (elapsedSeconds <= 60) return "Just now";
  if (elapsedSeconds < 3600) return `${Math.floor(elapsedSeconds / 60)} min ago`;
  if (elapsedSeconds < 86400) return `${Math.floor(elapsedSeconds / 3600)} hr ago`;
  if (elapsedSeconds < 172800) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}
