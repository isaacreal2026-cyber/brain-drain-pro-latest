import { describe, expect, it } from "vitest";
import { ADMIN_CONFIRM_PHRASE, matchesAdminPhrase } from "./admin-gate";

describe("admin gate phrase", () => {
  it("is the literal phrase 'im admin'", () => {
    expect(ADMIN_CONFIRM_PHRASE).toBe("im admin");
  });

  it("matches case-insensitively and tolerates surrounding whitespace", () => {
    expect(matchesAdminPhrase("im admin")).toBe(true);
    expect(matchesAdminPhrase("IM ADMIN")).toBe(true);
    expect(matchesAdminPhrase("  Im Admin  ")).toBe(true);
  });

  it("rejects empty or incorrect phrases", () => {
    expect(matchesAdminPhrase("")).toBe(false);
    expect(matchesAdminPhrase("admin")).toBe(false);
    expect(matchesAdminPhrase("i am admin")).toBe(false);
    expect(matchesAdminPhrase("im admin now")).toBe(false);
  });
});
