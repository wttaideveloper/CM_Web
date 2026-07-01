"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import {
  createDynamicAttribute,
  deleteDynamicAttribute,
  getDynamicAttributes,
  updateDynamicAttribute,
} from "@/services/attribute.service";
import { getEnterpriseLocations } from "@/services/enterprise-location.service";
import { getProductById, updateProduct } from "@/services/product.service";
import type { DynamicAttributeDto } from "@/types/attribute.types";
import type { EnterpriseLocationDto } from "@/types/location.types";
import type { ProductDto } from "@/types/product.types";

type ProductAttributeRow = {
  id?: string;
  attribute_name: string;
  attribute_value: string;
  attribute_type: string;
  isDeleted?: boolean;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-sm font-bold text-[#06201c]">{children}</span>;
}

function controlClass() {
  return "h-[46px] w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]";
}

function inputClass() {
  return `mt-1.5 ${controlClass()}`;
}

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function optionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const taxClassOptions = [
  { value: "standard", label: "Standard (8%)" },
  { value: "reduced", label: "Reduced (4%)" },
  { value: "zero_rate", label: "Zero Rate (0%)" },
];

const stockManagementOptions = [
  { value: "track_inventory", label: "Track inventory" },
  { value: "no_tracking", label: "No tracking (unlimited)" },
  { value: "preorder", label: "Preorder" },
];

const currencyOptions = [
  { value: "USD", label: "USD ($)" },
  { value: "INR", label: "INR (₹)" },
  { value: "EUR", label: "EUR (€)" },
];

const publishStatusOptions = [
  { value: "published", label: "Publish immediately" },
  { value: "draft", label: "Save as draft" },
  { value: "scheduled", label: "Schedule for later" },
];

const categoryOptions = ["Equipment", "Supplements", "Recovery", "Digital", "Accessories"];

function normalizeOptionValue(value: string | undefined, options: { value: string; label: string }[]) {
  if (!value) {
    return "";
  }

  const normalized = value.trim().toLowerCase();
  const match = options.find(
    (option) =>
      option.value.toLowerCase() === normalized || option.label.toLowerCase() === normalized,
  );

  return match?.value ?? value.trim();
}

  function resolveOptionLabel(value: string, options: { value: string; label: string }[]) {
    return options.find((option) => option.value === value)?.label || value || "Select";
  }

function hasCategoryOption(value: string) {
  return categoryOptions.includes(value);
}

function resolveLocationLabel(location: EnterpriseLocationDto) {
  const locationName = location.location_name?.trim();
  const cityState = [location.city, location.state].filter(Boolean).join(", ");

  if (locationName && cityState) {
    return `${locationName} · ${cityState}`;
  }

  return locationName || cityState || "Unnamed Location";
}

function createAttributeRow(attribute?: DynamicAttributeDto): ProductAttributeRow {
  return {
    id: attribute?.id,
    attribute_name: attribute?.attribute_name ?? "",
    attribute_value: attribute?.attribute_value ?? "",
    attribute_type: attribute?.attribute_type ?? "text",
    isDeleted: false,
  };
}

type EditProductPageProps = {
  enterpriseFilterId?: string;
  listHref?: string;
  detailHrefBase?: string;
};

export function EditProductPage({
  enterpriseFilterId,
  listHref = "/products",
  detailHrefBase = "/products",
}: EditProductPageProps = {}) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductDto | null>(null);
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productImages, setProductImages] = useState("");
  const [sku, setSku] = useState("");
  const [barcodeUpc, setBarcodeUpc] = useState("");
  const [weight, setWeight] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [taxClass, setTaxClass] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [lowStockAlertThreshold, setLowStockAlertThreshold] = useState("");
  const [stockManagement, setStockManagement] = useState("");
  const [currency, setCurrency] = useState("");
  const [publishStatus, setPublishStatus] = useState("");
  const [productStatus, setProductStatus] = useState(true);
  const [customAttributes, setCustomAttributes] = useState<ProductAttributeRow[]>([]);
  const [locationId, setLocationId] = useState("");
  const [locationOptions, setLocationOptions] = useState<EnterpriseLocationDto[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchLocations(enterpriseId: string, nextLocationId?: string | null) {
    if (!enterpriseId) {
      setLocationOptions([]);
      setLocationId("");
      setLocationError(null);
      return;
    }

    try {
      setIsLoadingLocations(true);
      setLocationError(null);

      const data = await getEnterpriseLocations(enterpriseId);
      setLocationOptions(data);
      setLocationId(nextLocationId ?? "");
    } catch (fetchError) {
      setLocationOptions([]);
      setLocationId(nextLocationId ?? "");
      setLocationError(fetchError instanceof Error ? fetchError.message : "Unable to load locations.");
    } finally {
      setIsLoadingLocations(false);
    }
  }

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

      const data = await getProductById(params.id);

      if (enterpriseFilterId && data.enterprise_id !== enterpriseFilterId) {
        setProduct(null);
        setLocationOptions([]);
        setLocationId("");
        setLocationError(null);
        setAccessDenied("This product belongs to another enterprise.");
        return;
      }

      setProduct(data);
      setProductName(data.product_name || "");
      setProductDescription(data.product_description || "");
      setProductCategory(data.product_category || "");
      setProductPrice(String(data.product_price ?? ""));
      setProductImages(data.product_images || "");
      setSku(data.sku || "");
      setBarcodeUpc(data.barcode_upc || "");
      setWeight(String(data.weight ?? ""));
      setDimensions(data.dimensions || "");
      setSalePrice(String(data.sale_price ?? ""));
      setCostPrice(String(data.cost_price ?? ""));
      setTaxClass(normalizeOptionValue(data.tax_class, taxClassOptions));
      setStockQuantity(String(data.stock_quantity ?? ""));
      setLowStockAlertThreshold(String(data.low_stock_alert_threshold ?? ""));
      setStockManagement(normalizeOptionValue(data.stock_management, stockManagementOptions));
      setCurrency(normalizeOptionValue(data.currency, currencyOptions));
      setPublishStatus(normalizeOptionValue(data.publish_status, publishStatusOptions));
      setProductStatus(data.product_status !== false);
      setLocationId(data.location_id ?? "");
      setLocationError(null);
      void fetchLocations(data.enterprise_id, data.location_id ?? "");

      try {
        const attributes = await getDynamicAttributes("product", data.id);
        setCustomAttributes(attributes.map((attribute) => createAttributeRow(attribute)));
      } catch {
        setCustomAttributes([]);
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load product.");
      setProduct(null);
      setLocationOptions([]);
      setLocationId("");
      setLocationError(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void fetchProduct();
  }, [params.id]);

  async function handleSave() {
    const trimmedName = productName.trim();
    const trimmedDescription = productDescription.trim();
    const trimmedCategory = productCategory.trim();
    const parsedPrice = Number(productPrice);
    const trimmedSku = optionalText(sku);
    const trimmedBarcodeUpc = optionalText(barcodeUpc);
    const parsedWeight = optionalNumber(weight);
    const trimmedDimensions = optionalText(dimensions);
    const parsedSalePrice = optionalNumber(salePrice);
    const parsedCostPrice = optionalNumber(costPrice);
    const trimmedTaxClass = optionalText(taxClass);
    const parsedStockQuantity = optionalNumber(stockQuantity);
    const parsedLowStockAlertThreshold = optionalNumber(lowStockAlertThreshold);
    const trimmedStockManagement = optionalText(stockManagement);
    const trimmedCurrency = optionalText(currency);
    const trimmedPublishStatus = optionalText(publishStatus);

    if (!trimmedName || !trimmedDescription || !trimmedCategory || !Number.isFinite(parsedPrice)) {
      setError("Please complete all required product fields.");
      return;
    }

    if (!params.id || isSubmitting) {
      return;
    }

    if (!product || accessDenied) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await updateProduct(params.id, {
        enterprise_id: enterpriseFilterId ?? product.enterprise_id,
        product_name: trimmedName,
        product_description: trimmedDescription,
        product_category: trimmedCategory,
        product_price: parsedPrice,
        product_images: productImages.trim(),
        product_status: productStatus,
        ...(locationId.trim() ? { location_id: locationId.trim() } : {}),
        ...(trimmedSku ? { sku: trimmedSku } : {}),
        ...(trimmedBarcodeUpc ? { barcode_upc: trimmedBarcodeUpc } : {}),
        ...(parsedWeight !== undefined ? { weight: parsedWeight } : {}),
        ...(trimmedDimensions ? { dimensions: trimmedDimensions } : {}),
        ...(parsedSalePrice !== undefined ? { sale_price: parsedSalePrice } : {}),
        ...(parsedCostPrice !== undefined ? { cost_price: parsedCostPrice } : {}),
        ...(trimmedTaxClass ? { tax_class: trimmedTaxClass } : {}),
        ...(parsedStockQuantity !== undefined ? { stock_quantity: parsedStockQuantity } : {}),
        ...(parsedLowStockAlertThreshold !== undefined
          ? { low_stock_alert_threshold: parsedLowStockAlertThreshold }
          : {}),
        ...(trimmedStockManagement ? { stock_management: trimmedStockManagement } : {}),
        ...(trimmedCurrency ? { currency: trimmedCurrency } : {}),
        ...(trimmedPublishStatus ? { publish_status: trimmedPublishStatus } : {}),
      });

      const attributeOperations: Promise<unknown>[] = [];

      customAttributes.forEach((attribute) => {
        if (attribute.isDeleted) {
          if (attribute.id) {
            attributeOperations.push(deleteDynamicAttribute(attribute.id));
          }
          return;
        }

        const trimmedAttributeName = attribute.attribute_name.trim();
        const trimmedAttributeValue = attribute.attribute_value.trim();

        if (!trimmedAttributeName || !trimmedAttributeValue) {
          return;
        }

        if (attribute.id) {
          attributeOperations.push(
            updateDynamicAttribute(attribute.id, {
              attribute_name: trimmedAttributeName,
              attribute_value: trimmedAttributeValue,
              attribute_type: attribute.attribute_type,
            }),
          );
          return;
        }

        attributeOperations.push(
          createDynamicAttribute({
            entity_type: "product",
            entity_id: params.id,
            attribute_name: trimmedAttributeName,
            attribute_value: trimmedAttributeValue,
            attribute_type: attribute.attribute_type,
          }),
        );
      });

      const results = await Promise.allSettled(attributeOperations);
      const hasAttributeFailure = results.some((result) => result.status === "rejected");

      if (hasAttributeFailure) {
        setError("Product was updated, but some additional attributes could not be saved.");
        return;
      }

      router.push(listHref);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to update product.");
    } finally {
      setIsSubmitting(false);
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

  if (error && !product) {
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

  return (
    <AppShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href={`${detailHrefBase}/${params.id}`}
            className="mt-1 flex h-10 w-10 items-center justify-center rounded-full border border-[#d7e5df] text-[#52736a]"
          >
            &larr;
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-[#06201c]">Edit Product</h2>
            <p className="mt-1 text-sm text-[#52736a]">Update product details</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link
            href={`${detailHrefBase}/${params.id}`}
            className="inline-flex h-12 items-center rounded-full border border-[#d7e5df] bg-white px-5 text-sm font-bold text-[#1f6a58] shadow-sm"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSubmitting}
            className="inline-flex h-12 items-center rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <section className="mt-4 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <FieldLabel>Product Name*</FieldLabel>
            <input
              type="text"
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
              className={inputClass()}
            />
          </label>

          <label className="block">
            <FieldLabel>Category*</FieldLabel>
            <select
              value={productCategory}
              onChange={(event) => setProductCategory(event.target.value)}
              className={inputClass()}
            >
              <option value="">Select category</option>
              {!hasCategoryOption(productCategory) && productCategory ? (
                <option value={productCategory}>{productCategory}</option>
              ) : null}
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <FieldLabel>Location</FieldLabel>
            <select
              value={locationId}
              onChange={(event) => setLocationId(event.target.value)}
              className={inputClass()}
              disabled={isLoadingLocations || locationOptions.length === 0}
            >
              <option value="">
                {isLoadingLocations
                  ? "Loading locations..."
                  : locationOptions.length === 0
                    ? "No locations available"
                    : "Select location"}
              </option>
              {locationOptions.map((location) => (
                <option key={location.id} value={location.id}>
                  {resolveLocationLabel(location)}
                </option>
              ))}
            </select>
            {locationError ? (
              <p className="mt-1.5 text-xs font-medium text-[#b42318]">{locationError}</p>
            ) : null}
          </label>

          <label className="block md:col-span-2">
            <FieldLabel>Description*</FieldLabel>
            <textarea
              value={productDescription}
              onChange={(event) => setProductDescription(event.target.value)}
              className="mt-1.5 min-h-28 w-full resize-none rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 py-3 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
            />
          </label>

          <label className="block">
            <FieldLabel>Price*</FieldLabel>
            <input
              type="number"
              step="0.01"
              value={productPrice}
              onChange={(event) => setProductPrice(event.target.value)}
              className={inputClass()}
            />
          </label>

          <label className="block">
            <FieldLabel>Status*</FieldLabel>
            <select
              value={productStatus ? "Active" : "Inactive"}
              onChange={(event) => setProductStatus(event.target.value === "Active")}
              className={inputClass()}
            >
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </label>

          <label className="block md:col-span-2">
            <FieldLabel>Product Images URL</FieldLabel>
            <input
              type="text"
              value={productImages}
              onChange={(event) => setProductImages(event.target.value)}
              className={inputClass()}
            />
          </label>
          <label className="block">
            <FieldLabel>SKU</FieldLabel>
            <input
              type="text"
              value={sku}
              onChange={(event) => setSku(event.target.value)}
              className={inputClass()}
            />
          </label>
          <label className="block">
            <FieldLabel>Barcode/UPC</FieldLabel>
            <input
              type="text"
              value={barcodeUpc}
              onChange={(event) => setBarcodeUpc(event.target.value)}
              className={inputClass()}
            />
          </label>
          <label className="block">
            <FieldLabel>Weight (kg)</FieldLabel>
            <input
              type="text"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              className={inputClass()}
            />
          </label>
          <label className="block md:col-span-2">
            <FieldLabel>Dimensions (L x W x H cm)</FieldLabel>
            <input
              type="text"
              value={dimensions}
              onChange={(event) => setDimensions(event.target.value)}
              className={inputClass()}
            />
          </label>
          <label className="block">
            <FieldLabel>Sale / Promo Price</FieldLabel>
            <input
              type="text"
              value={salePrice}
              onChange={(event) => setSalePrice(event.target.value)}
              className={inputClass()}
            />
          </label>
          <label className="block">
            <FieldLabel>Cost Price (internal)</FieldLabel>
            <input
              type="text"
              value={costPrice}
              onChange={(event) => setCostPrice(event.target.value)}
              className={inputClass()}
            />
          </label>
          <label className="block">
            <FieldLabel>Tax Class</FieldLabel>
            <select
              value={taxClass}
              onChange={(event) => setTaxClass(normalizeOptionValue(event.target.value, taxClassOptions))}
              className={inputClass()}
            >
              <option value="">Select tax class</option>
              {taxClassOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <FieldLabel>Stock Quantity</FieldLabel>
            <input
              type="text"
              value={stockQuantity}
              onChange={(event) => setStockQuantity(event.target.value)}
              className={inputClass()}
            />
          </label>
          <label className="block">
            <FieldLabel>Low Stock Alert Threshold</FieldLabel>
            <input
              type="text"
              value={lowStockAlertThreshold}
              onChange={(event) => setLowStockAlertThreshold(event.target.value)}
              className={inputClass()}
            />
          </label>
          <label className="block">
            <FieldLabel>Stock Management</FieldLabel>
            <select
              value={stockManagement}
              onChange={(event) =>
                setStockManagement(normalizeOptionValue(event.target.value, stockManagementOptions))
              }
              className={inputClass()}
            >
              <option value="">Select stock management</option>
              {stockManagementOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <FieldLabel>Currency</FieldLabel>
            <select
              value={currency}
              onChange={(event) => setCurrency(normalizeOptionValue(event.target.value, currencyOptions))}
              className={inputClass()}
            >
              <option value="">Select currency</option>
              {currencyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <FieldLabel>Publish Status</FieldLabel>
            <select
              value={publishStatus}
              onChange={(event) =>
                setPublishStatus(normalizeOptionValue(event.target.value, publishStatusOptions))
              }
              className={inputClass()}
            >
              <option value="">Select publish status</option>
              {publishStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#06201c]">Additional Attributes</h3>
              <p className="mt-1 text-sm text-[#52736a]">
                Update custom attributes for this product.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setCustomAttributes((current) => [
                  ...current,
                  {
                    attribute_name: "",
                    attribute_value: "",
                    attribute_type: "text",
                  },
                ])
              }
              className="h-[46px] rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#1f6a58]"
            >
              + Add Attribute
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {customAttributes.length === 0 ? (
              <p className="text-sm text-[#52736a]">No additional attributes</p>
            ) : (
              customAttributes.map((attribute, index) => (
                <div
                  key={attribute.id || `new-${index}`}
                  className={`grid gap-3 rounded-2xl border p-4 lg:grid-cols-[1fr_1fr_180px_auto] ${
                    attribute.isDeleted
                      ? "border-[#f3d0cb] bg-[#fff6f5] opacity-75"
                      : "border-[#edf3f0] bg-[#f9fcfa]"
                  }`}
                >
                  <label className="block">
                    <FieldLabel>Attribute Name</FieldLabel>
                    <input
                      type="text"
                      value={attribute.attribute_name}
                      onChange={(event) =>
                        setCustomAttributes((current) =>
                          current.map((item) =>
                            item === attribute
                              ? { ...item, attribute_name: event.target.value, isDeleted: false }
                              : item,
                          ),
                        )
                      }
                      className={inputClass()}
                      disabled={attribute.isDeleted}
                      placeholder="Color"
                    />
                  </label>

                  <label className="block">
                    <FieldLabel>Attribute Value</FieldLabel>
                    <input
                      type="text"
                      value={attribute.attribute_value}
                      onChange={(event) =>
                        setCustomAttributes((current) =>
                          current.map((item) =>
                            item === attribute
                              ? { ...item, attribute_value: event.target.value, isDeleted: false }
                              : item,
                          ),
                        )
                      }
                      className={inputClass()}
                      disabled={attribute.isDeleted}
                      placeholder="Forest Green"
                    />
                  </label>

                  <label className="block">
                    <FieldLabel>Attribute Type</FieldLabel>
                    <select
                      className={inputClass()}
                      value={attribute.attribute_type}
                      onChange={(event) =>
                        setCustomAttributes((current) =>
                          current.map((item) =>
                            item === attribute
                              ? { ...item, attribute_type: event.target.value, isDeleted: false }
                              : item,
                          ),
                        )
                      }
                      disabled={attribute.isDeleted}
                    >
                      {["text", "number", "boolean", "date"].map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (attribute.id) {
                          setCustomAttributes((current) =>
                            current.map((item) =>
                              item === attribute
                                ? { ...item, isDeleted: !item.isDeleted }
                                : item,
                            ),
                          );
                          return;
                        }

                        setCustomAttributes((current) =>
                          current.filter((item) => item !== attribute),
                        );
                      }}
                      className={`h-[46px] rounded-full border px-4 text-sm font-semibold ${
                        attribute.isDeleted
                          ? "border-[#d7e5df] text-[#1f6a58]"
                          : "border-[#f3d0cb] text-[#b42318]"
                      }`}
                    >
                      {attribute.isDeleted ? "Undo Remove" : "Remove"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {error ? (
          <p className="mt-4 text-sm font-semibold text-[#b42318]">{error}</p>
        ) : null}
      </section>
    </AppShell>
  );
}

export default function PublicEditProductPage() {
  return <EditProductPage />;
}
