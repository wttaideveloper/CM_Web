const SHELL_ORIGIN_ENV = "NEXT_PUBLIC_SHELL_ORIGIN";
const ENTERPRISE_ADMIN_ORIGIN_ENV = "NEXT_PUBLIC_ENTERPRISE_ADMIN_ORIGIN";
const PLATFORM_ADMIN_ORIGIN_ENV = "NEXT_PUBLIC_PLATFORM_ADMIN_ORIGIN";

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

function getConfiguredOrigin(environmentVariable: string, developmentFallback: string) {
  const configured = normalizeOrigin(process.env[environmentVariable]);
  if (configured) {
    return configured;
  }

  return process.env.NODE_ENV === "production" ? null : developmentFallback;
}

export function getShellAppOrigin() {
  return getConfiguredOrigin(SHELL_ORIGIN_ENV, "http://localhost:3000");
}

export function getEnterpriseAdminAppOrigin() {
  return getConfiguredOrigin(ENTERPRISE_ADMIN_ORIGIN_ENV, "http://localhost:3001");
}

export function getPlatformAdminAppOrigin() {
  return getConfiguredOrigin(PLATFORM_ADMIN_ORIGIN_ENV, "http://localhost:3002");
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
      url.pathname !== "/"
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
    getSafeEnterpriseAdminReturnUrl(returnUrl) ?? getSafePlatformAdminReturnUrl(returnUrl);
  if (!safeReturnUrl) {
    return "/auth/validate";
  }

  return `/auth/validate?return_to=${encodeURIComponent(safeReturnUrl)}`;
}
