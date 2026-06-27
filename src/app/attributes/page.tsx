"use client";

import { useEffect, useState } from "react";

import AppShell from "@/components/layout/AppShell";
import { getDynamicAttributes, createDynamicAttribute, updateDynamicAttribute, deleteDynamicAttribute } from "@/services/attribute.service";
import { getEnterprises } from "@/services/enterprise.service";
import { getProducts } from "@/services/product.service";
import { getServices } from "@/services/service.service";
import type { DynamicAttributeDto } from "@/types/attribute.types";
import type { EnterpriseDto } from "@/types/enterprise.types";
import type { ProductDto } from "@/types/product.types";
import type { ServiceDto } from "@/types/service.types";

const tabs = ["Enterprise", "Product", "Service"] as const;
type Tab = (typeof tabs)[number];
type EntityType = "enterprise" | "product" | "service";

const attributeTypes = ["text", "number", "boolean", "date"] as const;

type AttributeFormState = {
  attribute_name: string;
  attribute_value: string;
  attribute_type: (typeof attributeTypes)[number];
};

type PageError = {
  message: string;
  retry: () => void;
};

function EditIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 20h4L18.5 9.5a2.8 2.8 0 0 0-4-4L4 16v4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m13.5 6.5 4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 7h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getEntityType(tab: Tab): EntityType {
  if (tab === "Enterprise") return "enterprise";
  if (tab === "Product") return "product";
  return "service";
}

function getEntityLabel(tab: Tab) {
  if (tab === "Enterprise") return "enterprise";
  if (tab === "Product") return "product";
  return "service";
}

function getEnterpriseName(enterprise: EnterpriseDto) {
  return (
    enterprise.business_legal_name ||
    enterprise.business_short_name ||
    enterprise.name ||
    "Unnamed Enterprise"
  );
}

function getProductName(product: ProductDto) {
  return product.product_name || "Unnamed Product";
}

function getServiceName(service: ServiceDto) {
  return service.service_name || "Unnamed Service";
}

function getEntityDisplayName(tab: Tab, entity: EnterpriseDto | ProductDto | ServiceDto | undefined) {
  if (!entity) {
    return "N/A";
  }

  if (tab === "Enterprise") {
    return getEnterpriseName(entity as EnterpriseDto);
  }

  if (tab === "Product") {
    return getProductName(entity as ProductDto);
  }

  return getServiceName(entity as ServiceDto);
}

function AttributeTableRow({
  attribute,
  usedWhere,
  onEdit,
  onDelete,
}: {
  attribute: DynamicAttributeDto;
  usedWhere: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <tr className="h-[64px] text-sm transition-colors duration-150 hover:bg-emerald-50/60">
      <td className="px-5 font-semibold text-[#06201c]">{attribute.attribute_name}</td>
      <td className="px-5 text-[#52736a]">{attribute.attribute_value}</td>
      <td className="px-5">
        <span className="rounded-full bg-[#f1f4f3] px-3 py-1 text-xs font-bold text-[#52736a]">
          {attribute.attribute_type}
        </span>
      </td>
      <td className="px-5">
        <span className="rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-bold text-[#16825b]">
          {getEntityTypeFromAttribute(attribute)}
        </span>
      </td>
      <td className="px-5 text-[#52736a]">{usedWhere}</td>
      <td className="px-5">
        <div className="flex gap-2 text-[#52736a]">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d7e5df] hover:bg-[#f4faf7]"
            aria-label={`Edit ${attribute.attribute_name}`}
            onClick={onEdit}
          >
            <EditIcon />
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d7e5df] hover:bg-[#fff1f0] hover:text-[#b42318]"
            aria-label={`Delete ${attribute.attribute_name}`}
            onClick={onDelete}
          >
            <DeleteIcon />
          </button>
        </div>
      </td>
    </tr>
  );
}

function getEntityTypeFromAttribute(attribute: DynamicAttributeDto) {
  return attribute.entity_type || "unknown";
}

