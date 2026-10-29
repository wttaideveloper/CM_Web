/** Normalized response returned by the password requirements endpoint. */
export type PasswordRequirementsResponse = {
  message: string | null;
  data: unknown;
  raw: unknown;
};

/** One password-policy rule that can be displayed and evaluated by account forms. */
export type PasswordRequirementRule = {
  key: string;
  label: string;
  test: (password: string) => boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readPositiveNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function findRequirementValue(response: PasswordRequirementsResponse, keys: string[]): unknown {
  for (const source of [response.data, response.raw]) {
    if (!isRecord(source)) continue;
    for (const container of [source, source.policy, source.requirements, source.rules, source.data]) {
      if (!isRecord(container)) continue;
      for (const key of keys) {
        if (key in container) return container[key];
      }
    }
  }
  return null;
}

/** Builds displayable checks from the backend password policy response. */
export function getPasswordRequirementRules(
  response: PasswordRequirementsResponse | null,
): PasswordRequirementRule[] | null {
  if (!response) return null;
  const minimumLength = ["minLength", "minimumLength", "min_length", "passwordMinLength", "password_min_length"]
    .map((key) => readPositiveNumber(findRequirementValue(response, [key])))
    .find((value): value is number => value !== null);
  const rules: PasswordRequirementRule[] = [];
  if (minimumLength) {
    rules.push({
      key: "minimum-length",
      label: `At least ${minimumLength} characters`,
      test: (password) => password.length >= minimumLength,
    });
  }

  const ruleDefinitions = [
    { key: "uppercase", label: "At least one uppercase letter", keys: ["requireUppercase", "requiresUppercase", "uppercaseRequired", "uppercase"], test: /[A-Z]/ },
    { key: "lowercase", label: "At least one lowercase letter", keys: ["requireLowercase", "requiresLowercase", "lowercaseRequired", "lowercase"], test: /[a-z]/ },
    { key: "number", label: "At least one number", keys: ["requireNumber", "requiresNumber", "numberRequired", "number"], test: /\d/ },
    { key: "special-character", label: "At least one special character", keys: ["requireSpecialCharacter", "requiresSpecialCharacter", "specialCharacterRequired", "special"], test: /[^A-Za-z0-9]/ },
  ];
  for (const definition of ruleDefinitions) {
    if (findRequirementValue(response, definition.keys) === true) {
      rules.push({
        key: definition.key,
        label: definition.label,
        test: (password) => definition.test.test(password),
      });
    }
  }
  return rules.length > 0 ? rules : null;
}

async function readResponseBody(response: Response) {
  const text = await response.text().catch(() => "");

  try {
    return { text, json: text ? (JSON.parse(text) as unknown) : null };
  } catch {
    return { text, json: null as unknown };
  }
}

/** Loads the current server-defined password policy for account forms. */
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
