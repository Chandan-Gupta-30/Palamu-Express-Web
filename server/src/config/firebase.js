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

const cacheStore = {};
const CACHE_TTL_MS = 60 * 1000; // Cache Firestore collections for 60 seconds

// In-flight fetch promises to coalesce concurrent requests
const activeCollectionFetches = {};
const activeDocFetches = {};

const invalidateCache = (colName) => {
  if (cacheStore[colName]) {
    delete cacheStore[colName];
  }
  // Clear any single document caches for this collection
  const prefix = `${colName}/`;
  Object.keys(cacheStore).forEach(key => {
    if (key.startsWith(prefix)) {
      delete cacheStore[key];
    }
  });
  console.log(`[Cache Invalidation] Cleared cache for collection "${colName}" and its documents`);
};

const shouldInvalidate = (colName, docId, data) => {
  if (!data) return true;
  
  const ignoreKeys = ["pageViews", "shareCount", "trendingScore", "updatedAt", "views"];
  const keys = Object.keys(data);
  
  // 1. If it is a partial update containing only stats fields, do NOT invalidate
  const hasOtherKeys = keys.some(key => !ignoreKeys.includes(key));
  if (!hasOtherKeys) {
    return false;
  }

  // 2. If it is a full document save (contains all fields), compare with existing cache
  const cached = cacheStore[colName];
  if (cached && docId) {
    const cachedDocSnap = cached.snapshot.docs?.find(d => d.id === docId);
    if (cachedDocSnap) {
      const prevData = cachedDocSnap.data();
      const allKeys = new Set([...Object.keys(prevData), ...keys]);
      for (const key of allKeys) {
        if (ignoreKeys.includes(key)) continue;
        
        const prevVal = prevData[key];
        const nextVal = data[key];
        
        // Handle dates and timestamps
        const prevTime = prevVal && typeof prevVal.toDate === "function" 
          ? prevVal.toDate().getTime() 
          : (prevVal instanceof Date ? prevVal.getTime() : null);
          
        const nextTime = nextVal instanceof Date 
          ? nextVal.getTime() 
          : (typeof nextVal === "string" || typeof nextVal === "number" ? new Date(nextVal).getTime() : null);
          
        if (prevTime !== null || nextTime !== null) {
          if (prevTime !== nextTime) return true;
          continue;
        }
        
        if (String(prevVal || "") !== String(nextVal || "")) {
          return true;
        }
      }
      return false; // All non-stats fields are identical! Do NOT invalidate cache.
    }
  }

  return true;
};

const wrapFirestoreDbWithCaching = (rawDb) => {
  return {
    collection: (colName) => {
      const rawCollection = rawDb.collection(colName);

      return {
        get: async () => {
          const now = Date.now();
          const cached = cacheStore[colName];
          if (cached && now - cached.timestamp < CACHE_TTL_MS) {
            console.log(`[Cache Hit] Serving documents from cache for collection "${colName}"`);
            return cached.snapshot;
          }

          // Return active fetch if already in flight
          if (activeCollectionFetches[colName]) {
            console.log(`[Cache Coalescing] Reusing active fetch promise for collection "${colName}"`);
            return activeCollectionFetches[colName];
          }

          console.log(`[Cache Miss] Fetching fresh documents from Firestore for collection "${colName}"`);
          const fetchPromise = rawCollection.get().then(snapshot => {
            cacheStore[colName] = {
              snapshot,
              timestamp: Date.now(),
            };
            delete activeCollectionFetches[colName];
            return snapshot;
          }).catch(err => {
            delete activeCollectionFetches[colName];
            throw err;
          });

          activeCollectionFetches[colName] = fetchPromise;
          return fetchPromise;
        },

        doc: (docId) => {
          const rawDoc = docId ? rawCollection.doc(docId) : rawCollection.doc();
          return {
            id: rawDoc.id,
            get: async () => {
              const now = Date.now();
              const docCacheKey = `${colName}/${rawDoc.id}`;

              // 1. First attempt to resolve from parent collection cache if fresh
              const parentCached = cacheStore[colName];
              if (parentCached && now - parentCached.timestamp < CACHE_TTL_MS) {
                const foundDocSnap = parentCached.snapshot.docs?.find(d => d.id === rawDoc.id);
                if (foundDocSnap) {
                  console.log(`[Cache Hit] Serving document "${rawDoc.id}" from parent collection "${colName}" cache`);
                  return {
                    id: rawDoc.id,
                    exists: true,
                    data: () => foundDocSnap.data(),
                    get: (field) => foundDocSnap.get(field),
                  };
                }
              }

              // 2. Resolve from single document cache
              const docCached = cacheStore[docCacheKey];
              if (docCached && now - docCached.timestamp < CACHE_TTL_MS) {
                console.log(`[Cache Hit] Serving single document "${rawDoc.id}" from cache`);
                return docCached.snapshot;
              }

              // 3. Resolve from active in-flight single document fetch
              if (activeDocFetches[docCacheKey]) {
                console.log(`[Cache Coalescing] Reusing active fetch promise for single document "${docCacheKey}"`);
                return activeDocFetches[docCacheKey];
              }

              console.log(`[Cache Miss] Fetching fresh single document "${rawDoc.id}" from Firestore`);
              const fetchPromise = rawDoc.get().then(snapshot => {
                cacheStore[docCacheKey] = {
                  snapshot,
                  timestamp: Date.now(),
                };
                delete activeDocFetches[docCacheKey];
                return snapshot;
              }).catch(err => {
                delete activeDocFetches[docCacheKey];
                throw err;
              });

              activeDocFetches[docCacheKey] = fetchPromise;
              return fetchPromise;
            },
            set: async (data, options) => {
              if (shouldInvalidate(colName, rawDoc.id, data)) {
                invalidateCache(colName);
              }
              return await rawDoc.set(data, options);
            },
            update: async (data) => {
              if (shouldInvalidate(colName, rawDoc.id, data)) {
                invalidateCache(colName);
              }
              return await rawDoc.update(data);
            },
            delete: async () => {
              invalidateCache(colName);
              return await rawDoc.delete();
            },
          };
        },

        add: async (data) => {
          invalidateCache(colName);
          return await rawCollection.add(data);
        },
      };
    },
  };
};

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

  const forceMock = process.env.FORCE_OFFLINE_MOCK === "true";

  if (serviceAccount && !forceMock) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: bucketName,
        projectId: projectId,
      });
      const rawDb = admin.firestore();
      rawDb.settings({ ignoreUndefinedProperties: true });
      db = wrapFirestoreDbWithCaching(rawDb);
      bucket = admin.storage().bucket();
      isFirebaseInitialized = true;
      console.log(`[Firebase] Connected successfully to project "${projectId}" and bucket "${bucketName}" using service account.`);
    } catch (error) {
      console.error("[Firebase] Error initializing admin SDK with service account:", error.message);
    }
  } else if (forceMock) {
    console.log("[Firebase] FORCE_OFFLINE_MOCK environment variable is set to true. Forcing mock database mode.");
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
          category: "education",
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
          category: "health",
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
