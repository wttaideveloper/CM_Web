"use client";

import { PlatformAttributesScreen } from "@ihp/platform-attributes";
import { useParams } from "next/navigation";
import { EnterpriseEditScreen } from "@ihp/enterprises";
import {
  ProductCreateScreen,
  ProductDetailsScreen,
  ProductEditScreen,
  ProductsListScreen,
} from "@ihp/products";
import {
  ServiceCreateScreen,
  ServiceDetailsScreen,
  ServiceEditScreen,
  ServicesListScreen,
} from "@ihp/services";
import { PlatformCatalogManagement } from "./PlatformCatalogManagement";
import {
  getPlatformEnterpriseById,
  getPlatformEnterpriseLocationById,
  getPlatformEnterpriseLocations,
  getPlatformEnterprises,
  updatePlatformEnterprise,
} from "@ihp/platform-enterprises";

export function PlatformAttributesWithEnterpriseData() {
  return <PlatformAttributesScreen enterprisesLoader={getPlatformEnterprises} />;
}

export function PlatformEnterpriseEditWithEnterpriseData() {
  return <EnterpriseEditScreen enterpriseLoader={getPlatformEnterpriseById} enterpriseUpdater={updatePlatformEnterprise} />;
}

export function PlatformProductsListWithEnterpriseData() {
  return <PlatformCatalogManagement module="product"><ProductsListScreen enterprisesLoader={getPlatformEnterprises} /></PlatformCatalogManagement>;
}

export function PlatformProductCreateWithEnterpriseData() {
  return <ProductCreateScreen enterprisesLoader={getPlatformEnterprises} enterpriseLocationsLoader={getPlatformEnterpriseLocations} />;
}

export function PlatformProductDetailsWithEnterpriseData() {
  const params = useParams<{ id: string }>();
  return <PlatformCatalogManagement module="product" itemId={params.id}><ProductDetailsScreen enterprisesLoader={getPlatformEnterprises} enterpriseLocationLoader={getPlatformEnterpriseLocationById} /></PlatformCatalogManagement>;
}

export function PlatformProductEditWithEnterpriseData() {
  return <ProductEditScreen enterpriseLocationsLoader={getPlatformEnterpriseLocations} />;
}

export function PlatformServicesListWithEnterpriseData() {
  return <PlatformCatalogManagement module="service"><ServicesListScreen enterprisesLoader={getPlatformEnterprises} /></PlatformCatalogManagement>;
}

export function PlatformServiceCreateWithEnterpriseData() {
  return <ServiceCreateScreen enterprisesLoader={getPlatformEnterprises} enterpriseLocationsLoader={getPlatformEnterpriseLocations} />;
}

export function PlatformServiceDetailsWithEnterpriseData() {
  const params = useParams<{ id: string }>();
  return <PlatformCatalogManagement module="service" itemId={params.id}><ServiceDetailsScreen enterprisesLoader={getPlatformEnterprises} enterpriseLocationLoader={getPlatformEnterpriseLocationById} /></PlatformCatalogManagement>;
}

export function PlatformServiceEditWithEnterpriseData() {
  return <ServiceEditScreen enterpriseLocationsLoader={getPlatformEnterpriseLocations} />;
}
