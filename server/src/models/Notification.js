import { FirestoreModel, FirestoreDocument } from "./FirestoreModel.js";

class NotificationDocument extends FirestoreDocument {
  constructor(modelClass, data) {
    super(modelClass, data);
    if (this.userId === undefined) this.userId = "all"; // "all" for broadcast, or specific userId
    if (this.title === undefined) this.title = "";
    if (this.message === undefined) this.message = "";
    if (this.type === undefined) this.type = "broadcast"; // "broadcast" or "direct"
    if (this.isRead === undefined) this.isRead = false; // For direct notifications
    if (this.readBy === undefined) this.readBy = []; // User IDs who read this broadcast
    if (this.clearedBy === undefined) this.clearedBy = []; // User IDs who cleared/dismissed this broadcast
    if (this.senderId === undefined) this.senderId = ""; // Admin sender ID
    if (this.createdAt === undefined) this.createdAt = Date.now();
  }

  async preSave(rawData) {
    if (rawData.userId === undefined) rawData.userId = "all";
    if (rawData.title === undefined) rawData.title = "";
    if (rawData.message === undefined) rawData.message = "";
    if (rawData.type === undefined) rawData.type = "broadcast";
    if (rawData.isRead === undefined) rawData.isRead = false;
    if (rawData.readBy === undefined) rawData.readBy = [];
    if (rawData.clearedBy === undefined) rawData.clearedBy = [];
    if (rawData.senderId === undefined) rawData.senderId = "";
    if (rawData.createdAt === undefined) rawData.createdAt = Date.now();
  }
}

export class Notification extends FirestoreModel {
  static get collectionName() {
    return "notifications";
  }

  static get InstanceClass() {
    return NotificationDocument;
  }
}
