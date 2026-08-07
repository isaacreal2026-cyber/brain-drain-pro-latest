/**
 * The exact pass-phrase an operator must type to authorize a destructive
 * "refresh / reset local data" action.
 *
 * This is an intentional-confirmation gate, NOT a secrecy-based security
 * boundary: the protected data lives on the user's own device. Requiring the
 * literal phrase prevents accidental one-click wipes while keeping the step
 * explicit and accessible.
 */
export const ADMIN_CONFIRM_PHRASE = "im admin";

/**
 * Returns true when the supplied text matches the admin phrase after
 * trimming and case-folding.
 */
export function matchesAdminPhrase(value: string): boolean {
  return value.trim().toLowerCase() === ADMIN_CONFIRM_PHRASE;
}
