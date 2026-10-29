import { describe, expect, it } from "vitest";

import { approvalActorDisplayName } from "./approval-actor-display";

describe("approval actor display", () => {
  it("keeps a valid reviewer name", () => {
    expect(approvalActorDisplayName(" Jane Doe ")).toBe("Jane Doe");
  });

  it("hides UUID-only, null, empty, and placeholder identities", () => {
    expect(approvalActorDisplayName("24444513-e398-4d0c-9a6d-ee9da7fa19da")).toBeNull();
    expect(approvalActorDisplayName(null)).toBeNull();
    expect(approvalActorDisplayName("   ")).toBeNull();
    expect(approvalActorDisplayName("undefined")).toBeNull();
    expect(approvalActorDisplayName("null")).toBeNull();
    expect(approvalActorDisplayName("reviewer@example.com")).toBeNull();
    expect(approvalActorDisplayName("Unknown User")).toBeNull();
    expect(approvalActorDisplayName("N/A")).toBeNull();
  });

  it("preserves readable system-generated actor labels", () => {
    expect(approvalActorDisplayName("System")).toBe("System");
  });
});
