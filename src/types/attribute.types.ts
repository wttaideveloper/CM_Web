export type AttributeEntityType = "enterprise" | "product" | "service";

export type DynamicAttributeDto = {
  id: string;
  entity_type: string;
  entity_id: string;
  attribute_name: string;
  attribute_value: string;
  attribute_type: string;
};

export type CreateDynamicAttributePayload = {
  entity_type: AttributeEntityType;
  entity_id: string;
  attribute_name: string;
  attribute_value: string;
  attribute_type: string;
};

export type UpdateDynamicAttributePayload = Partial<{
  attribute_name: string;
  attribute_value: string;
  attribute_type: string;
}>;
