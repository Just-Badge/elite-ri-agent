"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Slash } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  contacts: "Contacts",
  drafts: "Drafts",
  settings: "Settings",
  profile: "Profile",
  integrations: "Integrations",
  schedule: "Schedule",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // Track contact name for dynamic breadcrumbs on /contacts/[id]
  const [contactName, setContactName] = useState<string | null>(null);
  const isContactDetail =
    segments.length >= 2 && segments[0] === "contacts" && !SEGMENT_LABELS[segments[1]];
  const contactId = isContactDetail ? segments[1] : null;

  useEffect(() => {
    if (!contactId) {
      setContactName(null);
      return;
    }

    let cancelled = false;

    async function fetchContactName() {
      try {
        const res = await fetch(`/api/contacts/${contactId}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && json.data?.name) {
          setContactName(json.data.name);
        }
      } catch {
        // Fallback to showing the ID
      }
    }

    fetchContactName();
    return () => {
      cancelled = true;
    };
  }, [contactId]);

  if (segments.length === 0) return null;

  const items = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const isLast = index === segments.length - 1;

    // Determine label
    let label = SEGMENT_LABELS[segment] ?? segment;

    // For contact detail pages, show the contact name instead of ID
    if (isContactDetail && index === 1) {
      label = contactName ?? segment;
    }

    return { href, label, isLast };
  });

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => (
          <BreadcrumbItem key={item.href}>
            {index > 0 && (
              <BreadcrumbSeparator>
                <Slash />
              </BreadcrumbSeparator>
            )}
            {item.isLast ? (
              <BreadcrumbPage>{item.label}</BreadcrumbPage>
            ) : (
              <BreadcrumbLink render={<Link href={item.href} />}>
                {item.label}
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
