"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { City, Country, State } from "country-state-city";

import AppShell from "@/components/layout/AppShell";
import {
  createEnterpriseLocation,
  deleteLocation,
  getEnterpriseLocations,
  updateLocation,
} from "@/services/enterprise-location.service";
import { getEnterpriseById, getEnterprises } from "@/services/enterprise.service";
import { formatCurrency } from "@/lib/format-currency";
import { getProducts } from "@/services/product.service";
import { getServices } from "@/services/service.service";
import type { EnterpriseDto } from "@/types/enterprise.types";
import type { EnterpriseLocationDto } from "@/types/location.types";
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

const countryOptions = Country.getAllCountries().sort((left, right) => left.name.localeCompare(right.name));

function SectionLabel({ children }: { children: string }) {
  return <p className="text-sm font-bold text-[#06201c]">{children}</p>;
}

function normalizeLookupValue(value: string) {
  return value.trim().toLowerCase();
}

function formatPhoneCode(phonecode: string) {
  const trimmed = phonecode.trim();
  return trimmed.startsWith("+") ? trimmed : `+${trimmed}`;
}

function findCountryOption(value: string) {
  const normalizedValue = normalizeLookupValue(value);
  return countryOptions.find((country) => {
    return (
      normalizeLookupValue(country.name) === normalizedValue ||
      normalizeLookupValue(country.isoCode) === normalizedValue
    );
  });
}

function getStateOptions(countryCode: string) {
  return State.getStatesOfCountry(countryCode).sort((left, right) => left.name.localeCompare(right.name));
}

function findStateOption(countryCode: string, value: string) {
  const normalizedValue = normalizeLookupValue(value);
  return getStateOptions(countryCode).find((state) => {
    return (
      normalizeLookupValue(state.name) === normalizedValue ||
      normalizeLookupValue(state.isoCode) === normalizedValue
    );
  });
}

