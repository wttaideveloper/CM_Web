const platformAdminSafeReturnPrefixes = [
  "/",
  "/profile",
  "/account-settings",
  "/form-builder-new",
  "/workflow-builder-new",
  "/dashboard",
  "/approval-queue",
  "/tenant-applications",
  "/onboarding-forms",
  "/form-configurations",
  "/training-forms",
  "/training-form-configurations",
  "/enterprise-types",
  "/categories",
  "/sub-admins",
  "/attributes",
  "/products",
  "/services",
  "/enterprises",
  "/users",
  "/super-admins",
  "/events",
  "/trainings",
  "/integrations",
] as const;

const shellSafeReturnPrefixes = ["/admin", "/trainings", "/training-forms"] as const;

function normalizeOrigin(value: string | undefined) {
  if (!value?.trim()) {
    return null;
  }

  try {
    const url = new URL(value.trim());
    return url.origin;
  } catch {
    return null;
  }
}

function getConfiguredOrigin(value: string | undefined, developmentFallback: string) {
  const configured = normalizeOrigin(value);
  if (configured) {
    return configured;
  }

  return process.env.NODE_ENV === "production" ? null : developmentFallback;
}

export function getShellAppOrigin() {
  return getConfiguredOrigin(
    process.env.NEXT_PUBLIC_SHELL_ORIGIN,
    "http://localhost:3000",
  );
}

export function getEnterpriseAdminAppOrigin() {
  return getConfiguredOrigin(
    process.env.NEXT_PUBLIC_ENTERPRISE_ADMIN_ORIGIN,
    "http://localhost:3001",
  );
}

export function getPlatformAdminAppOrigin() {
  return getConfiguredOrigin(
    process.env.NEXT_PUBLIC_PLATFORM_ADMIN_ORIGIN,
    "http://localhost:3002",
  );
}

export function getSafeEnterpriseAdminReturnUrl(value: string | null | undefined) {
  const enterpriseAdminOrigin = getEnterpriseAdminAppOrigin();
  if (!enterpriseAdminOrigin || !value?.trim()) {
    return null;
  }

  try {
    const url = new URL(value);
    if (
      url.origin !== enterpriseAdminOrigin ||
      url.username ||
      url.password ||
      !url.pathname.startsWith("/admin")
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

/** Returns a same-origin Shell route allowed after authentication, without query data. */
export function getSafeShellReturnPath(value: string | null | undefined) {
  if (!value?.trim()) {
    return null;
  }

  try {
    const shellOrigin = getShellAppOrigin();
    const url = new URL(value, shellOrigin ?? "https://invalid.local");
    if (
      !shellOrigin ||
      url.origin !== shellOrigin ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !shellSafeReturnPrefixes.some((prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`))
    ) {
      return null;
    }

    return url.pathname;
  } catch {
    return null;
  }
}

export function getSafePlatformAdminReturnUrl(value: string | null | undefined) {
  const platformAdminOrigin = getPlatformAdminAppOrigin();
  if (!platformAdminOrigin || !value?.trim()) {
    return null;
  }

  try {
    const url = new URL(value);
    if (
      url.origin !== platformAdminOrigin ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !platformAdminSafeReturnPrefixes.some((prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`))
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function buildShellLoginUrlForSafeReturnUrl(returnUrl: string | null) {
  const shellOrigin = getShellAppOrigin();

  if (!shellOrigin || !returnUrl) {
    return null;
  }

  const loginUrl = new URL("/auth/login", shellOrigin);
  loginUrl.searchParams.set("return_to", returnUrl);
  return loginUrl.toString();
}

export function buildShellLoginUrl(returnUrl: string) {
  const safeReturnUrl = getSafeEnterpriseAdminReturnUrl(returnUrl);

  return buildShellLoginUrlForSafeReturnUrl(safeReturnUrl);
}

export function buildShellLoginUrlForPlatform(returnUrl: string) {
  const safeReturnUrl = getSafePlatformAdminReturnUrl(returnUrl);

  return buildShellLoginUrlForSafeReturnUrl(safeReturnUrl);
}

export function buildAuthCallbackPath(returnUrl: string | null | undefined) {
  const safeReturnUrl =
    getSafeEnterpriseAdminReturnUrl(returnUrl) ??
    getSafePlatformAdminReturnUrl(returnUrl) ??
    getSafeShellReturnPath(returnUrl);
  if (!safeReturnUrl) {
    return "/auth/validate";
  }

  const serializedReturnUrl = safeReturnUrl.startsWith("/")
    ? new URL(safeReturnUrl, getShellAppOrigin() ?? "https://invalid.local").toString()
    : safeReturnUrl;

  return `/auth/validate?return_to=${encodeURIComponent(serializedReturnUrl)}`;
}
