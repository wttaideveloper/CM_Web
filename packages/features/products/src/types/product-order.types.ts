export type ProductOrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancellation_requested"
  | "cancelled";

export interface ProductOrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_image?: string;
  sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface ProductOrderShippingAddress {
  recipient_name: string;
  phone: string;
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
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  status: ProductOrderStatus;
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
  cancellation_reason?: string | null;
  cancellation_requested_at?: string | null;
  cancellation_rejection_reason?: string | null;
}