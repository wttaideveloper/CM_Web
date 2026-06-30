import { API_BASE_URL } from "@/lib/api";
import type {
  CreateOnboardingFormPayload,
  FormStatus,
  OnboardingFormDto,
  OnboardingFormListParams,
  OnboardingFormListResponse,
  UpdateOnboardingFormPayload,
} from "@/types/onboarding-form.types";

type UpdateOnboardingFormResponse = {
  id: string;
  name: string;
  status: FormStatus;
  sections_count: number;
  fields_count: number;
  updated_at?: string;
};

type DeleteOnboardingFormResponse = {
  id: string;
  status: FormStatus;
  message: string;
};

type PublishOnboardingFormResponse = {
  id: string;
  status: FormStatus;
  published_at?: string;
};

type UnpublishOnboardingFormResponse = {
  id: string;
  status: FormStatus;
  updated_at?: string;
};

type DuplicateOnboardingFormResponse = {
  id: string;
  name: string;
  status: FormStatus;
  sections_count: number;
  fields_count: number;
  created_at?: string;
};

function buildQueryString(params?: OnboardingFormListParams): string {
  if (!params) {
    return "";
  }

  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null);

  if (!entries.length) {
    return "";
  }

  return entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
}

async function readResponseError(response: Response): Promise<string> {
  const fallback = `${response.status} ${response.statusText}`.trim();

  try {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const data: unknown = await response.json();

      if (typeof data === "string" && data.trim()) {
        return data;
      }

      if (typeof data === "object" && data !== null) {
        if ("detail" in data && typeof data.detail === "string" && data.detail.trim()) {
          return data.detail;
        }

        if ("message" in data && typeof data.message === "string" && data.message.trim()) {
          return data.message;
        }
      }
    } else {
      const text = await response.text();

      if (text.trim()) {
        return text;
      }
    }
  } catch {
    // Fall back to the HTTP status when the body cannot be read.
  }

  return fallback;
}

async function requestJson<T>(input: RequestInfo | URL, init: RequestInit): Promise<T> {
  const response = await fetch(input, init);

  if (!response.ok) {
    const errorMessage = await readResponseError(response);
    throw new Error(`Request failed (${response.status} ${response.statusText}): ${errorMessage}`);
  }

  return response.json() as Promise<T>;
}

export async function createOnboardingForm(
  payload: CreateOnboardingFormPayload,
): Promise<OnboardingFormDto> {
  return requestJson<OnboardingFormDto>(`${API_BASE_URL}/onboarding-forms/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function getOnboardingForms(
  params?: OnboardingFormListParams,
): Promise<OnboardingFormListResponse> {
  const queryString = buildQueryString(params);
  const url = queryString
    ? `${API_BASE_URL}/onboarding-forms/?${queryString}`
    : `${API_BASE_URL}/onboarding-forms/`;

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    const errorMessage = await readResponseError(response);
    throw new Error(`Failed to load onboarding forms (${response.status} ${response.statusText}): ${errorMessage}`);
  }

  return response.json() as Promise<OnboardingFormListResponse>;
}

export async function getOnboardingFormById(formId: string): Promise<OnboardingFormDto> {
  return requestJson<OnboardingFormDto>(`${API_BASE_URL}/onboarding-forms/${encodeURIComponent(formId)}`, {
    method: "GET",
    cache: "no-store",
  });
}

export async function updateOnboardingForm(
  formId: string,
  payload: UpdateOnboardingFormPayload,
): Promise<UpdateOnboardingFormResponse> {
  return requestJson<UpdateOnboardingFormResponse>(
    `${API_BASE_URL}/onboarding-forms/${encodeURIComponent(formId)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteOnboardingForm(formId: string): Promise<DeleteOnboardingFormResponse> {
  return requestJson<DeleteOnboardingFormResponse>(
    `${API_BASE_URL}/onboarding-forms/${encodeURIComponent(formId)}`,
    {
      method: "DELETE",
    },
  );
}

export async function publishOnboardingForm(
  formId: string,
): Promise<PublishOnboardingFormResponse> {
  return requestJson<PublishOnboardingFormResponse>(
    `${API_BASE_URL}/onboarding-forms/${encodeURIComponent(formId)}/publish`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "published" }),
    },
  );
}

export async function unpublishOnboardingForm(
  formId: string,
): Promise<UnpublishOnboardingFormResponse> {
  return requestJson<UnpublishOnboardingFormResponse>(
    `${API_BASE_URL}/onboarding-forms/${encodeURIComponent(formId)}/unpublish`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "draft" }),
    },
  );
}

export async function duplicateOnboardingForm(
  formId: string,
  name: string,
): Promise<DuplicateOnboardingFormResponse> {
  return requestJson<DuplicateOnboardingFormResponse>(
    `${API_BASE_URL}/onboarding-forms/${encodeURIComponent(formId)}/duplicate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    },
  );
}
