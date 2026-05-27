import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export async function createUserProfile(user, role = "customer") {
  if (!user) {
    return;
  }

  const userRef = doc(db, "users", user.uid);
  const userSnapshot = await getDoc(userRef);

  if (userSnapshot.exists()) {
    return;
  }

  await setDoc(userRef, {
    email: user.email || "",
    role,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function getUserRole(userId) {
  if (!userId) {
    return "";
  }

  const userRef = doc(db, "users", userId);
  const userSnapshot = await getDoc(userRef);

  if (!userSnapshot.exists()) {
    return "customer";
  }

  return userSnapshot.data().role || "customer";
}
