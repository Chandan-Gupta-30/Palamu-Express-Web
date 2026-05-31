import { db } from "../config/firebase.js";

// Helper to convert Firestore Timestamps to standard Dates
export const formatFirestoreData = (data) => {
  if (!data) return data;
  const formatted = { ...data };
  for (const key of Object.keys(formatted)) {
    if (formatted[key] && typeof formatted[key] === "object") {
      if (typeof formatted[key].toDate === "function") {
        formatted[key] = formatted[key].toDate();
      } else if (formatted[key] instanceof Date) {
        // Keep Date
      } else if (Array.isArray(formatted[key])) {
        formatted[key] = formatted[key].map(item => 
          item && typeof item === "object" && typeof item.toDate === "function" ? item.toDate() : item
        );
      } else {
        formatted[key] = formatFirestoreData(formatted[key]);
      }
    }
  }
  return formatted;
};

// Emulated Query Builder mimicking Mongoose queries
class FirestoreQuery {
  constructor(modelClass, isFindOne = false, isDelete = false, filter = {}) {
    this.modelClass = modelClass;
    this.isFindOne = isFindOne;
    this.isDelete = isDelete;
    this.filterObj = filter || {};
    this.populatePaths = [];
    this.sortObj = null;
    this.limitVal = null;
    this.skipVal = null;
    this.selectFields = [];
    this.updatePayload = null;
  }

  populate(path, select) {
    this.populatePaths.push({ path, select });
    return this;
  }

  sort(sortObj) {
    this.sortObj = sortObj;
    return this;
  }

  limit(limitVal) {
    this.limitVal = limitVal;
    return this;
  }

  skip(skipVal) {
    this.skipVal = skipVal;
    return this;
  }

  select(selectStr) {
    if (typeof selectStr === "string") {
      // support both "a b c" and "-password"
      const fields = selectStr.split(/\s+/).filter(Boolean);
      this.selectFields.push(...fields);
    }
    return this;
  }

  // Support for findOneAndUpdate / findByIdAndUpdate payload staging
  setUpdate(updatePayload) {
    this.updatePayload = updatePayload;
    return this;
  }

