import { requestSuperAdminJson, isTenantUuid, superAdminErrorResponse, superAdminJsonResponse } from "@/lib/super-admin-server-client";
export async function POST(request: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  if (!isTenantUuid(applicationId)) return Response.json({ detail: "Invalid application ID." }, { status: 400 });
  try { const body = await request.json(); const identity = await requestSuperAdminJson("/auth/me"); const actorUserId = typeof (identity.body as { data?: { id?: unknown } })?.data?.id === "string" ? (identity.body as { data: { id: string } }).data.id : null; if (!actorUserId) return Response.json({ detail: "Super Admin identity is unavailable." }, { status: 401 }); return superAdminJsonResponse(await requestSuperAdminJson(`/tenant-applications/${applicationId}/reject`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actorUserId, reviewNotes: body?.reviewNotes }) })); } catch (error) { return superAdminErrorResponse(error); }
}
