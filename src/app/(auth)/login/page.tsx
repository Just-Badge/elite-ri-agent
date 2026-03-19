"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">ELITE</CardTitle>
          <CardDescription>Relationship Intelligence Agent</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {error === "auth_callback_failed" && (
            <div className="w-full rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Sign in failed. Please try again.
            </div>
          )}
          <GoogleSignInButton />
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
