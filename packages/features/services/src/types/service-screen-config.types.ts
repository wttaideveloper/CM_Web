export type ServiceMode = "super-admin" | "enterprise-admin";

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
};

export type ServiceCreateScreenProps = {
  mode?: ServiceMode;
  redirectTo?: string;
  enterpriseId?: string;
  enterpriseName?: string;
  tenantId?: string;
  providerOptionsLoader?: ServiceProviderOptionsLoader;
};

export type ServiceDetailsScreenProps = {
  enterpriseFilterId?: string;
  listHref?: string;
  editHrefBase?: string;
};

export type ServiceEditScreenProps = {
  enterpriseFilterId?: string;
  listHref?: string;
  detailHrefBase?: string;
  providerOptionsLoader?: ServiceProviderOptionsLoader;
};
