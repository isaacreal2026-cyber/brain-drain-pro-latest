import { getFirestore } from "firebase/firestore";
import { firebaseApp, firebaseConfig } from "./firebase-app";

export const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
