import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../models/User.js";

dotenv.config({ path: "./.env" });

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/palamu-express";

console.log("Connecting to:", mongoUri);

async function run() {
  await mongoose.connect(mongoUri);
  console.log("Connected successfully!");
  const users = await User.find({}, { fullName: 1, phone: 1, role: 1, approvalStatus: 1, isPhoneVerified: 1 });
  console.log("Users in Database:");
  console.log(users);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
