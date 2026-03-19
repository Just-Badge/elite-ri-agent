/**
 * Seed Data MD Parser
 *
 * Parses the 289 pre-existing relationship markdown files into structured contact data.
 * Handles two structural variations:
 * - Bold contact info: `- **Email:** x` AND plain: `- Email: x`
 * - Subsection relationship context AND inline paragraph
 * - Checkbox action items `- [ ] task` AND plain `- task`
 * - Meeting history with `### date -- title` AND compact bullet format
 */

export interface ParsedMeeting {
  date: string;
  title: string;
  summary: string;
  granola_url?: string;
}

export interface ParsedContact {
  name: string;
  email?: string;
  company?: string;
  role?: string;
  location?: string;
  connected_via?: string;
  category: string;
  last_contact?: string;
  status: "active" | "not_pursuing" | "dormant";
  background?: string;
  relationship_context?: {
    why?: string;
    what?: string;
    mutual_value?: string;
  };
  meetings: ParsedMeeting[];
  action_items: string[];
  notes?: string;
}

/**
 * Split markdown content into sections by `## ` headings.
 * Returns a map of section name (lowercased) to section content.
 */
function extractSections(content: string): Map<string, string> {
  const sections = new Map<string, string>();
  const parts = content.split(/^## /m);

  // First part is everything before the first ## heading (frontmatter + blockquote)
  if (parts[0]) {
    sections.set("_preamble", parts[0].trim());
  }

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const newlineIndex = part.indexOf("\n");
    if (newlineIndex === -1) {
      sections.set(part.trim().toLowerCase(), "");
      continue;
    }
    const heading = part.substring(0, newlineIndex).trim().toLowerCase();
    const body = part.substring(newlineIndex + 1).trim();
    sections.set(heading, body);
  }

  return sections;
}

/**
 * Extract name from H1 heading.
 */
function extractName(preamble: string): string {
  const match = preamble.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "";
}

/**
 * Extract blockquote metadata: category, last_contact, status.
 */
function extractBlockquote(preamble: string): {
  category?: string;
  last_contact?: string;
  status?: string;
} {
  const result: { category?: string; last_contact?: string; status?: string } =
    {};

  const categoryMatch = preamble.match(
    />\s*\*\*Category:\*\*\s*(.+?)(?:\s*$)/m
  );
  if (categoryMatch) {
    result.category = categoryMatch[1].trim().toLowerCase().replace(/\s+/g, "-");
  }

  const lastContactMatch = preamble.match(
    />\s*\*\*Last Contact:\*\*\s*(.+?)(?:\s*$)/m
  );
  if (lastContactMatch) {
    const rawDate = lastContactMatch[1].trim();
    // Try to normalize date formats (e.g., "Jul 7, 2025" -> "2025-07-07")
    result.last_contact = normalizeDateString(rawDate);
  }

  const statusMatch = preamble.match(/>\s*\*\*Status:\*\*\s*(.+?)(?:\s*$)/m);
  if (statusMatch) {
    result.status = statusMatch[1].trim();
  }

  return result;
}

/**
 * Normalize various date formats to YYYY-MM-DD.
 */
function normalizeDateString(dateStr: string): string {
  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Try parsing "Month Day, Year" format (e.g., "Jul 7, 2025")
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return dateStr;
}

/**
 * Map status string to valid enum value.
 */
function normalizeStatus(
  status: string | undefined
): "active" | "not_pursuing" | "dormant" {
  if (!status) return "active";

  const lower = status.toLowerCase().trim();
  switch (lower) {
    case "active":
      return "active";
    case "not pursuing":
      return "not_pursuing";
    case "not_pursuing":
      return "not_pursuing";
    case "dormant":
      return "dormant";
    case "nurturing":
      return "active";
    default:
      return "active";
  }
}

/**
 * Extract contact info fields from the Contact Info section.
 * Handles both bold (`- **Email:** x`) and plain (`- Email: x`) formats.
 */
