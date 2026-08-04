import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { UserProfile } from "@/lib/types";
import { AppUser, isGuestUser } from "@/lib/user-data";
import { idb } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { BrainCircuit, UserRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: AppUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isGuest: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const GUEST_STORAGE_KEY = "brain-builder-guest";
const GUEST_PROFILE_ID = "guest-profile";

function makeGuestProfile(uid: string): UserProfile {
  return {
    id: uid,
    username: `guest_${uid.substring(6, 11)}`,
    displayName: "Guest Builder",
    bio: "Exploring the limits of logic graphs and social knowledge.",
    followerCount: 0,
    followingCount: 0,
  };
}

function loadFirebaseServices() {
  return Promise.all([
    import("@/lib/firebase"),
    import("firebase/auth"),
    import("firebase/firestore"),
  ]).then(([firebase, authApi, firestoreApi]) => ({
    auth: firebase.auth,
    db: firebase.db,
    onAuthStateChanged: authApi.onAuthStateChanged,
    signInWithPopup: authApi.signInWithPopup,
    GoogleAuthProvider: authApi.GoogleAuthProvider,
    signOut: authApi.signOut,
    doc: firestoreApi.doc,
    getDoc: firestoreApi.getDoc,
    setDoc: firestoreApi.setDoc,
  }));
}

let firebaseServicesPromise: ReturnType<typeof loadFirebaseServices> | null = null;

function getFirebaseServices() {
  if (!firebaseServicesPromise) firebaseServicesPromise = loadFirebaseServices();
  return firebaseServicesPromise;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;
    const guestId = localStorage.getItem(GUEST_STORAGE_KEY);
    let guestSessionActive = Boolean(guestId);

    const restoreGuestSession = async (uid: string) => {
      const guestUser: AppUser = { uid, displayName: "Guest Builder", email: null, photoURL: null };
      let guestProfile = makeGuestProfile(uid);
      try {
        const localProfile = await idb.get<UserProfile>("profile", GUEST_PROFILE_ID);
        guestProfile = localProfile || guestProfile;
      } catch {
        // Local profile storage is best-effort.
      }
      if (!isMounted || !guestSessionActive) return;
      setUser(guestUser);
      setProfile(guestProfile);
      setLoading(false);
    };

    const handleAuthFailure = (error: unknown) => {
      console.error("Firebase auth initialization failed:", error);
      if (guestId) {
        guestSessionActive = true;
        void restoreGuestSession(guestId);
      } else if (isMounted) {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
      toast({
        title: "Authentication unavailable",
        description: "You can continue as a guest while sign-in reconnects.",
      });
    };

    const initializeAuth = async () => {
      try {
        const services = await getFirebaseServices();
        if (!isMounted) return;

        unsubscribe = services.onAuthStateChanged(
          services.auth,
          async (currentUser) => {
            if (!isMounted) return;

            if (currentUser) {
              guestSessionActive = false;
              const appUser: AppUser = {
                uid: currentUser.uid,
                displayName: currentUser.displayName,
                email: currentUser.email,
                photoURL: currentUser.photoURL,
              };
              setUser(appUser);

              try {
                const userDocRef = services.doc(services.db, "users", currentUser.uid);
                const userDoc = await services.getDoc(userDocRef);
                if (userDoc.exists()) {
                  setProfile(userDoc.data() as UserProfile);
                } else {
                  const newProfile: UserProfile = {
                    id: currentUser.uid,
                    username: currentUser.email?.split("@")[0] || `user_${currentUser.uid.substring(0, 5)}`,
                    displayName: currentUser.displayName || "New Builder",
                    bio: "Exploring the limits of logic graphs and social knowledge.",
                    avatarUrl: currentUser.photoURL || undefined,
                    followerCount: 0,
                    followingCount: 0,
                  };
                  await services.setDoc(userDocRef, newProfile);
                  setProfile(newProfile);
                }
              } catch (error: unknown) {
                console.error("Error fetching/creating profile:", error);
                setProfile({
                  id: currentUser.uid,
                  username: currentUser.email?.split("@")[0] || "builder",
                  displayName: currentUser.displayName || "Builder",
                  bio: "",
                  avatarUrl: currentUser.photoURL || undefined,
                  followerCount: 0,
                  followingCount: 0,
                });
                toast({ title: "Profile Sync Issue", description: "Working with a local profile. Changes will sync when possible." });
              }
              if (isMounted) setLoading(false);
            } else if (guestId) {
              guestSessionActive = true;
              await restoreGuestSession(guestId);
            } else {
              setUser(null);
              setProfile(null);
              setLoading(false);
            }
          },
          handleAuthFailure,
        );
      } catch (error: unknown) {
        handleAuthFailure(error);
      }
    };

    if (guestId) void restoreGuestSession(guestId);
    void initializeAuth();
    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, [toast]);

  const signIn = async () => {
    setSigningIn(true);
    try {
      const services = await getFirebaseServices();
      await services.signInWithPopup(services.auth, new services.GoogleAuthProvider());
      localStorage.removeItem(GUEST_STORAGE_KEY);
    } catch (error: any) {
      console.error("Error signing in", error);
      const blocked = error?.code === "auth/popup-blocked" || error?.code === "auth/cancelled-popup-request" || error?.code === "auth/popup-closed-by-user";
      toast({
        title: "Sign-in Failed",
        description: blocked
          ? "The sign-in popup was blocked or closed. You can continue as a guest instead."
          : error.message || "Could not sign in. You can continue as a guest instead.",
        variant: "destructive",
      });
    } finally {
      setSigningIn(false);
    }
  };

  const continueAsGuest = async () => {
    const guestId = `guest-${crypto.randomUUID().substring(0, 8)}`;
    localStorage.setItem(GUEST_STORAGE_KEY, guestId);
    const guestUser: AppUser = { uid: guestId, displayName: "Guest Builder", email: null, photoURL: null };
    const guestProfile = makeGuestProfile(guestId);
    try {
      await idb.put("profile", { ...guestProfile, id: GUEST_PROFILE_ID });
    } catch (error: unknown) {
      console.error("Failed to persist guest profile", error);
    }
    setUser(guestUser);
    setProfile(guestProfile);
  };

  const logOut = async () => {
    try {
      localStorage.removeItem(GUEST_STORAGE_KEY);
      if (user && isGuestUser(user)) {
        setUser(null);
        setProfile(null);
        return;
      }
      const services = await getFirebaseServices();
      await services.signOut(services.auth);
    } catch (error: any) {
      console.error("Error signing out", error);
      toast({ title: "Sign-out Failed", description: error.message || "Could not sign out.", variant: "destructive" });
    }
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!user || !profile) return;
    const updatedProfile = { ...profile, ...data };
    try {
      if (isGuestUser(user)) {
        await idb.put("profile", { ...updatedProfile, id: GUEST_PROFILE_ID });
      } else {
        const services = await getFirebaseServices();
        await services.setDoc(services.doc(services.db, "users", user.uid), updatedProfile, { merge: true });
      }
      setProfile(updatedProfile);
    } catch (error: any) {
      console.error("Error updating profile", error);
      toast({ title: "Update Failed", description: error.message || "Could not update profile.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="animate-pulse flex items-center gap-2">
          <BrainCircuit className="w-6 h-6 text-primary" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background p-6">
        <div className="max-w-md w-full bg-card border rounded-2xl p-8 text-center shadow-lg">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BrainCircuit className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome to Brain Drain</h1>
          <p className="text-muted-foreground mb-8">Sign in to start creating logic modules, managing missions, and joining the community.</p>
          <div className="space-y-3">
            <Button onClick={signIn} disabled={signingIn} className="w-full py-6 text-lg rounded-xl">
              {signingIn ? "Signing in..." : "Sign in with Google"}
            </Button>
            <Button onClick={continueAsGuest} variant="outline" className="w-full py-6 text-lg rounded-xl gap-2">
              <UserRound className="w-5 h-5" />
              Continue as Guest
            </Button>
            <p className="text-xs text-muted-foreground pt-2">
              Guest mode stores everything on this device. Sign in later to sync across devices.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, isGuest: isGuestUser(user), signIn, logOut, updateProfileData }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
