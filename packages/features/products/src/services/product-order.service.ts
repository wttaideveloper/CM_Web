import type { ProductOrder, ProductOrderStatus } from "../types/product-order.types";

const SEED_ORDERS: ProductOrder[] = [
  {
    id: "po-001",
    order_number: "ORD-1001",
    enterprise_id: "ent-1",
    customer_name: "Priya Sharma",
    customer_email: "priya@example.com",
    customer_phone: "+91 98765 43210",
    status: "pending",
    items: [
      { id: "poi-1", product_id: "p1", product_name: "Herbal Tea Blend", product_image: "", sku: "HTB-001", quantity: 2, unit_price: 250, total_price: 500 },
      { id: "poi-2", product_id: "p2", product_name: "Vitamin C Capsules", product_image: "", sku: "VCC-002", quantity: 1, unit_price: 450, total_price: 450 },
    ],
    subtotal: 950,
    shipping_fee: 50,
    tax: 47.5,
    total_amount: 1047.5,
    currency: "INR",
    created_at: "2026-11-10T09:30:00.000Z",
    shipping_address: { recipient_name: "Priya Sharma", phone: "+91 98765 43210", street: "12 Green Lane", city: "Mumbai", state: "Maharashtra", postal_code: "400001", country: "India" },
  },
  {
    id: "po-002",
    order_number: "ORD-1002",
    enterprise_id: "ent-1",
    customer_name: "Rahul Verma",
    customer_email: "rahul@example.com",
    customer_phone: "+91 99887 76655",
    status: "confirmed",
    items: [
      { id: "poi-3", product_id: "p3", product_name: "Yoga Mat Pro", product_image: "", sku: "YMP-003", quantity: 1, unit_price: 1200, total_price: 1200 },
    ],
    subtotal: 1200,
    shipping_fee: 80,
    tax: 60,
    total_amount: 1340,
    currency: "INR",
    created_at: "2026-11-09T14:15:00.000Z",
    shipping_address: { recipient_name: "Rahul Verma", phone: "+91 99887 76655", street: "45 Lotus Apt", city: "Delhi", state: "Delhi", postal_code: "110001", country: "India" },
  },
  {
    id: "po-003",
    order_number: "ORD-1003",
    enterprise_id: "ent-1",
    customer_name: "Anita Desai",
    customer_email: "anita@example.com",
    customer_phone: "+91 91234 56789",
    status: "shipped",
    items: [
      { id: "poi-4", product_id: "p4", product_name: "Ayurvedic Oil 200ml", product_image: "", sku: "AO-004", quantity: 3, unit_price: 320, total_price: 960 },
    ],
    subtotal: 960,
    shipping_fee: 40,
    tax: 50,
    total_amount: 1050,
    currency: "INR",
    created_at: "2026-11-08T11:00:00.000Z",
    shipping_address: { recipient_name: "Anita Desai", phone: "+91 91234 56789", street: "8 Rose Villa", city: "Pune", state: "Maharashtra", postal_code: "411001", country: "India" },
    shipping_carrier: "BlueDart",
    tracking_number: "BD123456789",
  },
  {
    id: "po-004",
    order_number: "ORD-1004",
    enterprise_id: "ent-1",
    customer_name: "Vikram Singh",
    customer_email: "vikram@example.com",
    customer_phone: "+91 98123 45678",
    status: "delivered",
    items: [
      { id: "poi-5", product_id: "p5", product_name: "Digital Thermometer", product_image: "", sku: "DT-005", quantity: 1, unit_price: 600, total_price: 600 },
    ],
    subtotal: 600,
    shipping_fee: 30,
    tax: 30,
    total_amount: 660,
    currency: "INR",
    created_at: "2026-11-05T08:45:00.000Z",
    shipping_address: { recipient_name: "Vikram Singh", phone: "+91 98123 45678", street: "22 Lake View", city: "Bangalore", state: "Karnataka", postal_code: "560001", country: "India" },
    shipping_carrier: "Delhivery",
    tracking_number: "DL987654321",
  },
  {
    id: "po-005",
    order_number: "ORD-1005",
    enterprise_id: "ent-1",
    customer_name: "Meera Iyer",
    customer_email: "meera@example.com",
    customer_phone: "+91 98456 12345",
    status: "cancellation_requested",
    items: [
      { id: "poi-6", product_id: "p6", product_name: "Resistance Bands Set", product_image: "", sku: "RBS-006", quantity: 1, unit_price: 850, total_price: 850 },
    ],
    subtotal: 850,
    shipping_fee: 40,
    tax: 42.5,
    total_amount: 932.5,
    currency: "INR",
    created_at: "2026-11-07T10:20:00.000Z",
    shipping_address: { recipient_name: "Meera Iyer", phone: "+91 98456 12345", street: "3 Palm Grove", city: "Chennai", state: "Tamil Nadu", postal_code: "600001", country: "India" },
    cancellation_reason: "Ordered by mistake, need refund.",
    cancellation_requested_at: "2026-11-08T09:00:00.000Z",
  },
  {
    id: "po-006",
    order_number: "ORD-1006",
    enterprise_id: "ent-1",
    customer_name: "Suresh Kumar",
    customer_email: "suresh@example.com",
    customer_phone: "+91 90123 45678",
    status: "cancelled",
    items: [
      { id: "poi-7", product_id: "p7", product_name: "Protein Powder 1kg", product_image: "", sku: "PP-007", quantity: 2, unit_price: 1500, total_price: 3000 },
    ],
    subtotal: 3000,
    shipping_fee: 60,
    tax: 150,
    total_amount: 3210,
    currency: "INR",
    created_at: "2026-11-04T07:30:00.000Z",
    shipping_address: { recipient_name: "Suresh Kumar", phone: "+91 90123 45678", street: "10 River Side", city: "Hyderabad", state: "Telangana", postal_code: "500001", country: "India" },
    cancellation_reason: "Delivery delayed too long.",
    cancellation_requested_at: "2026-11-05T08:00:00.000Z",
  },
];

