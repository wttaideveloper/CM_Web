export type AvailabilityScheduleItem = {
  day: string;
  is_available: boolean;
  start_time?: string;
  end_time?: string;
  slot_length?: string;
};

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
  max_participants?: number;
  provider_name?: string;
  instructor_name?: string;
  delivery_format?: string;
  package_price?: number;
  currency?: string;
  cancellation_policy?: string;
  availability_schedule?: AvailabilityScheduleItem[];
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
  max_participants?: number;
  provider_name?: string;
  instructor_name?: string;
  delivery_format?: string;
  package_price?: number;
  currency?: string;
  cancellation_policy?: string;
  availability_schedule?: AvailabilityScheduleItem[];
};

export type UpdateServicePayload = Partial<{
  service_name: string;
  service_description: string;
  service_category: string;
  service_price: number;
  duration: number;
  availability_status: boolean;
  service_status: boolean;
  max_participants: number;
  provider_name: string;
  instructor_name: string;
  delivery_format: string;
  package_price: number;
  currency: string;
  cancellation_policy: string;
  availability_schedule: AvailabilityScheduleItem[];
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