  async execute() {
    const colName = this.modelClass.collectionName;
    let docs = [];

    // 1. Fetch raw documents
    try {
      const snap = await db.collection(colName).get();
      snap.forEach(docSnap => {
        const raw = formatFirestoreData(docSnap.data());
        docs.push({
          _id: docSnap.id,
          id: docSnap.id,
          ...raw,
        });
      });
    } catch (err) {
      console.error(`[FirestoreQuery] Error fetching collection "${colName}":`, err.message);
    }

    // 2. Perform in-memory filter matching MongoDB operators
    docs = docs.filter(doc => this.matchFilter(doc, this.filterObj));

    // 3. Handle deletions if this query was a delete query
    if (this.isDelete) {
      const deletedDocs = [...docs];
      for (const doc of deletedDocs) {
        await db.collection(colName).doc(doc._id).delete();
      }
      return this.isFindOne ? (deletedDocs[0] || null) : { deletedCount: deletedDocs.length };
    }

    // 4. Handle updates if this query was an update query (findOneAndUpdate)
    if (this.updatePayload) {
      if (docs.length > 0) {
        const targetDocs = this.isFindOne ? [docs[0]] : docs;
        const updatedInstances = [];

        for (const doc of targetDocs) {
          const rawDoc = { ...doc };
          delete rawDoc._id;
          delete rawDoc.id;

          // Apply Mongoose-like atomic operators or flat overrides
          let nextData = { ...rawDoc };
          const update = this.updatePayload;

          if (update.$set) {
            Object.assign(nextData, update.$set);
          } else {
            // Check if it's a flat object or contains mongoose $set
            const hasMongooseOps = Object.keys(update).some(k => k.startsWith("$"));
            if (hasMongooseOps) {
              if (update.$inc) {
                for (const [k, v] of Object.entries(update.$inc)) {
                  nextData[k] = (nextData[k] || 0) + Number(v);
                }
              }
              if (update.$push) {
                for (const [k, v] of Object.entries(update.$push)) {
                  nextData[k] = Array.isArray(nextData[k]) ? [...nextData[k], v] : [v];
                }
              }
              if (update.$addToSet) {
                for (const [k, v] of Object.entries(update.$addToSet)) {
                  if (Array.isArray(nextData[k])) {
                    if (!nextData[k].some(item => String(item) === String(v))) {
                      nextData[k] = [...nextData[k], v];
                    }
                  } else {
                    nextData[k] = [v];
                  }
                }
              }
              if (update.$pull) {
                for (const [k, v] of Object.entries(update.$pull)) {
                  if (Array.isArray(nextData[k])) {
                    nextData[k] = nextData[k].filter(item => String(item) !== String(v));
                  }
                }
              }
            } else {
              Object.assign(nextData, update);
            }
          }

          nextData.updatedAt = new Date();

          // Create document instance, run pre-saves, and save
          const docInstance = new this.modelClass.InstanceClass(this.modelClass, nextData);
          docInstance._id = doc._id;
          docInstance.id = doc._id;
          await docInstance.save();
          updatedInstances.push(docInstance);
        }

        return this.isFindOne ? updatedInstances[0] : updatedInstances;
      }
      return this.isFindOne ? null : [];
    }

    // 5. Perform sorting
    if (this.sortObj) {
      docs.sort((a, b) => {
        for (const [key, val] of Object.entries(this.sortObj)) {
          const multiplier = val === -1 || val === "desc" ? -1 : 1;
          const aField = a[key];
          const bField = b[key];

          if (aField instanceof Date && bField instanceof Date) {
            if (aField.getTime() !== bField.getTime()) {
              return (aField.getTime() - bField.getTime()) * multiplier;
            }
          } else if (aField !== bField) {
            if (aField < bField || aField === undefined) return -1 * multiplier;
            if (aField > bField || bField === undefined) return 1 * multiplier;
          }
        }
        return 0;
      });
    }

    // 6. Perform skip (offset)
    if (this.skipVal !== null && this.skipVal > 0) {
      docs = docs.slice(this.skipVal);
    }

    // 7. Perform limit
    if (this.limitVal !== null && this.limitVal > 0) {
      docs = docs.slice(0, this.limitVal);
    }

    // 8. Instantiate wrapped documents
    let results = docs.map(d => {
      const inst = new this.modelClass.InstanceClass(this.modelClass, d);
      inst._id = d._id;
      inst.id = d._id;
      return inst;
    });

    // 9. Perform populated resolutions
    for (const pop of this.populatePaths) {
      for (const inst of results) {
        await this.resolvePopulate(inst, pop.path, pop.select);
      }
    }

    // 10. Perform select filtering (projections)
    if (this.selectFields.length > 0) {
      const excludes = this.selectFields.filter(f => f.startsWith("-")).map(f => f.slice(1));
      const includes = this.selectFields.filter(f => !f.startsWith("-") && !f.startsWith("+"));
      
      for (const inst of results) {
        // Handle excludes
        excludes.forEach(field => delete inst[field]);

        // Handle explicit password exclude if it doesn't have an explicit '+' include
        if (!this.selectFields.includes("+password") && !this.selectFields.includes("password")) {
          delete inst.password;
        }
        if (!this.selectFields.includes("+phoneOtpCode")) {
          delete inst.phoneOtpCode;
        }
        if (!this.selectFields.includes("+phoneOtpExpiresAt")) {
          delete inst.phoneOtpExpiresAt;
        }

        // Handle includes (if there are explicit includes, we drop everything else not included)
        if (includes.length > 0) {
          const keys = Object.keys(inst);
          keys.forEach(key => {
            if (!includes.includes(key) && key !== "_id" && key !== "id") {
              delete inst[key];
            }
          });
        }
      }
    } else {
      // Default projections (hide sensitive selected fields)
      for (const inst of results) {
        delete inst.password;
        delete inst.phoneOtpCode;
        delete inst.phoneOtpExpiresAt;
      }
    }

    return this.isFindOne ? (results[0] || null) : results;
  }

  // Thenable interface so users can use await on the query
  then(onFulfilled, onRejected) {
    return this.execute().then(onFulfilled, onRejected);
  }

