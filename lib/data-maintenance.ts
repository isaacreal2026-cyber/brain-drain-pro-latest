import { idb } from "./db";

/**
 * Object stores that hold user-generated content. "Refresh local data" clears
 * these so the app re-seeds fresh starter content on next load.
 *
 * We deliberately exclude "profile" and "settings" so a refresh does not wipe
 * the signed-in/guest profile or the user's appearance and privacy choices.
 */
const REFRESHABLE_STORES = [
  "brains",
  "nodes",
  "posts",
  "topics",
  "brain_dna",
  "messages",
  "conversations",
  "notifications",
  "comments",
  "communities",
  "missions",
  "milestones",
  "reputation",
  "xp_events",
  "checkins",
  "pathways",
  "books",
  "analytics_events",
] as const;

/**
 * Clears refreshable local data and reloads the app so seeding hooks run
 * again. Guarded by <AdminGateDialog /> which requires the phrase "im admin".
 */
export async function refreshLocalData(): Promise<void> {
  const existing = await idb.storeNames();
  const stores = REFRESHABLE_STORES.filter((name) => existing.includes(name));
  await idb.clearAll(stores);
}
