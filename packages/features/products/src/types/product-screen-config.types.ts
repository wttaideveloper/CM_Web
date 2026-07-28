export type ProductMode = "super-admin" | "enterprise-admin";

export type ProductsListScreenProps = {
  enterpriseFilterId?: string;
  createHref?: string;
  detailHrefBase?: string;
  editHrefBase?: string;
  enterpriseName?: string;
};

export type ProductCreateScreenProps = {
  mode?: ProductMode;
  redirectTo?: string;
  enterpriseId?: string;
  enterpriseName?: string;
  tenantId?: string;
};

export type ProductDetailsScreenProps = {
  enterpriseFilterId?: string;
  listHref?: string;
  editHrefBase?: string;
};

export type ProductEditScreenProps = {
  enterpriseFilterId?: string;
  listHref?: string;
  detailHrefBase?: string;
};
