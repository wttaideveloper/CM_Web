import { redirect } from "next/navigation";

type ValidatePageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function EnglishValidateAliasPage({ searchParams = {} }: ValidatePageProps) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      params.set(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
    }
  }

  const query = params.toString();
  redirect(query ? `/auth/validate?${query}` : "/auth/validate");
}
