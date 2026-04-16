import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../models/User.js";
import { Article } from "../models/Article.js";
import { Advertisement } from "../models/Advertisement.js";
import { Category } from "../models/Category.js";
import { env } from "../config/env.js";
import { adPlacements, approvalStatuses, adStatuses, articleStatuses, jharkhandBlocksByDistrict, roles } from "../utils/constants.js";
import { generateReporterCardBuffer } from "../utils/generateReporterCard.js";

dotenv.config({ path: "./server/.env" });

const reporters = [
  {
    fullName: "Aman Tiwari",
    email: "aman@palamuexpress.local",
    phone: "9000000001",
    password: "reporter123",
    role: roles.REPORTER,
    approvalStatus: approvalStatuses.APPROVED,
    isPhoneVerified: true,
    aadhaarNumber: "123412341234",
    district: "Palamu",
    area: "Medininagar",
    profilePhotoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80",
    aadhaarImageUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80",
    reporterCode: "PE-RPT-001",
  },
  {
    fullName: "Neha Kumari",
    email: "neha@palamuexpress.local",
    phone: "9000000002",
    password: "reporter123",
    role: roles.REPORTER,
    approvalStatus: approvalStatuses.PENDING,
    isPhoneVerified: true,
    aadhaarNumber: "223412341234",
    district: "Ranchi",
    area: "Kanke",
    profilePhotoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80",
    aadhaarImageUrl: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&q=80",
  },
];

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const ensureReporterCard = async (user) => {
  if (user.role !== roles.REPORTER || user.approvalStatus !== approvalStatuses.APPROVED) return;
  if (user.idCardUrl) return;
  const pdfBuffer = await generateReporterCardBuffer(user);
  user.idCardUrl = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;
  await user.save();
};

const seed = async () => {
  await mongoose.connect(env.mongoUri);

  let admin = await User.findOne({ role: roles.SUPER_ADMIN });
  if (!admin) {
    admin = await User.create({
      fullName: "Platform Super Admin",
      phone: "9999999999",
      password: "admin123",
      role: roles.SUPER_ADMIN,
      approvalStatus: approvalStatuses.APPROVED,
      isPhoneVerified: true,
    });
  }

  const createdReporters = [];
  for (const reporterData of reporters) {
    let reporter = await User.findOne({ phone: reporterData.phone });
    if (!reporter) {
      reporter = await User.create(reporterData);
    }
    await ensureReporterCard(reporter);
    createdReporters.push(reporter);
  }

  const approvedReporter = createdReporters.find((reporter) => reporter.phone === "9000000001");
  const pendingReporter = createdReporters.find((reporter) => reporter.phone === "9000000002");

  const articles = [
    {
      title: "Palamu schools launch new digital attendance drive",
      excerpt: "Government schools across Medininagar have begun a district-level digital attendance initiative.",
      content:
        "Government schools across Medininagar have begun a district-level digital attendance initiative to improve transparency, attendance monitoring, and parent communication. Education officials say the pilot will expand to more blocks after the first month of rollout.",
      district: "Palamu",
      area: "Medininagar",
      status: articleStatuses.PUBLISHED,
      breaking: true,
      pageViews: 84,
      trendingScore: 8,
      author: approvedReporter?._id,
      reviewedBy: admin._id,
      publishedAt: new Date(),
    },
    {
      title: "Farm road repair demand rises in Hussainabad villages",
      excerpt: "Residents have asked for urgent repair work on a road linking farms to the local mandi.",
      content:
        "Residents in several villages under Hussainabad block have asked district authorities to begin urgent road restoration before the next market cycle. Farmers say transport costs are rising because of damaged approach roads.",
      district: "Palamu",
      area: "Hussainabad",
      status: articleStatuses.PENDING,
      breaking: false,
      pageViews: 12,
      trendingScore: 1,
      author: approvedReporter?._id,
    },
    {
      title: "Ranchi commuters welcome revised bus route proposal",
      excerpt: "Transport users in Kanke and nearby areas say the revised route can reduce crowding during office hours.",
      content:
        "Transport users in Kanke and nearby areas say the revised route can reduce crowding during peak office hours. Officials are collecting public feedback before notifying the final route schedule.",
      district: "Ranchi",
      area: "Kanke",
      status: articleStatuses.PENDING,
      breaking: false,
      pageViews: 9,
      trendingScore: 0,
      author: pendingReporter?._id,
    },
    {
      title: "Evening health camp draws strong turnout in Chainpur",
      excerpt: "A local health camp saw strong participation with free screening support for families.",
      content:
        "A community health camp in Chainpur drew strong participation, with free screening support for women, children, and elderly residents. Organizers said the next camp will focus on follow-up consultations and awareness sessions.",
      district: "Palamu",
      area: "Chainpur",
      status: articleStatuses.PUBLISHED,
      breaking: false,
      pageViews: 45,
      trendingScore: 5,
      author: approvedReporter?._id,
      reviewedBy: admin._id,
      publishedAt: new Date(),
    },
  ];

  for (const articleData of articles) {
    const slug = slugify(articleData.title);
    const existing = await Article.findOne({ slug });
    if (!existing) {
      await Article.create({
        ...articleData,
        slug,
      });
    }
  }

  const ads = [
    {
      title: "Palamu Trade Fair 2026",
      imageUrl: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
      targetUrl: "https://example.com/palamu-trade-fair",
      placement: adPlacements.HOMEPAGE_HERO,
      durationDays: 15,
      amount: 5000,
      priority: 1,
      description: "Premium event promotion for the district's upcoming trade fair and family expo.",
      ctaLabel: "Explore Event",
      status: adStatuses.ACTIVE,
      advertiser: admin._id,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 15 * 86400000),
    },
    {
      title: "Local Business Spotlight",
      imageUrl: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80",
      targetUrl: "https://example.com/local-business",
      placement: adPlacements.HOMEPAGE_LATEST,
      durationDays: 10,
      amount: 3000,
      priority: 2,
      description: "Highlight trusted regional businesses without interrupting core headline reading flow.",
      ctaLabel: "View Offer",
      status: adStatuses.ACTIVE,
      advertiser: admin._id,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 10 * 86400000),
    },
  ];

  for (const adData of ads) {
    const existing = await Advertisement.findOne({ title: adData.title });
    if (!existing) {
      await Advertisement.create(adData);
    }
  }

  for (const [district, blocks] of Object.entries(jharkhandBlocksByDistrict)) {
    for (const block of blocks.slice(0, 4)) {
      const slug = `${district}-${block}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const existing = await Category.findOne({ slug });
      if (!existing) {
        await Category.create({
          district,
          block,
          slug,
          description: `${block} block coverage category for ${district}`,
        });
      }
    }
  }

  console.log("Demo seed complete.");
  console.log("Super Admin: 9999999999 / admin123");
  console.log("Approved Reporter: 9000000001 / reporter123");
  console.log("Pending Reporter: 9000000002 / reporter123");

  await mongoose.disconnect();
};

seed().catch(async (error) => {
  console.error("Demo seed failed", error);
  await mongoose.disconnect();
  process.exit(1);
});
