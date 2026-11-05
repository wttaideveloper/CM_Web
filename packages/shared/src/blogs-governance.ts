export type BlogModuleKey = "events" | "trainings" | "products" | "services" | "general";

export interface BlogModuleGovernance {
  events: boolean;
  trainings: boolean;
  products: boolean;
  services: boolean;
  general: boolean;
}

export interface BlogGovernanceActor {
  id: string;
  name: string;
}

export interface BlogGovernanceResponse {
  modules: BlogModuleGovernance;
  updated_at: string;
  updated_by: BlogGovernanceActor;
}

export interface BlogGovernanceAuditItem {
  id: string;
  module: BlogModuleKey;
  previous_value: boolean;
  new_value: boolean;
  action: "enabled" | "disabled" | "reset";
  actor_id: string;
  actor_name: string;
  actor_role: string;
  created_at: string;
}

export interface BlogGovernanceAuditResponse {
  items: BlogGovernanceAuditItem[];
  total: number;
}

export const DEFAULT_BLOG_GOVERNANCE: BlogModuleGovernance = {
  events: true,
  trainings: true,
  products: true,
  services: true,
  general: true,
};

export const DEFAULT_BLOG_GOVERNANCE_RESPONSE: BlogGovernanceResponse = {
  modules: DEFAULT_BLOG_GOVERNANCE,
  updated_at: "2026-11-02T10:30:00Z",
  updated_by: {
    id: "usr-super-admin-01",
    name: "Super Admin",
  },
};

export const INITIAL_GOVERNANCE_AUDIT: BlogGovernanceAuditItem[] = [
  {
    id: "gov-audit-init-01",
    module: "general",
    previous_value: false,
    new_value: true,
    action: "enabled",
    actor_id: "usr-super-admin-01",
    actor_name: "Super Admin",
    actor_role: "super_admin",
    created_at: "2026-11-02T10:30:00Z",
  },
  {
    id: "gov-audit-init-02",
    module: "events",
    previous_value: false,
    new_value: true,
    action: "enabled",
    actor_id: "usr-super-admin-01",
    actor_name: "Super Admin",
    actor_role: "super_admin",
    created_at: "2026-11-02T09:15:00Z",
  },
];

const GOVERNANCE_STORAGE_KEY = "ihp.blogs.governance.v1";
const GOVERNANCE_AUDIT_STORAGE_KEY = "ihp.blogs.governance_audit.v1";
const GOVERNANCE_UPDATED_EVENT = "ihp:blogs-governance-updated";

export function getBlogGovernance(): BlogModuleGovernance {
  if (typeof window === "undefined") return DEFAULT_BLOG_GOVERNANCE;
  try {
    const raw = window.localStorage.getItem(GOVERNANCE_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(GOVERNANCE_STORAGE_KEY, JSON.stringify(DEFAULT_BLOG_GOVERNANCE));
      return DEFAULT_BLOG_GOVERNANCE;
    }
    const parsed = JSON.parse(raw);
    const modules = parsed.modules ?? parsed;
    return {
      events: typeof modules.events === "boolean" ? modules.events : true,
      trainings: typeof modules.trainings === "boolean" ? modules.trainings : true,
      products: typeof modules.products === "boolean" ? modules.products : true,
      services: typeof modules.services === "boolean" ? modules.services : true,
      general: typeof modules.general === "boolean" ? modules.general : true,
    };
  } catch {
    return DEFAULT_BLOG_GOVERNANCE;
  }
}

export function getStoredGovernanceResponse(): BlogGovernanceResponse {
  if (typeof window === "undefined") return DEFAULT_BLOG_GOVERNANCE_RESPONSE;
  try {
    const raw = window.localStorage.getItem(GOVERNANCE_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(GOVERNANCE_STORAGE_KEY, JSON.stringify(DEFAULT_BLOG_GOVERNANCE_RESPONSE));
      return DEFAULT_BLOG_GOVERNANCE_RESPONSE;
    }
    const parsed = JSON.parse(raw);
    if (parsed.modules && parsed.updated_at && parsed.updated_by) {
      return parsed as BlogGovernanceResponse;
    }
    return {
      modules: getBlogGovernance(),
      updated_at: new Date().toISOString(),
      updated_by: DEFAULT_BLOG_GOVERNANCE_RESPONSE.updated_by,
    };
  } catch {
    return DEFAULT_BLOG_GOVERNANCE_RESPONSE;
  }
}

export function saveStoredGovernanceResponse(response: BlogGovernanceResponse): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GOVERNANCE_STORAGE_KEY, JSON.stringify(response));
    queueMicrotask(() => window.dispatchEvent(new CustomEvent(GOVERNANCE_UPDATED_EVENT, { detail: response.modules })));
  } catch {
    // ignore
  }
}

export function getStoredGovernanceAudit(): BlogGovernanceAuditItem[] {
  if (typeof window === "undefined") return INITIAL_GOVERNANCE_AUDIT;
  try {
    const raw = window.localStorage.getItem(GOVERNANCE_AUDIT_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(GOVERNANCE_AUDIT_STORAGE_KEY, JSON.stringify(INITIAL_GOVERNANCE_AUDIT));
      return INITIAL_GOVERNANCE_AUDIT;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as BlogGovernanceAuditItem[]) : INITIAL_GOVERNANCE_AUDIT;
  } catch {
    return INITIAL_GOVERNANCE_AUDIT;
  }
}

export function saveStoredGovernanceAudit(items: BlogGovernanceAuditItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GOVERNANCE_AUDIT_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function recordGovernanceAudit(item: Omit<BlogGovernanceAuditItem, "id" | "created_at">): void {
  const current = getStoredGovernanceAudit();
  const newEntry: BlogGovernanceAuditItem = {
    ...item,
    id: `gov-audit-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  current.unshift(newEntry);
  saveStoredGovernanceAudit(current);
}

export function setBlogGovernance(settings: Partial<BlogModuleGovernance>): BlogModuleGovernance {
  const current = getStoredGovernanceResponse();
  const updatedModules: BlogModuleGovernance = { ...current.modules, ...settings };
  const updatedResponse: BlogGovernanceResponse = {
    modules: updatedModules,
    updated_at: new Date().toISOString(),
    updated_by: current.updated_by,
  };
  saveStoredGovernanceResponse(updatedResponse);
  return updatedModules;
}

export function isBlogModuleEnabled(key: BlogModuleKey): boolean {
  return getBlogGovernance()[key] ?? true;
}

export function subscribeToBlogGovernance(listener: (governance: BlogModuleGovernance) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key === GOVERNANCE_STORAGE_KEY) {
      listener(getBlogGovernance());
    }
  };
  const onCustom = () => listener(getBlogGovernance());
  window.addEventListener("storage", onStorage);
  window.addEventListener(GOVERNANCE_UPDATED_EVENT, onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(GOVERNANCE_UPDATED_EVENT, onCustom);
  };
}
