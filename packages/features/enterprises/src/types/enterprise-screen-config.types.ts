export type EnterpriseProductSummary = {
  id: string;
  productName: string;
  productCategory: string;
  productPrice: number;
  productImages: string;
  productStatus: boolean;
  currency?: string;
};

export type EnterpriseServiceSummary = {
  id: string;
  serviceName: string;
  serviceDescription: string;
  serviceCategory: string;
  servicePrice: number;
  duration: number;
  availabilityStatus: boolean;
  serviceStatus: boolean;
  currency?: string;
};

export type EnterpriseProductSummariesLoader = (
  enterpriseId: string,
) => Promise<EnterpriseProductSummary[]>;

export type EnterpriseServiceSummariesLoader = (
  enterpriseId: string,
) => Promise<EnterpriseServiceSummary[]>;

export type EnterprisesListScreenProps = {
  createHref?: string;
  detailHrefBase?: string;
  editHrefBase?: string;
};

export type EnterpriseDetailsScreenProps = {
  enterpriseId?: string;
  editHref?: string;
  productCreateHref?: string;
  serviceCreateHref?: string;
  allowEnterpriseSelector?: boolean;
  emptyValue?: string;
  enterpriseProductsLoader: EnterpriseProductSummariesLoader;
  enterpriseServicesLoader: EnterpriseServiceSummariesLoader;
};

export type EnterpriseEditScreenProps = {
  enterpriseId?: string;
  successRedirect?: string;
  backHref?: string;
};
