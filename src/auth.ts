// src/auth.ts
import { auth } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  reload,
  type User,
} from "firebase/auth";

export async function register(email: string, password: string) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);

  await sendEmailVerification(credential.user);

  return credential;
}

export function login(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function logout() {
  return signOut(auth);
}

export function observeAuthState(
  callback: (user: User | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}

export function sendVerificationEmail(user: User) {
  return sendEmailVerification(user);
}

export async function refreshUser(user: User) {
  await reload(user);

  const currentUser = auth.currentUser;

  if (currentUser) {
    await currentUser.getIdToken(true);
  }

  return currentUser;
}