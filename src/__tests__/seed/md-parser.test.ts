import { describe, it, expect } from "vitest";
import { parseSeedContactMd, ParsedContact } from "@/lib/seed/md-parser";

// Full reference fixture: relationships/advisors/2026-02-03-dave-brown.md
const DAVE_BROWN_MD = `# Dave Brown

> **Category:** Advisors
> **Last Contact:** 2026-02-03
> **Status:** Active

## Contact Info
- **Email:** davidfosterbrown@gmail.com
- **Company:** Various (Advisor/Strategic Consultant)
- **Role:** Advisor
- **Location:** Remote
- **Connected via:** Direct introduction

## Background
Dave Brown brings extraordinary executive experience spanning four decades in media, technology, and consumer platforms. He started his career at a wireless network company where he led the first direct-to-consumer music subscription service pre-iPhone. At BlackBerry, he managed BBM cross-platform push notifications. At Google and YouTube, he negotiated content partnerships and served as country manager. He was CEO of an MCN (Multi-Channel Network) that was subsequently acquired by IGN. He's a cancer survivor whose experience navigating health challenges informs his perspective on resilience and strategic decision-making.

## Relationship Context
### Why We Connected
Strategic advisory relationship with FAST agreement signed. Dave provides exceptional media, technology, and go-to-market expertise.

### What Was Discussed
- Career trajectory and media/technology insights
- YouTube content partnerships and country management
- MCN business model and acquisition strategy
- Go-to-market strategy and platform scaling
- Advisory relationship structure and commitment
- Investor network and connections

### Mutual Value
**Matthew offers:** Board/advisory role; equity participation; strategic direction and growth opportunity
**Dave offers:** Media industry expertise; YouTube and content partnership insights; executive mentorship; investor network access; strategic guidance

## Meeting History
### 2026-02-03 \u2014 Advisor Agreement & Strategic Discussion (Meeting 1)
Initial advisor discussion with Dave Brown. Reviewed his extensive career in media and technology including wireless music subscriptions, BlackBerry, Google/YouTube, and MCN leadership. Discussed strategic advisor role and equity structure.
[Granola Notes](https://app.granola.so/notes/2ffabd21)

### 2026-02-03 \u2014 FAST Agreement & Ongoing Relationship (Meeting 2)
Formalized advisor relationship with FAST (Founder-Advisor Standard Template) agreement. Established structure for ongoing strategic consultation and investor introduction support.
[Granola Notes](https://app.granola.so/notes/8639d4de)

### 2026-02-03 \u2014 Investor Tracking & Next Steps (Meeting 3)
Discussed investor introduction pipeline and tracking mechanism. Established regular check-in cadence for ongoing relationship management.
[Granola Notes](https://app.granola.so/notes/9a7a06bd)

## Action Items & Next Steps
- [ ] Maintain regular check-in schedule (monthly or quarterly)
- [ ] Track investor introductions from Dave's network
- [ ] Provide progress updates on company metrics and milestones
- [ ] Leverage media and partnership insights for go-to-market
- [ ] Coordinate on potential board involvement if growth trajectory warrants

## Notes
FAST agreement signed - formal advisor relationship is established. Four decades of executive experience in media/tech is exceptional. YouTube content partnerships directly relevant to potential platform partnerships. MCN acquisition to IGN shows understanding of media company valuations. Cancer survivor story shows resilience and character. Regular check-ins and investor tracking are critical.`;

// Compact format fixture: relationships/networking/daniel-chadash
const DANIEL_CHADASH_MD = `# Daniel Chadash

> **Category:** Networking
> **Last Contact:** Jul 7, 2025
> **Status:** Not Pursuing

## Contact Info
- Email: danielch20@gmail.com
- Background: DNA editing, Cybersecurity, Israel

## Background
Daniel Chadash is founder of Genome Compiler, a DNA editing technology company acquired by Twist Bioscience in 2017. Successfully navigated through Twist IPO in 2019, demonstrating ability to scale biotech company through liquidity event. Brings cybersecurity background from Israel, providing security expertise complementary to biotech focus.

## Relationship Context
Connected as networking contact in biotech/DNA editing space. His Genome Compiler exit through Twist demonstrates successful biotech M&A. Twist IPO involvement shows ability to build company through subsequent owner's exit. However, timing not right for collaboration at this point (as noted in meeting summary). Cybersecurity background from Israel represents alternative expertise area.

## Meeting History
- 1 meeting in July 2025
- [Granola meeting notes](https://app.granola.so/notes/6ca83564-b3c7-4e5c-ad87-a0549d63c434)

## Action Items
- Maintain relationship for future opportunity
- Revisit timing for potential collaboration

## Notes
Founded Genome Compiler (DNA editing, acquired Twist Bioscience 2017). Led through Twist IPO 2019. Cybersecurity/Israel background. Timing not right currently.`;

// Minimal fixture: missing optional sections
const MINIMAL_MD = `# Jane Doe

> **Category:** Investors
> **Last Contact:** 2025-06-15
> **Status:** Active

## Contact Info
- **Email:** jane@example.com
- **Company:** Acme Ventures

## Background
Investor at Acme Ventures.`;

