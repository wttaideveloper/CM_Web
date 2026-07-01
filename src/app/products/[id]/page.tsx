"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import { getDynamicAttributes } from "@/services/attribute.service";
import { getEnterprises } from "@/services/enterprise.service";
import { getLocationById } from "@/services/enterprise-location.service";
import { activateProduct, deactivateProduct, getProductById } from "@/services/product.service";
import type { DynamicAttributeDto } from "@/types/attribute.types";
import type { EnterpriseDto } from "@/types/enterprise.types";
import type { EnterpriseLocationDto } from "@/types/location.types";
import type { ProductDto } from "@/types/product.types";

function formatPrice(price: number) {
  return `₹${Number.isFinite(price) ? price.toFixed(2) : "0.00"}`;
}

function statusLabel(status: boolean) {
  return status === false ? "Inactive" : "Active";
}

function resolveEnterpriseName(enterprise: EnterpriseDto) {
  return (
    enterprise.business_legal_name ||
    enterprise.business_short_name ||
    enterprise.name ||
    "Unnamed Enterprise"
  );
}

function fallbackEnterpriseName(enterpriseId: string, enterpriseMap: Record<string, EnterpriseDto>) {
  const enterprise = enterpriseMap[enterpriseId];

  if (!enterprise) {
    return "Unknown Enterprise";
  }

  return resolveEnterpriseName(enterprise);
}

function resolveLocationSummary(location: EnterpriseLocationDto) {
  const locationName = location.location_name?.trim();
  const cityState = [location.city, location.state].filter(Boolean).join(", ");

  if (locationName && cityState) {
    return `${locationName} · ${cityState}`;
  }

  return locationName || cityState || "Not provided";
}

function formatMaybeNumber(value: number | undefined, suffix = "") {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "N/A";
  }

  return `${value}${suffix}`;
}

