import bcrypt from "bcryptjs";
import { FirestoreModel, FirestoreDocument } from "./FirestoreModel.js";
import { approvalStatuses, roles } from "../utils/constants.js";

class UserDocument extends FirestoreDocument {
  constructor(modelClass, data) {
    super(modelClass, data);
    if (this.role === undefined) this.role = roles.ADVERTISER;
    if (this.approvalStatus === undefined) this.approvalStatus = approvalStatuses.PENDING;
    if (this.isPhoneVerified === undefined) this.isPhoneVerified = false;
    if (this.isFunctionalityDisabled === undefined) this.isFunctionalityDisabled = false;
    if (this.bookmarks === undefined) this.bookmarks = [];
    if (this.bloodGroup === undefined) this.bloodGroup = "O+";
    if (this.education === undefined) this.education = "";
    if (this.validUpto === undefined) this.validUpto = "";
  }

  async preSave(rawData) {
    if (rawData.password && !(rawData.password.length === 60 && rawData.password.startsWith("$2"))) {
      rawData.password = await bcrypt.hash(rawData.password, 10);
      this.password = rawData.password;
    }

    if (rawData.role === undefined) rawData.role = roles.ADVERTISER;
    if (rawData.approvalStatus === undefined) rawData.approvalStatus = approvalStatuses.PENDING;
    if (rawData.isPhoneVerified === undefined) rawData.isPhoneVerified = false;
    if (rawData.isFunctionalityDisabled === undefined) rawData.isFunctionalityDisabled = false;
    if (rawData.bookmarks === undefined) rawData.bookmarks = [];
    if (rawData.bloodGroup === undefined) rawData.bloodGroup = "O+";
    if (rawData.education === undefined) rawData.education = "";
    if (rawData.validUpto === undefined) rawData.validUpto = "";

    // Enforce permanent staff ID Card numbers
    if (this._id) {
      try {
        const existingDoc = await this._modelClass.findById(this._id);
        if (existingDoc) {
          if (existingDoc.reporterCode) {
            rawData.reporterCode = existingDoc.reporterCode;
            this.reporterCode = existingDoc.reporterCode;
          }
          if (existingDoc.chiefEditorCode) {
            rawData.chiefEditorCode = existingDoc.chiefEditorCode;
            this.chiefEditorCode = existingDoc.chiefEditorCode;
          }
        }
      } catch (err) {
        console.error("[User preSave] Error fetching existing user for code permanence check:", err.message);
      }
    }
  }

  comparePassword(candidate) {
    return bcrypt.compare(candidate, this.password || "");
  }
}

export class User extends FirestoreModel {
  static get collectionName() {
    return "users";
  }

  static get InstanceClass() {
    return UserDocument;
  }
}
