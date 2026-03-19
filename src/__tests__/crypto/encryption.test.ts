import { describe, it, expect, vi, beforeEach } from "vitest";

// Set ENCRYPTION_KEY before importing encryption module
// 32 bytes = 64 hex chars
const TEST_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("AES-256-GCM Encryption", () => {
  beforeEach(() => {
    vi.stubEnv("ENCRYPTION_KEY", TEST_KEY);
  });

  it("encrypt returns string in iv:authTag:ciphertext format", async () => {
    const { encrypt } = await import("@/lib/crypto/encryption");
    const result = encrypt("test-plaintext");
    const parts = result.split(":");
    expect(parts).toHaveLength(3);
    // IV is 12 bytes = 24 hex chars
    expect(parts[0]).toHaveLength(24);
    // Auth tag is 16 bytes = 32 hex chars
    expect(parts[1]).toHaveLength(32);
    // Ciphertext is non-empty hex
    expect(parts[2].length).toBeGreaterThan(0);
  });

  it("decrypt reverses encrypt (round-trip)", async () => {
    const { encrypt, decrypt } = await import("@/lib/crypto/encryption");
    const original = "my-secret-api-key-12345";
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it("encrypt produces different ciphertexts for same input (random IV)", async () => {
    const { encrypt } = await import("@/lib/crypto/encryption");
    const input = "same-input";
    const a = encrypt(input);
    const b = encrypt(input);
    expect(a).not.toBe(b);
  });

  it("decrypt throws on tampered ciphertext", async () => {
    const { encrypt, decrypt } = await import("@/lib/crypto/encryption");
    const encrypted = encrypt("original");
    const parts = encrypted.split(":");
    // Tamper with ciphertext
    parts[2] = "ff" + parts[2].slice(2);
    expect(() => decrypt(parts.join(":"))).toThrow();
  });

  it("throws if ENCRYPTION_KEY is missing", async () => {
    vi.stubEnv("ENCRYPTION_KEY", "");
    // Re-import to pick up new env
    vi.resetModules();
    const { encrypt } = await import("@/lib/crypto/encryption");
    expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY");
  });
});
