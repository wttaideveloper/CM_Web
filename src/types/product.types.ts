export type ProductDto = {
  id: string;
  enterprise_id: string;
  product_name: string;
  product_description: string;
  product_category: string;
  product_price: number;
  product_images: string;
  product_status: boolean;
};

export type CreateProductPayload = {
  enterprise_id: string;
  product_name: string;
  product_description: string;
  product_category: string;
  product_price: number;
  product_images: string;
  product_status: boolean;
};

export type UpdateProductPayload = Partial<{
  product_name: string;
  product_description: string;
  product_category: string;
  product_price: number;
  product_images: string;
  product_status: boolean;
}>;

export type ProductListItem = {
  id: string;
  enterpriseId: string;
  name: string;
  description: string;
  category: string;
  price: string;
  image: string;
  status: "Active" | "Inactive";
  enterprise: string;
  stock: string;
  sales: string;
};
