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
import { getProductById, updateProduct } from "@/services/product.service";
import type { DynamicAttributeDto } from "@/types/attribute.types";
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

function createAttributeRow(attribute?: DynamicAttributeDto): ProductAttributeRow {
  return {
    id: attribute?.id,
    attribute_name: attribute?.attribute_name ?? "",
    attribute_value: attribute?.attribute_value ?? "",
    attribute_type: attribute?.attribute_type ?? "text",
    isDeleted: false,
  };
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductDto | null>(null);
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productImages, setProductImages] = useState("");
  const [productStatus, setProductStatus] = useState(true);
  const [customAttributes, setCustomAttributes] = useState<ProductAttributeRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchProduct() {
    if (!params.id) {
      setError("Missing product id.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await getProductById(params.id);
      setProduct(data);
      setProductName(data.product_name || "");
      setProductDescription(data.product_description || "");
      setProductCategory(data.product_category || "");
      setProductPrice(String(data.product_price ?? ""));
      setProductImages(data.product_images || "");
      setProductStatus(data.product_status !== false);

      try {
        const attributes = await getDynamicAttributes("product", data.id);
        setCustomAttributes(attributes.map((attribute) => createAttributeRow(attribute)));
      } catch {
        setCustomAttributes([]);
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load product.");
      setProduct(null);
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

    if (!trimmedName || !trimmedDescription || !trimmedCategory || !Number.isFinite(parsedPrice)) {
      setError("Please complete all required product fields.");
      return;
    }

    if (!params.id || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await updateProduct(params.id, {
        product_name: trimmedName,
        product_description: trimmedDescription,
        product_category: trimmedCategory,
        product_price: parsedPrice,
        product_images: productImages.trim(),
        product_status: productStatus,
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

      router.push(`/products/${params.id}`);
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

  return (
    <AppShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href={`/products/${params.id}`}
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
            href={`/products/${params.id}`}
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
            <input
              type="text"
              value={productCategory}
              onChange={(event) => setProductCategory(event.target.value)}
              className={inputClass()}
            />
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
