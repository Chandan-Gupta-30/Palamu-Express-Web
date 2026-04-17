import { StatusCodes } from "http-status-codes";
import { Advertisement } from "../models/Advertisement.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { adDurationOptions, adPlacementPricing, adPlacements, adStatuses } from "../utils/constants.js";
import { createAdOrder, verifyRazorpayPaymentSignature } from "../services/paymentService.js";
import { uploadBase64Asset } from "../services/uploadService.js";
import { env } from "../config/env.js";

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

const resolvePlacementPricing = (placement) => adPlacementPricing[normalizePlacementValue(placement)] || adPlacementPricing[adPlacements.HOMEPAGE_LATEST];

const buildPlacementDurationPlans = (placement) => {
  const pricing = resolvePlacementPricing(placement);

  return adDurationOptions.map((days) => ({
    days,
    amount: pricing.baseDailyRate * days,
    label: `${days} Day${days > 1 ? "s" : ""}`,
    placement,
    placementLabel: pricing.label,
    currency: "INR",
  }));
};

const getPlanForSelection = (placement, durationDays) => {
  const normalizedPlacement = normalizePlacementValue(placement);
  const days = Number(durationDays || 0);
  if (!adDurationOptions.includes(days)) return null;

  const pricing = resolvePlacementPricing(normalizedPlacement);
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

  const plan = getPlanForSelection(placement, durationDays);
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
  res.json({
    placements: Object.values(adPlacements),
    placementPricing: Object.entries(adPlacementPricing).reduce((accumulator, [placement, pricing]) => {
      accumulator[placement] = {
        ...pricing,
        durationPlans: buildPlacementDurationPlans(placement),
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

  const schedule = buildAdSchedule(adStatuses.ACTIVE, ad.durationDays, new Date());
  ad.status = adStatuses.ACTIVE;
  ad.startsAt = schedule.startsAt;
  ad.endsAt = schedule.endsAt;
  ad.reviewedAt = new Date();
  ad.reviewedBy = req.user?._id;
  ad.rejectionReason = "";
  await ad.save();

  res.json({
    message: "Advertisement approved and published on the homepage.",
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

export const getActiveAdvertisements = asyncHandler(async (req, res) => {
  const now = new Date();
  await Advertisement.updateMany(
    { endsAt: { $lt: now }, status: adStatuses.ACTIVE },
    { status: adStatuses.EXPIRED }
  );

  const ads = await Advertisement.find({
    status: adStatuses.ACTIVE,
    paymentStatus: "paid",
    $or: [{ endsAt: { $gte: now } }, { endsAt: { $exists: false } }, { endsAt: null }],
  }).sort({ priority: 1, createdAt: -1 });

  res.json({ ads: ads.map((ad) => normalizeAdvertisementRecord(ad)) });
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
