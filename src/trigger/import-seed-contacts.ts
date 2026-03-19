/**
 * Seed Contact Import Task
 *
 * One-time Trigger.dev task that imports pre-existing contact data from
 * the relationships/ directory of seed markdown files into Supabase.
 */

import { task, logger } from "@trigger.dev/sdk";
import { importSeedContacts } from "@/lib/seed/import-contacts";

export const importSeedContactsTask = task({
  id: "import-seed-contacts",
  retry: { maxAttempts: 1 },
  run: async (payload: { userId: string; relationshipsDir: string }) => {
    logger.info("Starting seed contact import", {
      userId: payload.userId,
      relationshipsDir: payload.relationshipsDir,
    });

    const result = await importSeedContacts(
      payload.userId,
      payload.relationshipsDir
    );

    logger.info("Seed contact import complete", {
      userId: payload.userId,
      contactsImported: result.contactsImported,
      meetingsImported: result.meetingsImported,
      actionItemsImported: result.actionItemsImported,
    });

    return result;
  },
});
