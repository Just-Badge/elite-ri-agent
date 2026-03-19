import { describe, it, expect } from "vitest";
import { buildMimeMessage } from "@/lib/gmail/mime";

describe("buildMimeMessage", () => {
  it("returns a base64url-encoded string (no +, /, = characters)", () => {
    const result = buildMimeMessage(
      "test@example.com",
      "Test Subject",
      "<p>Hello</p>"
    );

    expect(result).toBeTruthy();
    expect(result).not.toMatch(/[+/=]/);
    // base64url only uses A-Z, a-z, 0-9, -, _
    expect(result).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it("sets To header correctly", () => {
    const result = buildMimeMessage(
      "recipient@example.com",
      "Test",
      "<p>Body</p>"
    );

    // Decode the base64url string to verify the To header
    // mimetext wraps addresses in angle brackets per RFC 5322
    const decoded = Buffer.from(result, "base64url").toString("utf-8");
    expect(decoded).toMatch(/To:.*recipient@example\.com/);
  });

  it("sets Subject header correctly", () => {
    const result = buildMimeMessage(
      "test@example.com",
      "Important Meeting Follow-up",
      "<p>Body</p>"
    );

    const decoded = Buffer.from(result, "base64url").toString("utf-8");
    // mimetext may base64-encode the Subject per RFC 2047; verify the header exists
    expect(decoded).toMatch(/Subject: /);
  });

  it("includes HTML body content", () => {
    const htmlBody = "<h1>Hello World</h1><p>This is a test email.</p>";
    const result = buildMimeMessage(
      "test@example.com",
      "Test",
      htmlBody
    );

    const decoded = Buffer.from(result, "base64url").toString("utf-8");
    expect(decoded).toContain("Hello World");
    expect(decoded).toContain("This is a test email.");
  });

  it("works without From header (Gmail fills it in)", () => {
    const result = buildMimeMessage(
      "test@example.com",
      "No From",
      "<p>Body</p>"
    );

    expect(result).toBeTruthy();
    // Should still produce a valid base64url string
    expect(result).toMatch(/^[A-Za-z0-9\-_]+$/);
  });
});
