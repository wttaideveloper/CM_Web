import type { EnterpriseDto, EnterpriseLocationDto } from "@ihp/enterprises";

export type ProductMode = "super-admin" | "enterprise-admin";
export type EnterpriseOptionsLoader = () => Promise<EnterpriseDto[]>;
export type EnterpriseLocationsLoader = (enterpriseId: string) => Promise<EnterpriseLocationDto[]>;
export type EnterpriseLocationLoader = (locationId: string) => Promise<EnterpriseLocationDto>;

export type ProductsListScreenProps = {
  enterpriseFilterId?: string;
  createHref?: string;
  detailHrefBase?: string;
  editHrefBase?: string;
  enterpriseName?: string;
  enterprisesLoader?: EnterpriseOptionsLoader;
  enterpriseLocationsLoader?: EnterpriseLocationsLoader;
};

export type ProductCreateScreenProps = {
  mode?: ProductMode;
  redirectTo?: string;
  enterpriseId?: string;
  enterpriseName?: string;
  tenantId?: string;
  enterprisesLoader?: EnterpriseOptionsLoader;
  enterpriseLocationsLoader?: EnterpriseLocationsLoader;
};

export type ProductDetailsScreenProps = {
  enterpriseFilterId?: string;
  listHref?: string;
  editHrefBase?: string;
  enterprisesLoader?: EnterpriseOptionsLoader;
  enterpriseLocationLoader?: EnterpriseLocationLoader;
};

export type ProductEditScreenProps = {
  enterpriseFilterId?: string;
  listHref?: string;
  detailHrefBase?: string;
  enterpriseLocationsLoader?: EnterpriseLocationsLoader;
};
