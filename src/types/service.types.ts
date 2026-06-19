export type ServiceDto = {
  id: string;
  enterprise_id: string;
  service_name: string;
  service_description: string;
  service_category: string;
  service_price: number;
  duration: number;
  availability_status: boolean;
  service_status: boolean;
};

export type CreateServicePayload = {
  enterprise_id: string;
  service_name: string;
  service_description: string;
  service_category: string;
  service_price: number;
  duration: number;
  availability_status: boolean;
  service_status: boolean;
};

export type UpdateServicePayload = Partial<{
  service_name: string;
  service_description: string;
  service_category: string;
  service_price: number;
  duration: number;
  availability_status: boolean;
  service_status: boolean;
}>;

export type ServiceListItem = {
  id: string;
  enterpriseId: string;
  name: string;
  description: string;
  category: string;
  price: string;
  duration: string;
  availability: "Available" | "Unavailable";
  status: "Active" | "Inactive";
  enterprise: string;
  bookings: string;
};
