import { StatusCodes } from "http-status-codes";
import { Advertisement } from "../models/Advertisement.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { adDurationOptions, adPlacementPricing, adPlacements, adStatuses } from "../utils/constants.js";
import { createAdOrder, verifyRazorpayPaymentSignature } from "../services/paymentService.js";
import { uploadBase64Asset } from "../services/uploadService.js";
import { env } from "../config/env.js";
import { db } from "../config/firebase.js";

const normalizePlacementValue = (placement) => {
  const value = String(placement || "").trim();

  if (value === "homepage-top") return adPlacements.HOMEPAGE_HERO;
  if (value === "homepage-sidebar") return adPlacements.HOMEPAGE_LATEST;
  if (Object.values(adPlacements).includes(value)) return value;

  return adPlacements.HOMEPAGE_LATEST;
};

const buildHttpError = (message, statusCode = StatusCodes.BAD_REQUEST) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const loadDynamicPricing = async () => {
  const pricing = JSON.parse(JSON.stringify(adPlacementPricing));
  try {
    const configSnap = await db.collection("settings").doc("global_config").get();
    if (configSnap.exists) {
      const mapping = {
        "homepage-hero": "adPricing_homepage-hero",
        "homepage-latest": "adPricing_homepage-latest",
        "homepage-district": "adPricing_homepage-district",
        "homepage-popup": "adPricing_homepage-popup",
        "in-article": "adPricing_in-article",
        "promotional-article": "adPricing_promotional-article"
      };
      
      Object.entries(mapping).forEach(([placementKey, dbKey]) => {
        const val = configSnap.get(dbKey);
        if (val !== undefined && val !== null && val !== "") {
          pricing[placementKey] = {
            ...pricing[placementKey],
            baseDailyRate: Number(val)
          };
        }
      });
    }
  } catch (err) {
    console.error("[loadDynamicPricing] Error loading global config settings:", err.message);
  }
  return pricing;
};

const getPlanForSelection = (placement, durationDays, dynamicPricing) => {
  const normalizedPlacement = normalizePlacementValue(placement);
  const days = Number(durationDays || 0);
  if (!adDurationOptions.includes(days)) return null;

  const pricing = dynamicPricing[normalizedPlacement] || dynamicPricing[adPlacements.HOMEPAGE_LATEST];
  return {
    placement: normalizedPlacement,
    days,
    amount: pricing.baseDailyRate * days,
    label: `${days} Day${days > 1 ? "s" : ""}`,
    placementLabel: pricing.label,
    currency: "INR",
  };
};

const normalizeAdvertisementRecord = (ad) => {
  if (!ad) return ad;

  const normalizedPlacement = normalizePlacementValue(ad.placement);
  const record = typeof ad.toObject === "function" ? ad.toObject() : { ...ad };

  return {
    ...record,
    placement: normalizedPlacement,
    ctaLabel: record.ctaLabel || "Visit Sponsor",
    priority: record.priority || 100,
    description: record.description || "",
    targetUrl: record.targetUrl || "",
    companyName: record.companyName || "",
    notes: record.notes || "",
    rejectionReason: record.rejectionReason || "",
    articleId: record.articleId || "",
    adPosition: record.adPosition || "middle",
    paragraphIndex: record.paragraphIndex !== undefined ? Number(record.paragraphIndex) : 2,
    viewsCount: Number(record.viewsCount || 0),
    clicksCount: Number(record.clicksCount || 0),
    promotionalContent: record.promotionalContent || "",
    district: record.district || "",
    block: record.block || "",
    targetDistricts: record.targetDistricts || [],
    targetBlocks: record.targetBlocks || [],
    timeTargeting: record.timeTargeting || { startHour: 0, endHour: 24 },
  };
};

