import { FirestoreModel, FirestoreDocument } from "./FirestoreModel.js";

class AnalyticsDocument extends FirestoreDocument {
  constructor(modelClass, data) {
    super(modelClass, data);
    if (this.views === undefined) this.views = 0;
    if (this.liveVisitors === undefined) this.liveVisitors = 0;
  }

  async preSave(rawData) {
    if (rawData.views === undefined) rawData.views = 0;
    if (rawData.liveVisitors === undefined) rawData.liveVisitors = 0;
  }
}

export class Analytics extends FirestoreModel {
  static get collectionName() {
    return "analytics";
  }

  static get InstanceClass() {
    return AnalyticsDocument;
  }
}
