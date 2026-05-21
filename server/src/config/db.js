import { isFirebaseInitialized } from "./firebase.js";

export const connectDb = async () => {
  if (isFirebaseInitialized) {
    console.log("[Database] Connected successfully to Firestore & Firebase Storage.");
  } else {
    console.log("[Database] Operating in Firebase offline/mock mode. Live operations require service account credentials.");
  }
};

