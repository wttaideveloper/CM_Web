"use client";

import { PlatformAttributesScreen } from "@ihp/platform-attributes";
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
  return <ProductsListScreen enterprisesLoader={getPlatformEnterprises} />;
}

export function PlatformProductCreateWithEnterpriseData() {
  return <ProductCreateScreen enterprisesLoader={getPlatformEnterprises} enterpriseLocationsLoader={getPlatformEnterpriseLocations} />;
}

export function PlatformProductDetailsWithEnterpriseData() {
  return <ProductDetailsScreen enterprisesLoader={getPlatformEnterprises} enterpriseLocationLoader={getPlatformEnterpriseLocationById} />;
}

export function PlatformProductEditWithEnterpriseData() {
  return <ProductEditScreen enterpriseLocationsLoader={getPlatformEnterpriseLocations} />;
}

export function PlatformServicesListWithEnterpriseData() {
  return <ServicesListScreen enterprisesLoader={getPlatformEnterprises} />;
}

export function PlatformServiceCreateWithEnterpriseData() {
  return <ServiceCreateScreen enterprisesLoader={getPlatformEnterprises} enterpriseLocationsLoader={getPlatformEnterpriseLocations} />;
}

export function PlatformServiceDetailsWithEnterpriseData() {
  return <ServiceDetailsScreen enterprisesLoader={getPlatformEnterprises} enterpriseLocationLoader={getPlatformEnterpriseLocationById} />;
}

export function PlatformServiceEditWithEnterpriseData() {
  return <ServiceEditScreen enterpriseLocationsLoader={getPlatformEnterpriseLocations} />;
}