const normalizeAdminAdvertisementInput = async (payload = {}, user) => {
  const title = String(payload.title || "").trim();
  const imageUrl = await uploadBase64Asset(String(payload.imageUrl || "").trim(), "palamu-express/ads");
  const targetUrl = String(payload.targetUrl || "").trim();
  const placement = normalizePlacementValue(payload.placement);
  const description = String(payload.description || "").trim();
  const ctaLabel = String(payload.ctaLabel || "Visit Sponsor").trim();
  const durationDays = Number(payload.durationDays || 0);
  const amount = Number(payload.amount || 0);
  const priority = Number(payload.priority || 100);
  const requestedStatus = String(payload.status || "").trim();
  const activateNow = Boolean(payload.activateNow);
  const advertiserName = String(payload.advertiserName || user?.fullName || "Palamu Express Sponsor").trim();
  const advertiserEmail = String(payload.advertiserEmail || user?.email || "admin@palamuexpress.in").trim().toLowerCase();
  const advertiserPhone = String(payload.advertiserPhone || user?.phone || "").trim();
  const companyName = String(payload.companyName || "").trim();
  const notes = String(payload.notes || "").trim();
  const articleId = String(payload.articleId || "").trim();
  const adPosition = String(payload.adPosition || "middle").trim();
  const paragraphIndex = payload.paragraphIndex !== undefined ? Number(payload.paragraphIndex) : 2;
  const promotionalContent = String(payload.promotionalContent || "").trim();
  const district = String(payload.district || "").trim();
  const block = String(payload.block || "").trim();
  const targetDistricts = Array.isArray(payload.targetDistricts) ? payload.targetDistricts : [];
  const targetBlocks = Array.isArray(payload.targetBlocks) ? payload.targetBlocks : [];
  const timeTargeting = payload.timeTargeting ? {
    startHour: Number(payload.timeTargeting.startHour ?? 0),
    endHour: Number(payload.timeTargeting.endHour ?? 24)
  } : { startHour: 0, endHour: 24 };

  if (!title) throw buildHttpError("Advertisement title is required.");
  if (!imageUrl) throw buildHttpError("Please provide a banner image URL or upload an image.");
  if (!placement) throw buildHttpError("Placement is required.");
  if (!Number.isFinite(durationDays) || durationDays < 1) throw buildHttpError("Duration must be at least 1 day.");
  if (!Number.isFinite(amount) || amount < 0) throw buildHttpError("Price must be a valid non-negative number.");
  if (!Number.isFinite(priority) || priority < 1) throw buildHttpError("Priority must be 1 or greater.");
  if (!advertiserName) throw buildHttpError("Advertiser name is required.");
  if (!advertiserEmail) throw buildHttpError("Advertiser email is required.");
  if (!advertiserPhone) throw buildHttpError("Advertiser phone is required.");

  return {
    title,
    imageUrl,
    targetUrl,
    placement,
    description,
    ctaLabel: ctaLabel || "Visit Sponsor",
    durationDays,
    amount,
    priority,
    requestedStatus,
    activateNow,
    advertiserName,
    advertiserEmail,
    advertiserPhone,
    companyName,
    notes,
    articleId,
    adPosition,
    paragraphIndex,
    promotionalContent,
    district,
    block,
    targetDistricts,
    targetBlocks,
    timeTargeting,
  };
};

const normalizeAdminAdvertisementUpdateInput = async (payload = {}, user, existingAd) => {
  const resolvedPayload = {
    ...payload,
    title: String(payload.title ?? existingAd?.title ?? "").trim(),
    imageUrl: String(payload.imageUrl ?? existingAd?.imageUrl ?? "").trim() || String(existingAd?.imageUrl || "").trim(),
    targetUrl: String(payload.targetUrl ?? existingAd?.targetUrl ?? "").trim(),
    placement: payload.placement ?? existingAd?.placement,
    description: String(payload.description ?? existingAd?.description ?? "").trim(),
    ctaLabel: String(payload.ctaLabel ?? existingAd?.ctaLabel ?? "Visit Sponsor").trim(),
    durationDays:
      payload.durationDays === "" || payload.durationDays === undefined || payload.durationDays === null
        ? Number(existingAd?.durationDays || 0)
        : payload.durationDays,
    amount:
      payload.amount === "" || payload.amount === undefined || payload.amount === null
        ? Number(existingAd?.amount || 0)
        : payload.amount,
    priority:
      payload.priority === "" || payload.priority === undefined || payload.priority === null
        ? Number(existingAd?.priority || 100)
        : payload.priority,
    advertiserName: String(payload.advertiserName ?? existingAd?.advertiserName ?? user?.fullName ?? "").trim(),
    advertiserEmail: String(payload.advertiserEmail ?? existingAd?.advertiserEmail ?? user?.email ?? "").trim(),
    advertiserPhone: String(payload.advertiserPhone ?? existingAd?.advertiserPhone ?? user?.phone ?? "").trim(),
    companyName: String(payload.companyName ?? existingAd?.companyName ?? "").trim(),
    notes: String(payload.notes ?? existingAd?.notes ?? "").trim(),
    status: payload.status ?? existingAd?.status,
    articleId: payload.articleId !== undefined ? String(payload.articleId).trim() : (existingAd?.articleId || ""),
    adPosition: payload.adPosition !== undefined ? String(payload.adPosition).trim() : (existingAd?.adPosition || "middle"),
    paragraphIndex: payload.paragraphIndex !== undefined ? Number(payload.paragraphIndex) : (existingAd?.paragraphIndex ?? 2),
    promotionalContent: payload.promotionalContent !== undefined ? String(payload.promotionalContent).trim() : (existingAd?.promotionalContent || ""),
    district: payload.district !== undefined ? String(payload.district).trim() : (existingAd?.district || ""),
    block: payload.block !== undefined ? String(payload.block).trim() : (existingAd?.block || ""),
    targetDistricts: payload.targetDistricts ?? existingAd?.targetDistricts ?? [],
    targetBlocks: payload.targetBlocks ?? existingAd?.targetBlocks ?? [],
    timeTargeting: payload.timeTargeting ?? existingAd?.timeTargeting ?? { startHour: 0, endHour: 24 },
  };

  return normalizeAdminAdvertisementInput(resolvedPayload, user);
};

