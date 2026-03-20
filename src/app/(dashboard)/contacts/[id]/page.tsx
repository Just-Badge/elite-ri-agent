import { ContactDetail } from "@/components/contacts/contact-detail";
import { ErrorBoundary } from "@/components/error-boundary";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <ErrorBoundary>
        <ContactDetail contactId={id} />
      </ErrorBoundary>
    </div>
  );
}
