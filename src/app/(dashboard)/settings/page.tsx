import Link from "next/link";
import { User, Key, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const settingsSections = [
  {
    title: "Profile",
    description:
      "Configure your communication style, business objectives, and projects for AI-drafted emails.",
    href: "/settings/profile",
    icon: User,
  },
  {
    title: "Integrations",
    description:
      "Manage your API keys and connected services like Google and z.ai.",
    href: "/settings/integrations",
    icon: Key,
  },
  {
    title: "Schedule",
    description:
      "Set when meetings are checked and processed, including timezone preferences.",
    href: "/settings/schedule",
    icon: Clock,
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile, integrations, and processing schedule.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {settingsSections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <section.icon className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>{section.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{section.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
