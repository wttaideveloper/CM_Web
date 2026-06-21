"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import { getEnterpriseById, getEnterprises } from "@/services/enterprise.service";
import { getProducts } from "@/services/product.service";
import { getServices } from "@/services/service.service";
import type { EnterpriseDto } from "@/types/enterprise.types";
import type { ProductDto } from "@/types/product.types";
import type { ServiceDto } from "@/types/service.types";

const tabs = ["Overview", "Products", "Services", "Events", "Trainings"];

const performance = [
  { label: "Member Growth", value: "↑ 18%", tone: "text-[#16825b]" },
  { label: "Average Rating", value: "4.8 ★", tone: "text-[#d97706]" },
  { label: "Response Rate", value: "97%", tone: "text-[#2563eb]" },
  { label: "Completion Rate", value: "84%", tone: "text-[#7c3aed]" },
  { label: "Retention Rate", value: "91%", tone: "text-[#14532d]" },
];

function SectionLabel({ children }: { children: string }) {
  return <p className="text-sm font-bold text-[#06201c]">{children}</p>;
}

function resolveEnterpriseName(enterprise: EnterpriseDto) {
  return (
    enterprise.business_legal_name ||
    enterprise.business_short_name ||
    enterprise.name ||
    "Unnamed Enterprise"
  );
}

function resolveEnterpriseCategory(enterprise: EnterpriseDto) {
  const category = enterprise.business_category || (enterprise as EnterpriseDto & { category?: string }).category;

  if (!category || !category.trim()) {
    return "Enterprise";
  }

  return category.trim();
}

function formatAddress(address: string | null | undefined) {
  if (!address) {
    return "N/A";
  }

  return address.trim() || "N/A";
}

function formatImageUrl(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.trim();
}

function formatPrice(price: number) {
  return `₹${Number.isFinite(price) ? price.toFixed(2) : "0.00"}`;
}

