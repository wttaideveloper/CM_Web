import type { CreateProductPayload, ProductDto, UpdateProductPayload } from "@/types/product.types";

export async function getProducts(): Promise<ProductDto[]> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error("API base URL is not configured.");
  }

  const response = await fetch(`${baseUrl}/api/v1/api/products/`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load products (${response.status} ${response.statusText}).`);
  }

  return response.json();
}

export async function getProductById(id: string): Promise<ProductDto> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error("API base URL is not configured.");
  }

  const response = await fetch(`${baseUrl}/api/v1/api/products/${id}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load product (${response.status} ${response.statusText}).`);
  }

  return response.json();
}

export async function createProduct(payload: CreateProductPayload): Promise<ProductDto> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error("API base URL is not configured.");
  }

  const response = await fetch(`${baseUrl}/api/v1/api/products/`, {
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
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error("API base URL is not configured.");
  }

  const response = await fetch(`${baseUrl}/api/v1/api/products/${id}`, {
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

export async function deactivateProduct(id: string): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error("API base URL is not configured.");
  }

  const response = await fetch(`${baseUrl}/api/v1/api/products/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Failed to deactivate product (${response.status} ${response.statusText}).`);
  }

  return response.text();
}

export async function activateProduct(id: string): Promise<ProductDto> {
  return updateProduct(id, { product_status: true });
}
