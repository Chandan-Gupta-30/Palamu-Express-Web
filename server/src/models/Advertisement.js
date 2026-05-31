import { FirestoreModel, FirestoreDocument } from "./FirestoreModel.js";
import { adPlacements, adStatuses } from "../utils/constants.js";

class AdvertisementDocument extends FirestoreDocument {
  constructor(modelClass, data) {
    super(modelClass, data);
    if (this.targetUrl === undefined) this.targetUrl = "";
    if (this.placement === undefined) this.placement = adPlacements.HOMEPAGE_LATEST;
    if (this.priority === undefined) this.priority = 100;
    if (this.description === undefined) this.description = "";
    if (this.ctaLabel === undefined) this.ctaLabel = "Visit Sponsor";
    if (this.status === undefined) this.status = adStatuses.PENDING_PAYMENT;
    if (this.companyName === undefined) this.companyName = "";
    if (this.notes === undefined) this.notes = "";
    if (this.paymentStatus === undefined) this.paymentStatus = "pending";
    if (this.rejectionReason === undefined) this.rejectionReason = "";
    if (this.articleId === undefined) this.articleId = "";
    if (this.adPosition === undefined) this.adPosition = "middle";
    if (this.paragraphIndex === undefined) this.paragraphIndex = 2;
    if (this.viewsCount === undefined) this.viewsCount = 0;
    if (this.clicksCount === undefined) this.clicksCount = 0;
    if (this.promotionalContent === undefined) this.promotionalContent = "";
    if (this.district === undefined) this.district = "";
    if (this.block === undefined) this.block = "";
    if (this.targetDistricts === undefined) this.targetDistricts = [];
    if (this.targetBlocks === undefined) this.targetBlocks = [];
    if (this.timeTargeting === undefined) this.timeTargeting = { startHour: 0, endHour: 24 };
    if (this.pausedAt === undefined) this.pausedAt = null;
  }

  async preSave(rawData) {
    if (rawData.targetUrl === undefined) rawData.targetUrl = "";
    if (rawData.placement === undefined) rawData.placement = adPlacements.HOMEPAGE_LATEST;
    if (rawData.priority === undefined) rawData.priority = 100;
    if (rawData.description === undefined) rawData.description = "";
    if (rawData.ctaLabel === undefined) rawData.ctaLabel = "Visit Sponsor";
    if (rawData.status === undefined) rawData.status = adStatuses.PENDING_PAYMENT;
    if (rawData.companyName === undefined) rawData.companyName = "";
    if (rawData.notes === undefined) rawData.notes = "";
    if (rawData.paymentStatus === undefined) rawData.paymentStatus = "pending";
    if (rawData.rejectionReason === undefined) rawData.rejectionReason = "";
    if (rawData.articleId === undefined) rawData.articleId = "";
    if (rawData.adPosition === undefined) rawData.adPosition = "middle";
    if (rawData.paragraphIndex === undefined) rawData.paragraphIndex = 2;
    if (rawData.viewsCount === undefined) rawData.viewsCount = 0;
    if (rawData.clicksCount === undefined) rawData.clicksCount = 0;
    if (rawData.promotionalContent === undefined) rawData.promotionalContent = "";
    if (rawData.district === undefined) rawData.district = "";
    if (rawData.block === undefined) rawData.block = "";
    if (rawData.targetDistricts === undefined) rawData.targetDistricts = [];
    if (rawData.targetBlocks === undefined) rawData.targetBlocks = [];
    if (rawData.timeTargeting === undefined) rawData.timeTargeting = { startHour: 0, endHour: 24 };
    if (rawData.pausedAt === undefined) rawData.pausedAt = null;
  }
}

export class Advertisement extends FirestoreModel {
  static get collectionName() {
    return "advertisements";
  }

  static get InstanceClass() {
    return AdvertisementDocument;
  }
}
