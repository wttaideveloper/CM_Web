import { API_BASE_URL } from "@/lib/api";
import type { CreateProductPayload, ProductDto, UpdateProductPayload } from "@/types/product.types";

type ProductListResponse = ProductDto[] | { items?: ProductDto[] };

function isProductArray(value: unknown): value is ProductDto[] {
  return Array.isArray(value);
}

function isProductListResponse(value: unknown): value is { items?: ProductDto[] } {
  return typeof value === "object" && value !== null && "items" in value;
}

export async function getProducts(): Promise<ProductDto[]> {
  const response = await fetch(`${API_BASE_URL}/products/`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load products (${response.status} ${response.statusText}).`);
  }

  const data: ProductListResponse = await response.json();

  if (isProductArray(data)) {
    return data;
  }

  if (isProductListResponse(data) && Array.isArray(data.items)) {
    return data.items;
  }

  return [];
}

export async function getProductById(id: string): Promise<ProductDto> {
  const response = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load product (${response.status} ${response.statusText}).`);
  }

  return response.json();
}

export async function createProduct(payload: CreateProductPayload): Promise<ProductDto> {
  const response = await fetch(`${API_BASE_URL}/products/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to create product (${response.status} ${response.statusText}).`);
  }

  return response.json();
}

export async function updateProduct(
  id: string,
  payload: UpdateProductPayload,
): Promise<ProductDto> {
  const response = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to update product (${response.status} ${response.statusText}).`);
  }

  return response.json();
}

export async function deactivateProduct(id: string): Promise<ProductDto> {
  return updateProduct(id, { product_status: false });
}

export async function activateProduct(id: string): Promise<ProductDto> {
  return updateProduct(id, { product_status: true });
}
