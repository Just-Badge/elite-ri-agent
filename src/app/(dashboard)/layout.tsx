import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { LayoutDashboard, Mail, Settings, Users } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { SetupChecklist } from "@/components/onboarding/setup-checklist";
import { Separator } from "@/components/ui/separator";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Contacts", href: "/contacts", icon: Users },
  { title: "Drafts", href: "/drafts", icon: Mail },
  { title: "Settings", href: "/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <a href="#main-content" className="skip-to-content">
        Skip to content
      </a>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 px-4 py-2">
            <span className="text-lg font-bold">ELITE</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <nav aria-label="Main navigation">
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton render={<Link href={item.href} />}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
              </nav>
            </SidebarGroupContent>
          </SidebarGroup>
          <SetupChecklist />
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 overflow-hidden" aria-label="Top bar">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="min-w-0 flex-1">
            <Breadcrumbs />
          </div>
          <div className="ml-auto shrink-0">
            <ThemeToggle />
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="flex-1 p-4 sm:p-6 outline-none">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