  // MongoDB Match Engine emulated in Javascript
  matchFilter(doc, filter) {
    if (!filter || Object.keys(filter).length === 0) return true;

    for (const [key, value] of Object.entries(filter)) {
      if (key === "$or") {
        if (!Array.isArray(value)) continue;
        const matchesOr = value.some(subFilter => this.matchFilter(doc, subFilter));
        if (!matchesOr) return false;
        continue;
      }
      if (key === "$and") {
        if (!Array.isArray(value)) continue;
        const matchesAnd = value.every(subFilter => this.matchFilter(doc, subFilter));
        if (!matchesAnd) return false;
        continue;
      }
      if (key === "$text") {
        const searchKeyword = String(value?.$search || "").toLowerCase().trim();
        if (!searchKeyword) continue;

        const docString = [
          doc.title,
          doc.excerpt,
          doc.content,
          doc.district,
          doc.area,
          doc.fullName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!docString.includes(searchKeyword)) return false;
        continue;
      }

      const docVal = doc[key];

      // Handle MongoDB Query Operators
      if (value && typeof value === "object" && !(value instanceof Date) && !Array.isArray(value)) {
        if ("$ne" in value && String(docVal) === String(value.$ne)) return false;
        if ("$in" in value) {
          const inArr = Array.isArray(value.$in) ? value.$in.map(String) : [];
          if (!inArr.includes(String(docVal))) return false;
        }
        if ("$nin" in value) {
          const ninArr = Array.isArray(value.$nin) ? value.$nin.map(String) : [];
          if (ninArr.includes(String(docVal))) return false;
        }
        if ("$gt" in value && !(docVal > value.$gt)) return false;
        if ("$lt" in value && !(docVal < value.$lt)) return false;
        if ("$gte" in value && !(docVal >= value.$gte)) return false;
        if ("$lte" in value && !(docVal <= value.$lte)) return false;
        if ("$exists" in value) {
          const exists = value.$exists;
          const hasVal = docVal !== undefined && docVal !== null && docVal !== "";
          if (exists && !hasVal) return false;
          if (!exists && hasVal) return false;
        }
        continue;
      }

      // Simple equality check (converting to String for safe ObjectId string checking)
      if (value instanceof Date && docVal instanceof Date) {
        if (docVal.getTime() !== value.getTime()) return false;
      } else if (String(docVal) !== String(value)) {
        return false;
      }
    }

    return true;
  }

  // Populate reference field dynamic resolver
  async resolvePopulate(inst, path, select) {
    const rawRef = inst[path];
    if (!rawRef) return;

    // Check if it's an array of references (like bookmarks)
    if (Array.isArray(rawRef)) {
      const populatedItems = [];
      for (const itemRef of rawRef) {
        const populated = await this.fetchPopulatedDoc(itemRef, path);
        if (populated) {
          populatedItems.push(populated);
        }
      }
      inst[path] = populatedItems;
    } else {
      const populated = await this.fetchPopulatedDoc(rawRef, path);
      if (populated) {
        inst[path] = populated;
      }
    }
  }

  async fetchPopulatedDoc(refId, path) {
    const idStr = String(refId);
    let targetCollection = "";

    // Map path to collection name
    if (path === "author" || path === "reviewedBy" || path === "advertiser") {
      targetCollection = "users";
    } else if (path === "category") {
      targetCollection = "categories";
    } else if (path === "article" || path === "bookmarks") {
      targetCollection = "articles";
    }

    if (!targetCollection) return null;

    try {
      const docSnap = await db.collection(targetCollection).doc(idStr).get();
      if (docSnap.exists) {
        const raw = formatFirestoreData(docSnap.data());
        const cleaned = {
          _id: docSnap.id,
          id: docSnap.id,
          ...raw,
        };
        // Exclude passwords on populated user returns by default
        delete cleaned.password;
        return cleaned;
      }
    } catch (err) {
      console.error(`[FirestoreQuery] Populate resolution error on "${targetCollection}/${idStr}":`, err.message);
    }
    return null;
  }
}

