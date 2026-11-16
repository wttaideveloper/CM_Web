export type ProductOrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "completed"
  | "cancellation_requested"
  | "cancelled"
  | "refund_requested"
  | "refunded";

export type ProductRefundStatus = "requested" | "approved" | "rejected" | "completed";

export interface ProductOrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_image?: string | null;
  sku?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface ProductOrderShippingAddress {
  recipient_name: string;
  phone?: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface ProductOrder {
  id: string;
  order_number: string;
  enterprise_id: string;
  enterprise_name?: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  status: ProductOrderStatus;
  refund_status?: ProductRefundStatus | null;
  refund_amount?: string | number | null;
  refund_reason?: string | null;
  cancellation_reason?: string | null;
  cancellation_requested_at?: string | null;
  cancellation_rejection_reason?: string | null;
  items: ProductOrderItem[];
  subtotal: number;
  shipping_fee: number;
  tax: number;
  total_amount: number;
  currency: string;
  created_at: string;
  shipping_address: ProductOrderShippingAddress;
  shipping_carrier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
}

export interface ListOrdersResponse {
  items: ProductOrder[];
  total: number;
  page?: number;
  page_size?: number;
}
