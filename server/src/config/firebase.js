import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { env } from "./env.js";

let db;
let bucket;
let isFirebaseInitialized = false;

// In-memory mock database store for completely functional offline development
const mockMemoryDb = {};
const mockStorage = {};

const getCollectionStore = (name) => {
  if (!mockMemoryDb[name]) {
    mockMemoryDb[name] = {};
  }
  return mockMemoryDb[name];
};

const createMockCollectionRef = (collectionName) => {
  const mockQuery = {
    where: () => mockQuery,
    orderBy: () => mockQuery,
    limit: () => mockQuery,
    offset: () => mockQuery,
    get: async () => {
      const store = getCollectionStore(collectionName);
      const docs = Object.entries(store).map(([id, val]) => createMockDocSnap(collectionName, id, val));
      const forEach = (cb) => docs.forEach(cb);
      return { docs, size: docs.length, empty: docs.length === 0, forEach };
    },
    doc: (id) => {
      const docId = id || Math.random().toString(36).substring(2, 15);
      return createMockDocRef(collectionName, docId);
    },
    add: async (data) => {
      const docId = Math.random().toString(36).substring(2, 15);
      const store = getCollectionStore(collectionName);
      store[docId] = { ...data };
      const snap = createMockDocSnap(collectionName, docId, data);
      return { id: docId, get: async () => snap };
    },
  };
  return mockQuery;
};

const createMockDocRef = (collectionName, id) => ({
  id,
  get: async () => {
    const store = getCollectionStore(collectionName);
    const data = store[id];
    return createMockDocSnap(collectionName, id, data);
  },
  set: async (data, options) => {
    const store = getCollectionStore(collectionName);
    if (options && options.merge && store[id]) {
      store[id] = { ...store[id], ...data };
    } else {
      store[id] = { ...data };
    }
  },
  update: async (data) => {
    const store = getCollectionStore(collectionName);
    store[id] = { ...(store[id] || {}), ...data };
  },
  delete: async () => {
    const store = getCollectionStore(collectionName);
    delete store[id];
  },
});

const createMockDocSnap = (collectionName, id, data) => ({
  id,
  exists: data !== undefined && data !== null,
  data: () => data || {},
  get: (field) => (data || {})[field],
});

const createMockFileRef = (fileName) => ({
  name: fileName,
  save: async (buffer, options) => {
    mockStorage[fileName] = buffer;
  },
  makePublic: async () => {},
  publicUrl: () => `https://storage.googleapis.com/mock-bucket/${fileName}`,
});

