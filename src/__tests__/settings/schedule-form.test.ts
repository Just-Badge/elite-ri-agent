import { describe, it, expect } from "vitest";
import { scheduleSchema } from "@/lib/validations/settings";

describe("scheduleSchema", () => {
  it("rejects interval_hours below 1", () => {
    expect(() =>
      scheduleSchema.parse({
        interval_hours: 0,
        start_hour: 8,
        end_hour: 18,
        timezone: "America/Los_Angeles",
      })
    ).toThrow();
  });

  it("rejects interval_hours above 24", () => {
    expect(() =>
      scheduleSchema.parse({
        interval_hours: 25,
        start_hour: 8,
        end_hour: 18,
        timezone: "America/Los_Angeles",
      })
    ).toThrow();
  });

  it("accepts valid schedule", () => {
    const result = scheduleSchema.parse({
      interval_hours: 2,
      start_hour: 8,
      end_hour: 18,
      timezone: "America/Los_Angeles",
    });
    expect(result.interval_hours).toBe(2);
    expect(result.start_hour).toBe(8);
    expect(result.end_hour).toBe(18);
    expect(result.timezone).toBe("America/Los_Angeles");
  });

  it("rejects empty timezone", () => {
    expect(() =>
      scheduleSchema.parse({
        interval_hours: 2,
        start_hour: 8,
        end_hour: 18,
        timezone: "",
      })
    ).toThrow();
  });

  it("rejects start_hour above 23", () => {
    expect(() =>
      scheduleSchema.parse({
        interval_hours: 2,
        start_hour: 24,
        end_hour: 18,
        timezone: "America/Los_Angeles",
      })
    ).toThrow();
  });
});
