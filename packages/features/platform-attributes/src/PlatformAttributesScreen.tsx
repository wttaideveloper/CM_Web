"use client";

import {
  AttributesScreen,
  type AttributeEntityOption,
} from "@ihp/attributes";
import { getEnterprises, type EnterpriseDto } from "@ihp/enterprises";
import { getProducts, type ProductDto } from "@ihp/products";
import { getServices, type ServiceDto } from "@ihp/services";

function getEnterpriseName(enterprise: EnterpriseDto) {
  return (
    enterprise.business_legal_name ||
    enterprise.business_short_name ||
    enterprise.name ||
    "Unnamed Enterprise"
  );
}

function getProductName(product: ProductDto) {
  return product.product_name || "Unnamed Product";
}

function getServiceName(service: ServiceDto) {
  return service.service_name || "Unnamed Service";
}

function loadEnterpriseOptions(
  enterprisesLoader: () => Promise<EnterpriseDto[]>,
): Promise<AttributeEntityOption[]> {
  return enterprisesLoader().then((enterprises) =>
    enterprises.map((enterprise) => ({
      id: enterprise.id,
      label: getEnterpriseName(enterprise),
    })),
  );
}

async function loadProductOptions(): Promise<AttributeEntityOption[]> {
  const products = await getProducts();
  return products.map((product) => ({
    id: product.id,
    label: getProductName(product),
  }));
}

async function loadServiceOptions(): Promise<AttributeEntityOption[]> {
  const services = await getServices();
  return services.map((service) => ({
    id: service.id,
    label: getServiceName(service),
  }));
}

export default function PlatformAttributesScreen({
  enterprisesLoader = getEnterprises,
}: {
  enterprisesLoader?: () => Promise<EnterpriseDto[]>;
}) {
  return (
    <AttributesScreen
      enterpriseOptionsLoader={() => loadEnterpriseOptions(enterprisesLoader)}
      productOptionsLoader={loadProductOptions}
      serviceOptionsLoader={loadServiceOptions}
    />
  );
}
