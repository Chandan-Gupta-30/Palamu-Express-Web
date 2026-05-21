import { FirestoreModel, FirestoreDocument } from "./FirestoreModel.js";

class CategoryDocument extends FirestoreDocument {
  constructor(modelClass, data) {
    super(modelClass, data);
    if (this.state === undefined) this.state = "Jharkhand";
  }

  async preSave(rawData) {
    if (rawData.state === undefined) rawData.state = "Jharkhand";
  }
}

export class Category extends FirestoreModel {
  static get collectionName() {
    return "categories";
  }

  static get InstanceClass() {
    return CategoryDocument;
  }
}