const normalizePublicAdvertisementInput = async (payload = {}) => {
  const title = String(payload.title || "").trim();
  const imageUrl = await uploadBase64Asset(String(payload.imageUrl || "").trim(), "palamu-express/ads");
  const targetUrl = String(payload.targetUrl || "").trim();
  const placement = normalizePlacementValue(payload.placement);
  const description = String(payload.description || "").trim();
  const ctaLabel = String(payload.ctaLabel || "Visit Sponsor").trim();
  const durationDays = Number(payload.durationDays || 0);
  const advertiserName = String(payload.advertiserName || "").trim();
  const advertiserEmail = String(payload.advertiserEmail || "").trim().toLowerCase();
  const advertiserPhone = String(payload.advertiserPhone || "").trim();
  const companyName = String(payload.companyName || "").trim();
  const notes = String(payload.notes || "").trim();
  const promotionalContent = String(payload.promotionalContent || "").trim();
  const district = String(payload.district || "").trim();
  const block = String(payload.block || "").trim();

  if (!title) throw buildHttpError("Advertisement title is required.");
  if (!imageUrl) throw buildHttpError("Please upload a banner image or paste a banner image URL.");
  if (!placement) throw buildHttpError("Placement is required.");
  if (!advertiserName) throw buildHttpError("Advertiser name is required.");
  if (!advertiserEmail) throw buildHttpError("Advertiser email is required.");
  if (!advertiserPhone) throw buildHttpError("Advertiser phone is required.");

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(advertiserEmail)) {
    throw buildHttpError("Please enter a valid advertiser email address.");
  }

  const dynamicPricing = await loadDynamicPricing();
  const plan = getPlanForSelection(placement, durationDays, dynamicPricing);
  if (!plan) {
    throw buildHttpError("Please choose one of the available duration plans.");
  }

  return {
    title,
    imageUrl,
    targetUrl,
    placement,
    description,
    ctaLabel: ctaLabel || "Visit Sponsor",
    durationDays: plan.days,
    amount: plan.amount,
    advertiserName,
    advertiserEmail,
    advertiserPhone,
    companyName,
    notes,
    promotionalContent,
    district,
    block,
    targetDistricts: [],
    targetBlocks: [],
    timeTargeting: { startHour: 0, endHour: 24 },
  };
};

const buildAdSchedule = (status, durationDays, existingStartsAt) => {
  if (status !== adStatuses.ACTIVE) {
    return { startsAt: undefined, endsAt: undefined };
  }

  const startsAt = existingStartsAt || new Date();
  const endsAt = new Date(new Date(startsAt).getTime() + durationDays * 86400000);
  return { startsAt, endsAt };
};

export const getAdvertisementFormOptions = asyncHandler(async (req, res) => {
  const dynamicPricing = await loadDynamicPricing();
  res.json({
    placements: Object.values(adPlacements),
    placementPricing: Object.entries(dynamicPricing).reduce((accumulator, [placement, pricing]) => {
      accumulator[placement] = {
        ...pricing,
        durationPlans: adDurationOptions.map((days) => ({
          days,
          amount: pricing.baseDailyRate * days,
          label: `${days} Day${days > 1 ? "s" : ""}`,
          placement,
          placementLabel: pricing.label,
          currency: "INR",
        })),
      };
      return accumulator;
    }, {}),
    durationOptions: adDurationOptions,
    razorpayKeyId: env.razorpay.keyId || "",
  });
});

