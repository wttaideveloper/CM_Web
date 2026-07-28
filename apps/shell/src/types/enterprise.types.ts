export type EnterpriseStatus = "draft" | "active" | "inactive";

export type EnterpriseDto = {
  id: string;
  tenant_id?: string;
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
  status: EnterpriseStatus;
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

export type EnterpriseStatusLabel = "Active" | "Inactive" | "Draft";

const enterpriseStatusLabels: Record<EnterpriseStatus, EnterpriseStatusLabel> = {
  draft: "Draft",
  active: "Active",
  inactive: "Inactive",
};

export function normalizeEnterpriseStatus(status: EnterpriseStatus): EnterpriseStatusLabel {
  return enterpriseStatusLabels[status];
}

export type CreateEnterprisePayload = {
  tenant_id: string;
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
  status: EnterpriseStatus;
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
  status: EnterpriseStatus;
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
