import { StatusCodes } from "http-status-codes";
import { Advertisement } from "../models/Advertisement.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { adPlacements, adStatuses } from "../utils/constants.js";
import { createAdOrder } from "../services/paymentService.js";

const normalizePlacementValue = (placement) => {
  const value = String(placement || "").trim();

  if (value === "homepage-top") return adPlacements.HOMEPAGE_HERO;
  if (value === "homepage-sidebar") return adPlacements.HOMEPAGE_LATEST;
  if (Object.values(adPlacements).includes(value)) return value;

  return adPlacements.HOMEPAGE_LATEST;
};

const normalizeAdvertisementRecord = (ad) => {
  if (!ad) return ad;

  const normalizedPlacement = normalizePlacementValue(ad.placement);
  if (ad.placement !== normalizedPlacement) {
    ad.placement = normalizedPlacement;
  }

  if (!ad.ctaLabel) {
    ad.ctaLabel = "Visit Sponsor";
  }

  if (!ad.priority) {
    ad.priority = 100;
  }

  if (!ad.description) {
    ad.description = "";
  }

  return ad;
};

const buildHttpError = (message, statusCode = StatusCodes.BAD_REQUEST) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeAdvertisementInput = (payload = {}) => {
  const title = String(payload.title || "").trim();
  const imageUrl = String(payload.imageUrl || "").trim();
  const targetUrl = String(payload.targetUrl || "").trim();
  const placement = normalizePlacementValue(payload.placement);
  const description = String(payload.description || "").trim();
  const ctaLabel = String(payload.ctaLabel || "Visit Sponsor").trim();
  const durationDays = Number(payload.durationDays || 0);
  const amount = Number(payload.amount || 0);
  const priority = Number(payload.priority || 100);
  const requestedStatus = payload.status;
  const activateNow = Boolean(payload.activateNow);

  if (!title) throw buildHttpError("Advertisement title is required.");
  if (!imageUrl) throw buildHttpError("Please provide a banner image URL or upload an image.");
  if (!targetUrl) throw buildHttpError("Target URL is required.");
  if (!placement) throw buildHttpError("Placement is required.");
  if (!Number.isFinite(durationDays) || durationDays < 1) throw buildHttpError("Duration must be at least 1 day.");
  if (!Number.isFinite(amount) || amount < 0) throw buildHttpError("Price must be a valid non-negative number.");
  if (!Number.isFinite(priority) || priority < 1) throw buildHttpError("Priority must be 1 or greater.");

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

export const createAdvertisement = asyncHandler(async (req, res) => {
  const input = normalizeAdvertisementInput(req.body);
  const status = input.activateNow ? adStatuses.ACTIVE : input.requestedStatus || adStatuses.PENDING_PAYMENT;
  const schedule = buildAdSchedule(status, input.durationDays);

  const ad = await Advertisement.create({
    title: input.title,
    imageUrl: input.imageUrl,
    targetUrl: input.targetUrl,
    placement: input.placement,
    durationDays: input.durationDays,
    amount: input.amount,
    priority: input.priority,
    description: input.description,
    ctaLabel: input.ctaLabel,
    advertiser: req.user._id,
    status,
    ...schedule,
  });

  let order = null;

  if (status === adStatuses.PENDING_PAYMENT) {
    order = await createAdOrder({
      amount: ad.amount,
      receipt: `ad_${ad._id}`,
    });

    ad.razorpayOrderId = order.id;
    await ad.save();
  }

  res.status(StatusCodes.CREATED).json({ ad: normalizeAdvertisementRecord(ad), order });
});

export const verifyAdvertisementPayment = asyncHandler(async (req, res) => {
  const durationDays = Number(req.body.durationDays || 7);
  const ad = await Advertisement.findByIdAndUpdate(
    req.params.id,
    {
      status: adStatuses.ACTIVE,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + durationDays * 86400000),
      durationDays,
    },
    { new: true }
  );

  if (!ad) {
    throw buildHttpError("Advertisement not found.", StatusCodes.NOT_FOUND);
  }

  res.json({ message: "Advertisement activated", ad: normalizeAdvertisementRecord(ad) });
});

export const getActiveAdvertisements = asyncHandler(async (req, res) => {
  const now = new Date();
  await Advertisement.updateMany(
    { endsAt: { $lt: now }, status: adStatuses.ACTIVE },
    { status: adStatuses.EXPIRED }
  );

  const ads = await Advertisement.find({
    status: adStatuses.ACTIVE,
    $or: [{ endsAt: { $gte: now } }, { endsAt: { $exists: false } }, { endsAt: null }],
  }).sort({ priority: 1, createdAt: -1 });
  res.json({ ads: ads.map((ad) => normalizeAdvertisementRecord(ad)) });
});

export const getAllAdvertisements = asyncHandler(async (req, res) => {
  const ads = await Advertisement.find().sort({ status: 1, priority: 1, createdAt: -1 });
  res.json({ ads: ads.map((ad) => normalizeAdvertisementRecord(ad)) });
});

export const updateAdvertisement = asyncHandler(async (req, res) => {
  const ad = await Advertisement.findById(req.params.id);
  if (!ad) {
    throw buildHttpError("Advertisement not found.", StatusCodes.NOT_FOUND);
  }

  const input = normalizeAdvertisementInput(req.body);
  const status = input.activateNow ? adStatuses.ACTIVE : input.requestedStatus || ad.status;
  const schedule = buildAdSchedule(status, input.durationDays, status === adStatuses.ACTIVE ? ad.startsAt || new Date() : undefined);

  ad.title = input.title;
  ad.imageUrl = input.imageUrl;
  ad.targetUrl = input.targetUrl;
  ad.placement = input.placement;
  ad.durationDays = input.durationDays;
  ad.amount = input.amount;
  ad.priority = input.priority;
  ad.description = input.description;
  ad.ctaLabel = input.ctaLabel;
  ad.status = status;
  ad.startsAt = schedule.startsAt;
  ad.endsAt = schedule.endsAt;

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
