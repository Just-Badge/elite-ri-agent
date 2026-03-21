import { Suspense } from "react";
import { IntegrationStatus } from "@/components/settings/integration-status";
import { ApiKeyForm } from "@/components/settings/api-key-form";
import { GranolaConnect } from "@/components/settings/granola-connect";

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          Manage your connected services and API keys.
        </p>
      </div>
      <IntegrationStatus />
      <Suspense>
        <GranolaConnect />
      </Suspense>
      <ApiKeyForm />
    </div>
  );
}
