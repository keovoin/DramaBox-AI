import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, getDocFromServer, collection, onSnapshot, deleteDoc } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { UserProfile, Drama } from "../types";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
// Configure Google Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account"
});

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, "users", "connection_test"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("offline")) {
      console.warn("Firestore client appears offline or connecting.");
    }
  }
}

// Sync Firebase Auth User to Firestore Profile
export async function syncUserProfileToFirestore(userProfile: UserProfile): Promise<void> {
  if (!userProfile.id) return;
  const userRef = doc(db, "users", userProfile.id);
  try {
    const cleanProfile: Record<string, any> = {
      id: userProfile.id,
      name: userProfile.name || "",
      email: userProfile.email || "",
      phone: userProfile.phone || "",
      authMethod: userProfile.authMethod || "gmail",
      avatarUrl: userProfile.avatarUrl || "",
      isVip: Boolean(userProfile.isVip),
      vipPlanName: userProfile.isVip ? (userProfile.vipPlanName || "VIP Pass") : "",
      vipExpiresAt: userProfile.isVip ? (userProfile.vipExpiresAt || "") : "",
      vipExpiryDate: userProfile.isVip ? (userProfile.vipExpiryDate || "") : "",
      coins: typeof userProfile.coins === 'number' ? userProfile.coins : 0,
      createdAt: userProfile.createdAt || new Date().toISOString(),
      isBlocked: Boolean(userProfile.isBlocked),
      blockedReason: userProfile.blockedReason || "",
      transactions: userProfile.transactions || [],
      updatedAt: new Date().toISOString()
    };
    await setDoc(userRef, cleanProfile);
  } catch (error) {
    console.error("Failed to sync user profile to Firestore:", error);
  }
}

// Fetch User Profile from Firestore
export async function fetchUserProfileFromFirestore(userId: string): Promise<UserProfile | null> {
  const userRef = doc(db, "users", userId);
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      return {
        ...data,
        isVip: Boolean(data.isVip),
        vipPlanName: data.isVip ? (data.vipPlanName || undefined) : undefined,
        vipExpiryDate: data.isVip ? (data.vipExpiryDate || undefined) : undefined,
        vipExpiresAt: data.isVip ? (data.vipExpiresAt || undefined) : undefined,
      };
    }
  } catch (error) {
    console.error("Failed to fetch user profile from Firestore:", error);
  }
  return null;
}

export async function deleteUserProfileFromFirestore(userId: string): Promise<void> {
  if (!userId) return;
  const userRef = doc(db, "users", userId);
  try {
    await deleteDoc(userRef);
  } catch (error) {
    console.error(`Failed to delete user ${userId} from Firestore:`, error);
  }
}

// Global Drama Catalog Sync Functions
export async function syncDramaToFirestore(drama: Drama): Promise<void> {
  if (!drama.id) return;
  const dramaRef = doc(db, "dramas", drama.id);
  try {
    // Sanitize object to strip undefined properties that break Firestore setDoc
    const cleanDrama = JSON.parse(JSON.stringify(drama));
    await setDoc(dramaRef, {
      ...cleanDrama,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error(`Failed to sync drama ${drama.id} to Firestore:`, error);
  }
}

export async function deleteDramaFromFirestore(dramaId: string): Promise<void> {
  if (!dramaId) return;
  const dramaRef = doc(db, "dramas", dramaId);
  try {
    await deleteDoc(dramaRef);
  } catch (error) {
    console.error(`Failed to delete drama ${dramaId} from Firestore:`, error);
  }
}

// Realtime Listener for Dramas across all production devices
export function subscribeToDramasFromFirestore(onUpdate: (dramas: Drama[]) => void) {
  const dramasRef = collection(db, "dramas");
  return onSnapshot(dramasRef, (snapshot) => {
    const items: Drama[] = [];
    snapshot.forEach((docSnap) => {
      items.push(docSnap.data() as Drama);
    });
    onUpdate(items);
  }, (error) => {
    console.error("Firestore dramas subscription error:", error);
  });
}

// Realtime Listener for Users (Admin only)
export function subscribeToUsersFromFirestore(onUpdate: (users: UserProfile[]) => void) {
  const usersRef = collection(db, "users");
  return onSnapshot(usersRef, (snapshot) => {
    const items: UserProfile[] = [];
    snapshot.forEach((docSnap) => {
      if (docSnap.id !== "connection_test") {
        const raw = docSnap.data() as UserProfile;
        items.push({
          ...raw,
          isVip: Boolean(raw.isVip),
          vipPlanName: raw.isVip ? (raw.vipPlanName || undefined) : undefined,
          vipExpiryDate: raw.isVip ? (raw.vipExpiryDate || undefined) : undefined,
          vipExpiresAt: raw.isVip ? (raw.vipExpiresAt || undefined) : undefined,
        });
      }
    });
    onUpdate(items);
  }, (error) => {
    console.error("Firestore users subscription error:", error);
  });
}

// Trigger Google Popup Login via Firebase Auth
export async function loginWithFirebaseGoogle(): Promise<UserProfile> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user: User = result.user;
    const isAdmin = user.email?.toLowerCase() === "keovoin@gmail.com";

    const userProfile: UserProfile = {
      id: user.uid,
      name: user.displayName || user.email?.split("@")[0] || "Drama Fan",
      email: user.email || "",
      authMethod: "gmail",
      avatarUrl: user.photoURL || "https://lh3.googleusercontent.com/a/default-user=s96-c",
      isVip: isAdmin,
      vipExpiresAt: isAdmin ? "2030-12-31" : undefined,
      coins: 0,
      createdAt: new Date().toISOString(),
    };

    // Save to Firestore
    await syncUserProfileToFirestore(userProfile);
    return userProfile;
  } catch (error: any) {
    console.error("Firebase Google Auth error:", error);
    throw error;
  }
}

export async function logoutFirebase(): Promise<void> {
  await signOut(auth);
}