const initializeFirebase = () => {
  if (isFirebaseInitialized) return { db, bucket };

  const saPath = path.resolve(process.cwd(), env.firebase.serviceAccountPath);
  const fallbackSaPath = path.resolve(process.cwd(), ".firebase-service-account.json");

  let serviceAccount = null;

  if (fs.existsSync(saPath)) {
    try {
      serviceAccount = JSON.parse(fs.readFileSync(saPath, "utf8"));
    } catch (err) {
      console.error(`Error parsing Firebase service account file at ${saPath}:`, err.message);
    }
  } else if (fs.existsSync(fallbackSaPath)) {
    try {
      serviceAccount = JSON.parse(fs.readFileSync(fallbackSaPath, "utf8"));
    } catch (err) {
      console.error(`Error parsing fallback service account file at ${fallbackSaPath}:`, err.message);
    }
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch (err) {
      console.error("Error parsing FIREBASE_SERVICE_ACCOUNT_JSON environment variable:", err.message);
    }
  }

  const bucketName = env.firebase.storageBucket || (serviceAccount ? `${serviceAccount.project_id}.appspot.com` : "palamu-express-web.firebasestorage.app");
  const projectId = env.firebase.projectId || (serviceAccount ? serviceAccount.project_id : "palamu-express-web");

  if (serviceAccount) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: bucketName,
        projectId: projectId,
      });
      db = admin.firestore();
      bucket = admin.storage().bucket();
      isFirebaseInitialized = true;
      console.log(`[Firebase] Connected successfully to project "${projectId}" and bucket "${bucketName}" using service account.`);
    } catch (error) {
      console.error("[Firebase] Error initializing admin SDK with service account:", error.message);
    }
  }

  if (!isFirebaseInitialized) {
    console.warn("\n==========================================================================");
    console.warn("[Firebase WARNING] Firebase Service Account Key File was not found or failed to load!");
    console.warn(`Looking at: ${saPath}`);
    console.warn("Please place your downloaded service account key file there.");
    console.warn("Initializing in fully functional in-memory MOCK / OFFLINE mode.");
    console.warn("==========================================================================\n");

    db = {
      collection: (name) => createMockCollectionRef(name),
    };
    bucket = {
      file: (name) => createMockFileRef(name),
      name: bucketName,
    };

    // Auto-seed mock memory database for seamless offline login and browsing!
    try {
      const superAdminId = "mock-super-admin-id";
      const approvedReporterId = "mock-approved-reporter-id";
      const pendingReporterId = "mock-pending-reporter-id";
      
      const adminHash = bcrypt.hashSync("admin123", 10);
      const reporterHash = bcrypt.hashSync("reporter123", 10);

      mockMemoryDb["users"] = {
        [superAdminId]: {
          fullName: "Platform Super Admin",
          phone: "9999999999",
          password: adminHash,
          role: "super_admin",
          approvalStatus: "approved",
          isPhoneVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        [approvedReporterId]: {
          fullName: "Aman Tiwari",
          email: "aman@palamuexpress.local",
          phone: "9000000001",
          password: reporterHash,
          role: "reporter",
          approvalStatus: "approved",
          isPhoneVerified: true,
          aadhaarNumber: "123412341234",
          district: "Palamu",
          area: "Medininagar",
          profilePhotoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80",
          aadhaarImageUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80",
          reporterCode: "PE-RPT-001",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        [pendingReporterId]: {
          fullName: "Neha Kumari",
          email: "neha@palamuexpress.local",
          phone: "9000000002",
          password: reporterHash,
          role: "reporter",
          approvalStatus: "pending",
          isPhoneVerified: true,
          aadhaarNumber: "223412341234",
          district: "Ranchi",
          area: "Kanke",
          profilePhotoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80",
          aadhaarImageUrl: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&q=80",
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      };

      // Auto-seed a few articles
      mockMemoryDb["articles"] = {
        "art-1": {
          title: "Palamu schools launch new digital attendance drive",
          slug: "palamu-schools-launch-new-digital-attendance-drive",
          excerpt: "Government schools across Medininagar have begun a district-level digital attendance initiative.",
          content: "Government schools across Medininagar have begun a district-level digital attendance initiative to improve transparency, attendance monitoring, and parent communication. Education officials say the pilot will expand to more blocks after the first month of rollout.",
          coverImageUrl: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=1200&q=80",
          district: "Palamu",
          area: "Medininagar",
          status: "published",
          storyFormat: "text",
          breaking: true,
          pageViews: 84,
          trendingScore: 8,
          author: approvedReporterId,
          createdAt: new Date(),
          updatedAt: new Date(),
          publishedAt: new Date(),
        },
        "art-2": {
          title: "Evening health camp draws strong turnout in Chainpur",
          slug: "evening-health-camp-draws-strong-turnout-in-chainpur",
          excerpt: "A local health camp saw strong participation with free screening support for families.",
          content: "A community health camp in Chainpur drew strong participation, with free screening support for women, children, and elderly residents. Organizers said the next camp will focus on follow-up consultations and awareness sessions.",
          coverImageUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80",
          district: "Palamu",
          area: "Chainpur",
          status: "published",
          storyFormat: "text",
          breaking: false,
          pageViews: 45,
          trendingScore: 5,
          author: approvedReporterId,
          createdAt: new Date(),
          updatedAt: new Date(),
          publishedAt: new Date(),
        }
      };
      
      // Auto-seed a category
      mockMemoryDb["categories"] = {
        "cat-1": {
          district: "Palamu",
          block: "Medininagar",
          slug: "palamu-medininagar",
          state: "Jharkhand",
          description: "Medininagar block coverage category for Palamu",
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      };
      
      console.log("[Firebase Mock] Successfully pre-populated offline database with Super Admin and Reporter accounts.");
    } catch (err) {
      console.error("[Firebase Mock] Error pre-populating mock memory database:", err.message);
    }
  }

  return { db, bucket };
};

const { db: firestoreDb, bucket: storageBucket } = initializeFirebase();

export { firestoreDb as db, storageBucket as bucket, isFirebaseInitialized };
