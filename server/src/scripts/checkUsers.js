import dotenv from "dotenv";
import { User } from "../models/User.js";
import { connectDb } from "../config/db.js";

dotenv.config({ path: "./.env" });

async function run() {
  await connectDb();
  
  const users = await User.find({})
    .select("fullName phone role approvalStatus isPhoneVerified");
    
  console.log("Users in Database:");
  console.log(users);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
