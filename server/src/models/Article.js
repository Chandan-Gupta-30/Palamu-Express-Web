import { FirestoreModel, FirestoreDocument } from "./FirestoreModel.js";
import { articleStatuses } from "../utils/constants.js";

class ArticleDocument extends FirestoreDocument {
  constructor(modelClass, data) {
    super(modelClass, data);
    if (this.content === undefined) this.content = "";
    if (this.audioDuration === undefined) this.audioDuration = 0;
    if (this.audioWaveform === undefined) this.audioWaveform = [];
    if (this.audioTranscript === undefined) this.audioTranscript = "";
    if (this.storyFormat === undefined) this.storyFormat = "text";
    if (this.tags === undefined) this.tags = [];
    if (this.status === undefined) this.status = articleStatuses.PENDING;
    if (this.breaking === undefined) this.breaking = false;
    if (this.trendingScore === undefined) this.trendingScore = 0;
    if (this.pageViews === undefined) this.pageViews = 0;
  }

  async preSave(rawData) {
    const hasContent = Boolean(rawData.content?.trim());
    const hasAudio = Boolean(rawData.audioUrl?.trim());

    if (!hasContent && !hasAudio) {
      throw new Error("Either article content or a recorded voice clip is required");
    }

    if (hasAudio && hasContent) {
      rawData.storyFormat = "hybrid";
    } else if (hasAudio) {
      rawData.storyFormat = "voice";
    } else {
      rawData.storyFormat = "text";
    }
    this.storyFormat = rawData.storyFormat;

    if (rawData.content === undefined) rawData.content = "";
    if (rawData.audioDuration === undefined) rawData.audioDuration = 0;
    if (rawData.audioWaveform === undefined) rawData.audioWaveform = [];
    if (rawData.audioTranscript === undefined) rawData.audioTranscript = "";
    if (rawData.tags === undefined) rawData.tags = [];
    if (rawData.status === undefined) rawData.status = articleStatuses.PENDING;
    if (rawData.breaking === undefined) rawData.breaking = false;
    if (rawData.trendingScore === undefined) rawData.trendingScore = 0;
    if (rawData.pageViews === undefined) rawData.pageViews = 0;
  }
}

export class Article extends FirestoreModel {
  static get collectionName() {
    return "articles";
  }

  static get InstanceClass() {
    return ArticleDocument;
  }
}
