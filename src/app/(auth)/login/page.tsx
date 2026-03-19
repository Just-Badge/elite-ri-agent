import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Sign in to ELITE
          </CardTitle>
          <CardDescription>
            Relationship intelligence powered by your meetings
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground">
            Google OAuth sign-in will be configured in the next plan.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
