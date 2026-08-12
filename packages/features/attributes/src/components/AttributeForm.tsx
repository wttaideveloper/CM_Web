const attributeTypes = ["text", "number", "boolean", "date"] as const;

/** The controlled field values used by the inline Dynamic Attribute form. */
export interface AttributeFormState {
  attribute_name: string;
  attribute_value: string;
  attribute_type: (typeof attributeTypes)[number];
}

/** Presentation inputs and callbacks for the inline Dynamic Attribute create/edit form. */
export interface AttributeFormProps {
  formState: AttributeFormState;
  formError: string | null;
  isSavingAttribute: boolean;
  editingAttributeId: string | null;
  onFormStateChange: (formState: AttributeFormState) => void;
  onCancel: () => void;
  onSave: () => void;
}

/** Renders the existing controlled inline form without owning mutation or validation behavior. */
export function AttributeForm({
  formState,
  formError,
  isSavingAttribute,
  editingAttributeId,
  onFormStateChange,
  onCancel,
  onSave,
}: AttributeFormProps) {
  return (
    <div className="mt-5 rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-bold text-[#06201c]">Attribute Name</span>
          <input
            type="text"
            value={formState.attribute_name}
            onChange={(event) =>
              onFormStateChange({ ...formState, attribute_name: event.target.value })
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
              onFormStateChange({ ...formState, attribute_value: event.target.value })
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
              onFormStateChange({
                ...formState,
                attribute_type: event.target.value as AttributeFormState["attribute_type"],
              })
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
          onClick={onCancel}
          className="h-[46px] rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
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
  );
}
