"use client";

import { useEffect, useState } from "react";

import {
  createDynamicAttribute,
  deleteDynamicAttribute,
  getDynamicAttributes,
  updateDynamicAttribute,
} from "../services/attribute.service";
import {
  AttributeForm,
  type AttributeFormState,
} from "../components/AttributeForm";
import { AttributesTable } from "../components/AttributesTable";
import type { DynamicAttributeDto } from "../types/attribute.types";
import type {
  AttributeEntityOption,
  AttributesScreenProps,
} from "../types/attribute-screen-config.types";

const tabs = ["Enterprise", "Product", "Service"] as const;
type Tab = (typeof tabs)[number];
type EntityType = "enterprise" | "product" | "service";

type PageError = {
  message: string;
  retry: () => void;
};

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

export default function AttributesScreen({
  enterpriseOptionsLoader,
  productOptionsLoader,
  serviceOptionsLoader,
}: AttributesScreenProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Enterprise");
  const [selectedEnterpriseId, setSelectedEnterpriseId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [enterpriseOptions, setEnterpriseOptions] = useState<AttributeEntityOption[]>([]);
  const [productOptions, setProductOptions] = useState<AttributeEntityOption[]>([]);
  const [serviceOptions, setServiceOptions] = useState<AttributeEntityOption[]>([]);
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

  const selectedEntityName = selectedEntity?.label || "N/A";
  const entityLabel = getEntityLabel(activeTab);

  async function loadEntities(tab: Tab, force = false) {
    try {
      setIsLoadingEntities(true);
      setPageError(null);

      if (tab === "Enterprise") {
        if (enterpriseLoaded && !force) {
          return;
        }

        const data = await enterpriseOptionsLoader();
        setEnterpriseOptions(data);
        setEnterpriseLoaded(true);
        return;
      }

      if (tab === "Product") {
        if (productLoaded && !force) {
          return;
        }

        const data = await productOptionsLoader();
        setProductOptions(data);
        setProductLoaded(true);
        return;
      }

      if (serviceLoaded && !force) {
        return;
      }

      const data = await serviceOptionsLoader();
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
    <>
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
                  {item.label}
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
          <AttributeForm
            formState={formState}
            formError={formError}
            isSavingAttribute={isSavingAttribute}
            editingAttributeId={editingAttributeId}
            onFormStateChange={setFormState}
            onCancel={() => {
              setIsFormOpen(false);
              setFormError(null);
              setEditingAttributeId(null);
            }}
            onSave={() => void handleSaveAttribute()}
          />
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

      <AttributesTable
        attributes={attributes}
        isLoading={isLoadingEntities || isLoadingAttributes}
        selectedEntityId={selectedEntityId}
        selectedEntityName={selectedEntityName}
        onEdit={openEditForm}
        onDelete={(attribute) => void handleDeleteAttribute(attribute)}
      />
    </>
  );
}
