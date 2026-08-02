import PlatformAdminShell from "@/components/PlatformAdminShell";
import { ProductCreateScreen } from "@ihp/products";

export default function PlatformCreateProductPage() {
  return (
    <PlatformAdminShell>
      <ProductCreateScreen />
    </PlatformAdminShell>
  );
}
