import Razorpay from "razorpay";
import crypto from "crypto";
import { env } from "../config/env.js";

const razorpay = new Razorpay({
  key_id: env.razorpay.keyId || "rzp_test_placeholder",
  key_secret: env.razorpay.keySecret || "secret_placeholder",
});

export const isRazorpayConfigured = () =>
  Boolean(env.razorpay.keyId && env.razorpay.keySecret);

export const createAdOrder = async ({ amount, receipt }) => {
  if (!isRazorpayConfigured()) {
    throw new Error("Razorpay is not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }

  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency: "INR",
    receipt,
  });

  return order;
};

export const verifyRazorpayPaymentSignature = ({ orderId, paymentId, signature }) => {
  if (!isRazorpayConfigured()) {
    throw new Error("Razorpay is not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }

  const expectedSignature = crypto
    .createHmac("sha256", env.razorpay.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return expectedSignature === signature;
};