export default function AttributesPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Enterprise");
  const [selectedEnterpriseId, setSelectedEnterpriseId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [enterpriseOptions, setEnterpriseOptions] = useState<EnterpriseDto[]>([]);
  const [productOptions, setProductOptions] = useState<ProductDto[]>([]);
  const [serviceOptions, setServiceOptions] = useState<ServiceDto[]>([]);
  const [enterpriseLoaded, setEnterpriseLoaded] = useState(false);
  const [productLoaded, setProductLoaded] = useState(false);
  const [serviceLoaded, setServiceLoaded] = useState(false);
  const [attributes, setAttributes] = useState<DynamicAttributeDto[]>([]);
  const [isLoadingEntities, setIsLoadingEntities] = useState(false);
  const [isLoadingAttributes, setIsLoadingAttributes] = useState(false);
  const [pageError, setPageError] = useState<PageError | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAttributeId, setEditingAttributeId] = useState<string | null>(null);
  const [formState, setFormState] = useState<AttributeFormState>({
    attribute_name: "",
    attribute_value: "",
    attribute_type: "text",
  });
  const [isSavingAttribute, setIsSavingAttribute] = useState(false);

  const activeEntityType = getEntityType(activeTab);
  const selectedEntityId =
    activeTab === "Enterprise"
      ? selectedEnterpriseId
      : activeTab === "Product"
        ? selectedProductId
        : selectedServiceId;

  const selectedEntity =
    activeTab === "Enterprise"
      ? enterpriseOptions.find((item) => item.id === selectedEnterpriseId)
      : activeTab === "Product"
        ? productOptions.find((item) => item.id === selectedProductId)
        : serviceOptions.find((item) => item.id === selectedServiceId);

  const selectedEntityName = getEntityDisplayName(activeTab, selectedEntity);
  const entityLabel = getEntityLabel(activeTab);

  async function loadEntities(tab: Tab, force = false) {
    try {
      setIsLoadingEntities(true);
      setPageError(null);

      if (tab === "Enterprise") {
        if (enterpriseLoaded && !force) {
          return;
        }

        const data = await getEnterprises();
        setEnterpriseOptions(data);
        setEnterpriseLoaded(true);
        return;
      }

      if (tab === "Product") {
        if (productLoaded && !force) {
          return;
        }

        const data = await getProducts();
        setProductOptions(data);
        setProductLoaded(true);
        return;
      }

      if (serviceLoaded && !force) {
        return;
      }

      const data = await getServices();
      setServiceOptions(data);
      setServiceLoaded(true);
    } catch (fetchError) {
      setPageError({
        message: fetchError instanceof Error ? fetchError.message : "Unable to load items.",
        retry: () => void loadEntities(tab, true),
      });
    } finally {
      setIsLoadingEntities(false);
    }
  }

  async function loadAttributes(tab: Tab, entityId: string, force = false) {
    if (!entityId) {
      setAttributes([]);
      setPageError(null);
      return;
    }

    try {
      setIsLoadingAttributes(true);
      setPageError(null);
      const data = await getDynamicAttributes(getEntityType(tab), entityId);
      setAttributes(data);
    } catch (fetchError) {
      setAttributes([]);
      setPageError({
        message: fetchError instanceof Error ? fetchError.message : "Unable to load attributes.",
        retry: () => void loadAttributes(tab, entityId, true),
      });
    } finally {
      setIsLoadingAttributes(false);
    }
  }

  useEffect(() => {
    setIsFormOpen(false);
    setEditingAttributeId(null);
    setFormError(null);
    setFormState({
      attribute_name: "",
      attribute_value: "",
      attribute_type: "text",
    });
    setAttributes([]);
    void loadEntities(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    void loadAttributes(activeTab, selectedEntityId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedEntityId]);

  async function refreshAttributes() {
    if (!selectedEntityId) {
      setAttributes([]);
      return;
    }

    await loadAttributes(activeTab, selectedEntityId, true);
  }

  function handleSelectChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value;

    if (activeTab === "Enterprise") {
      setSelectedEnterpriseId(value);
      return;
    }

    if (activeTab === "Product") {
      setSelectedProductId(value);
      return;
    }

    setSelectedServiceId(value);
  }

  function openCreateForm() {
    setFormError(null);

    if (!selectedEntityId) {
      setFormError("Please select an item before adding an attribute.");
      return;
    }

    setEditingAttributeId(null);
    setFormState({
      attribute_name: "",
      attribute_value: "",
      attribute_type: "text",
    });
    setIsFormOpen(true);
  }

  function openEditForm(attribute: DynamicAttributeDto) {
    setFormError(null);
    setEditingAttributeId(attribute.id);
    setFormState({
      attribute_name: attribute.attribute_name || "",
      attribute_value: attribute.attribute_value || "",
      attribute_type: (attribute.attribute_type as AttributeFormState["attribute_type"]) || "text",
    });
    setIsFormOpen(true);
  }

  async function handleSaveAttribute() {
    if (!selectedEntityId) {
      setFormError("Please select an item before adding an attribute.");
      return;
    }

    const trimmedName = formState.attribute_name.trim();
    const trimmedValue = formState.attribute_value.trim();

    if (!trimmedName || !trimmedValue) {
      setFormError("Attribute Name and Attribute Value are required.");
      return;
    }

    try {
      setIsSavingAttribute(true);
      setFormError(null);

      if (editingAttributeId) {
        await updateDynamicAttribute(editingAttributeId, {
          attribute_name: trimmedName,
          attribute_value: trimmedValue,
          attribute_type: formState.attribute_type,
        });
      } else {
        await createDynamicAttribute({
          entity_type: activeEntityType,
          entity_id: selectedEntityId,
          attribute_name: trimmedName,
          attribute_value: trimmedValue,
          attribute_type: formState.attribute_type,
        });
      }

      setIsFormOpen(false);
      setEditingAttributeId(null);
      await refreshAttributes();
    } catch (submitError) {
      setFormError(
        submitError instanceof Error ? submitError.message : "Unable to save attribute.",
      );
    } finally {
      setIsSavingAttribute(false);
    }
  }

  async function handleDeleteAttribute(attribute: DynamicAttributeDto) {
    const confirmed = window.confirm("Are you sure you want to delete this attribute?");
    if (!confirmed) {
      return;
    }

    try {
      await deleteDynamicAttribute(attribute.id);
      await refreshAttributes();
    } catch (submitError) {
      setPageError({
        message:
          submitError instanceof Error ? submitError.message : "Unable to delete attribute.",
        retry: () => void refreshAttributes(),
      });
    }
  }

  const currentOptions =
    activeTab === "Enterprise"
      ? enterpriseOptions
      : activeTab === "Product"
        ? productOptions
        : serviceOptions;

  return (
    <AppShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#06201c]">Dynamic Attributes</h2>
          <p className="mt-1 text-sm text-[#52736a]">
            Configure custom fields for enterprises, products, and services.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="h-12 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm"
        >
          + Add Attribute
        </button>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto rounded-2xl border border-[#e1ebe6] bg-white p-2 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`h-10 whitespace-nowrap rounded-xl px-4 text-sm font-bold transition ${
              activeTab === tab
                ? "bg-[#e9f4ee] text-[#1f6a58]"
                : "text-[#52736a] hover:bg-[#f4faf7]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <section className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <label className="block w-full lg:max-w-md">
            <span className="text-sm font-bold text-[#06201c]">Select {entityLabel}</span>
            <select
              className="mt-1.5 h-[46px] w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3.5 text-sm text-[#06201c] outline-none focus:border-[#1f6a58]"
              value={selectedEntityId}
              onChange={handleSelectChange}
            >
              <option value="">Select {entityLabel}</option>
              {currentOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {getEntityDisplayName(activeTab, item)}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={openCreateForm}
            className="h-[46px] rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#1f6a58]"
          >
            + Add Attribute
          </button>
        </div>

        {isFormOpen ? (
          <div className="mt-5 rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-bold text-[#06201c]">Attribute Name</span>
                <input
                  type="text"
                  value={formState.attribute_name}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, attribute_name: event.target.value }))
                  }
                  className="mt-1.5 h-[46px] w-full rounded-xl border border-[#d7e5df] bg-white px-3.5 text-sm text-[#06201c] outline-none focus:border-[#1f6a58]"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-[#06201c]">Attribute Value</span>
                <input
                  type="text"
                  value={formState.attribute_value}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, attribute_value: event.target.value }))
                  }
                  className="mt-1.5 h-[46px] w-full rounded-xl border border-[#d7e5df] bg-white px-3.5 text-sm text-[#06201c] outline-none focus:border-[#1f6a58]"
                />
              </label>

              <label className="block md:col-span-2 lg:col-span-1">
                <span className="text-sm font-bold text-[#06201c]">Attribute Type</span>
                <select
                  className="mt-1.5 h-[46px] w-full rounded-xl border border-[#d7e5df] bg-white px-3.5 text-sm text-[#06201c] outline-none focus:border-[#1f6a58]"
                  value={formState.attribute_type}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      attribute_type: event.target.value as AttributeFormState["attribute_type"],
                    }))
                  }
                >
                  {attributeTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {formError ? (
              <p className="mt-4 text-sm font-semibold text-[#b42318]">{formError}</p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  setFormError(null);
                  setEditingAttributeId(null);
                }}
                className="h-[46px] rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSaveAttribute()}
                disabled={isSavingAttribute}
                className="h-[46px] rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm disabled:opacity-60"
              >
                {isSavingAttribute
                  ? "Saving..."
                  : editingAttributeId
                    ? "Update Attribute"
                    : "Create Attribute"}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {pageError ? (
        <div className="mt-5 rounded-2xl border border-[#f3d0cb] bg-[#fff6f5] px-4 py-3 text-sm text-[#b42318]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{pageError.message}</span>
            <button
              type="button"
              onClick={() => pageError.retry()}
              className="h-10 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white"
            >
              Retry
            </button>
          </div>
        </div>
      ) : null}

      <section className="mt-5 overflow-hidden rounded-2xl border border-[#e1ebe6] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left">
            <thead className="bg-[#f8fbf9] text-xs uppercase tracking-[0.12em] text-[#7f9d94]">
              <tr>
                {[
                  "Attribute Name",
                  "Attribute Value",
                  "Field Type",
                  "Entity Type",
                  "Used Where",
                  "Actions",
                ].map((heading) => (
                  <th key={heading} className="px-5 py-3 font-bold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf3f0]">
              {isLoadingEntities || isLoadingAttributes ? (
                <tr className="h-[64px] text-sm">
                  <td className="px-5 text-[#52736a]" colSpan={6}>
                    Loading {selectedEntityId ? "attributes" : "items"}...
                  </td>
                </tr>
              ) : !selectedEntityId ? (
                <tr className="h-[64px] text-sm">
                  <td className="px-5 text-[#52736a]" colSpan={6}>
                    Select an enterprise/product/service to view attributes.
                  </td>
                </tr>
              ) : attributes.length === 0 ? (
                <tr className="h-[64px] text-sm">
                  <td className="px-5 text-[#52736a]" colSpan={6}>
                    No attributes found for this item.
                  </td>
                </tr>
              ) : (
                attributes.map((attribute) => (
                  <AttributeTableRow
                    key={attribute.id}
                    attribute={attribute}
                    usedWhere={selectedEntityName}
                    onEdit={() => openEditForm(attribute)}
                    onDelete={() => void handleDeleteAttribute(attribute)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
