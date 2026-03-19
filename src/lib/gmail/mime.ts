import { createMimeMessage } from "mimetext";

export function buildMimeMessage(
  to: string,
  subject: string,
  htmlBody: string,
  from?: string
): string {
  const msg = createMimeMessage();

  msg.setRecipient(to);
  msg.setSubject(subject);

  // mimetext requires a From header; use placeholder if not provided
  // (Gmail API replaces the From header with the authenticated user's address)
  msg.setSender(from || "me@gmail.com");

  msg.addMessage({
    contentType: "text/html",
    data: htmlBody,
  });

  return msg.asEncoded();
}