let orders: ProductOrder[] = JSON.parse(JSON.stringify(SEED_ORDERS));

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function listProductOrders(status?: ProductOrderStatus | "all"): Promise<ProductOrder[]> {
  return delay(200).then(() => {
    if (!status || status === "all") return [...orders];
    return orders.filter((o) => o.status === status);
  });
}

export function getProductOrder(id: string): Promise<ProductOrder | undefined> {
  return delay(100).then(() => orders.find((o) => o.id === id));
}

export function confirmProductOrder(id: string): Promise<ProductOrder> {
  return delay(200).then(() => {
    const order = orders.find((o) => o.id === id);
    if (!order) throw new Error("Order not found");
    if (order.status !== "pending") throw new Error("Only pending orders can be confirmed");
    order.status = "confirmed";
    return { ...order };
  });
}

export function shipProductOrder(id: string, carrier: string, trackingNumber: string): Promise<ProductOrder> {
  return delay(200).then(() => {
    const order = orders.find((o) => o.id === id);
    if (!order) throw new Error("Order not found");
    if (order.status !== "confirmed") throw new Error("Only confirmed orders can be shipped");
    if (!carrier.trim() || !trackingNumber.trim()) throw new Error("Carrier and tracking number are required");
    order.status = "shipped";
    order.shipping_carrier = carrier.trim();
    order.tracking_number = trackingNumber.trim();
    return { ...order };
  });
}

export function deliverProductOrder(id: string): Promise<ProductOrder> {
  return delay(200).then(() => {
    const order = orders.find((o) => o.id === id);
    if (!order) throw new Error("Order not found");
    if (order.status !== "shipped") throw new Error("Only shipped orders can be delivered");
    order.status = "delivered";
    return { ...order };
  });
}

export function approveProductOrderCancellation(id: string): Promise<ProductOrder> {
  return delay(200).then(() => {
    const order = orders.find((o) => o.id === id);
    if (!order) throw new Error("Order not found");
    if (order.status !== "cancellation_requested") throw new Error("Only cancellation-requested orders can be approved");
    order.status = "cancelled";
    return { ...order };
  });
}

export function rejectProductOrderCancellation(id: string, reason: string): Promise<ProductOrder> {
  return delay(200).then(() => {
    const order = orders.find((o) => o.id === id);
    if (!order) throw new Error("Order not found");
    if (order.status !== "cancellation_requested") throw new Error("Only cancellation-requested orders can be rejected");
    if (!reason.trim()) throw new Error("Rejection reason is required");
    order.status = "confirmed";
    order.cancellation_rejection_reason = reason.trim();
    return { ...order };
  });
}

export function resetProductOrders(): void {
  orders = JSON.parse(JSON.stringify(SEED_ORDERS));
}