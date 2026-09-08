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
  enterprisesLoader?: () => Promise<import("./enterprise.types").EnterpriseDto[]>;
  errorMessageForLoadFailure?: (error: unknown) => string;
  activateEnterpriseAction?: (enterpriseId: string) => Promise<import("./enterprise.types").EnterpriseDto>;
  deactivateEnterpriseAction?: (enterpriseId: string) => Promise<import("./enterprise.types").EnterpriseDto>;
};

export type EnterpriseDetailsScreenProps = {
  enterpriseId?: string;
  editHref?: string;
  productCreateHref?: string;
  serviceCreateHref?: string;
  allowEnterpriseSelector?: boolean;
  emptyValue?: string;
  enterpriseLoader?: (enterpriseId: string) => Promise<import("./enterprise.types").EnterpriseDto>;
  enterprisesLoader?: () => Promise<import("./enterprise.types").EnterpriseDto[]>;
  enterpriseLocationsLoader?: (enterpriseId: string) => Promise<import("./location.types").EnterpriseLocationDto[]>;
  createLocationAction?: (enterpriseId: string, payload: import("./location.types").CreateEnterpriseLocationPayload) => Promise<import("./location.types").EnterpriseLocationDto>;
  updateLocationAction?: (locationId: string, payload: import("./location.types").UpdateEnterpriseLocationPayload) => Promise<import("./location.types").EnterpriseLocationDto>;
  deleteLocationAction?: (locationId: string) => Promise<void>;
  enterpriseProductsLoader: EnterpriseProductSummariesLoader;
  enterpriseServicesLoader: EnterpriseServiceSummariesLoader;
};

export type EnterpriseEditScreenProps = {
  enterpriseId?: string;
  successRedirect?: string;
  backHref?: string;
  enterpriseLoader?: (enterpriseId: string) => Promise<import("./enterprise.types").EnterpriseDto>;
  enterpriseUpdater?: (enterpriseId: string, payload: import("./enterprise.types").UpdateEnterprisePayload) => Promise<import("./enterprise.types").EnterpriseDto>;
};

export type EnterpriseTenantOption = {
  id: string;
  name: string;
  slug: string | null;
};

export type EnterpriseTenantOptionsLoader = () => Promise<EnterpriseTenantOption[]>;

export type EnterpriseCreateScreenProps = {
  tenantOptionsLoader: EnterpriseTenantOptionsLoader;
  successRedirect?: string;
  enterpriseCreator?: (payload: import("./enterprise.types").CreateEnterprisePayload) => Promise<import("./enterprise.types").EnterpriseDto>;
};
