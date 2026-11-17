"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  listProductOrders,
  getProductOrder,
  updateOrderStatus,
  approveOrderCancellation,
  rejectOrderCancellation,
  approveOrderRefund,
  rejectOrderRefund,
} from "../services/product-order.service";
import type { ProductOrder, ProductOrderItem, ProductOrderStatus } from "../types/product-order.types";

export interface ProductOrdersScreenProps {
  enterpriseId?: string;
  readOnly?: boolean;
}

const STATUSES: { key: ProductOrderStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
  { key: "cancellation_requested", label: "Cancellation Requests" },
  { key: "refund_requested", label: "Refund Requests" },
  { key: "cancelled", label: "Cancelled" },
];

const CARRIERS = ["FedEx", "DHL", "BlueDart", "UPS", "Other"];

function statusBadge(status: ProductOrderStatus) {
  const map: Record<ProductOrderStatus, string> = {
    pending: "bg-[#fff8e6] text-[#8a6d1b] border-[#f3e0a6]",
    confirmed: "bg-[#e8f6ee] text-[#1f6a58] border-[#a3d7c3]",
    shipped: "bg-[#eff8f3] text-[#175245] border-[#b6dfce]",
    delivered: "bg-[#eef6f2] text-[#16825b] border-[#c9e8d6]",
    completed: "bg-[#e8f6ee] text-[#1f6a58] border-[#a3d7c3]",
    cancellation_requested: "bg-[#fff1f0] text-[#b42318] border-[#f3d0cb]",
    cancelled: "bg-[#f1f4f3] text-[#6b7f79] border-[#d7e5df]",
    refund_requested: "bg-[#fff8e6] text-[#8a6d1b] border-[#f3e0a6]",
    refunded: "bg-[#f1f4f3] text-[#6b7f79] border-[#d7e5df]",
  };
  return map[status];
}

function formatMoney(amount: number, currency: string) {
  return `${currency} ${Number(amount).toFixed(2)}`;
}