function getCityOptions(countryCode: string, stateCode: string) {
  return City.getCitiesOfState(countryCode, stateCode).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

function findCityOption(countryCode: string, stateCode: string, value: string) {
  const normalizedValue = normalizeLookupValue(value);
  return getCityOptions(countryCode, stateCode).find((city) => {
    return normalizeLookupValue(city.name) === normalizedValue;
  });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitPhoneNumber(phone: string, phoneCode: string) {
  const trimmedPhone = phone.trim();
  const trimmedCode = phoneCode.trim();

  if (!trimmedPhone || !trimmedCode) {
    return trimmedPhone;
  }

  const codePattern = new RegExp(`^${escapeRegExp(trimmedCode)}(?:\\s+|[-\\s]*)`, "i");
  return trimmedPhone.replace(codePattern, "").trim();
}

function sanitizePhoneNumber(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function joinPhoneValue(phoneCode: string, phoneNumber: string) {
  const trimmedNumber = sanitizePhoneNumber(phoneNumber);

  if (!trimmedNumber) {
    return "";
  }

  return `${phoneCode} ${trimmedNumber}`;
}

type LocationDraft = {
  location_name: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  phone: string;
  email: string;
  latitude: string;
  longitude: string;
  status: string;
};

function createLocationDraft(location?: EnterpriseLocationDto): LocationDraft {
  const status = location?.status?.trim().toLowerCase() ?? "";

  return {
    location_name: location?.location_name ?? "",
    address_line_1: location?.address_line_1 ?? "",
    address_line_2: location?.address_line_2 ?? "",
    city: location?.city ?? "",
    state: location?.state ?? "",
    country: location?.country ?? "",
    postal_code: location?.postal_code ?? "",
    phone: location?.phone ?? "",
    email: location?.email ?? "",
    latitude: location?.latitude !== undefined && location?.latitude !== null ? String(location.latitude) : "",
    longitude:
      location?.longitude !== undefined && location?.longitude !== null ? String(location.longitude) : "",
    status: status === "active" || status === "inactive" || status === "draft" ? status : "",
  };
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const next = Number(trimmed);
  return Number.isFinite(next) ? next : null;
}

function resolveEnterpriseName(enterprise: EnterpriseDto) {
  return (
    enterprise.business_legal_name ||
    enterprise.business_short_name ||
    enterprise.name ||
    "Unnamed Enterprise"
  );
}

function resolveEnterpriseCategory(enterprise: EnterpriseDto | null) {
  if (!enterprise) {
    return "Enterprise";
  }

  const category = enterprise.business_category || (enterprise as EnterpriseDto & { category?: string }).category;

  if (!category || !category.trim()) {
    return "Enterprise";
  }

  return category.trim();
}

function formatImageUrl(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.trim();
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
          <p className="text-sm font-semibold text-[#06201c]">
            {formatCurrency(product.product_price, product.currency)}
          </p>
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
              {formatCurrency(service.service_price, service.currency)}
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

function LocationCard({
  location,
  onEdit,
  onDelete,
  isDeleting,
}: {
  location: EnterpriseLocationDto;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}) {
  const addressParts = [location.address_line_1, location.address_line_2, location.city, location.state, location.country, location.postal_code]
    .filter((part) => Boolean(part && part.trim()))
    .join(", ");

  return (
    <article className="rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#c6ddd3] hover:shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-base font-bold text-[#06201c]">{location.location_name}</h4>
            <span className="rounded-full bg-[#e8f6ee] px-2.5 py-1 text-[11px] font-bold text-[#16825b]">
              {location.status?.trim() || "Active"}
            </span>
          </div>
          <p className="mt-2 text-sm text-[#52736a]">{addressParts || "N/A"}</p>
          <div className="mt-3 grid gap-2 text-sm text-[#52736a] sm:grid-cols-2">
            <p>Phone: {location.phone?.trim() || "N/A"}</p>
            <p>Email: {location.email?.trim() || "N/A"}</p>
            <p>Latitude: {location.latitude ?? "N/A"}</p>
            <p>Longitude: {location.longitude ?? "N/A"}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full border border-[#d7e5df] px-3 py-2 text-xs font-semibold text-[#1f6a58] hover:bg-[#f4faf7]"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            className="rounded-full border border-[#d7e5df] px-3 py-2 text-xs font-semibold text-[#b42318] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

type EnterpriseDetailsPageProps = {
  enterpriseId?: string;
  editHref?: string;
  productCreateHref?: string;
  serviceCreateHref?: string;
  allowEnterpriseSelector?: boolean;
  emptyValue?: string;
};

function formatDisplayValue(value: unknown, emptyValue: string): string {
  if (value === null || value === undefined) {
    return emptyValue;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || emptyValue;
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    const cleaned: string[] = value
      .map((item) => formatDisplayValue(item, ""))
      .filter((item) => item);

    return cleaned.length > 0 ? cleaned.join(", ") : emptyValue;
  }

  if (typeof value === "object") {
    return emptyValue;
  }

  return String(value);
}

export function EnterpriseDetailsPage({
  enterpriseId,
  editHref,
  productCreateHref = "/products/create",
  serviceCreateHref = "/services/create",
  allowEnterpriseSelector = true,
  emptyValue = "N/A",
}: EnterpriseDetailsPageProps = {}) {
  const params = useParams<{ id: string }>();
  const resolvedEnterpriseId = enterpriseId ?? params.id;
  const resolvedEditHref = editHref ?? `/enterprises/${resolvedEnterpriseId}/edit`;
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [enterprise, setEnterprise] = useState<EnterpriseDto | null>(null);
  const [enterpriseOptions, setEnterpriseOptions] = useState<EnterpriseDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [locations, setLocations] = useState<EnterpriseLocationDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  const [hasLogoImageError, setHasLogoImageError] = useState(false);
  const [hasHeroImageError, setHasHeroImageError] = useState(false);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [locationDraft, setLocationDraft] = useState<LocationDraft>(() => createLocationDraft());
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

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
    if (!resolvedEnterpriseId) {
      if (allowEnterpriseSelector) {
        await fetchEnterpriseOptions();
      } else {
        setError("Unable to load enterprise.");
        setIsNotFound(false);
        setShowSelector(false);
        setIsLoading(false);
      }
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setIsNotFound(false);

      const data = await getEnterpriseById(resolvedEnterpriseId);
      setEnterprise(data);
      setShowSelector(false);
    } catch (fetchError) {
      const nextError =
        fetchError instanceof Error ? fetchError.message : "Unable to load enterprise.";
      setIsNotFound(nextError.includes("(404"));

      if (allowEnterpriseSelector) {
        try {
          const data = await getEnterprises();
          setEnterpriseOptions(data);
          setShowSelector(true);
          setError(null);
        } catch (selectorError) {
          setError(
            selectorError instanceof Error ? selectorError.message : "Unable to load enterprise.",
          );
          setShowSelector(false);
        }
      } else {
        setError(nextError);
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

  async function fetchEnterpriseLocations(enterpriseId: string) {
    try {
      setIsLoadingLocations(true);
      setLocationsError(null);
      const data = await getEnterpriseLocations(enterpriseId);
      setLocations(data);
    } catch (fetchError) {
      setLocations([]);
      setLocationsError(
        fetchError instanceof Error ? fetchError.message : "Unable to load locations.",
      );
    } finally {
      setIsLoadingLocations(false);
    }
  }

  function openNewLocationForm() {
    setEditingLocationId(null);
    setLocationDraft(createLocationDraft());
    setLocationError(null);
    setLocationsError(null);
    setShowLocationForm(true);
  }

  function openEditLocationForm(location: EnterpriseLocationDto) {
    setEditingLocationId(location.id);
    setLocationDraft(createLocationDraft(location));
    setLocationError(null);
    setLocationsError(null);
    setShowLocationForm(true);
  }

  async function saveLocation() {
    const enterpriseId = currentId;

    if (!enterpriseId) {
      return;
    }

    if (!locationDraft.location_name.trim() || !locationDraft.address_line_1.trim()) {
      setLocationError("Location name and Address Line 1 are required.");
      return;
    }

    const normalizedPhone = selectedPhoneCode
      ? joinPhoneValue(selectedPhoneCode, locationPhoneNumber)
      : locationDraft.phone.trim();

    const payload = {
      location_name: locationDraft.location_name.trim(),
      address_line_1: locationDraft.address_line_1.trim(),
      address_line_2: locationDraft.address_line_2.trim() || undefined,
      city: locationDraft.city.trim(),
      state: locationDraft.state.trim(),
      country: locationDraft.country.trim(),
      postal_code: locationDraft.postal_code.trim(),
      phone: normalizedPhone || undefined,
      email: locationDraft.email.trim() || undefined,
      latitude: parseOptionalNumber(locationDraft.latitude),
      longitude: parseOptionalNumber(locationDraft.longitude),
      status: locationDraft.status.trim().toLowerCase() || undefined,
    };

    try {
      setIsSavingLocation(true);
      setLocationError(null);
      setLocationsError(null);

      const savedLocation = editingLocationId
        ? await updateLocation(editingLocationId, payload)
        : await createEnterpriseLocation(enterpriseId, payload);

      setLocations((current) => {
        if (editingLocationId) {
          return current.map((location) => (location.id === savedLocation.id ? savedLocation : location));
        }

        return [savedLocation, ...current];
      });
      setShowLocationForm(false);
      setEditingLocationId(null);
      setLocationDraft(createLocationDraft());
    } catch (saveError) {
      setLocationError(saveError instanceof Error ? saveError.message : "Unable to save location.");
    } finally {
      setIsSavingLocation(false);
    }
  }

  async function handleDeleteLocation(locationId: string) {
    try {
      setLocationError(null);
      setLocationsError(null);
      await deleteLocation(locationId);
      setLocations((current) => current.filter((location) => location.id !== locationId));
    } catch (deleteError) {
      setLocationError(deleteError instanceof Error ? deleteError.message : "Unable to delete location.");
    }
  }

  useEffect(() => {
    void fetchEnterprise();
  }, [resolvedEnterpriseId, allowEnterpriseSelector]);

  useEffect(() => {
    void fetchEnterpriseProducts();
  }, []);

  useEffect(() => {
    void fetchEnterpriseServices();
  }, []);

  useEffect(() => {
    if (!resolvedEnterpriseId) {
      setLocations([]);
      setIsLoadingLocations(false);
      return;
    }

    void fetchEnterpriseLocations(resolvedEnterpriseId);
  }, [resolvedEnterpriseId]);

  const currentId = resolvedEnterpriseId;
  const enterpriseName = enterprise ? resolveEnterpriseName(enterprise) : "Unnamed Enterprise";
  const enterpriseStatus = enterprise?.status === false ? "Inactive" : "Active";
  const selectedCountry = findCountryOption(locationDraft.country);
  const selectedCountryCode = selectedCountry?.isoCode ?? "";
  const selectedPhoneCode = selectedCountry ? formatPhoneCode(selectedCountry.phonecode) : "";
  const selectedState = selectedCountryCode
    ? findStateOption(selectedCountryCode, locationDraft.state)
    : undefined;
  const selectedStateCode = selectedState?.isoCode ?? "";
  const selectedCity = selectedCountryCode && selectedStateCode
    ? findCityOption(selectedCountryCode, selectedStateCode, locationDraft.city)
    : undefined;
  const locationPhoneNumber = selectedPhoneCode
    ? sanitizePhoneNumber(splitPhoneNumber(locationDraft.phone, selectedPhoneCode))
    : sanitizePhoneNumber(locationDraft.phone.trim());
  const aboutText = formatDisplayValue(
    enterprise?.business_description || enterprise?.description,
    emptyValue,
  );
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
    { label: "Email", value: formatDisplayValue(enterprise?.business_email, emptyValue) },
    { label: "Phone", value: formatDisplayValue(enterprise?.business_phone, emptyValue) },
    {
      label: "Registration Number",
      value: formatDisplayValue(enterprise?.registration_number, emptyValue),
    },
    {
      label: "Business Category",
      value: formatDisplayValue(enterprise?.business_category, emptyValue),
    },
    { label: "Website", value: formatDisplayValue(enterprise?.website_url, emptyValue) },
    { label: "Year Founded", value: formatDisplayValue(enterprise?.year_founded, emptyValue) },
    {
      label: "Address",
      value: formatDisplayValue(
        enterprise?.business_address ||
          enterprise?.registered_address ||
          enterprise?.communication_address,
        emptyValue,
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
          <p className="text-base font-bold text-[#06201c]">
            {isNotFound ? "Enterprise not found." : "Unable to load enterprise."}
          </p>
          <p className="mt-2 text-sm text-[#52736a]">{error}</p>
          {!isNotFound ? (
            <button
              type="button"
              onClick={() => void fetchEnterprise()}
              className="mt-5 h-11 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm"
            >
              Retry
            </button>
          ) : null}
        </section>
      </AppShell>
    );
  }

  if (showSelector && allowEnterpriseSelector) {
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
      <section className="enterprise-hero-card overflow-hidden rounded-3xl border border-[#d9e8e1] bg-white shadow-sm">
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
              href={resolvedEditHref}
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
            className="group rounded-2xl border border-[#e1ebe6] bg-[#f9fcfa] p-5 transition-all duration-200 hover:bg-gradient-to-br hover:from-[#1f6a58] hover:to-[#8fc9a8] hover:shadow-md"
            >
              <p className="text-sm text-[#52736a] transition-colors duration-200 group-hover:text-white">{item.label}</p>
              <p className="mt-2 text-2xl font-extrabold text-[#06201c] transition-colors duration-200 group-hover:text-white">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-5 flex gap-2 overflow-x-auto rounded-2xl border border-[#e1ebe6] bg-white p-2 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`h-10 whitespace-nowrap rounded-xl px-4 text-sm font-bold ${
              activeTab === tab
                ? "bg-[#e9f4ee] text-[#1f6a58]"
                : "text-[#52736a] hover:bg-[#f4faf7]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Overview" ? (
        <>
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
                        : "border-t border-[#edf3f0]"
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

          <section className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#06201c]">Locations</h3>
                <p className="mt-1 text-sm text-[#52736a]">
                  Manage the enterprise locations used across the platform.
                </p>
              </div>
              <button
                type="button"
                onClick={openNewLocationForm}
                className="inline-flex h-12 items-center rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm"
              >
                + Add Location
              </button>
            </div>

            {locationsError || locationError ? (
              <p className="mt-4 rounded-2xl border border-[#f5c2c7] bg-[#fff5f5] px-4 py-3 text-sm font-medium text-[#b42318]">
                {locationsError || locationError}
              </p>
            ) : null}

            {showLocationForm ? (
              <div className="mt-5 rounded-2xl border border-[#e1ebe6] bg-[#f9fcfa] p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">
                      {editingLocationId ? "Edit Location" : "Add Location"}
                    </p>
                    <h4 className="mt-1 text-base font-bold text-[#06201c]">
                      {editingLocationId ? "Update location details" : "Create a new location"}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLocationForm(false);
                      setEditingLocationId(null);
                      setLocationDraft(createLocationDraft());
                      setLocationError(null);
                    }}
                    className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a] hover:bg-[#f4faf7]"
                  >
                    Cancel
                  </button>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-bold text-[#06201c]">Location Name</span>
                    <input
                      type="text"
                      value={locationDraft.location_name}
                      onChange={(event) =>
                        setLocationDraft((current) => ({
                          ...current,
                          location_name: event.target.value,
                        }))
                      }
                      className="mt-1.5 h-[46px] w-full rounded-xl border border-[#d7e5df] bg-white px-3.5 text-sm text-[#06201c] outline-none focus:border-[#1f6a58]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold text-[#06201c]">Address Line 1</span>
                    <input
                      type="text"
                      value={locationDraft.address_line_1}
                      onChange={(event) =>
                        setLocationDraft((current) => ({
                          ...current,
                          address_line_1: event.target.value,
                        }))
                      }
                      className="mt-1.5 h-[46px] w-full rounded-xl border border-[#d7e5df] bg-white px-3.5 text-sm text-[#06201c] outline-none focus:border-[#1f6a58]"
                    />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="text-sm font-bold text-[#06201c]">Address Line 2</span>
                    <textarea
                      value={locationDraft.address_line_2}
                      onChange={(event) =>
                        setLocationDraft((current) => ({
                          ...current,
                          address_line_2: event.target.value,
                        }))
                      }
                      className="mt-1.5 min-h-24 w-full rounded-xl border border-[#d7e5df] bg-white px-3.5 py-3 text-sm text-[#06201c] outline-none focus:border-[#1f6a58]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold text-[#06201c]">Country</span>
                    <select
                      value={selectedCountry?.isoCode ?? ""}
                      onChange={(event) => {
                        const nextCountry = countryOptions.find(
                          (country) => country.isoCode === event.target.value,
                        );
                        const nextPhoneCode = nextCountry ? formatPhoneCode(nextCountry.phonecode) : "";
                        const currentPhoneNumber = selectedPhoneCode
                          ? splitPhoneNumber(locationDraft.phone, selectedPhoneCode)
                          : locationDraft.phone.trim();

                        setLocationDraft((current) => ({
                          ...current,
                          country: nextCountry?.name ?? "",
                          state: "",
                          city: "",
                          phone: nextCountry ? joinPhoneValue(nextPhoneCode, currentPhoneNumber) : "",
                        }));
                      }}
                      className="mt-1.5 h-[46px] w-full rounded-xl border border-[#d7e5df] bg-white px-3.5 text-sm text-[#06201c] outline-none disabled:cursor-not-allowed disabled:bg-[#f3f7f5] disabled:text-[#8ca69e] focus:border-[#1f6a58]"
                    >
                      <option value="">Select country</option>
                      {countryOptions.map((country) => (
                        <option key={country.isoCode} value={country.isoCode}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold text-[#06201c]">State</span>
                    <select
                      value={selectedState?.isoCode ?? ""}
                      onChange={(event) => {
                        const nextState = selectedCountryCode
                          ? getStateOptions(selectedCountryCode).find(
                              (state) => state.isoCode === event.target.value,
                            )
                          : undefined;

                        setLocationDraft((current) => ({
                          ...current,
                          state: nextState?.name ?? "",
                          city: "",
                        }));
                      }}
                      disabled={!selectedCountryCode}
                      className="mt-1.5 h-[46px] w-full rounded-xl border border-[#d7e5df] bg-white px-3.5 text-sm text-[#06201c] outline-none disabled:cursor-not-allowed disabled:bg-[#f3f7f5] disabled:text-[#8ca69e] focus:border-[#1f6a58]"
                    >
                      <option value="">
                        {selectedCountryCode ? "Select state" : "Select country first"}
                      </option>
                      {selectedCountryCode
                        ? getStateOptions(selectedCountryCode).map((state) => (
                            <option key={state.isoCode} value={state.isoCode}>
                              {state.name}
                            </option>
                          ))
                        : null}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold text-[#06201c]">City</span>
                    <select
                      value={selectedCity?.name ?? ""}
                      onChange={(event) => {
                        const nextCity = selectedCountryCode && selectedStateCode
                          ? getCityOptions(selectedCountryCode, selectedStateCode).find(
                              (city) => city.name === event.target.value,
                            )
                          : undefined;

                        setLocationDraft((current) => ({
                          ...current,
                          city: nextCity?.name ?? "",
                        }));
                      }}
                      disabled={!selectedStateCode}
                      className="mt-1.5 h-[46px] w-full rounded-xl border border-[#d7e5df] bg-white px-3.5 text-sm text-[#06201c] outline-none disabled:cursor-not-allowed disabled:bg-[#f3f7f5] disabled:text-[#8ca69e] focus:border-[#1f6a58]"
                    >
                      <option value="">
                        {selectedStateCode ? "Select city" : "Select state first"}
                      </option>
                      {selectedCountryCode && selectedStateCode
                        ? getCityOptions(selectedCountryCode, selectedStateCode).map((city) => (
                            <option key={city.name} value={city.name}>
                              {city.name}
                            </option>
                          ))
                        : null}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold text-[#06201c]">Phone</span>
                    <div className="mt-1.5 flex gap-2">
                      <input
                        type="text"
                        value={selectedPhoneCode}
                        readOnly
                        disabled={!selectedCountryCode}
                        className="h-[46px] w-[110px] shrink-0 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-2 text-sm text-[#06201c] outline-none disabled:cursor-not-allowed disabled:bg-[#f3f7f5] disabled:text-[#8ca69e]"
                      />
                      <input
                        type="text"
                        value={locationPhoneNumber}
                        onChange={(event) =>
                          setLocationDraft((current) => ({
                            ...current,
                            phone: selectedPhoneCode
                              ? joinPhoneValue(selectedPhoneCode, event.target.value)
                              : sanitizePhoneNumber(event.target.value),
                          }))
                        }
                        inputMode="numeric"
                        pattern="[0-9]*"
                        disabled={!selectedCountryCode}
                        className="h-[46px] min-w-0 flex-1 rounded-xl border border-[#d7e5df] bg-white px-3.5 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] disabled:cursor-not-allowed disabled:bg-[#f3f7f5] disabled:text-[#8ca69e] focus:border-[#1f6a58]"
                      />
                    </div>
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold text-[#06201c]">Postal Code</span>
                    <input
                      type="text"
                      value={locationDraft.postal_code}
                      onChange={(event) =>
                        setLocationDraft((current) => ({
                          ...current,
                          postal_code: event.target.value,
                        }))
                      }
                      className="mt-1.5 h-[46px] w-full rounded-xl border border-[#d7e5df] bg-white px-3.5 text-sm text-[#06201c] outline-none focus:border-[#1f6a58]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold text-[#06201c]">Email</span>
                    <input
                      type="text"
                      value={locationDraft.email}
                      onChange={(event) =>
                        setLocationDraft((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      className="mt-1.5 h-[46px] w-full rounded-xl border border-[#d7e5df] bg-white px-3.5 text-sm text-[#06201c] outline-none focus:border-[#1f6a58]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold text-[#06201c]">Latitude</span>
                    <input
                      type="number"
                      value={locationDraft.latitude}
                      onChange={(event) =>
                        setLocationDraft((current) => ({
                          ...current,
                          latitude: event.target.value,
                        }))
                      }
                      className="mt-1.5 h-[46px] w-full rounded-xl border border-[#d7e5df] bg-white px-3.5 text-sm text-[#06201c] outline-none focus:border-[#1f6a58]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold text-[#06201c]">Longitude</span>
                    <input
                      type="number"
                      value={locationDraft.longitude}
                      onChange={(event) =>
                        setLocationDraft((current) => ({
                          ...current,
                          longitude: event.target.value,
                        }))
                      }
                      className="mt-1.5 h-[46px] w-full rounded-xl border border-[#d7e5df] bg-white px-3.5 text-sm text-[#06201c] outline-none focus:border-[#1f6a58]"
                    />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="text-sm font-bold text-[#06201c]">Status</span>
                    <select
                      value={locationDraft.status}
                      onChange={(event) =>
                        setLocationDraft((current) => ({
                          ...current,
                          status: event.target.value,
                        }))
                      }
                      className="mt-1.5 h-11 w-full rounded-xl border border-[#d7e5df] bg-white px-3.5 text-sm text-[#06201c] outline-none focus:border-[#1f6a58]"
                    >
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                    </select>
                  </label>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={saveLocation}
                    disabled={isSavingLocation}
                    className="h-11 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingLocation ? "Saving..." : editingLocationId ? "Save Changes" : "Save Location"}
                  </button>
                </div>
              </div>
            ) : null}

            {isLoadingLocations ? (
              <div className="mt-5 rounded-2xl border border-dashed border-[#d7e5df] bg-[#f9fcfa] px-5 py-14 text-center">
                <p className="text-base font-bold text-[#06201c]">Loading locations...</p>
              </div>
            ) : locations.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-[#d7e5df] bg-[#f9fcfa] px-5 py-14 text-center">
                <p className="text-base font-bold text-[#06201c]">No locations added yet.</p>
                <p className="mt-2 text-sm text-[#52736a]">Add the first enterprise location to get started.</p>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {locations.map((location) => (
                  <LocationCard
                    key={location.id}
                    location={location}
                    onEdit={() => openEditLocationForm(location)}
                    onDelete={() => void handleDeleteLocation(location.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
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
              href={productCreateHref}
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
              href={serviceCreateHref}
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

export default function SuperAdminEnterpriseDetailsPage() {
  return <EnterpriseDetailsPage />;
}