function extractContactInfo(sectionContent: string): {
  email?: string;
  company?: string;
  role?: string;
  location?: string;
  connected_via?: string;
} {
  const result: {
    email?: string;
    company?: string;
    role?: string;
    location?: string;
    connected_via?: string;
  } = {};

  const lines = sectionContent.split("\n");
  for (const line of lines) {
    // Match both `- **Field:** value` and `- Field: value`
    // Bold format: - **Email:** value  (colon before closing **)
    // Plain format: - Email: value
    const match = line.match(
      /^-\s+\*\*([^*]+?):\*\*\s*(.+?)$/
    ) || line.match(
      /^-\s+([^*:]+?):\s*(.+?)$/
    );
    if (!match) continue;

    const field = match[1].trim().toLowerCase();
    const value = match[2].trim();

    switch (field) {
      case "email":
        result.email = value;
        break;
      case "company":
        result.company = value;
        break;
      case "role":
        result.role = value;
        break;
      case "location":
        result.location = value;
        break;
      case "connected via":
        result.connected_via = value;
        break;
      // Skip other fields like "Background" in compact contact info
    }
  }

  return result;
}

/**
 * Extract relationship context, handling both subsection format and inline paragraph.
 */
function extractRelationshipContext(
  sectionContent: string
): { why?: string; what?: string; mutual_value?: string } | undefined {
  if (!sectionContent.trim()) return undefined;

  // Check for subsection format (### headings)
  const hasSubsections = /^###\s+/m.test(sectionContent);

  if (hasSubsections) {
    const result: { why?: string; what?: string; mutual_value?: string } = {};

    // Split on ### headings
    const subParts = sectionContent.split(/^###\s+/m);

    for (let i = 1; i < subParts.length; i++) {
      const subPart = subParts[i];
      const newlineIndex = subPart.indexOf("\n");
      if (newlineIndex === -1) continue;

      const heading = subPart.substring(0, newlineIndex).trim().toLowerCase();
      const body = subPart.substring(newlineIndex + 1).trim();

      if (heading.includes("why")) {
        result.why = body;
      } else if (heading.includes("what")) {
        result.what = body;
      } else if (heading.includes("mutual")) {
        result.mutual_value = body;
      }
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  // Inline paragraph format -- store entire text as "why"
  return { why: sectionContent.trim() };
}

/**
 * Extract meeting history, handling both subsection format and compact bullet format.
 */
function extractMeetings(sectionContent: string): ParsedMeeting[] {
  if (!sectionContent.trim()) return [];

  const meetings: ParsedMeeting[] = [];

  // Check for subsection format (### headings with date -- title)
  const hasSubsections = /^###\s+/m.test(sectionContent);

  if (hasSubsections) {
    const subParts = sectionContent.split(/^###\s+/m);

    for (let i = 1; i < subParts.length; i++) {
      const subPart = subParts[i];
      const newlineIndex = subPart.indexOf("\n");
      if (newlineIndex === -1) continue;

      const heading = subPart.substring(0, newlineIndex).trim();
      const body = subPart.substring(newlineIndex + 1).trim();

      // Parse heading: "2026-02-03 -- Title" or "2026-02-03 --- Title"
      // Use various dash types: --, ---, em dash, en dash
      const headingMatch = heading.match(
        /^(\d{4}-\d{2}-\d{2})\s*[\u2014\u2013—–-]{1,3}\s*(.+)$/
      );

      let date = "";
      let title = heading;
      if (headingMatch) {
        date = headingMatch[1];
        title = headingMatch[2].trim();
      }

      // Extract Granola URL from body
      const urlMatch = body.match(
        /\[(?:Granola\s*Notes|Granola\s*meeting\s*notes)\]\((https:\/\/app\.granola\.so\/notes\/[^\s)]+)\)/i
      );
      const granola_url = urlMatch ? urlMatch[1] : undefined;

      // Summary is the body text minus the Granola link line
      const summaryLines = body
        .split("\n")
        .filter(
          (line) =>
            !line.match(
              /\[(?:Granola\s*Notes|Granola\s*meeting\s*notes)\]\(https:\/\/app\.granola\.so/i
            )
        )
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      const summary = summaryLines.join("\n");

      meetings.push({
        date,
        title,
        summary,
        granola_url,
      });
    }
  } else {
    // Compact bullet format -- extract Granola URLs from bullet items
    const lines = sectionContent.split("\n");

    for (const line of lines) {
      const urlMatch = line.match(
        /\[(?:Granola\s*Notes|Granola\s*meeting\s*notes|[^\]]*)\]\((https:\/\/app\.granola\.so\/notes\/[^\s)]+)\)/i
      );
      if (urlMatch) {
        // Extract summary from lines without URLs
        const summaryLine = line.replace(/\[.*?\]\(.*?\)/g, "").replace(/^-\s*/, "").trim();

        meetings.push({
          date: "",
          title: "",
          summary: summaryLine || "",
          granola_url: urlMatch[1],
        });
      }
    }

    // If there are summary lines without URLs, combine them as context
    // (e.g., "- 1 meeting in July 2025" is context, not a separate meeting)
  }

  return meetings;
}

/**
 * Extract action items from various formats.
 * Handles both `- [ ] task` (checkbox) and `- task` (plain list) formats.
 */
function extractActionItems(sectionContent: string): string[] {
  if (!sectionContent.trim()) return [];

  const items: string[] = [];
  const lines = sectionContent.split("\n");

  for (const line of lines) {
    // Match checkbox format: - [ ] text or - [x] text
    const checkboxMatch = line.match(/^-\s+\[[ x]\]\s+(.+)$/i);
    if (checkboxMatch) {
      items.push(checkboxMatch[1].trim());
      continue;
    }

    // Match plain list format: - text (must start with dash + space)
    const plainMatch = line.match(/^-\s+(.+)$/);
    if (plainMatch) {
      items.push(plainMatch[1].trim());
    }
  }

  return items;
}

/**
 * Parse a seed contact markdown file into structured data.
 *
 * @param content - The full markdown content of the seed file
 * @param category - The directory category (used as fallback if blockquote category missing)
 * @returns ParsedContact with all extracted fields
 */
export function parseSeedContactMd(
  content: string,
  category: string
): ParsedContact {
  const sections = extractSections(content);
  const preamble = sections.get("_preamble") || "";

  // Extract H1 name
  const name = extractName(preamble);

  // Extract blockquote metadata
  const blockquote = extractBlockquote(preamble);

  // Use blockquote category or fallback to directory category
  const resolvedCategory = blockquote.category || category.toLowerCase();

  // Normalize status
  const status = normalizeStatus(blockquote.status);

  // Extract contact info
  const contactInfoSection = sections.get("contact info") || "";
  const contactInfo = extractContactInfo(contactInfoSection);

  // Extract background
  const backgroundSection = sections.get("background");
  const background = backgroundSection?.trim() || undefined;

  // Extract relationship context
  const rcSection = sections.get("relationship context");
  const relationship_context = rcSection
    ? extractRelationshipContext(rcSection)
    : undefined;

  // Extract meeting history
  const meetingSection =
    sections.get("meeting history") || "";
  const meetings = extractMeetings(meetingSection);

  // Extract action items (multiple heading variations)
  const actionSection =
    sections.get("action items & next steps") ||
    sections.get("action items") ||
    "";
  const action_items = extractActionItems(actionSection);

  // Extract notes
  const notesSection = sections.get("notes");
  const notes = notesSection?.trim() || undefined;

  return {
    name,
    email: contactInfo.email,
    company: contactInfo.company,
    role: contactInfo.role,
    location: contactInfo.location,
    connected_via: contactInfo.connected_via,
    category: resolvedCategory,
    last_contact: blockquote.last_contact,
    status,
    background,
    relationship_context,
    meetings,
    action_items,
    notes,
  };
}
