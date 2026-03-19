import { IntegrationStatus } from "@/components/settings/integration-status";
import { ApiKeyForm } from "@/components/settings/api-key-form";

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          Manage your connected services and API keys.
        </p>
      </div>
      <IntegrationStatus />
      <ApiKeyForm />
    </div>
  );
}
