import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import fs from "fs";
import path from "path";

let dbInstance: Firestore | null = null;
let isInitialized = false;

export function getFirebaseDb(): Firestore | null {
  if (isInitialized) {
    return dbInstance;
  }

  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      
      if (!config.projectId || !config.apiKey) {
        console.warn("Firebase config is missing key fields. Firestore will run in-memory.");
        isInitialized = true;
        return null;
      }

      const app = getApps().length === 0 
        ? initializeApp({
            apiKey: config.apiKey,
            authDomain: config.authDomain,
            projectId: config.projectId,
            storageBucket: config.storageBucket,
            messagingSenderId: config.messagingSenderId,
            appId: config.appId,
          })
        : getApp();

      if (config.firestoreDatabaseId) {
        dbInstance = getFirestore(app, config.firestoreDatabaseId);
      } else {
        dbInstance = getFirestore(app);
      }
      console.log("Firebase Firestore initialized with databaseId:", config.firestoreDatabaseId || "default");
    } else {
      console.warn("firebase-applet-config.json not found. Firestore will run in-memory.");
    }
  } catch (error) {
    console.error("Failed to initialize Firebase Firestore:", error);
  }

  isInitialized = true;
  return dbInstance;
}