export const createAdvertisementRequest = asyncHandler(async (req, res) => {
  const input = await normalizePublicAdvertisementInput(req.body);

  const ad = await Advertisement.create({
    ...input,
    status: adStatuses.PENDING_PAYMENT,
    paymentStatus: "pending",
  });

  const order = await createAdOrder({
    amount: ad.amount,
    receipt: `ad_${ad._id}`,
  });

  ad.razorpayOrderId = order.id;
  await ad.save();

  res.status(StatusCodes.CREATED).json({
    ad: normalizeAdvertisementRecord(ad),
    order,
    razorpayKeyId: env.razorpay.keyId || "",
  });
});

export const createAdvertisement = asyncHandler(async (req, res) => {
  const input = await normalizeAdminAdvertisementInput(req.body, req.user);
  const status = input.activateNow ? adStatuses.ACTIVE : input.requestedStatus || adStatuses.ACTIVE;
  const schedule = buildAdSchedule(status, input.durationDays);

  const ad = await Advertisement.create({
    ...input,
    advertiser: req.user?._id,
    status,
    paymentStatus: "paid",
    paidAt: new Date(),
    ...schedule,
  });

  res.status(StatusCodes.CREATED).json({ ad: normalizeAdvertisementRecord(ad), order: null });
});

export const verifyAdvertisementPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw buildHttpError("Razorpay payment verification details are required.");
  }

  const ad = await Advertisement.findById(req.params.id);

  if (!ad) {
    throw buildHttpError("Advertisement not found.", StatusCodes.NOT_FOUND);
  }

  if (!ad.razorpayOrderId || ad.razorpayOrderId !== razorpayOrderId) {
    throw buildHttpError("Razorpay order mismatch. Please restart the payment flow.");
  }

  const isValidSignature = verifyRazorpayPaymentSignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });

  if (!isValidSignature) {
    ad.paymentStatus = "failed";
    await ad.save();
    throw buildHttpError("Payment verification failed. Please contact support if the amount was debited.");
  }

  ad.razorpayPaymentId = razorpayPaymentId;
  ad.razorpaySignature = razorpaySignature;
  ad.paymentStatus = "paid";
  ad.paidAt = new Date();
  ad.status = adStatuses.PENDING_APPROVAL;
  await ad.save();

  res.json({
    message: "Payment verified. Your advertisement request is now pending super admin approval.",
    ad: normalizeAdvertisementRecord(ad),
  });
});

export const approveAdvertisement = asyncHandler(async (req, res) => {
  const ad = await Advertisement.findById(req.params.id);

  if (!ad) {
    throw buildHttpError("Advertisement not found.", StatusCodes.NOT_FOUND);
  }

  if (ad.paymentStatus !== "paid") {
    throw buildHttpError("Only paid advertisement requests can be approved.");
  }

  let articleId = ad.articleId || "";

  if (ad.placement === "promotional-article" && !articleId) {
    const { Article } = await import("../models/Article.js");
    const article = await Article.create({
      title: ad.title,
      excerpt: ad.description || ad.title,
      content: ad.promotionalContent || ad.description || ad.title,
      coverImageUrl: ad.imageUrl,
      district: ad.district || "Palamu",
      area: ad.block || "Medininagar",
      category: "promotional",
      status: "published",
      publishedAt: new Date(),
      author: ad.advertiser || req.user?._id || "super_admin",
      storyFormat: "text",
    });
    articleId = article._id;
    ad.articleId = articleId;
  }

  const schedule = buildAdSchedule(adStatuses.ACTIVE, ad.durationDays, new Date());
  ad.status = adStatuses.ACTIVE;
  ad.startsAt = schedule.startsAt;
  ad.endsAt = schedule.endsAt;
  ad.reviewedAt = new Date();
  ad.reviewedBy = req.user?._id;
  ad.rejectionReason = "";
  await ad.save();

  res.json({
    message: ad.placement === "promotional-article" 
      ? "Promotional article approved and published successfully." 
      : "Advertisement approved and published on the homepage.",
    ad: normalizeAdvertisementRecord(ad),
  });
});

