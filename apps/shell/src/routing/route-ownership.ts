export const ROUTE_PATHS = {
  public: {
    home: "/",
    auth: {
      login: "/auth/login",
      register: "/auth/register",
      validate: "/auth/validate",
    },
    internal: {
      demoAuthLogin: "/internal/demo-auth/login",
    },
  },
  platform: {
    dashboard: "/dashboard",
    approvalQueue: "/approval-queue",
    onboardingForms: "/onboarding-forms",
    enterpriseTypes: "/enterprise-types",
    categories: "/categories",
    subAdmins: "/sub-admins",
    attributes: "/attributes",
    enterprises: "/enterprises",
    products: "/products",
    services: "/services",
    events: "/events",
    trainings: "/trainings",
    integrations: "/integrations",
  },
  enterprise: {
    dashboard: "/admin/dashboard",
    enterprise: "/admin/enterprise",
    enterpriseEdit: "/admin/enterprise/edit",
    analytics: "/admin/analytics",
    products: "/admin/products",
    services: "/admin/services",
    events: "/admin/events",
    trainings: "/admin/trainings",
    settings: "/admin/settings",
    profile: "/admin/profile",
    messages: "/admin/messages",
    notifications: "/admin/notifications",
  },
  realtime: {
    notifications: "/notifications",
  },
} as const;

export type RouteArea = "public" | "platform" | "enterprise" | "realtime" | "unknown";
export type GatewayRouteOwner = "shell" | "platform-admin" | "enterprise-admin";

const platformRouteRoots = [
  ROUTE_PATHS.platform.dashboard,
  ROUTE_PATHS.platform.approvalQueue,
  ROUTE_PATHS.platform.onboardingForms,
  ROUTE_PATHS.platform.enterpriseTypes,
  ROUTE_PATHS.platform.categories,
  ROUTE_PATHS.platform.subAdmins,
  ROUTE_PATHS.platform.attributes,
  ROUTE_PATHS.platform.enterprises,
  ROUTE_PATHS.platform.products,
  ROUTE_PATHS.platform.services,
  ROUTE_PATHS.platform.events,
  ROUTE_PATHS.platform.trainings,
  ROUTE_PATHS.platform.integrations,
] as const;

const realtimeCompatibilityPaths = [
  ROUTE_PATHS.enterprise.messages,
  ROUTE_PATHS.enterprise.notifications,
  ROUTE_PATHS.realtime.notifications,
] as const;

function isRouteOrDescendant(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function isPublicAuthRoute(pathname: string) {
  return (
    pathname === ROUTE_PATHS.public.home ||
    isRouteOrDescendant(pathname, "/auth") ||
    isRouteOrDescendant(pathname, "/internal")
  );
}

export function isRegistrationRoute(pathname: string) {
  return pathname === ROUTE_PATHS.public.auth.register;
}

export function isEnterpriseRoute(pathname: string) {
  return isRouteOrDescendant(pathname, "/admin");
}

export function isPlatformRoute(pathname: string) {
  return platformRouteRoots.some((route) => isRouteOrDescendant(pathname, route));
}

export function isRealtimeCompatibilityRoute(pathname: string) {
  return realtimeCompatibilityPaths.includes(pathname as (typeof realtimeCompatibilityPaths)[number]);
}

export function getRouteArea(pathname: string): RouteArea {
  if (isRealtimeCompatibilityRoute(pathname)) {
    return "realtime";
  }

  if (isPublicAuthRoute(pathname)) {
    return "public";
  }

  if (isEnterpriseRoute(pathname)) {
    return "enterprise";
  }

  if (isPlatformRoute(pathname)) {
    return "platform";
  }

  return "unknown";
}

export function getGatewayRouteOwner(pathname: string): GatewayRouteOwner {
  switch (getRouteArea(pathname)) {
    case "platform":
      return "platform-admin";
    case "enterprise":
      return "enterprise-admin";
    case "public":
    case "realtime":
    case "unknown":
      return "shell";
  }
}
