import type {
  EnterpriseProductSummariesLoader,
  EnterpriseServiceSummariesLoader,
} from "@ihp/enterprises";
import { getProducts } from "@ihp/products";
import { getServices } from "@ihp/services";

export const loadEnterpriseProductSummaries: EnterpriseProductSummariesLoader = async (enterpriseId) => {
  try {
    const products = await getProducts();

    return products
      .filter((product) => product.enterprise_id === enterpriseId)
      .map((product) => ({
        id: product.id,
        productName: product.product_name,
        productCategory: product.product_category,
        productPrice: product.product_price,
        productImages: product.product_images,
        productStatus: product.product_status,
        ...(product.currency ? { currency: product.currency } : {}),
      }));
  } catch {
    return [];
  }
};

export const loadEnterpriseServiceSummaries: EnterpriseServiceSummariesLoader = async (enterpriseId) => {
  try {
    const services = await getServices();

    return services
      .filter((service) => service.enterprise_id === enterpriseId)
      .map((service) => ({
        id: service.id,
        serviceName: service.service_name,
        serviceDescription: service.service_description,
        serviceCategory: service.service_category,
        servicePrice: service.service_price,
        duration: service.duration,
        availabilityStatus: service.availability_status,
        serviceStatus: service.service_status,
        ...(service.currency ? { currency: service.currency } : {}),
      }));
  } catch {
    return [];
  }
};