export const rejectAdvertisement = asyncHandler(async (req, res) => {
  const ad = await Advertisement.findById(req.params.id);

  if (!ad) {
    throw buildHttpError("Advertisement not found.", StatusCodes.NOT_FOUND);
  }

  ad.status = adStatuses.REJECTED;
  ad.reviewedAt = new Date();
  ad.reviewedBy = req.user?._id;
  ad.rejectionReason = String(req.body.reason || "Advertisement was rejected during review.").trim();
  await ad.save();

  res.json({
    message: "Advertisement rejected.",
    ad: normalizeAdvertisementRecord(ad),
  });
});

const selectPriorityWeightedAd = (popupAds) => {
  const weighted = popupAds.map(ad => {
    const rawPriority = Number(ad.priority || 10);
    const weight = Math.max(1, 11 - rawPriority);
    return { ad, weight };
  });
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  let randomPoint = Math.random() * totalWeight;
  for (const item of weighted) {
    if (randomPoint < item.weight) {
      return item.ad;
    }
    randomPoint -= item.weight;
  }
  return popupAds[0];
};

export const getActiveAdvertisements = asyncHandler(async (req, res) => {
  const now = new Date();
  await Advertisement.updateMany(
    { endsAt: { $lt: now }, status: adStatuses.ACTIVE },
    { status: adStatuses.EXPIRED }
  );

  const rawAds = await Advertisement.find({
    status: adStatuses.ACTIVE,
    paymentStatus: "paid",
    $or: [{ endsAt: { $gte: now } }, { endsAt: { $exists: false } }, { endsAt: null }],
  }).sort({ priority: 1, createdAt: -1 });

  const districtFilter = req.query.district ? String(req.query.district).trim() : "";
  const currentHour = new Date().getHours();

  const standardAds = [];
  const popupAds = [];

  rawAds.forEach(ad => {
    const record = normalizeAdvertisementRecord(ad);
    if (record.placement === "homepage-popup") {
      const matchesGeo = !ad.targetDistricts || !ad.targetDistricts.length || !districtFilter || ad.targetDistricts.includes(districtFilter);
      const matchesTime = !ad.timeTargeting || (currentHour >= (ad.timeTargeting.startHour ?? 0) && currentHour <= (ad.timeTargeting.endHour ?? 24));
      if (matchesGeo && matchesTime) {
        popupAds.push(record);
      }
    } else {
      standardAds.push(record);
    }
  });

  // Load global config settings for popups
  let popupDisplayMode = "weighted_random";
  let popupLockedAdId = "";
  try {
    const configSnap = await db.collection("settings").doc("global_config").get();
    if (configSnap.exists) {
      popupDisplayMode = configSnap.get("popupDisplayMode") || "weighted_random";
      popupLockedAdId = configSnap.get("popupLockedAdId") || "";
    }
  } catch (err) {
    console.error("[getActiveAdvertisements] Error loading global config:", err.message);
  }

  const finalAds = [...standardAds];

  if (popupAds.length > 0) {
    if (popupDisplayMode === "locked_single" && popupLockedAdId) {
      const lockedAd = popupAds.find(ad => String(ad._id) === popupLockedAdId);
      if (lockedAd) {
        finalAds.push(lockedAd);
      } else {
        const selected = selectPriorityWeightedAd(popupAds);
        if (selected) finalAds.push(selected);
      }
    } else if (popupDisplayMode === "sequence" || popupDisplayMode === "loop_carousel") {
      // Return ALL active popup ads to client so client handles continuous slide loops
      finalAds.push(...popupAds);
    } else {
      // Default: weighted random selection
      const selected = selectPriorityWeightedAd(popupAds);
      if (selected) finalAds.push(selected);
    }
  }

  res.json({
    ads: finalAds,
    popupDisplayMode,
    popupLockedAdId
  });
});

export const getAllAdvertisements = asyncHandler(async (req, res) => {
  const ads = await Advertisement.find()
    .populate("reviewedBy", "fullName")
    .populate("advertiser", "fullName email phone")
    .sort({ createdAt: -1, priority: 1 });

  res.json({ ads: ads.map((ad) => normalizeAdvertisementRecord(ad)) });
});

export const updateAdvertisement = asyncHandler(async (req, res) => {
  const ad = await Advertisement.findById(req.params.id);

  if (!ad) {
    throw buildHttpError("Advertisement not found.", StatusCodes.NOT_FOUND);
  }

  const input = await normalizeAdminAdvertisementUpdateInput(req.body, req.user, ad);
  const nextStatus = input.activateNow ? adStatuses.ACTIVE : input.requestedStatus || ad.status;
  const schedule = buildAdSchedule(
    nextStatus,
    input.durationDays,
    nextStatus === adStatuses.ACTIVE ? ad.startsAt || new Date() : undefined
  );

  Object.assign(ad, input, {
    status: nextStatus,
    startsAt: schedule.startsAt,
    endsAt: schedule.endsAt,
  });

  if (nextStatus === adStatuses.ACTIVE) {
    ad.paymentStatus = "paid";
    ad.paidAt = ad.paidAt || new Date();
  }

  await ad.save();

  res.json({ message: "Advertisement updated.", ad: normalizeAdvertisementRecord(ad) });
});

