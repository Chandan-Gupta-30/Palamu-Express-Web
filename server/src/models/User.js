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
