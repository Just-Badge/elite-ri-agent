import type { FieldErrors } from "react-hook-form";

/**
 * Focuses the first form field that has a validation error.
 * Works with react-hook-form's FieldErrors structure.
 * Handles nested errors (e.g., relationship_context.why).
 */
export function focusFirstError(
  errors: FieldErrors,
  containerRef?: React.RefObject<HTMLElement | null>
): void {
  const container = containerRef?.current ?? document;
  // Flatten error field names including nested (dot-notation) paths
  const errorNames = flattenErrorNames(errors);
  for (const name of errorNames) {
    // Try by name attribute first (register-based inputs), then by id
    const el = container.querySelector<HTMLElement>(
      `[name="${name}"], #${CSS.escape(name)}`
    );
    if (el && typeof el.focus === "function") {
      el.focus();
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
  }
}

function flattenErrorNames(errors: FieldErrors, prefix = ""): string[] {
  const names: string[] = [];
  for (const key of Object.keys(errors)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const err = errors[key];
    if (err && typeof err === "object" && "message" in err) {
      names.push(fullKey);
    } else if (err && typeof err === "object") {
      names.push(...flattenErrorNames(err as FieldErrors, fullKey));
    }
  }
  return names;
}
