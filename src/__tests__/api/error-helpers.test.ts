import { describe, it, expect } from "vitest";
import {
  apiError,
  apiUnauthorized,
  apiNotFound,
  apiBadRequest,
  apiValidationError,
} from "@/lib/api/errors";
import { ZodError, ZodIssue } from "zod";

describe("API Error Helpers", () => {
  describe("apiError", () => {
    it("returns a response with the given message and status", async () => {
      const res = apiError("Something failed", 500);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toEqual({ error: "Something failed" });
    });

    it("works with arbitrary status codes", async () => {
      const res = apiError("Rate limited", 429);
      expect(res.status).toBe(429);
      const body = await res.json();
      expect(body).toEqual({ error: "Rate limited" });
    });
  });

  describe("apiUnauthorized", () => {
    it("returns 401 with default message", async () => {
      const res = apiUnauthorized();
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toEqual({ error: "Unauthorized" });
    });

    it("returns 401 with custom message", async () => {
      const res = apiUnauthorized("Custom msg");
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toEqual({ error: "Custom msg" });
    });
  });

  describe("apiNotFound", () => {
    it("returns 404 with default message", async () => {
      const res = apiNotFound();
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body).toEqual({ error: "Not found" });
    });

    it("returns 404 with custom message", async () => {
      const res = apiNotFound("User not found");
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body).toEqual({ error: "User not found" });
    });
  });

  describe("apiBadRequest", () => {
    it("returns 400 with default message", async () => {
      const res = apiBadRequest();
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({ error: "Bad request" });
    });

    it("returns 400 with custom message", async () => {
      const res = apiBadRequest("Bad input");
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({ error: "Bad input" });
    });
  });

  describe("apiValidationError", () => {
    it("returns 400 with validation issues from ZodError", async () => {
      const issues: ZodIssue[] = [
        {
          code: "invalid_type",
          expected: "string",
          received: "number",
          path: ["name"],
          message: "Expected string, received number",
        },
        {
          code: "invalid_type",
          expected: "string",
          received: "undefined",
          path: ["email"],
          message: "Required",
        },
      ];
      const zodError = new ZodError(issues);

      const res = apiValidationError(zodError);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Validation failed");
      expect(body.issues).toEqual(issues);
    });
  });
});
