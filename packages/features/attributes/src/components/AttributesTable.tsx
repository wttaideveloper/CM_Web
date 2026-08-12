import type { DynamicAttributeDto } from "../types/attribute.types";

/** Presentation inputs for the Dynamic Attributes table and its row actions. */
export interface AttributesTableProps {
  attributes: DynamicAttributeDto[];
  isLoading: boolean;
  selectedEntityId: string;
  selectedEntityName: string;
  onEdit: (attribute: DynamicAttributeDto) => void;
  onDelete: (attribute: DynamicAttributeDto) => void;
}

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
          {attribute.entity_type || "unknown"}
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

/** Renders Dynamic Attributes table states and delegates row actions to its owner. */
export function AttributesTable({
  attributes,
  isLoading,
  selectedEntityId,
  selectedEntityName,
  onEdit,
  onDelete,
}: AttributesTableProps) {
  return (
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
            {isLoading ? (
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
                  onEdit={() => onEdit(attribute)}
                  onDelete={() => onDelete(attribute)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
