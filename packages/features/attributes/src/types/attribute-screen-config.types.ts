export type AttributeEntityOption = {
  id: string;
  label: string;
};

export type AttributeEntityOptionsLoader = () => Promise<AttributeEntityOption[]>;

export type AttributesScreenProps = {
  enterpriseOptionsLoader: AttributeEntityOptionsLoader;
  productOptionsLoader: AttributeEntityOptionsLoader;
  serviceOptionsLoader: AttributeEntityOptionsLoader;
};
