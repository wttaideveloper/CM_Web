import PlatformAdminShell from "@/components/PlatformAdminShell";
import { ProductsListScreen } from "@ihp/products";

export default function PlatformProductsPage() {
  return (
    <PlatformAdminShell>
      <ProductsListScreen />
    </PlatformAdminShell>
  );
}
