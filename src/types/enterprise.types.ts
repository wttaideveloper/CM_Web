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
  name?: string;
  description?: string;
};

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
  status: "Active" | "Inactive";
};
