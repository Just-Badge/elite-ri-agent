export interface GmailDraftResult {
  draftId: string;
  messageId: string;
}

export interface GmailSendResult {
  messageId: string;
  threadId: string;
}
