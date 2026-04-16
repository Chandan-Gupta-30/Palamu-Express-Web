import Razorpay from "razorpay";
import { env } from "../config/env.js";

const razorpay = new Razorpay({
  key_id: env.razorpay.keyId || "rzp_test_placeholder",
  key_secret: env.razorpay.keySecret || "secret_placeholder",
});

export const createAdOrder = async ({ amount, receipt }) => {
  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency: "INR",
    receipt,
  });

  return order;
};

