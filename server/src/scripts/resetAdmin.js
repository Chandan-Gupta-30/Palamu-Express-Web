import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../models/User.js";

dotenv.config({ path: "./.env" });

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/palamu-express";

async function run() {
  await mongoose.connect(mongoUri);
  console.log("Connected successfully!");

  // Find the existing super admin
  let admin = await User.findOne({ role: "super_admin" });

  if (admin) {
    console.log("Found existing admin, updating phone and password...");
    admin.phone = "9999999999";
    admin.password = "admin123";
    await admin.save();
    console.log("Super Admin updated successfully!");
  } else {
    console.log("No super admin found, creating a new one...");
    await User.create({
      fullName: "Platform Super Admin",
      phone: "9999999999",
      password: "admin123",
      role: "super_admin",
      approvalStatus: "approved",
      isPhoneVerified: true,
    });
    console.log("Super Admin created successfully!");
  }

  await mongoose.disconnect();
}

run().catch(err => {
  console.error("Reset failed", err);
  process.exit(1);
});