export const deleteAdvertisement = asyncHandler(async (req, res) => {
  const ad = await Advertisement.findByIdAndDelete(req.params.id);

  if (!ad) {
    throw buildHttpError("Advertisement not found.", StatusCodes.NOT_FOUND);
  }

  res.json({ message: "Advertisement deleted." });
});

export const getActiveInArticleAds = asyncHandler(async (req, res) => {
  const now = new Date();
  const ads = await Advertisement.find({
    status: adStatuses.ACTIVE,
    placement: "in-article",
    $and: [
      {
        $or: [
          { articleId: req.params.articleId },
          { articleId: "all" }
        ]
      },
      {
        $or: [
          { endsAt: { $gte: now } },
          { endsAt: { $exists: false } },
          { endsAt: null }
        ]
      }
    ]
  }).sort({ priority: 1, createdAt: -1 });

  res.json({ ads: ads.map((ad) => normalizeAdvertisementRecord(ad)) });
});

export const incrementAdImpression = asyncHandler(async (req, res) => {
  const ad = await Advertisement.findById(req.params.id);
  if (!ad) {
    throw buildHttpError("Advertisement not found.", StatusCodes.NOT_FOUND);
  }
  ad.viewsCount = (ad.viewsCount || 0) + 1;
  await ad.save();

  req.io?.emit("ad:live-update", {
    adId: String(ad._id),
    viewsCount: ad.viewsCount,
    clicksCount: ad.clicksCount || 0,
  });

  res.json({ message: "Impression registered.", viewsCount: ad.viewsCount });
});

export const incrementAdClick = asyncHandler(async (req, res) => {
  const ad = await Advertisement.findById(req.params.id);
  if (!ad) {
    throw buildHttpError("Advertisement not found.", StatusCodes.NOT_FOUND);
  }
  ad.clicksCount = (ad.clicksCount || 0) + 1;
  await ad.save();

  req.io?.emit("ad:live-update", {
    adId: String(ad._id),
    viewsCount: ad.viewsCount || 0,
    clicksCount: ad.clicksCount,
  });

  res.json({ message: "Click registered.", clicksCount: ad.clicksCount });
});

export const pauseAllAdvertisements = asyncHandler(async (req, res) => {
  await Advertisement.updateMany(
    { status: adStatuses.ACTIVE },
    { status: adStatuses.EXPIRED }
  );

  req.io?.emit("ad:pause-all", { timestamp: new Date() });

  res.json({ message: "All running advertisements have been paused successfully." });
});

export const toggleAdPause = asyncHandler(async (req, res) => {
  const ad = await Advertisement.findById(req.params.id);

  if (!ad) {
    throw buildHttpError("Advertisement not found.", StatusCodes.NOT_FOUND);
  }

  if (ad.status !== adStatuses.ACTIVE && ad.status !== adStatuses.PAUSED) {
    throw buildHttpError("Only active or paused advertisements can be toggled.");
  }

  let nextStatus;
  let actionMessage = "";

  if (ad.status === adStatuses.ACTIVE) {
    nextStatus = adStatuses.PAUSED;
    ad.pausedAt = new Date();
    actionMessage = "Advertisement paused successfully.";
  } else {
    nextStatus = adStatuses.ACTIVE;
    if (ad.pausedAt && ad.endsAt) {
      const pauseDuration = new Date().getTime() - new Date(ad.pausedAt).getTime();
      ad.endsAt = new Date(new Date(ad.endsAt).getTime() + pauseDuration);
    }
    ad.pausedAt = null;
    actionMessage = "Advertisement resumed successfully.";
  }

  ad.status = nextStatus;
  await ad.save();

  const normalized = normalizeAdvertisementRecord(ad);

  req.io?.emit("ad:status-update", {
    adId: String(ad._id),
    status: ad.status,
    startsAt: ad.startsAt,
    endsAt: ad.endsAt,
  });

  res.json({
    message: actionMessage,
    ad: normalized,
  });
});