function ProductOrdersScreenContent({ enterpriseId, readOnly }: ProductOrdersScreenProps) {
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get("order_id");

  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProductOrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ProductOrder | null>(null);
  const [shipModal, setShipModal] = useState<ProductOrder | null>(null);
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [rejectCancelModal, setRejectCancelModal] = useState<ProductOrder | null>(null);
  const [rejectRefundModal, setRejectRefundModal] = useState<ProductOrder | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listProductOrders({
        enterpriseId,
        status: statusFilter,
        search,
        page: 1,
        pageSize: 50,
      });
      setOrders(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enterpriseId, statusFilter, search]);

  useEffect(() => {
    if (!orderIdParam) return;
    let active = true;
    getProductOrder(orderIdParam)
      .then((order) => {
        if (active) setSelected(order);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "Unable to fetch order details.");
      });
    return () => {
      active = false;
    };
  }, [orderIdParam]);

  const counts = STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s.key] = s.key === "all" ? orders.length : orders.filter((o) => o.status === s.key).length;
    return acc;
  }, {});

  const handleConfirm = async (id: string) => {
    setBusy(true);
    try {
      const updated = await updateOrderStatus(id, { status: "confirmed" });
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      if (selected?.id === id) setSelected(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to confirm order.");
    } finally {
      setBusy(false);
    }
  };

  const handleShipSubmit = async () => {
    if (!shipModal) return;
    if (!carrier.trim() || !tracking.trim()) return;
    setBusy(true);
    try {
      const updated = await updateOrderStatus(shipModal.id, {
        status: "shipped",
        carrier: carrier.trim(),
        tracking_number: tracking.trim(),
        tracking_url: trackingUrl.trim() || undefined,
      });
      setOrders((prev) => prev.map((o) => (o.id === shipModal.id ? updated : o)));
      if (selected?.id === shipModal.id) setSelected(updated);
      setShipModal(null);
      setCarrier("");
      setTracking("");
      setTrackingUrl("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to ship order.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeliver = async (id: string) => {
    setBusy(true);
    try {
      const updated = await updateOrderStatus(id, { status: "delivered" });
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      if (selected?.id === id) setSelected(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to mark delivered.");
    } finally {
      setBusy(false);
    }
  };

  const handleApproveCancel = async (id: string) => {
    setBusy(true);
    try {
      const updated = await approveOrderCancellation(id);
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      if (selected?.id === id) setSelected(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to approve cancellation.");
    } finally {
      setBusy(false);
    }
  };

  const handleRejectCancel = async () => {
    if (!rejectCancelModal) return;
    if (!rejectReason.trim()) return;
    setBusy(true);
    try {
      const updated = await rejectOrderCancellation(rejectCancelModal.id, rejectReason.trim());
      setOrders((prev) => prev.map((o) => (o.id === rejectCancelModal.id ? updated : o)));
      if (selected?.id === rejectCancelModal.id) setSelected(updated);
      setRejectCancelModal(null);
      setRejectReason("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to reject cancellation.");
    } finally {
      setBusy(false);
    }
  };

  const handleApproveRefund = async (id: string) => {
    setBusy(true);
    try {
      const updated = await approveOrderRefund(id);
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      if (selected?.id === id) setSelected(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to approve refund.");
    } finally {
      setBusy(false);
    }
  };

  const handleRejectRefund = async () => {
    if (!rejectRefundModal) return;
    if (!rejectReason.trim()) return;
    setBusy(true);
    try {
      const updated = await rejectOrderRefund(rejectRefundModal.id, rejectReason.trim());
      setOrders((prev) => prev.map((o) => (o.id === rejectRefundModal.id ? updated : o)));
      if (selected?.id === rejectRefundModal.id) setSelected(updated);
      setRejectRefundModal(null);
      setRejectReason("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to reject refund.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] p-5 text-[#06201c] sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7f9d94]">Commerce</p>
            <h1 className="mt-1 text-3xl font-bold">Product Orders</h1>
            <p className="mt-2 text-sm text-[#52736a]">Review and fulfill customer product orders.</p>
          </div>
        </header>

        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p>{error}</p>
            <button type="button" onClick={() => void load()} className="mt-2 rounded-full border border-red-300 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100">Retry</button>
          </div>
        )}

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Order status">
          {STATUSES.map((s) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={statusFilter === s.key}
              onClick={() => setStatusFilter(s.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === s.key ? "bg-[#e8f6ee] text-[#175245] font-semibold" : "border border-[#d7e5df] text-[#52736a] hover:bg-[#f8fafc]"
              }`}
            >
              <span>{s.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${statusFilter === s.key ? "bg-[#1f6a58] text-white" : "bg-[#edf3f0] text-[#52736a]"}`}>
                {counts[s.key]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order number, customer name or email..."
            aria-label="Search orders"
            className="w-full rounded-xl border border-[#d7e5df] bg-white px-4 py-2.5 text-sm text-[#06201c] placeholder-[#7f9d94] outline-none transition-colors focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/20"
          />
        </div>

        <section className="rounded-2xl border border-[#e1ebe6] bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div role="status" className="grid gap-3 p-5">
              {[1, 2, 3].map((r) => <div key={r} className="h-16 animate-pulse rounded-xl bg-[#f1f6f3]" />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <h2 className="text-lg font-semibold">No orders found.</h2>
              <p className="mt-2 text-sm text-[#52736a]">Customer orders will appear here once placed.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#f4faf7] text-xs uppercase tracking-wider text-[#52736a]">
                  <tr>
                    <th className="px-4 py-3 text-left">Order</th>
                    {readOnly && <th className="px-4 py-3 text-left">Enterprise</th>}
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-left">Items</th>
                    <th className="px-4 py-3 text-left">Total</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf3f0]">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-[#f8fafc]">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#06201c]">{order.order_number}</div>
                        <div className="text-xs text-[#7f9d94]">{new Date(order.created_at).toLocaleDateString()}</div>
                      </td>
                      {readOnly && (
                        <td className="px-4 py-3 text-[#52736a]">{order.enterprise_name ?? order.enterprise_id}</td>
                      )}
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#06201c]">{order.customer_name}</div>
                        <div className="text-xs text-[#52736a]">{order.customer_email}</div>
                      </td>
                      <td className="px-4 py-3 text-[#52736a]">{order.items.length} item(s)</td>
                      <td className="px-4 py-3 font-semibold text-[#06201c]">{formatMoney(order.total_amount, order.currency)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusBadge(order.status)}`}>
                          {order.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => setSelected(order)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#175245] hover:bg-[#f4faf7]">View</button>
                          {!readOnly && order.status === "pending" && (
                            <button type="button" disabled={busy} onClick={() => handleConfirm(order.id)} className="rounded-full bg-[#1f6a58] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#165244] disabled:opacity-50">Confirm</button>
                          )}
                          {!readOnly && order.status === "confirmed" && (
                            <button type="button" disabled={busy} onClick={() => { setShipModal(order); setCarrier(""); setTracking(""); setTrackingUrl(""); }} className="rounded-full bg-[#1f6a58] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#165244] disabled:opacity-50">Ship</button>
                          )}
                          {!readOnly && order.status === "shipped" && (
                            <button type="button" disabled={busy} onClick={() => handleDeliver(order.id)} className="rounded-full bg-[#1f6a58] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#165244] disabled:opacity-50">Deliver</button>
                          )}
                          {!readOnly && order.status === "cancellation_requested" && (
                            <>
                              <button type="button" disabled={busy} onClick={() => handleApproveCancel(order.id)} className="rounded-full bg-[#1f6a58] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#165244] disabled:opacity-50">Approve Cancel</button>
                              <button type="button" disabled={busy} onClick={() => { setRejectCancelModal(order); setRejectReason(""); }} className="rounded-full border border-[#f3d0cb] bg-[#fff1f0] px-3 py-1.5 text-xs font-semibold text-[#b42318] hover:bg-[#fde8e6] disabled:opacity-50">Reject</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Order detail modal */}
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06201c]/40 p-4" role="dialog" aria-modal="true" onClick={() => setSelected(null)}>
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-[#06201c]">{selected.order_number}</h2>
                  <p className="text-xs text-[#52736a]">{selected.customer_name} · {selected.customer_email}</p>
                </div>
                <button type="button" onClick={() => setSelected(null)} className="rounded-lg px-3 py-2 text-[#52736a] hover:bg-[#f4faf7]">Close</button>
              </div>
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-[#e1ebe6] bg-[#f8fafc] p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#7f9d94]">Shipping Address</p>
                  <p className="mt-1 text-sm text-[#06201c]">{selected.shipping_address.recipient_name}</p>
                  <p className="text-xs text-[#52736a]">{selected.shipping_address.street}, {selected.shipping_address.city}, {selected.shipping_address.state} {selected.shipping_address.postal_code}, {selected.shipping_address.country}</p>
                  {selected.shipping_address.phone && <p className="text-xs text-[#52736a]">Phone: {selected.shipping_address.phone}</p>}
                </div>

                {selected.status === "cancellation_requested" && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#b42318]">Cancellation Requested</p>
                    <p className="mt-1 text-sm text-[#b42318]">{selected.cancellation_reason}</p>
                    {selected.cancellation_requested_at && (
                      <p className="mt-1 text-xs text-[#52736a]">Requested at {new Date(selected.cancellation_requested_at).toLocaleString()}</p>
                    )}
                    {!readOnly && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" disabled={busy} onClick={() => handleApproveCancel(selected.id)} className="rounded-full bg-[#1f6a58] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#165244] disabled:opacity-50">Approve Cancellation</button>
                        <button type="button" disabled={busy} onClick={() => { setRejectCancelModal(selected); setRejectReason(""); }} className="rounded-full border border-[#f3d0cb] bg-[#fff1f0] px-3 py-1.5 text-xs font-semibold text-[#b42318] hover:bg-[#fde8e6] disabled:opacity-50">Reject Cancellation</button>
                      </div>
                    )}
                  </div>
                )}

                {selected.refund_status === "requested" && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#8a6d1b]">Refund Requested</p>
                    {selected.refund_amount != null && (
                      <p className="mt-1 text-sm text-[#8a6d1b]">Amount: {selected.refund_amount}</p>
                    )}
                    {selected.refund_reason && (
                      <p className="mt-1 text-sm text-[#8a6d1b]">Reason: {selected.refund_reason}</p>
                    )}
                    {!readOnly && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" disabled={busy} onClick={() => handleApproveRefund(selected.id)} className="rounded-full bg-[#1f6a58] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#165244] disabled:opacity-50">Approve Refund</button>
                        <button type="button" disabled={busy} onClick={() => { setRejectRefundModal(selected); setRejectReason(""); }} className="rounded-full border border-[#f3d0cb] bg-[#fff1f0] px-3 py-1.5 text-xs font-semibold text-[#b42318] hover:bg-[#fde8e6] disabled:opacity-50">Reject Refund</button>
                      </div>
                    )}
                  </div>
                )}

                {selected.cancellation_reason && selected.status !== "cancellation_requested" && (
                  <div className="rounded-xl border border-[#f3d0cb] bg-[#fff1f0] p-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#b42318]">Cancellation Reason</p>
                    <p className="mt-1 text-sm text-[#b42318]">{selected.cancellation_reason}</p>
                    {selected.cancellation_rejection_reason && <p className="mt-2 text-xs text-[#52736a]">Rejection: {selected.cancellation_rejection_reason}</p>}
                  </div>
                )}

                {selected.shipping_carrier && (
                  <div className="rounded-xl border border-[#e1ebe6] bg-[#f8fafc] p-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#7f9d94]">Shipping</p>
                    <p className="mt-1 text-sm text-[#06201c]">{selected.shipping_carrier} · {selected.tracking_number}</p>
                    {selected.tracking_url && (
                      <a href={selected.tracking_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-[#1f6a58] underline">Track</a>
                    )}
                  </div>
                )}

                <div className="rounded-xl border border-[#e1ebe6] bg-white p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#7f9d94] mb-2">Items</p>
                  <ul className="space-y-2">
                    {selected.items.map((item: ProductOrderItem) => (
                      <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                        <div>
                          <p className="font-medium text-[#06201c]">{item.product_name}</p>
                          <p className="text-xs text-[#52736a]">SKU: {item.sku ?? "—"} · Qty: {item.quantity}</p>
                        </div>
                        <span className="font-semibold text-[#06201c]">{formatMoney(item.total_price, selected.currency)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 border-t border-[#edf3f0] pt-3 space-y-1 text-xs text-[#52736a]">
                    <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(selected.subtotal, selected.currency)}</span></div>
                    <div className="flex justify-between"><span>Shipping</span><span>{formatMoney(selected.shipping_fee, selected.currency)}</span></div>
                    <div className="flex justify-between"><span>Tax</span><span>{formatMoney(selected.tax, selected.currency)}</span></div>
                    <div className="flex justify-between font-bold text-[#06201c] text-sm"><span>Total</span><span>{formatMoney(selected.total_amount, selected.currency)}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ship modal */}
        {shipModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06201c]/40 p-4" role="dialog" aria-modal="true" onClick={() => setShipModal(null)}>
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-bold text-[#06201c]">Ship Order {shipModal.order_number}</h2>
              <p className="mt-1 text-xs text-[#52736a]">Enter carrier and tracking number to mark as shipped.</p>
              <div className="mt-4 space-y-3">
                <label className="block text-sm font-medium text-[#06201c]">
                  Carrier
                  <select value={carrier} onChange={(e) => setCarrier(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#d7e5df] bg-white px-3 py-2.5 text-sm focus:border-[#1f6a58] focus:outline-none">
                    <option value="">Select carrier</option>
                    {CARRIERS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-medium text-[#06201c]">
                  Tracking Number
                  <input value={tracking} onChange={(e) => setTracking(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#d7e5df] bg-white px-3 py-2.5 text-sm focus:border-[#1f6a58] focus:outline-none" placeholder="e.g. BD123456789" />
                </label>
                <label className="block text-sm font-medium text-[#06201c]">
                  Tracking URL (optional)
                  <input value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#d7e5df] bg-white px-3 py-2.5 text-sm focus:border-[#1f6a58] focus:outline-none" placeholder="https://..." />
                </label>
              </div>
              <div className="mt-5 flex justify-end gap-3">
                <button type="button" onClick={() => setShipModal(null)} className="rounded-full border border-[#d7e5df] px-5 h-11 text-sm font-bold text-[#52736a] hover:bg-[#f4faf7]">Cancel</button>
                <button type="button" disabled={busy || !carrier.trim() || !tracking.trim()} onClick={handleShipSubmit} className="rounded-full bg-[#1f6a58] px-5 h-11 text-sm font-bold text-white hover:bg-[#165244] disabled:opacity-50">Mark Shipped</button>
              </div>
            </div>
          </div>
        )}

        {/* Reject cancellation modal */}
        {rejectCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06201c]/40 p-4" role="dialog" aria-modal="true" onClick={() => setRejectCancelModal(null)}>
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-bold text-[#06201c]">Reject Cancellation — {rejectCancelModal.order_number}</h2>
              <p className="mt-1 text-xs text-[#52736a]">Provide a reason for rejecting the customer's cancellation request.</p>
              <div className="mt-4">
                <label className="block text-sm font-medium text-[#06201c]">
                  Rejection Reason
                  <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} className="mt-1.5 w-full rounded-xl border border-[#d7e5df] bg-white px-3 py-2.5 text-sm focus:border-[#1f6a58] focus:outline-none" placeholder="e.g. Order already shipped, cannot cancel." />
                </label>
              </div>
              <div className="mt-5 flex justify-end gap-3">
                <button type="button" onClick={() => setRejectCancelModal(null)} className="rounded-full border border-[#d7e5df] px-5 h-11 text-sm font-bold text-[#52736a] hover:bg-[#f4faf7]">Cancel</button>
                <button type="button" disabled={busy || !rejectReason.trim()} onClick={handleRejectCancel} className="rounded-full bg-[#b42318] px-5 h-11 text-sm font-bold text-white hover:bg-[#961d14] disabled:opacity-50">Reject Cancellation</button>
              </div>
            </div>
          </div>
        )}

        {/* Reject refund modal */}
        {rejectRefundModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06201c]/40 p-4" role="dialog" aria-modal="true" onClick={() => setRejectRefundModal(null)}>
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-bold text-[#06201c]">Reject Refund — {rejectRefundModal.order_number}</h2>
              <p className="mt-1 text-xs text-[#52736a]">Provide a reason for rejecting the customer's refund request.</p>
              <div className="mt-4">
                <label className="block text-sm font-medium text-[#06201c]">
                  Rejection Reason
                  <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} className="mt-1.5 w-full rounded-xl border border-[#d7e5df] bg-white px-3 py-2.5 text-sm focus:border-[#1f6a58] focus:outline-none" placeholder="e.g. Item already delivered and used." />
                </label>
              </div>
              <div className="mt-5 flex justify-end gap-3">
                <button type="button" onClick={() => setRejectRefundModal(null)} className="rounded-full border border-[#d7e5df] px-5 h-11 text-sm font-bold text-[#52736a] hover:bg-[#f4faf7]">Cancel</button>
                <button type="button" disabled={busy || !rejectReason.trim()} onClick={handleRejectRefund} className="rounded-full bg-[#b42318] px-5 h-11 text-sm font-bold text-white hover:bg-[#961d14] disabled:opacity-50">Reject Refund</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function ProductOrdersScreen(props: ProductOrdersScreenProps) {
  return (
    <Suspense fallback={null}>
      <ProductOrdersScreenContent {...props} />
    </Suspense>
  );
}