function ProductImagePreview({ src, alt }: { src: string; alt: string }) {
  const [hasError, setHasError] = useState(false);
  const hasImage = Boolean(src.trim()) && !hasError;

  if (!hasImage) {
    return (
      <div
        className="flex h-full min-h-[260px] w-full items-center justify-center rounded-2xl border border-[#dcebe2] bg-[linear-gradient(180deg,#eff8f2,#e3f2e8)] shadow-sm"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(180deg,#eff8f2,#e3f2e8)",
          backgroundSize: "24px 24px, 100% 100%",
        }}
      >
        <div className="rounded-2xl border border-[#cfe3d7] bg-white/70 px-5 py-4 text-center text-[#1f6a58] shadow-sm backdrop-blur-sm">
          <span className="text-sm font-bold">No image available</span>
        </div>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="max-h-[300px] w-full rounded-2xl border border-[#e1ebe6] object-cover shadow-sm"
      onError={() => setHasError(true)}
    />
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[#06201c]">{value}</p>
    </div>
  );
}

type ProductDetailsPageProps = {
  enterpriseFilterId?: string;
  listHref?: string;
  editHrefBase?: string;
};

export function ProductDetailsPage({
  enterpriseFilterId,
  listHref = "/products",
  editHrefBase = "/products",
}: ProductDetailsPageProps = {}) {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductDto | null>(null);
  const [enterpriseMap, setEnterpriseMap] = useState<Record<string, EnterpriseDto>>({});
  const [locationSummary, setLocationSummary] = useState<string>("Not provided");
  const [dynamicAttributes, setDynamicAttributes] = useState<DynamicAttributeDto[]>([]);
  const [attributesError, setAttributesError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  async function fetchProduct() {
    if (!params.id) {
      setError("Missing product id.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setAccessDenied(null);

      const [productData, enterpriseData] = await Promise.all([getProductById(params.id), getEnterprises()]);

      if (enterpriseFilterId && productData.enterprise_id !== enterpriseFilterId) {
        setProduct(null);
        setEnterpriseMap({});
        setLocationSummary("Not provided");
        setLocationError(null);
        setIsLoadingLocation(false);
        setDynamicAttributes([]);
        setAttributesError(null);
        setAccessDenied("This product belongs to another enterprise.");
        return;
      }

      const nextEnterpriseMap = enterpriseData.reduce<Record<string, EnterpriseDto>>((acc, enterprise) => {
        acc[enterprise.id] = enterprise;
        return acc;
      }, {});

      setProduct(productData);
      setEnterpriseMap(nextEnterpriseMap);
      setDynamicAttributes([]);
      setAttributesError(null);
      setLocationSummary("Not provided");
      setLocationError(null);
      const productLocationId = productData.location_id?.trim();
      setIsLoadingLocation(Boolean(productLocationId));

      if (productLocationId) {
        void (async () => {
          try {
            const locationData = await getLocationById(productLocationId);
            setLocationSummary(resolveLocationSummary(locationData));
          } catch {
            setLocationError("Unable to load location");
            setLocationSummary("Unable to load location");
          } finally {
            setIsLoadingLocation(false);
          }
        })();
      }

      void (async () => {
        try {
          const attributesData = await getDynamicAttributes("product", productData.id);
          setDynamicAttributes(attributesData);
        } catch {
          setDynamicAttributes([]);
          setAttributesError("Unable to load additional attributes.");
        }
      })();
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load product.");
      setProduct(null);
      setEnterpriseMap({});
      setLocationSummary("Not provided");
      setLocationError(null);
      setIsLoadingLocation(false);
      setDynamicAttributes([]);
      setAttributesError(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void fetchProduct();
  }, [params.id]);

  async function handleDeactivate() {
    if (!product || isTogglingStatus) {
      return;
    }

    const confirmed = window.confirm("Are you sure you want to deactivate this product?");
    if (!confirmed) {
      return;
    }

    try {
      setIsTogglingStatus(true);
      await deactivateProduct(product.id);
      setProduct((current) => (current ? { ...current, product_status: false } : current));
    } catch {
      window.alert("Unable to deactivate product.");
    } finally {
      setIsTogglingStatus(false);
    }
  }

  async function handleActivate() {
    if (!product || isTogglingStatus) {
      return;
    }

    const confirmed = window.confirm("Are you sure you want to activate this product?");
    if (!confirmed) {
      return;
    }

    try {
      setIsTogglingStatus(true);
      const updatedProduct = await activateProduct(product.id);
      setProduct(updatedProduct);
    } catch {
      window.alert("Unable to activate product.");
    } finally {
      setIsTogglingStatus(false);
    }
  }

  if (isLoading) {
    return (
      <AppShell>
        <section className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm">
          <p className="text-base font-bold text-[#06201c]">Loading product...</p>
          <p className="mt-2 text-sm text-[#52736a]">Please wait while we fetch the latest data.</p>
        </section>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <section className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm">
          <p className="text-base font-bold text-[#06201c]">Unable to load product.</p>
          <p className="mt-2 text-sm text-[#52736a]">{error}</p>
          <button
            type="button"
            onClick={() => void fetchProduct()}
            className="mt-5 h-11 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm"
          >
            Retry
          </button>
        </section>
      </AppShell>
    );
  }

  if (accessDenied) {
    return (
      <AppShell>
        <section className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm">
          <p className="text-base font-bold text-[#06201c]">Access denied.</p>
          <p className="mt-2 text-sm text-[#52736a]">{accessDenied}</p>
          <Link
            href={listHref}
            className="mt-5 inline-flex h-11 items-center rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm"
          >
            Back to Products
          </Link>
        </section>
      </AppShell>
    );
  }

  if (!product) {
    return (
      <AppShell>
        <section className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm">
          <p className="text-base font-bold text-[#06201c]">Unable to load product.</p>
        </section>
      </AppShell>
    );
  }

  const productStatus = statusLabel(product.product_status);
  const enterpriseName = fallbackEnterpriseName(product.enterprise_id, enterpriseMap);
  const locationValue = locationError
    ? locationError
    : isLoadingLocation
      ? "Loading location..."
      : locationSummary;
  const productImage = product.product_images?.trim() || "";

  return (
    <AppShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#06201c]">
            {product.product_name || "Unnamed Product"}
          </h2>
          <p className="mt-1 text-sm text-[#52736a]">Product details</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`${editHrefBase}/${product.id}/edit`}
            className="inline-flex h-12 items-center rounded-full border border-[#d7e5df] bg-white px-5 text-sm font-bold text-[#1f6a58] shadow-sm"
          >
            Edit Product
          </Link>
          {productStatus === "Active" ? (
            <button
              type="button"
              onClick={() => void handleDeactivate()}
              disabled={isTogglingStatus}
              className="inline-flex h-12 items-center rounded-full border border-[#d7e5df] bg-white px-5 text-sm font-bold text-[#b42318] shadow-sm disabled:opacity-60"
            >
              Deactivate
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleActivate()}
              disabled={isTogglingStatus}
              className="inline-flex h-12 items-center rounded-full border border-[#d7e5df] bg-white px-5 text-sm font-bold text-[#16825b] shadow-sm disabled:opacity-60"
            >
              Activate
            </button>
          )}
          <Link
            href={listHref}
            className="inline-flex h-12 items-center rounded-full border border-[#d7e5df] bg-white px-5 text-sm font-bold text-[#1f6a58] shadow-sm"
          >
            Back to Products
          </Link>
        </div>
      </div>

      <section className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              productStatus === "Active"
                ? "bg-[#e8f6ee] text-[#16825b]"
                : "bg-[#fff1f0] text-[#b42318]"
            }`}
          >
            {productStatus}
          </span>
          <span className="rounded-full bg-[#f1f4f3] px-3 py-1 text-xs font-bold text-[#6b7f79]">
            {product.product_category || "N/A"}
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <DetailRow label="Product Name" value={product.product_name || "N/A"} />
          <DetailRow label="Category" value={product.product_category || "N/A"} />
          <DetailRow label="Price" value={formatPrice(product.product_price)} />
          <DetailRow label="Enterprise" value={enterpriseName} />
          <DetailRow label="Location" value={locationValue} />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <DetailRow label="SKU" value={product.sku || "N/A"} />
          <DetailRow label="Barcode / UPC" value={product.barcode_upc || "N/A"} />
          <DetailRow label="Weight" value={formatMaybeNumber(product.weight, " kg")} />
          <DetailRow label="Dimensions" value={product.dimensions || "N/A"} />
          <DetailRow
            label="Sale Price"
            value={product.sale_price !== undefined ? formatPrice(product.sale_price) : "N/A"}
          />
          <DetailRow
            label="Cost Price"
            value={product.cost_price !== undefined ? formatPrice(product.cost_price) : "N/A"}
          />
          <DetailRow
            label="Stock Quantity"
            value={formatMaybeNumber(product.stock_quantity)}
          />
          <DetailRow
            label="Low Stock Alert"
            value={formatMaybeNumber(product.low_stock_alert_threshold)}
          />
          <DetailRow label="Tax Class" value={product.tax_class || "N/A"} />
          <DetailRow label="Stock Management" value={product.stock_management || "N/A"} />
          <DetailRow label="Currency" value={product.currency || "N/A"} />
          <DetailRow label="Publish Status" value={product.publish_status || "N/A"} />
        </div>

        <div className="mt-4 rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">
            Description
          </p>
          <p className="mt-2 text-sm leading-6 text-[#52736a]">
            {product.product_description || "N/A"}
          </p>
        </div>

        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">
            Product Image
          </p>
          <div className="mt-2">
            <ProductImagePreview src={productImage} alt={product.product_name || "Product image"} />
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-[#06201c]">Additional Attributes</h3>
            <p className="mt-1 text-sm text-[#52736a]">
              Extra product details supplied through dynamic attributes.
            </p>
          </div>
        </div>

        {attributesError ? (
          <p className="mt-4 text-sm text-[#b42318]">{attributesError}</p>
        ) : dynamicAttributes.length === 0 ? (
          <p className="mt-4 text-sm text-[#52736a]">No additional attributes added yet.</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {dynamicAttributes.map((attribute) => (
              <div
                key={attribute.id}
                className="rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#06201c]">
                      {attribute.attribute_name || "Unnamed attribute"}
                    </p>
                    <p className="mt-1 text-sm text-[#52736a]">
                      {attribute.attribute_value || "N/A"}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#e8f6ee] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#16825b]">
                    {attribute.attribute_type || "unknown"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

export default function PublicProductDetailsPage() {
  return <ProductDetailsPage />;
}
