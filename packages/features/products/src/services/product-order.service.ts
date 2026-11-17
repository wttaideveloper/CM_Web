import type { ListOrdersResponse, ProductOrder, ProductOrderStatus } from "../types/product-order.types";

/** Fetches orders from the backend API. No mock data. */
export async function listProductOrders(params: {
  enterpriseId?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<ListOrdersResponse> {
  const query = new URLSearchParams();
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("page_size", String(params.pageSize));

  const url = params.enterpriseId
    ? `/api/v1/enterprises/${encodeURIComponent(params.enterpriseId)}/orders?${query.toString()}`
    : `/api/v1/admin/orders?${query.toString()}`;

  const res = await fetch(url, { method: "GET", credentials: "include", cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load orders (${res.status} ${res.statusText}).`);
  }
  const data = await res.json();
  if (Array.isArray(data)) return { items: data, total: data.length };
  return { items: Array.isArray(data.items) ? data.items : [], total: data.total ?? 0 };
}

/** Fetches single order details */
export async function getProductOrder(orderId: string): Promise<ProductOrder> {
  const res = await fetch(`/api/v1/admin/orders/${encodeURIComponent(orderId)}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to fetch order details (${res.status}).`);
  return res.json();
}

/** Updates order status (Confirm, Ship, Deliver) */
export async function updateOrderStatus(orderId: string, payload: {
  status: ProductOrderStatus;
  carrier?: string;
  tracking_number?: string;
  tracking_url?: string;
  reason?: string;
}): Promise<ProductOrder> {
  const res = await fetch(`/api/v1/admin/orders/${encodeURIComponent(orderId)}/status`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update order status (${res.status}).`);
  return res.json();
}

/** Approves a customer cancellation request */
export async function approveOrderCancellation(orderId: string): Promise<ProductOrder> {
  const res = await fetch(`/api/v1/admin/orders/${encodeURIComponent(orderId)}/cancellation/approve`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Failed to approve cancellation (${res.status}).`);
  return res.json();
}

/** Rejects a customer cancellation request */
export async function rejectOrderCancellation(orderId: string, reason: string): Promise<ProductOrder> {
  const res = await fetch(`/api/v1/admin/orders/${encodeURIComponent(orderId)}/cancellation/reject`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error(`Failed to reject cancellation (${res.status}).`);
  return res.json();
}

/** Approves a customer refund request */
export async function approveOrderRefund(orderId: string): Promise<ProductOrder> {
  const res = await fetch(`/api/v1/cart/orders/${encodeURIComponent(orderId)}/refund/approve`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "approve" }),
  });
  if (!res.ok) throw new Error(`Failed to approve refund (${res.status}).`);
  return res.json();
}

/** Rejects a customer refund request */
export async function rejectOrderRefund(orderId: string, reason: string): Promise<ProductOrder> {
  const res = await fetch(`/api/v1/cart/orders/${encodeURIComponent(orderId)}/refund/approve`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "reject", reason }),
  });
  if (!res.ok) throw new Error(`Failed to reject refund (${res.status}).`);
  return res.json();
}