// Emulated Document instance returned by Queries
export class FirestoreDocument {
  constructor(modelClass, data) {
    this._modelClass = modelClass;
    Object.assign(this, data);
    
    // Auto-map document IDs to both Mongoose and standard notations
    if (data && data._id) {
      this.id = data._id;
      this._id = data._id;
    }
  }

  // Emulate Mongoose instance save
  async save() {
    const colName = this._modelClass.collectionName;
    const rawData = { ...this };
    
    // Remove internal properties
    delete rawData._modelClass;
    delete rawData.id;
    delete rawData._id;

    // Run custom pre-save hooks on subclass
    if (typeof this.preSave === "function") {
      await this.preSave(rawData);
    }

    if (!this._id) {
      // Create new document
      rawData.createdAt = rawData.createdAt || new Date();
      rawData.updatedAt = new Date();

      const docRef = db.collection(colName).doc();
      this._id = docRef.id;
      this.id = docRef.id;
      await docRef.set(rawData);
    } else {
      // Update existing document
      rawData.updatedAt = new Date();
      await db.collection(colName).doc(this._id).set(rawData, { merge: true });
    }
    return this;
  }

  // Emulate Mongoose toObject()
  toObject() {
    const obj = { ...this };
    delete obj._modelClass;
    return obj;
  }

  toJSON() {
    return this.toObject();
  }
}

// Base Static Model class that emulates Mongoose models
export class FirestoreModel {
  constructor(data = {}) {
    return new this.constructor.InstanceClass(this.constructor, data);
  }

  static get collectionName() {
    throw new Error("collectionName static getter must be implemented on subclasses.");
  }

  static get InstanceClass() {
    return FirestoreDocument;
  }

  // Model static queries emulations
  static find(filter = {}) {
    return new FirestoreQuery(this, false, false, filter);
  }

  static findOne(filter = {}) {
    return new FirestoreQuery(this, true, false, filter);
  }

  static findById(id) {
    return new FirestoreQuery(this, true, false, { _id: id });
  }

  static async create(data = {}) {
    const nextData = { ...data };
    
    // Instantiate document, which automatically lets it run preSave hooks
    const docInstance = new this(nextData);
    await docInstance.save();
    return docInstance;
  }

  static findByIdAndUpdate(id, update, options = {}) {
    return new FirestoreQuery(this, true, false, { _id: id }).setUpdate(update);
  }

  static findOneAndUpdate(filter, update, options = {}) {
    return new FirestoreQuery(this, true, false, filter).setUpdate(update);
  }

  static findByIdAndDelete(id) {
    return new FirestoreQuery(this, true, true, { _id: id });
  }

  static findOneAndDelete(filter) {
    return new FirestoreQuery(this, true, true, filter);
  }

  static async countDocuments(filter = {}) {
    const query = new FirestoreQuery(this, false, false, filter);
    const results = await query.execute();
    return results.length;
  }

  static async updateMany(filter = {}, update = {}) {
    const query = new FirestoreQuery(this, false, false, filter).setUpdate(update);
    const results = await query.execute();
    return { modifiedCount: results.length };
  }

  static async deleteMany(filter = {}) {
    const query = new FirestoreQuery(this, false, true, filter);
    const result = await query.execute();
    return { deletedCount: result.deletedCount || 0 };
  }

  // Simple sum aggregator for Analytics
  static async aggregate(pipeline = []) {
    // We only use: [{ $group: { _id: null, views: { $sum: "$views" } } }] in analytics
    const sumOp = pipeline.find(stage => stage.$group && stage.$group.views && stage.$group.views.$sum);
    
    if (sumOp) {
      const sumField = String(sumOp.$group.views.$sum).replace(/^\$/, ""); // "views"
      const colName = this.collectionName;
      let total = 0;

      try {
        const snap = await db.collection(colName).get();
        snap.forEach(docSnap => {
          const val = Number(docSnap.get(sumField) || 0);
          total += val;
        });
        return [{ _id: null, views: total }];
      } catch (err) {
        console.error(`[FirestoreModel] Error in aggregate sum on "${colName}":`, err.message);
      }
    }
    return [{ _id: null, views: 0 }];
  }
}
