export type AvailabilityScheduleItem = {
  day: string;
  is_available: boolean;
  start_time?: string;
  end_time?: string;
  slot_length?: string;
};

/** Backend-generated availability for one calendar day. */
export type ServiceGeneratedAvailabilityDay = {
  day: string;
  date: string;
  slots: string[];
};

export type ServiceDto = {
  id: string;
  tenant_id?: string | null;
  enterprise_id: string;
  location_id?: string | null;
  service_name: string;
  service_description: string;
  service_category: string;
  service_price: number;
  duration: number;
  availability_status: boolean;
  service_status: boolean;
  max_participants?: number;
  provider_name?: string;
  provider_user_id?: string;
  instructor_name?: string;
  delivery_format?: string;
  package_price?: number;
  currency?: string;
  cancellation_policy?: string;
  availability_schedule?: AvailabilityScheduleItem[];
  availability?: ServiceGeneratedAvailabilityDay[];
  /** Backend list aliases retained for compatibility with the OpenAPI list response. */
  description?: string | null;
  category?: string;
  duration_minutes?: number;
  price?: number;
  status?: ServiceStatus;
  rating?: number | null;
  reviews_count?: number;
  reviews?: ServiceReviewPreview[];
};

export type ServiceStatus = "draft" | "active" | "inactive";

export type ServiceListQuery = {
  search?: string;
  tenant_id?: string;
  enterprise_id?: string;
  category?: string;
  location_id?: string;
  status?: ServiceStatus;
  page?: number;
  page_size?: number;
};

export type ServicePaginationMeta = {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export type PaginatedServiceList = {
  items: ServiceDto[];
  pagination: ServicePaginationMeta;
};

/** Approved review preview included with Service detail responses. */
export interface ServiceReviewPreview {
  id: string;
  rating: number;
  comment: string | null;
  reviewer_name: string | null;
  created_at: string | null;
}

export type CreateServicePayload = {
  tenant_id?: string;
  enterprise_id: string;
  location_id?: string;
  service_name: string;
  service_description: string;
  service_category: string;
  service_price: number;
  duration: number;
  availability_status: boolean;
  service_status: boolean;
  max_participants?: number;
  provider_name?: string;
  provider_user_id?: string;
  instructor_name?: string;
  delivery_format?: string;
  package_price?: number;
  currency?: string;
  cancellation_policy?: string;
  availability_schedule?: AvailabilityScheduleItem[];
};

export type UpdateServicePayload = Partial<{
  enterprise_id: string;
  location_id: string;
  service_name: string;
  service_description: string;
  service_category: string;
  service_price: number;
  duration: number;
  availability_status: boolean;
  service_status: boolean;
  max_participants: number;
  provider_name: string;
  provider_user_id: string;
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
  status: "Active" | "Inactive" | "Draft";
  enterprise: string;
  bookings: string;
  rating?: number | null;
  reviewsCount?: number;
};
