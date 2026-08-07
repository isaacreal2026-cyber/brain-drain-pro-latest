/**
 * Auth token helpers. We dynamically import firebase-auth so that the heavy
 * firebase/auth chunk is only loaded when a signed-in user makes an API call,
 * preserving the route-level code-splitting done elsewhere.
 */

export async function getAuthToken(forceRefresh = false): Promise<string | null> {
  const { auth } = await import("./firebase-auth");
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken(forceRefresh);
  } catch {
    return null;
  }
}

export async function onAuthChanged(cb: (signedIn: boolean) => void): Promise<() => void> {
  const { auth } = await import("./firebase-auth");
  return auth.onAuthStateChanged((user) => cb(Boolean(user)));
}
