import { describe, it, expect } from "vitest";
import { profileSchema } from "@/lib/validations/settings";

describe("profileSchema", () => {
  it("rejects empty personality_profile", () => {
    expect(() => profileSchema.parse({})).toThrow();
  });

  it("accepts valid profile", () => {
    const result = profileSchema.parse({
      personality_profile: "Casual and direct, uses humor",
      business_objectives: "Grow revenue 20%",
      projects: "Project Alpha",
    });
    expect(result.personality_profile).toBe("Casual and direct, uses humor");
    expect(result.business_objectives).toBe("Grow revenue 20%");
    expect(result.projects).toBe("Project Alpha");
  });

  it("rejects personality_profile over 2000 chars", () => {
    const longString = "a".repeat(2001);
    expect(() =>
      profileSchema.parse({ personality_profile: longString })
    ).toThrow();
  });

  it("accepts optional business_objectives as undefined", () => {
    const result = profileSchema.parse({
      personality_profile: "Professional tone",
    });
    expect(result.business_objectives).toBeUndefined();
    expect(result.projects).toBeUndefined();
  });
});
