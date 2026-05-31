import Razorpay from "razorpay";
import crypto from "crypto";
import { env } from "../config/env.js";

const razorpay = new Razorpay({
  key_id: env.razorpay.keyId || "rzp_test_placeholder",
  key_secret: env.razorpay.keySecret || "secret_placeholder",
});

export const isRazorpayConfigured = () =>
  Boolean(env.razorpay.keyId && env.razorpay.keySecret && env.razorpay.keyId !== "rzp_test_placeholder");

export const createAdOrder = async ({ amount, receipt }) => {
  if (!isRazorpayConfigured()) {
    console.warn("[Razorpay] Operating in SANDBOX/TEST mode since key_id or key_secret is missing.");
    return {
      id: `order_mock_${Math.random().toString(36).substring(2, 15)}`,
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt,
      isMock: true,
    };
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
    console.warn("[Razorpay] Verifying mock payment signature in SANDBOX/TEST mode.");
    return String(orderId).startsWith("order_mock_");
  }

  const expectedSignature = crypto
    .createHmac("sha256", env.razorpay.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return expectedSignature === signature;
};
