import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { UserProfile } from "../types";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google Provider
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
    await setDoc(userRef, {
      ...userProfile,
      updatedAt: new Date().toISOString()
    }, { merge: true });
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
      return snap.data() as UserProfile;
    }
  } catch (error) {
    console.error("Failed to fetch user profile from Firestore:", error);
  }
  return null;
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
