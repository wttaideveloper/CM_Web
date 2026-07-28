import { NextResponse } from "next/server";

import { CHAT_API_BASE_URL } from "@/lib/chat-api";

const MARKETPLACE_SHARED_DEMO_USER = {
  email: "provider@test.com",
  role: "provider",
  user_id: "550e8400-e29b-41d4-a716-446655440020",
};

export async function POST() {
  const useDemoChatToken = process.env.NEXT_PUBLIC_USE_DEMO_CHAT_TOKEN === "true";
  const apiBaseUrl = useDemoChatToken
    ? CHAT_API_BASE_URL
    : process.env.MARKETPLACE_API_BASE_URL ?? "http://13.207.85.164/api/v1";

  const response = await fetch(`${apiBaseUrl}/auth/dev-token`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(MARKETPLACE_SHARED_DEMO_USER),
  });

  const body = await response.text().catch(() => "");

  return new NextResponse(body || null, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
}
