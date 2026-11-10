import { getPlatformAdminAppOrigin } from "@ihp/auth";
import { notFound, redirect } from "next/navigation";

import { buildPlatformCommerceUrl } from "@/routing/platform-commerce-route";

type ShellCommercePageProps = {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ShellCommercePage({ params, searchParams }: ShellCommercePageProps) {
  const platformOrigin = getPlatformAdminAppOrigin();
  if (!platformOrigin) {
    notFound();
  }

  const [{ section }, query] = await Promise.all([params, searchParams]);
  redirect(buildPlatformCommerceUrl(platformOrigin, section, query));
}
