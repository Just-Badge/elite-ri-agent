import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

// Use vi.hoisted so the mock is available inside the vi.mock factory
const { mockSignInWithOAuth } = vi.hoisted(() => ({
  mockSignInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn().mockReturnValue({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}));

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

describe("GoogleSignInButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignInWithOAuth.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders Sign in with Google button", () => {
    render(<GoogleSignInButton />);
    expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeDefined();
  });

  it("calls signInWithOAuth with correct params on click", async () => {
    render(<GoogleSignInButton />);

    const button = screen.getByRole("button", { name: "Sign in with Google" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledTimes(1);
    });

    const callArgs = mockSignInWithOAuth.mock.calls[0][0];

    // Verify provider
    expect(callArgs.provider).toBe("google");

    // Verify scopes include gmail.compose
    expect(callArgs.options.scopes).toContain(
      "https://www.googleapis.com/auth/gmail.compose"
    );

    // Verify access_type is offline (critical for refresh token)
    expect(callArgs.options.queryParams.access_type).toBe("offline");

    // Verify prompt is consent (critical for refresh token every time)
    expect(callArgs.options.queryParams.prompt).toBe("consent");

    // Verify redirectTo includes /auth/callback
    expect(callArgs.options.redirectTo).toContain("/auth/callback");
  });

  it("shows loading state while signing in", async () => {
    // Make signInWithOAuth hang so we can observe loading state
    let resolveSignIn: () => void;
    mockSignInWithOAuth.mockImplementation(
      () =>
        new Promise<{ error: null }>((resolve) => {
          resolveSignIn = () => resolve({ error: null });
        })
    );

    render(<GoogleSignInButton />);

    const button = screen.getByRole("button", { name: "Sign in with Google" });
    fireEvent.click(button);

    // Should show loading text
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Signing in..." })).toBeDefined();
    });

    // Resolve the pending promise
    resolveSignIn!();

    // Should revert to normal text
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeDefined();
    });
  });
});
