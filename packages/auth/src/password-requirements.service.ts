export type PasswordRequirementsResponse = {
  message: string | null;
  data: unknown;
  raw: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readResponseBody(response: Response) {
  const text = await response.text().catch(() => "");

  try {
    return { text, json: text ? (JSON.parse(text) as unknown) : null };
  } catch {
    return { text, json: null as unknown };
  }
}

export async function getPasswordRequirements(): Promise<PasswordRequirementsResponse | null> {
  try {
    const response = await fetch("/api/v1/auth/password-requirements", { method: "GET", credentials: "include" });
    const { text, json } = await readResponseBody(response);
    if (!response.ok || !isRecord(json ?? text)) return null;
    const value = json as Record<string, unknown>;
    return { message: typeof value.message === "string" ? value.message : null, data: "data" in value ? value.data : value, raw: value };
  } catch {
    return null;
  }
}