describe("parseSeedContactMd", () => {
  it("Test 1: extracts name from H1 heading", () => {
    const result = parseSeedContactMd(DAVE_BROWN_MD, "advisors");
    expect(result.name).toBe("Dave Brown");
  });

  it("Test 2: extracts category, last_contact, status from blockquote", () => {
    const result = parseSeedContactMd(DAVE_BROWN_MD, "advisors");
    expect(result.category).toBe("advisors");
    expect(result.last_contact).toBe("2026-02-03");
    expect(result.status).toBe("active");
  });

  it("Test 3: extracts email, company, role, location, connected_via from Contact Info section (bold format)", () => {
    const result = parseSeedContactMd(DAVE_BROWN_MD, "advisors");
    expect(result.email).toBe("davidfosterbrown@gmail.com");
    expect(result.company).toBe("Various (Advisor/Strategic Consultant)");
    expect(result.role).toBe("Advisor");
    expect(result.location).toBe("Remote");
    expect(result.connected_via).toBe("Direct introduction");
  });

  it("Test 4: extracts background text", () => {
    const result = parseSeedContactMd(DAVE_BROWN_MD, "advisors");
    expect(result.background).toContain("Dave Brown brings extraordinary executive experience");
    expect(result.background).toContain("cancer survivor");
  });

  it("Test 5: extracts relationship_context with why, what, mutual_value", () => {
    const result = parseSeedContactMd(DAVE_BROWN_MD, "advisors");
    expect(result.relationship_context).toBeDefined();
    expect(result.relationship_context?.why).toContain("Strategic advisory relationship");
    expect(result.relationship_context?.what).toContain("Career trajectory");
    expect(result.relationship_context?.mutual_value).toContain("Matthew offers:");
  });

  it("Test 6: extracts meeting history entries with date, title, summary, granola_url", () => {
    const result = parseSeedContactMd(DAVE_BROWN_MD, "advisors");
    expect(result.meetings).toHaveLength(3);
    expect(result.meetings[0].title).toContain("Advisor Agreement");
    expect(result.meetings[0].date).toBe("2026-02-03");
    expect(result.meetings[0].summary).toContain("Initial advisor discussion");
    expect(result.meetings[0].granola_url).toBe("https://app.granola.so/notes/2ffabd21");
    expect(result.meetings[2].granola_url).toBe("https://app.granola.so/notes/9a7a06bd");
  });

  it("Test 7: extracts action items (both checkbox and plain list formats)", () => {
    // Checkbox format
    const daveBrown = parseSeedContactMd(DAVE_BROWN_MD, "advisors");
    expect(daveBrown.action_items.length).toBeGreaterThanOrEqual(5);
    expect(daveBrown.action_items[0]).toContain("Maintain regular check-in schedule");

    // Plain list format (no checkboxes)
    const daniel = parseSeedContactMd(DANIEL_CHADASH_MD, "networking");
    expect(daniel.action_items.length).toBeGreaterThanOrEqual(2);
    expect(daniel.action_items[0]).toContain("Maintain relationship for future opportunity");
  });

  it("Test 8: extracts notes text", () => {
    const result = parseSeedContactMd(DAVE_BROWN_MD, "advisors");
    expect(result.notes).toContain("FAST agreement signed");
    expect(result.notes).toContain("investor tracking are critical");
  });

  it("Test 9: handles missing optional sections gracefully", () => {
    const result = parseSeedContactMd(MINIMAL_MD, "investors");
    expect(result.name).toBe("Jane Doe");
    expect(result.email).toBe("jane@example.com");
    expect(result.company).toBe("Acme Ventures");
    expect(result.category).toBe("investors");
    expect(result.background).toContain("Investor at Acme Ventures");
    // Missing sections should be undefined/empty, not throw
    expect(result.relationship_context).toBeUndefined();
    expect(result.meetings).toEqual([]);
    expect(result.action_items).toEqual([]);
    expect(result.notes).toBeUndefined();
  });

  it("Test 10: handles non-bold Contact Info fields (e.g., '- Email:' without bold)", () => {
    const result = parseSeedContactMd(DANIEL_CHADASH_MD, "networking");
    expect(result.name).toBe("Daniel Chadash");
    expect(result.email).toBe("danielch20@gmail.com");
    // Status mapping: "Not Pursuing" -> "not_pursuing"
    expect(result.status).toBe("not_pursuing");
  });

  it("Test 11: maps 'Nurturing' status to 'active'", () => {
    const nurturingMd = `# Test Person

> **Category:** Advisors
> **Last Contact:** 2025-01-01
> **Status:** Nurturing

## Contact Info
- **Email:** test@example.com`;

    const result = parseSeedContactMd(nurturingMd, "advisors");
    expect(result.status).toBe("active");
  });

  it("Test 12: extracts meeting history from compact bullet format", () => {
    const result = parseSeedContactMd(DANIEL_CHADASH_MD, "networking");
    // The compact format uses bullet list with Granola links
    expect(result.meetings.length).toBeGreaterThanOrEqual(1);
    expect(result.meetings[0].granola_url).toBe(
      "https://app.granola.so/notes/6ca83564-b3c7-4e5c-ad87-a0549d63c434"
    );
  });

  it("Test 13: handles inline relationship context (no subsections)", () => {
    const result = parseSeedContactMd(DANIEL_CHADASH_MD, "networking");
    // When no subsections, the whole text should be stored
    expect(result.relationship_context).toBeDefined();
    expect(result.relationship_context?.why).toContain("networking contact");
  });

  it("Test 14: uses directory category as fallback, lowercased", () => {
    const noCategoryMd = `# No Category Person

> **Last Contact:** 2025-01-01
> **Status:** Active

## Contact Info
- **Email:** nocat@example.com`;

    const result = parseSeedContactMd(noCategoryMd, "partners");
    expect(result.category).toBe("partners");
  });
});