function ProductCard({ product }: { product: ProductDto }) {
  const [hasImageError, setHasImageError] = useState(false);
  const imageSrc = product.product_images?.trim() || "";
  const hasImage = Boolean(imageSrc) && !hasImageError;
  const productName = product.product_name || "Unnamed Product";
  const productCategory = product.product_category || "N/A";
  const productStatus = product.product_status === false ? "Inactive" : "Active";

  return (
    <article className="overflow-hidden rounded-2xl border border-[#e6efea] bg-white shadow-sm">
      <div
        className="relative h-[160px] w-full overflow-hidden rounded-t-2xl border-b border-[#2a6f5c]"
        style={{
          backgroundColor: "#2f7d68",
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.22) 1px, transparent 1px), linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0))",
          backgroundSize: "24px 24px, 100% 100%",
        }}
      >
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt={productName}
            className="h-full w-full object-cover"
            onError={() => setHasImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12)_0_1px,transparent_1px)] bg-[length:28px_28px]" />
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7f9d94]">
              {productCategory}
            </p>
            <h4 className="mt-2 truncate text-base font-bold text-[#06201c]">
              {productName}
            </h4>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${
              productStatus === "Inactive"
                ? "bg-[#fff1f0] text-[#b42318]"
                : "bg-[#e8f6ee] text-[#16825b]"
            }`}
          >
            {productStatus}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[#06201c]">{formatPrice(product.product_price)}</p>
        </div>
      </div>
    </article>
  );
}

function ServiceCard({ service }: { service: ServiceDto }) {
  const serviceStatus = service.service_status === false ? "Inactive" : "Active";
  const availabilityStatus =
    service.availability_status === false ? "Unavailable" : "Available";
  const subtitle =
    service.service_description?.trim().slice(0, 84) || `${service.duration || 0} min`;

  return (
    <article className="rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e8f6ee] text-[#1f6a58]">
          <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
            <path
              d="M7 7h10M7 12h10M7 17h7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h4 className="truncate text-base font-bold text-[#06201c]">
                {service.service_name || "Unnamed Service"}
              </h4>
              <p className="mt-1 text-sm text-[#52736a]">
                {subtitle || `${service.duration || 0} min`}
              </p>
            </div>
            <p className="whitespace-nowrap text-sm font-bold text-[#06201c]">
              {formatPrice(service.service_price)}
            </p>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#f1f4f3] px-2.5 py-1 text-[11px] font-bold text-[#6b7f79]">
              {service.service_category || "N/A"}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                availabilityStatus === "Available"
                  ? "bg-[#e8f6ee] text-[#16825b]"
                  : "bg-[#fff7e5] text-[#b7791f]"
              }`}
            >
              {availabilityStatus}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                serviceStatus === "Active"
                  ? "bg-[#e8f6ee] text-[#16825b]"
                  : "bg-[#fff1f0] text-[#b42318]"
              }`}
            >
              {serviceStatus}
            </span>
            <span className="text-xs text-[#52736a]">{`${service.duration || 0} min`}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function EnterpriseDetailsPage() {
  const params = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [enterprise, setEnterprise] = useState<EnterpriseDto | null>(null);
  const [enterpriseOptions, setEnterpriseOptions] = useState<EnterpriseDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  const [hasLogoImageError, setHasLogoImageError] = useState(false);
  const [hasHeroImageError, setHasHeroImageError] = useState(false);

  async function fetchEnterpriseOptions() {
    try {
      setIsLoading(true);
      setError(null);

      const data = await getEnterprises();
      setEnterpriseOptions(data);
      setShowSelector(true);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load enterprise.");
      setShowSelector(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchEnterprise() {
    if (!params.id) {
      await fetchEnterpriseOptions();
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await getEnterpriseById(params.id);
      setEnterprise(data);
      setShowSelector(false);
    } catch {
      try {
        const data = await getEnterprises();
        setEnterpriseOptions(data);
        setShowSelector(true);
        setError(null);
      } catch (selectorError) {
        setError(selectorError instanceof Error ? selectorError.message : "Unable to load enterprise.");
        setShowSelector(false);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchEnterpriseProducts() {
    try {
      setIsLoadingProducts(true);
      const data = await getProducts();
      setProducts(data);
    } catch {
      setProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  }

  async function fetchEnterpriseServices() {
    try {
      setIsLoadingServices(true);
      const data = await getServices();
      setServices(data);
    } catch {
      setServices([]);
    } finally {
      setIsLoadingServices(false);
    }
  }

  useEffect(() => {
    void fetchEnterprise();
  }, [params.id]);

  useEffect(() => {
    void fetchEnterpriseProducts();
  }, []);

  useEffect(() => {
    void fetchEnterpriseServices();
  }, []);

  const currentId = params.id;
  const enterpriseName = enterprise ? resolveEnterpriseName(enterprise) : "Unnamed Enterprise";
  const enterpriseStatus = enterprise?.status === false ? "Inactive" : "Active";
  const aboutText = enterprise?.business_description || enterprise?.description || "N/A";
  const enterpriseLogoSrc = formatImageUrl(enterprise?.logo_url);
  const enterpriseHeroSrc = formatImageUrl(enterprise?.business_images);

  useEffect(() => {
    setHasLogoImageError(false);
  }, [enterpriseLogoSrc]);

  useEffect(() => {
    setHasHeroImageError(false);
  }, [enterpriseHeroSrc]);
  const enterpriseProducts = products.filter((product) => product.enterprise_id === currentId);
  const enterpriseServices = services.filter((service) => service.enterprise_id === currentId);
  const stats = [
    { label: "Members", value: "0" },
    { label: "Products", value: String(enterpriseProducts.length) },
    { label: "Services", value: String(enterpriseServices.length) },
    { label: "Revenue", value: "$0" },
  ];
  const contactItems = [
    { label: "Email", value: enterprise?.business_email || "N/A" },
    { label: "Phone", value: enterprise?.business_phone || "N/A" },
    { label: "Registration Number", value: enterprise?.registration_number || "N/A" },
    { label: "Business Category", value: enterprise?.business_category || "N/A" },
    { label: "Website", value: enterprise?.website_url || "N/A" },
    { label: "Year Founded", value: enterprise?.year_founded || "N/A" },
    {
      label: "Address",
      value: formatAddress(
        enterprise?.business_address ||
          enterprise?.registered_address ||
          enterprise?.communication_address,
      ),
    },
  ];

  if (isLoading) {
    return (
      <AppShell>
        <section className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm">
          <p className="text-base font-bold text-[#06201c]">Loading enterprise...</p>
          <p className="mt-2 text-sm text-[#52736a]">Please wait while we fetch the latest data.</p>
        </section>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <section className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm">
          <p className="text-base font-bold text-[#06201c]">Unable to load enterprise.</p>
          <p className="mt-2 text-sm text-[#52736a]">Please try again.</p>
          <button
            type="button"
            onClick={() => void fetchEnterprise()}
            className="mt-5 h-11 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm"
          >
            Retry
          </button>
        </section>
      </AppShell>
    );
  }

  if (showSelector) {
    return (
      <AppShell>
        <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-[#06201c]">Select an enterprise</h2>
          <p className="mt-2 text-sm text-[#52736a]">Choose an enterprise to view its details.</p>

          {enterpriseOptions.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] px-5 py-16 text-center">
              <p className="text-base font-bold text-[#06201c]">
                No enterprises found. Create an enterprise to get started.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {enterpriseOptions.map((item) => (
                <Link
                  key={item.id}
                  href={`/enterprises/${item.id}`}
                  className="rounded-2xl border border-[#e1ebe6] bg-[#f9fcfa] p-5 transition-colors hover:bg-[#f4faf7]"
                >
                  <p className="text-base font-bold text-[#06201c]">{resolveEnterpriseName(item)}</p>
                  <p className="mt-2 text-sm text-[#52736a]">{item.business_email || "N/A"}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="enterprise-hero-card overflow-hidden rounded-3xl border border-[#d9e8e1] bg-white shadow-sm dark:!bg-[#0b211b]">
        <div className="relative overflow-hidden bg-[#1f6a58] px-6 py-7 text-white">
          {enterpriseHeroSrc && !hasHeroImageError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={enterpriseHeroSrc}
              alt={`${enterpriseName} banner`}
              className="absolute inset-0 z-0 h-full w-full object-cover"
              onError={() => setHasHeroImageError(true)}
            />
          ) : null}
          {enterpriseHeroSrc && !hasHeroImageError ? (
            <div className="absolute inset-0 z-10 bg-black/30" />
          ) : (
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.2)_0_1px,transparent_1px),linear-gradient(135deg,rgba(31,106,88,0.96),rgba(54,133,108,0.86))] bg-[length:36px_36px,auto]" />
          )}
          <div className="relative z-20 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white/95 text-2xl font-extrabold text-[#1f6a58]">
                {enterpriseLogoSrc && !hasLogoImageError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={enterpriseLogoSrc}
                    alt={enterpriseName}
                    className="h-full w-full object-cover"
                    onError={() => setHasLogoImageError(true)}
                  />
                ) : (
                  enterpriseName.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-bold">{enterpriseName}</h2>
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
                    {enterpriseStatus}
                  </span>
                </div>
                <p className="mt-1 text-sm text-white/80">
                  {resolveEnterpriseCategory(enterprise)} · {enterpriseStatus}
                </p>
              </div>
            </div>
            <Link
              href={`/enterprises/${currentId}/edit`}
              className="inline-flex h-12 items-center rounded-full bg-white px-5 text-sm font-bold text-[#1f6a58]"
            >
              Edit
            </Link>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <div
              key={item.label}
              className="group rounded-2xl border border-[#e1ebe6] bg-[#f9fcfa] p-5 transition-all duration-200 hover:bg-gradient-to-br hover:from-[#1f6a58] hover:to-[#8fc9a8] hover:shadow-md dark:!border-[#21463c] dark:!bg-[#0b211b] dark:hover:!from-[#1f6a58] dark:hover:!to-[#38b98f]"
            >
              <p className="text-sm text-[#52736a] transition-colors duration-200 group-hover:text-white dark:!text-[#bdd2cb] dark:group-hover:!text-white">{item.label}</p>
              <p className="mt-2 text-2xl font-extrabold text-[#06201c] transition-colors duration-200 group-hover:text-white dark:!text-[#f8fffc] dark:group-hover:!text-white">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-5 flex gap-2 overflow-x-auto rounded-2xl border border-[#e1ebe6] bg-white p-2 shadow-sm dark:!border-[#21463c] dark:!bg-[#0b211b]">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`h-10 whitespace-nowrap rounded-xl px-4 text-sm font-bold ${
              activeTab === tab
                ? "bg-[#e9f4ee] text-[#1f6a58] dark:!bg-[#103329] dark:!text-[#5ad2a8]"
                : "text-[#52736a] hover:bg-[#f4faf7] dark:!text-[#bdd2cb] dark:hover:!bg-[#103329] dark:hover:!text-[#f8fffc]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Overview" ? (
        <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[#06201c]">Overview</h3>
            <div className="mt-5">
              <SectionLabel>About</SectionLabel>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#52736a]">
                {aboutText}
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {contactItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#b9d8cc] hover:shadow-md"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#06201c]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[#06201c]">Performance</h3>
            <div className="mt-4">
              {performance.map((item, index) => (
                <div
                  key={item.label}
                  className={`flex items-center justify-between py-3 ${
                    index === 0
                      ? ""
                      : "border-t border-[#edf3f0] dark:!border-[rgba(167,195,186,0.06)]"
                  }`}
                >
                  <span className="text-sm font-semibold text-[#52736a]">
                    {item.label}
                  </span>
                  <span className="text-sm font-extrabold text-[#52736a]">
                    N/A
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "Products" ? (
        <section className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <input
              type="search"
              placeholder="Search products..."
              className="h-12 w-full rounded-2xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58] sm:max-w-sm"
            />
            <Link
              href="/products/create"
              className="inline-flex h-12 items-center rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm"
            >
              + Add Product
            </Link>
          </div>

          {isLoadingProducts ? (
            <div className="mt-5 rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] px-5 py-16 text-center">
              <p className="text-base font-bold text-[#06201c]">Loading products...</p>
            </div>
          ) : enterpriseProducts.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] px-5 py-16 text-center">
              <p className="text-base font-bold text-[#06201c]">No products available yet.</p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {enterpriseProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {activeTab === "Services" ? (
        <section className="mt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-bold text-[#06201c]">Services</h3>
            <Link
              href="/services/create"
              className="inline-flex h-12 items-center rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm"
            >
              + Add Service
            </Link>
          </div>
          {isLoadingServices ? (
            <div className="mt-4 rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] px-5 py-16 text-center">
              <p className="text-base font-bold text-[#06201c]">Loading services...</p>
            </div>
          ) : enterpriseServices.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] px-5 py-16 text-center">
              <p className="text-base font-bold text-[#06201c]">No services available yet.</p>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {enterpriseServices.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {activeTab === "Events" ? (
        <div className="mt-5 rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] px-5 py-16 text-center">
          <p className="text-base font-bold text-[#06201c]">No events available yet.</p>
        </div>
      ) : null}

      {activeTab === "Trainings" ? (
        <div className="mt-5 rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] px-5 py-16 text-center">
          <p className="text-base font-bold text-[#06201c]">No trainings available yet.</p>
        </div>
      ) : null}
    </AppShell>
  );
}
