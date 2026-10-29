const isRealtimeDebugEnabled = process.env.NODE_ENV !== "production";

export function realtimeDebug(scope: string, event: string, data?: unknown): void {
  if (isRealtimeDebugEnabled) console.log(`[realtime:${scope}] ${event}`, data ?? "");
}
