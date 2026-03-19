import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome to ELITE
        </h1>
        <p className="text-muted-foreground">
          Your relationship intelligence dashboard
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>
            Configure your profile and integrations to begin processing meeting
            data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Head to Settings to set up your profile, API keys, and processing
            schedule.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
