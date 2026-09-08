import type { EnterpriseDto, EnterpriseLocationDto } from "@ihp/enterprises";

export type ServiceMode = "super-admin" | "enterprise-admin";
export type EnterpriseOptionsLoader = () => Promise<EnterpriseDto[]>;
export type EnterpriseLocationsLoader = (enterpriseId: string) => Promise<EnterpriseLocationDto[]>;
export type EnterpriseLocationLoader = (locationId: string) => Promise<EnterpriseLocationDto>;

export type ServiceProviderOption = {
  id: string;
  userId: string;
  fullName: string;
};

export type ServiceProviderOptionsLoader = () => Promise<ServiceProviderOption[]>;

export type ServicesListScreenProps = {
  enterpriseFilterId?: string;
  createHref?: string;
  detailHrefBase?: string;
  editHrefBase?: string;
  enterpriseName?: string;
  enterprisesLoader?: EnterpriseOptionsLoader;
  enterpriseLocationsLoader?: EnterpriseLocationsLoader;
};

export type ServiceCreateScreenProps = {
  mode?: ServiceMode;
  redirectTo?: string;
  enterpriseId?: string;
  enterpriseName?: string;
  tenantId?: string;
  providerOptionsLoader?: ServiceProviderOptionsLoader;
  enterprisesLoader?: EnterpriseOptionsLoader;
  enterpriseLocationsLoader?: EnterpriseLocationsLoader;
};

export type ServiceDetailsScreenProps = {
  enterpriseFilterId?: string;
  listHref?: string;
  editHrefBase?: string;
  enterprisesLoader?: EnterpriseOptionsLoader;
  enterpriseLocationLoader?: EnterpriseLocationLoader;
};

export type ServiceEditScreenProps = {
  enterpriseFilterId?: string;
  listHref?: string;
  detailHrefBase?: string;
  providerOptionsLoader?: ServiceProviderOptionsLoader;
  enterpriseLocationsLoader?: EnterpriseLocationsLoader;
};
