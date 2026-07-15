export type EnterpriseDto = {
  id: string;
  business_short_name: string;
  business_legal_name: string;
  business_description: string;
  business_email: string;
  business_phone: string;
  registered_address: string;
  business_address: string;
  communication_address: string;
  logo_url: string;
  business_images: string;
  status: boolean;
  registration_number?: string;
  business_category?: string;
  website_url?: string;
  year_founded?: string;
  primary_contact_name?: string;
  primary_contact_title?: string;
  secondary_email?: string;
  secondary_phone?: string;
  suite_unit?: string;
  brand_color?: string;
  tagline?: string;
  created_at?: string;
  name?: string;
  description?: string;
};

export type EnterpriseStatusLabel = "Active" | "Inactive" | "Draft" | "Pending";

export function normalizeEnterpriseStatus(status: unknown): EnterpriseStatusLabel {
  if (status === true) {
    return "Active";
  }

  if (status === false) {
    return "Inactive";
  }

  if (typeof status !== "string") {
    return "Inactive";
  }

  const normalized = status.trim().toLowerCase();

  if (normalized === "active") {
    return "Active";
  }

  if (normalized === "inactive" || normalized === "deactivated") {
    return "Inactive";
  }

  if (normalized === "draft") {
    return "Draft";
  }

  if (normalized === "pending") {
    return "Pending";
  }

  return normalized.length > 0 ? (normalized.charAt(0).toUpperCase() + normalized.slice(1)) as EnterpriseStatusLabel : "Inactive";
}

export function normalizeEnterpriseStatusFlag(status: unknown): boolean {
  return normalizeEnterpriseStatus(status) === "Active";
}

export type CreateEnterprisePayload = {
  business_short_name: string;
  business_legal_name: string;
  business_description: string;
  business_email: string;
  business_phone: string;
  registered_address: string;
  business_address: string;
  communication_address: string;
  logo_url: string;
  business_images: string;
  registration_number?: string;
  business_category?: string;
  website_url?: string;
  year_founded?: number | string;
  primary_contact_name?: string;
  primary_contact_title?: string;
  secondary_email?: string;
  secondary_phone?: string;
  suite_unit?: string;
  brand_color?: string;
  tagline?: string;
  status: "draft" | "active";
};

export type UpdateEnterprisePayload = Partial<{
  business_short_name: string;
  business_legal_name: string;
  business_description: string;
  business_email: string;
  business_phone: string;
  registered_address: string;
  business_address: string;
  communication_address: string;
  logo_url: string;
  business_images: string;
  registration_number: string;
  business_category: string;
  website_url: string;
  year_founded: string;
  primary_contact_name: string;
  primary_contact_title: string;
  secondary_email: string;
  secondary_phone: string;
  suite_unit: string;
  brand_color: string;
  tagline: string;
  status: boolean;
}>;

export type EnterpriseListItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  location: string;
  members: string;
  revenue: string;
  joined: string;
  status: EnterpriseStatusLabel;
};
