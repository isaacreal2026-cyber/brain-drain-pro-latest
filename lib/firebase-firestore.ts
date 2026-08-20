import { getFirestore } from "firebase/firestore";
import { firebaseApp, firebaseConfig } from "./firebase-app";

// An empty databaseId makes getFirestore throw; fall back to the default DB.
export const db = getFirestore(
  firebaseApp,
  firebaseConfig.firestoreDatabaseId?.trim() || "(default)",
);
