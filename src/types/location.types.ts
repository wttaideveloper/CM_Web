export type EnterpriseLocationDto = {
  id: string;
  enterprise_id: string;
  location_name: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  phone?: string;
  email?: string;
  latitude?: number | null;
  longitude?: number | null;
  status?: string;
  created_at?: string;
};

export type CreateEnterpriseLocationPayload = {
  location_name: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  phone?: string;
  email?: string;
  latitude?: number | null;
  longitude?: number | null;
  status?: string;
};

export type UpdateEnterpriseLocationPayload = Partial<CreateEnterpriseLocationPayload>;
