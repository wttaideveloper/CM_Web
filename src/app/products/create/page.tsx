"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import { createDynamicAttribute } from "@/services/attribute.service";
import { getEnterprises } from "@/services/enterprise.service";
import { createProduct } from "@/services/product.service";

const tabs = ["Product Info", "Pricing", "Images", "Review"];

type EnterpriseOption = {
  id: string;
  business_legal_name?: string | null;
  business_short_name?: string | null;
};

type CustomAttributeRow = {
  id: string;
  attribute_name: string;
  attribute_value: string;
  attribute_type: string;
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

function createAttributeRow(): CustomAttributeRow {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    attribute_name: "",
    attribute_value: "",
    attribute_type: "text",
  };
}

export default function CreateProductPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [enterpriseId, setEnterpriseId] = useState("");
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productCategory, setProductCategory] = useState("Equipment");
  const [productPrice, setProductPrice] = useState("");
  const [productImages, setProductImages] = useState("");
  const [customAttributes, setCustomAttributes] = useState<CustomAttributeRow[]>([]);
  const [enterpriseOptions, setEnterpriseOptions] = useState<EnterpriseOption[]>([]);
  const [isLoadingEnterprises, setIsLoadingEnterprises] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedEnterprise = enterpriseOptions.find((enterprise) => enterprise.id === enterpriseId);
  const parsedReviewPrice = Number(productPrice);
  const reviewCustomAttributes = customAttributes.filter(
    (attribute) => attribute.attribute_name.trim() && attribute.attribute_value.trim(),
  );
  const isReviewComplete =
    Boolean(enterpriseId.trim()) &&
    Boolean(productName.trim()) &&
    Boolean(productDescription.trim()) &&
    Boolean(productCategory.trim()) &&
    Number.isFinite(parsedReviewPrice);
  const reviewProductPrice = productPrice.trim() && Number.isFinite(parsedReviewPrice)
    ? `₹${parsedReviewPrice.toFixed(2)}`
    : "Not provided";
  const reviewEnterpriseName =
    selectedEnterprise?.business_legal_name ||
    selectedEnterprise?.business_short_name ||
    "Unnamed Enterprise";

  async function fetchEnterprises() {
    try {
      setIsLoadingEnterprises(true);
      setError(null);

      const data = await getEnterprises();
      setEnterpriseOptions(data);
      setEnterpriseId((current) => current || data[0]?.id || "");
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load enterprises.");
      setEnterpriseOptions([]);
    } finally {
      setIsLoadingEnterprises(false);
    }
  }

  useEffect(() => {
    void fetchEnterprises();
  }, []);

  async function handleSubmit() {
    const trimmedEnterpriseId = enterpriseId.trim();
    const trimmedProductName = productName.trim();
    const trimmedProductDescription = productDescription.trim();
    const trimmedProductCategory = productCategory.trim();
    const parsedProductPrice = Number(productPrice);

    if (
      !trimmedEnterpriseId ||
      !trimmedProductName ||
      !trimmedProductDescription ||
      !trimmedProductCategory ||
      !Number.isFinite(parsedProductPrice)
    ) {
      setError("Please complete all required product fields.");
      return;
    }

    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const createdProduct = await createProduct({
        enterprise_id: trimmedEnterpriseId,
        product_name: trimmedProductName,
        product_description: trimmedProductDescription,
        product_category: trimmedProductCategory,
        product_price: parsedProductPrice,
        product_images: productImages.trim(),
        product_status: true,
      });

      const attributesToSave = customAttributes
        .filter(
          (attribute) => attribute.attribute_name.trim() && attribute.attribute_value.trim(),
        )
        .map((attribute) =>
          createDynamicAttribute({
            entity_type: "product",
            entity_id: createdProduct.id,
            attribute_name: attribute.attribute_name.trim(),
            attribute_value: attribute.attribute_value.trim(),
            attribute_type: attribute.attribute_type,
          }),
        );

      if (attributesToSave.length > 0) {
        try {
          await Promise.all(attributesToSave);
        } catch {
          setError("Product was created, but some additional attributes could not be saved.");
          await new Promise((resolve) => setTimeout(resolve, 900));
        }
      }

      router.push("/products");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create product.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            aria-label="Back"
            className="mt-1 flex h-10 w-10 items-center justify-center rounded-full border border-[#d7e5df] text-[#52736a]"
          >
            &larr;
          </button>
          <div>
            <h2 className="text-2xl font-bold text-[#06201c]">Create Product</h2>
            <p className="mt-1 text-sm text-[#52736a]">
              Add a new product to the marketplace
            </p>
          </div>
        </div>
        <button className="h-12 rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a]">
          Save Draft
        </button>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto rounded-2xl border border-[#e1ebe6] bg-white p-2 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`h-10 whitespace-nowrap rounded-xl px-4 text-sm font-bold ${
              activeTab === tab
                ? "bg-[#e9f4ee] text-[#1f6a58]"
                : "text-[#52736a] hover:bg-[#f4faf7]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <section className="mt-4 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
        {activeTab === "Product Info" ? (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#06201c]">Product Information</h3>
              <p className="mt-1 text-sm text-[#52736a]">
                Enter marketplace details and product identifiers.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <FieldLabel>Product Name*</FieldLabel>
                <input
                  type="text"
                  placeholder="Premium Yoga Mat"
                  value={productName}
                  onChange={(event) => setProductName(event.target.value)}
                  className={inputClass()}
                />
              </label>
              <label className="block">
                <FieldLabel>Category*</FieldLabel>
                <select
                  className={inputClass()}
                  value={productCategory}
                  onChange={(event) => setProductCategory(event.target.value)}
                >
                  {["Equipment", "Supplements", "Recovery", "Digital", "Accessories"].map(
                    (option) => (
                      <option key={option}>{option}</option>
                    ),
                  )}
                </select>
              </label>
              <label className="block">
                <FieldLabel>Enterprise*</FieldLabel>
                <select
                  className={inputClass()}
                  value={enterpriseId}
                  onChange={(event) => setEnterpriseId(event.target.value)}
                  disabled={isLoadingEnterprises || enterpriseOptions.length === 0}
                >
                  <option value="">
                    {isLoadingEnterprises ? "Loading enterprises..." : "Select enterprise"}
                  </option>
                  {enterpriseOptions.map((enterprise) => (
                    <option key={enterprise.id} value={enterprise.id}>
                      {enterprise.business_legal_name ||
                        enterprise.business_short_name ||
                        "Unnamed Enterprise"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <FieldLabel>SKU</FieldLabel>
                <input type="text" placeholder="PYM-001" className={inputClass()} />
              </label>
              <label className="block">
                <FieldLabel>Barcode/UPC</FieldLabel>
                <input
                  type="text"
                  placeholder="012345678905"
                  className={inputClass()}
                />
              </label>
              <label className="block">
                <FieldLabel>Weight (kg)</FieldLabel>
                <input type="text" placeholder="1.2" className={inputClass()} />
              </label>
              <label className="block md:col-span-2">
                <FieldLabel>Dimensions (L x W x H cm)</FieldLabel>
                <input
                  type="text"
                  placeholder="183 x 61 x 0.6"
                  className={inputClass()}
                />
              </label>
              <label className="block md:col-span-2">
                <FieldLabel>Description*</FieldLabel>
                <textarea
                  placeholder="Describe product benefits, materials, and use cases."
                  value={productDescription}
                  onChange={(event) => setProductDescription(event.target.value)}
                  className="mt-1.5 min-h-24 w-full resize-none rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 py-3 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
                />
              </label>
            </div>
          </>
        ) : null}

        {activeTab === "Pricing" ? (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#06201c]">Pricing &amp; Inventory</h3>
              <p className="mt-1 text-sm text-[#52736a]">
                Configure product pricing, tax, and stock controls.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <FieldLabel>Base Price*</FieldLabel>
                <input
                  type="text"
                  placeholder="89.99"
                  value={productPrice}
                  onChange={(event) => setProductPrice(event.target.value)}
                  className={inputClass()}
                />
              </label>
              <label className="block">
                <FieldLabel>Sale / Promo Price</FieldLabel>
                <input
                  type="text"
                  placeholder="79.99 (optional)"
                  className={inputClass()}
                />
              </label>
              <label className="block">
                <FieldLabel>Cost Price (internal)</FieldLabel>
                <input type="text" placeholder="32.00" className={inputClass()} />
              </label>
              <label className="block">
                <FieldLabel>Tax Class</FieldLabel>
                <select className={inputClass()} defaultValue="Standard (8%)">
                  {["Standard (8%)", "Reduced (4%)", "Zero Rate (0%)"].map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <FieldLabel>Stock Quantity*</FieldLabel>
                <input type="text" placeholder="100" className={inputClass()} />
              </label>
              <label className="block">
                <FieldLabel>Low Stock Alert Threshold</FieldLabel>
                <input type="text" placeholder="10" className={inputClass()} />
              </label>
              <label className="block">
                <FieldLabel>Stock Management</FieldLabel>
                <select className={inputClass()} defaultValue="Track inventory">
                  {["Track inventory", "No tracking (unlimited)", "Preorder"].map(
                    (option) => (
                      <option key={option}>{option}</option>
                    ),
                  )}
                </select>
              </label>
              <label className="block">
                <FieldLabel>Currency</FieldLabel>
                <select className={inputClass()} defaultValue="USD ($)">
                  {["USD ($)", "INR (₹)", "EUR (€)"].map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>
          </>
        ) : null}

        {activeTab === "Images" ? (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#06201c]">Product Images</h3>
              <p className="mt-1 text-sm text-[#52736a]">
                Upload marketplace-ready product images.
              </p>
            </div>

            <div className="rounded-2xl border border-dashed border-[#b8d1c7] bg-[#f9fcfa] p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f6ee] text-[#1f6a58]">
                <svg
                  aria-hidden="true"
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 16V4m0 0-4 4m4-4 4 4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4 16v3h16v-3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="mt-3 text-sm font-bold text-[#06201c]">
                Drag &amp; drop product images here
              </p>
              <p className="mt-1 text-sm text-[#52736a]">
                PNG, JPG up to 5MB each &middot; Up to 10 images &middot; First
                image becomes primary
              </p>
              <button className="mt-4 h-[46px] rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#1f6a58]">
                Browse Files
              </button>
            </div>

            <label className="mt-4 block">
              <FieldLabel>Product Images URL</FieldLabel>
              <input
                type="text"
                placeholder="https://example.com/product-image.jpg"
                value={productImages}
                onChange={(event) => setProductImages(event.target.value)}
                className={inputClass()}
              />
            </label>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {["Primary image", "Gallery image"].map((image, index) => (
                <div
                  key={image}
                  className="relative h-28 rounded-2xl border border-[#e1ebe6] bg-gradient-to-br from-[#e8f6ee] to-[#c8d8d3]"
                >
                  {index === 0 ? (
                    <span className="absolute right-3 top-3 rounded-full bg-[#1f6a58] px-3 py-1 text-xs font-bold text-white">
                      Primary
                    </span>
                  ) : null}
                  <span className="absolute bottom-3 left-3 text-sm font-bold text-[#1f6a58]">
                    {image}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {activeTab === "Review" ? (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#06201c]">Review &amp; Publish</h3>
              <p className="mt-1 text-sm text-[#52736a]">
                Confirm product details before publishing.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
              <div className="rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ["Product Name", productName.trim() || "Not provided"],
                    ["Category", productCategory.trim() || "Not provided"],
                    ["Enterprise", reviewEnterpriseName],
                    ["Price", reviewProductPrice],
                    ["Stock", "Not wired yet"],
                    ["Status", isReviewComplete ? "Ready to publish" : "Incomplete"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">
                        {label}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#06201c]">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">
                    Additional Attributes
                  </p>
                  {reviewCustomAttributes.length === 0 ? (
                    <p className="mt-2 text-sm text-[#52736a]">No additional attributes</p>
                  ) : (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {reviewCustomAttributes.map((attribute) => (
                        <div key={attribute.id} className="rounded-xl bg-[#f9fcfa] p-3">
                          <p className="text-sm font-bold text-[#06201c]">
                            {attribute.attribute_name.trim()}
                          </p>
                          <p className="mt-1 text-sm text-[#52736a]">
                            {attribute.attribute_value.trim()}
                          </p>
                          <p className="mt-2 text-xs font-bold uppercase tracking-[0.08em] text-[#7f9d94]">
                            {attribute.attribute_type}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-[#edf3f0] bg-white p-5">
                <h4 className="text-base font-bold text-[#06201c]">
                  All fields complete
                </h4>
                <p className="mt-2 text-sm leading-5 text-[#52736a]">
                  Product is ready to publish to the marketplace.
                </p>
                <label className="mt-4 block">
                  <FieldLabel>Publish Status</FieldLabel>
                  <select className={inputClass()} defaultValue="Publish immediately">
                    {["Publish immediately", "Save as draft", "Schedule for later"].map(
                      (option) => (
                        <option key={option}>{option}</option>
                      ),
                    )}
                  </select>
                </label>
              </div>
            </div>
          </>
        ) : null}

        <div className="mt-4 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#06201c]">Additional Attributes</h3>
              <p className="mt-1 text-sm text-[#52736a]">
                Add optional custom attributes for this product.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCustomAttributes((current) => [...current, createAttributeRow()])}
              className="h-[46px] rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#1f6a58]"
            >
              + Add Attribute
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {customAttributes.length === 0 ? (
              <p className="text-sm text-[#52736a]">No additional attributes</p>
            ) : (
              customAttributes.map((attribute) => (
                <div
                  key={attribute.id}
                  className="grid gap-3 rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] p-4 lg:grid-cols-[1fr_1fr_180px_auto]"
                >
                  <label className="block">
                    <FieldLabel>Attribute Name</FieldLabel>
                    <input
                      type="text"
                      placeholder="Color"
                      value={attribute.attribute_name}
                      onChange={(event) =>
                        setCustomAttributes((current) =>
                          current.map((item) =>
                            item.id === attribute.id
                              ? { ...item, attribute_name: event.target.value }
                              : item,
                          ),
                        )
                      }
                      className={inputClass()}
                    />
                  </label>
                  <label className="block">
                    <FieldLabel>Attribute Value</FieldLabel>
                    <input
                      type="text"
                      placeholder="Forest Green"
                      value={attribute.attribute_value}
                      onChange={(event) =>
                        setCustomAttributes((current) =>
                          current.map((item) =>
                            item.id === attribute.id
                              ? { ...item, attribute_value: event.target.value }
                              : item,
                          ),
                        )
                      }
                      className={inputClass()}
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
                            item.id === attribute.id
                              ? { ...item, attribute_type: event.target.value }
                              : item,
                          ),
                        )
                      }
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
                      onClick={() =>
                        setCustomAttributes((current) => current.filter((item) => item.id !== attribute.id))
                      }
                      className="h-[46px] rounded-full border border-[#f3d0cb] px-4 text-sm font-semibold text-[#b42318]"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-[#f3d0cb] bg-[#fff6f5] px-4 py-3 text-sm text-[#b42318]">
            {error}
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 border-t border-[#edf3f0] pt-4 sm:flex-row sm:justify-end">
          <button className="h-[46px] rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a]">
            Save Draft
          </button>
          <button
            type="button"
            onClick={() =>
              activeTab === "Review"
                ? void handleSubmit()
                : setActiveTab(tabs[Math.min(tabs.indexOf(activeTab) + 1, tabs.length - 1)])
            }
            disabled={isSubmitting}
            className="h-[46px] rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-70"
          >
            {activeTab === "Review"
              ? isSubmitting
                ? "Publishing..."
                : "Publish Product"
              : "Continue →"}
          </button>
        </div>
      </section>
    </AppShell>
  );
}
