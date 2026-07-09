import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { idb } from "@/lib/db";

// A minimal user shape shared by real Firebase users and local guest users.
export interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export const isGuestUser = (user: AppUser | null): boolean =>
  !!user && user.uid.startsWith("guest-");

export interface PersonalityTestData {
  answers: Record<string, number>;
  isCompleted: boolean;
  updatedAt: number;
}

const PT_SETTINGS_ID = "personality-test";

/**
 * Loads personality test progress. Guests read from local IndexedDB,
 * signed-in users read from Firestore.
 */
export async function loadPersonalityTest(user: AppUser): Promise<PersonalityTestData | null> {
  if (isGuestUser(user)) {
    const local = await idb.get<PersonalityTestData & { id: string }>("settings", PT_SETTINGS_ID);
    return local || null;
  }
  const snap = await getDoc(doc(db, "personality_tests", user.uid));
  return snap.exists() ? (snap.data() as PersonalityTestData) : null;
}

/**
 * Saves personality test progress. Guests write to local IndexedDB,
 * signed-in users write to Firestore.
 */
export async function savePersonalityTest(user: AppUser, data: PersonalityTestData): Promise<void> {
  if (isGuestUser(user)) {
    await idb.put("settings", { ...data, id: PT_SETTINGS_ID });
    return;
  }
  await setDoc(doc(db, "personality_tests", user.uid), data, { merge: true });
}
