import { FirestoreModel, FirestoreDocument } from "./FirestoreModel.js";

class ContactMessageDocument extends FirestoreDocument {
  constructor(modelClass, data) {
    super(modelClass, data);
    if (this.status === undefined) this.status = "new";
    if (this.adminNote === undefined) this.adminNote = "";
  }

  async preSave(rawData) {
    if (rawData.status === undefined) rawData.status = "new";
    if (rawData.adminNote === undefined) rawData.adminNote = "";
  }
}

export class ContactMessage extends FirestoreModel {
  static get collectionName() {
    return "contactmessages";
  }

  static get InstanceClass() {
    return ContactMessageDocument;
  }
}
