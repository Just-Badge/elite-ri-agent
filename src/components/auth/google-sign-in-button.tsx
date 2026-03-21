"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function GoogleSignInButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);

    const supabase = createClient();

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback`,
        scopes: [
          "https://www.googleapis.com/auth/gmail.compose",
          "https://www.googleapis.com/auth/gmail.send",
        ].join(" "),
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    // If signInWithOAuth doesn't redirect (error case), re-enable button
    setIsLoading(false);
  };

  return (
    <Button
      onClick={handleSignIn}
      variant="outline"
      size="lg"
      disabled={isLoading}
    >
      {isLoading ? "Signing in..." : "Sign in with Google"}
    </Button>
  );
}
