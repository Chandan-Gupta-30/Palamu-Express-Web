import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, ImageIcon, ShieldCheck, Newspaper, Sparkles, CreditCard, QrCode, ArrowRight } from "lucide-react";
import { http } from "../api/http";
import { ImagePicker } from "../components/onboarding/ImagePicker";
import { ActionPopup } from "../components/ui/ActionPopup";
import { jharkhandBlocksByDistrict, jharkhandDistricts } from "../data/districts";

const placementLabels = {
  "homepage-hero": "Homepage Hero Rail",
  "homepage-latest": "Latest Updates Sponsor Grid",
  "homepage-district": "District Coverage Sponsor Strip",
  "homepage-popup": "Homepage Premium Pop-up Ad",
  "promotional-article": "Promotional Launch Article",
};

const defaultPlacementPricing = {
  "homepage-district": {
    baseDailyRate: 299,
    label: "District Coverage Sponsor Strip",
    shortLabel: "District Sponsor Rail Strip",
    durationPlans: [
      { days: 1, amount: 299, label: "1 Day" },
      { days: 3, amount: 897, label: "3 Days" },
      { days: 7, amount: 2093, label: "7 Days" },
      { days: 15, amount: 4485, label: "15 Days" },
      { days: 30, amount: 8970, label: "30 Days" },
    ],
  },
  "homepage-latest": {
    baseDailyRate: 499,
    label: "Latest Updates Sponsor Grid",
    shortLabel: "Latest Update Sponsor Grid",
    durationPlans: [
      { days: 1, amount: 499, label: "1 Day" },
      { days: 3, amount: 1497, label: "3 Days" },
      { days: 7, amount: 3493, label: "7 Days" },
      { days: 15, amount: 7485, label: "15 Days" },
      { days: 30, amount: 14970, label: "30 Days" },
    ],
  },
  "homepage-hero": {
    baseDailyRate: 699,
    label: "Homepage Hero Rail",
    shortLabel: "Homepage Hero Rail",
    durationPlans: [
      { days: 1, amount: 699, label: "1 Day" },
      { days: 3, amount: 2097, label: "3 Days" },
      { days: 7, amount: 4893, label: "7 Days" },
      { days: 15, amount: 10485, label: "15 Days" },
      { days: 30, amount: 20970, label: "30 Days" },
    ],
  },
  "homepage-popup": {
    baseDailyRate: 999,
    label: "Homepage Premium Pop-up Ad",
    shortLabel: "Homepage Pop-up Modal",
    durationPlans: [
      { days: 1, amount: 999, label: "1 Day" },
      { days: 3, amount: 2997, label: "3 Days" },
      { days: 7, amount: 6993, label: "7 Days" },
      { days: 15, amount: 14985, label: "15 Days" },
      { days: 30, amount: 29970, label: "30 Days" },
    ],
  },
  "promotional-article": {
    baseDailyRate: 199,
    label: "Promotional Launch Article",
    shortLabel: "Promotional Launch Article",
    durationPlans: [
      { days: 1, amount: 199, label: "1 Day" },
      { days: 3, amount: 597, label: "3 Days" },
      { days: 7, amount: 1393, label: "7 Days" },
      { days: 15, amount: 2985, label: "15 Days" },
      { days: 30, amount: 5970, label: "30 Days" },
    ],
  },
};

const initialForm = {
  advertiserName: "",
  advertiserEmail: "",
  advertiserPhone: "",
  companyName: "",
  title: "",
  description: "",
  imageUrl: "",
  targetUrl: "",
  placement: "homepage-latest",
  durationDays: 1,
  ctaLabel: "Visit Sponsor",
  notes: "",
  // New fields for Promotional Article Track
  promotionalContent: "",
  district: "Palamu",
  block: "Medininagar",
};

const loadRazorpayScript = () =>
  new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => reject(new Error("Unable to load Razorpay checkout."));
    document.body.appendChild(script);
  });

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const isTestRazorpayKey = (value) => String(value || "").startsWith("rzp_test_");
const getBannerPreviewUrl = (value) => String(value || "").trim();
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
const normalizePhoneNumber = (value) => String(value || "").replace(/\D/g, "").slice(0, 10);
const isValidPhoneNumber = (value) => /^\d{10}$/.test(normalizePhoneNumber(value));
const PALAMU_EXPRESS_CHECKOUT_LOGO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256' viewBox='0 0 256 256'%3E%3Crect width='256' height='256' rx='48' fill='%23f97316'/%3E%3Ctext x='50%25' y='54%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial,sans-serif' font-size='108' font-weight='700' fill='white'%3EPE%3C/text%3E%3C/svg%3E";

const normalizePlacementPricing = (payload = {}) => {
  const incomingPricing = payload.placementPricing;
  if (incomingPricing && Object.keys(incomingPricing).length) {
    // Inject default plans if backend doesn't output promotional-article or homepage-popup yet
    if (!incomingPricing["promotional-article"]) {
      incomingPricing["promotional-article"] = defaultPlacementPricing["promotional-article"];
    }
    if (!incomingPricing["homepage-popup"]) {
      incomingPricing["homepage-popup"] = defaultPlacementPricing["homepage-popup"];
    }
    return incomingPricing;
  }
  return defaultPlacementPricing;
};

export const AdvertisePage = () => {
  const [form, setForm] = useState(initialForm);
  const [placementPricing, setPlacementPricing] = useState({});
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [popup, setPopup] = useState(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutDraft, setCheckoutDraft] = useState(null);
  const [activeTrack, setActiveTrack] = useState("banner"); // "banner" or "article"
  const [showSandboxModal, setShowSandboxModal] = useState(false);
  const [sandboxOrderData, setSandboxOrderData] = useState(null);
  const [sandboxPaymentMethod, setSandboxPaymentMethod] = useState("upi"); // "upi" or "card"
  const [mockCardNumber, setMockCardNumber] = useState("");
  const [mockCardName, setMockCardName] = useState("");

  useEffect(() => {
    http
      .get("/ads/form-options")
      .then(({ data }) => {
        const pricing = normalizePlacementPricing(data);
        setPlacementPricing(pricing);
        // Force test key if Razorpay isn't configured, so sandbox fallback is active
        setRazorpayKeyId(data.razorpayKeyId || "rzp_test_mock_palamuexpresskey");
        
        const defaultPlacement = activeTrack === "banner" ? "homepage-latest" : "promotional-article";
        const defaultDuration = pricing[defaultPlacement]?.durationPlans?.[0]?.days || initialForm.durationDays;
        setForm((current) => ({
          ...current,
          placement: defaultPlacement,
          durationDays: defaultDuration,
        }));
      })
      .catch(() => {
        const pricing = defaultPlacementPricing;
        setPlacementPricing(pricing);
        setRazorpayKeyId("rzp_test_mock_palamuexpresskey");
        const defaultPlacement = activeTrack === "banner" ? "homepage-latest" : "promotional-article";
        setForm((current) => ({
          ...current,
          placement: defaultPlacement,
          durationDays: pricing[defaultPlacement]?.durationPlans?.[0]?.days || 1,
        }));
      })
      .finally(() => setLoadingOptions(false));
  }, [activeTrack]);

  const activePlacementPricing = useMemo(
    () => placementPricing[form.placement] || null,
    [placementPricing, form.placement]
  );
  
  const durationPlans = useMemo(
    () => activePlacementPricing?.durationPlans || [],
    [activePlacementPricing]
  );
  
  const selectedPlan = useMemo(
    () => durationPlans.find((plan) => plan.days === Number(form.durationDays)),
    [durationPlans, form.durationDays]
  );
  
  const bannerPreviewUrl = getBannerPreviewUrl(form.imageUrl);
  
  const isMockSandboxMode = useMemo(
    () => razorpayKeyId === "rzp_test_mock_palamuexpresskey",
    [razorpayKeyId]
  );

  const blockOptions = useMemo(
    () => jharkhandBlocksByDistrict[form.district] || [],
    [form.district]
  );

  // Auto-switch placement when changing tabs
  const handleTrackChange = (track) => {
    setActiveTrack(track);
    const nextPlacement = track === "banner" ? "homepage-latest" : "promotional-article";
    const nextDuration = placementPricing[nextPlacement]?.durationPlans?.[0]?.days || 1;
    setForm((current) => ({
      ...current,
      placement: nextPlacement,
      durationDays: nextDuration,
      district: "Palamu",
      block: "Medininagar",
    }));
  };

  const executeSandboxSuccessFlow = async () => {
    if (!sandboxOrderData) return;
    const { ad, order } = sandboxOrderData;
    
    setShowSandboxModal(false);
    setPopup({
      type: "loading",
      title: "Verifying sandbox payment",
      message: "Verifying your simulated Razorpay payload with our server...",
      progress: 40,
      progressLabel: "Sandbox Handshake",
      persistent: true,
    });

    try {
      await new Promise((r) => setTimeout(r, 600));
      setPopup((p) => p ? { ...p, progress: 85, message: "Updating database indexes..." } : null);
      
      // Call standard verify payment endpoint with mock details
      await http.post(`/ads/${ad._id}/verify-payment`, {
        razorpayOrderId: order.id,
        razorpayPaymentId: `pay_mock_${Math.random().toString(36).substring(2, 10)}`,
        razorpaySignature: `sig_mock_${Math.random().toString(36).substring(2, 10)}`,
      });

      setPopup({
        type: "loading",
        title: "Simulation completed",
        message: "Payment successfully verified under sandbox rules!",
        progress: 100,
        progressLabel: "Verification Complete",
        persistent: true,
      });

      await new Promise((r) => setTimeout(r, 500));

      setPopup({
        type: "success",
        title: "Campaign booked!",
        message: activeTrack === "article"
          ? "Your promotional article launch request has been saved and queued. Go to the super admin desk to approve and instantly launch it!"
          : "Your advertisement campaign request is now waiting for super admin approval.",
      });

      setForm((current) => ({
        ...initialForm,
        placement: current.placement,
        durationDays: placementPricing[current.placement]?.durationPlans?.[0]?.days || 1,
      }));
    } catch (err) {
      setPopup({
        type: "error",
        title: "Sandbox Verification Failed",
        message: err.response?.data?.message || "Mock payment verify endpoint returned an error.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openRazorpayCheckout = async ({ ad, order, razorpayKey }) => {
    // If in sandbox test mode, open our beautiful custom payment modal instead of Razorpay Checkout script!
    if (isMockSandboxMode) {
      setSandboxOrderData({ ad, order });
      setShowSandboxModal(true);
      return;
    }

    const Razorpay = await loadRazorpayScript();
    if (!Razorpay) {
      throw new Error("Razorpay checkout is unavailable in this browser.");
    }

    const checkout = new Razorpay({
      key: razorpayKey,
      amount: order.amount,
      currency: order.currency,
      name: "Palamu Express",
      description: `${placementLabels[form.placement] || form.placement} for ${selectedPlan?.days || 0} day${selectedPlan?.days > 1 ? "s" : ""}`,
      order_id: order.id,
      image: PALAMU_EXPRESS_CHECKOUT_LOGO,
      prefill: {
        name: form.advertiserName,
        email: form.advertiserEmail,
        contact: form.advertiserPhone,
      },
      method: {
        upi: true,
        card: true,
        netbanking: true,
        wallet: true,
      },
      notes: {
        placement: placementLabels[form.placement] || form.placement,
        campaign: form.title,
      },
      theme: {
        color: "#f97316",
      },
      modal: {
        ondismiss: () => {
          setPopup({
            type: "error",
            title: "Payment not completed",
            message: "Your advertisement request was saved, but the Razorpay payment was not completed.",
          });
          setSubmitting(false);
        },
      },
      handler: async (response) => {
        setPopup({
          type: "loading",
          title: "Verifying payment",
          message: "We are verifying your Razorpay payment and forwarding the request to the super admin dashboard.",
          progress: 0,
          progressLabel: "Razorpay Verification",
          persistent: true,
        });

        let progressVal = 0;
        const interval = setInterval(() => {
          progressVal += Math.random() * 15 + 5;
          if (progressVal >= 90) {
            progressVal = 90;
            clearInterval(interval);
          }
          setPopup((prev) => prev ? { ...prev, progress: Math.min(progressVal, 90) } : null);
        }, 120);

        try {
          await http.post(`/ads/${ad._id}/verify-payment`, {
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });

          clearInterval(interval);
          setPopup({
            type: "loading",
            title: "Verifying payment",
            message: "Payment successfully verified and live updated!",
            progress: 100,
            progressLabel: "Verification Complete",
            persistent: true,
          });

          await new Promise((r) => setTimeout(r, 450));

          setPopup({
            type: "success",
            title: "Request submitted",
            message:
              "Payment was successful. Your advertisement request is now waiting for super admin approval before it appears on the homepage.",
          });
          setForm((current) => ({
            ...initialForm,
            placement: current.placement,
            durationDays: placementPricing[current.placement]?.durationPlans?.[0]?.days || 1,
          }));
        } catch (verificationError) {
          clearInterval(interval);
          setPopup({
            type: "error",
            title: "Verification failed",
            message:
              verificationError.response?.data?.message ||
              "Payment was received but verification failed. Please contact support with your payment details.",
          });
        } finally {
          setSubmitting(false);
        }
      },
    });

    checkout.open();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedName = String(form.advertiserName || "").trim();
    const trimmedEmail = String(form.advertiserEmail || "").trim().toLowerCase();
    const trimmedPhone = normalizePhoneNumber(form.advertiserPhone);
    const trimmedTitle = String(form.title || "").trim();

    if (!selectedPlan) {
      setPopup({
        type: "error",
        title: "Choose a duration",
        message: "Please select one of the available duration plans before continuing.",
      });
      return;
    }

    if (!trimmedName) {
      setPopup({
        type: "error",
        title: "Advertiser name required",
        message: "Please enter the advertiser or contact person name before continuing.",
      });
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setPopup({
        type: "error",
        title: "Valid email required",
        message: "Please enter a valid advertiser email address before continuing.",
      });
      return;
    }

    if (!isValidPhoneNumber(trimmedPhone)) {
      setPopup({
        type: "error",
        title: "Valid mobile number required",
        message: "Please enter a valid 10-digit mobile number before continuing.",
      });
      return;
    }

    if (!trimmedTitle) {
      setPopup({
        type: "error",
        title: "Campaign headline required",
        message: activeTrack === "article"
          ? "Please enter your promotional article headline before continuing."
          : "Please enter your campaign title before continuing.",
      });
      return;
    }

    if (activeTrack === "article" && !String(form.promotionalContent || "").trim()) {
      setPopup({
        type: "error",
        title: "Article body content required",
        message: "Please write the full body content for the promotional launch article before proceeding.",
      });
      return;
    }

    if (!bannerPreviewUrl) {
      setPopup({
        type: "error",
        title: "Banner/Cover image required",
        message: activeTrack === "article"
          ? "Please upload or supply a cover image for the promotional launch article."
          : "Please upload your advertisement banner or provide a banner image URL before continuing.",
      });
      return;
    }

    setForm((current) => ({
      ...current,
      advertiserName: trimmedName,
      advertiserEmail: trimmedEmail,
      advertiserPhone: trimmedPhone,
      title: trimmedTitle,
    }));
    
    setCheckoutDraft({
      bannerPreviewUrl,
      placementLabel: placementLabels[form.placement] || form.placement,
    });
  };

  const confirmCheckout = async () => {
    if (!selectedPlan) return;

    setSubmitting(true);
    setCheckoutDraft(null);
    
    setPopup({
      type: "loading",
      title: "Creating order",
      message: "Saving campaign details and preparing sandbox billing keys...",
      progress: 0,
      progressLabel: "Ad Booking Pipeline",
      persistent: true,
    });

    let progressVal = 0;
    const interval = setInterval(() => {
      progressVal += Math.random() * 12 + 4;
      if (progressVal >= 90) {
        progressVal = 90;
        clearInterval(interval);
      }
      setPopup((prev) => prev ? { ...prev, progress: Math.min(progressVal, 90) } : null);
    }, 150);

    try {
      const { data } = await http.post("/ads/request", {
        ...form,
        durationDays: selectedPlan.days,
      });

      clearInterval(interval);
      setPopup({
        type: "loading",
        title: "Creating order",
        message: isMockSandboxMode ? "Mock Sandbox Checkout Ready!" : "Razorpay Checkout Ready!",
        progress: 100,
        progressLabel: "Checkout Pipeline",
        persistent: true,
      });

      await new Promise((r) => setTimeout(r, 300));
      setPopup(null);

      await openRazorpayCheckout({
        ad: data.ad,
        order: data.order,
        razorpayKey: data.razorpayKeyId || razorpayKeyId,
      });
    } catch (error) {
      clearInterval(interval);
      setPopup({
        type: "error",
        title: "Unable to continue",
        message: error.response?.data?.message || error.message || "We could not start the advertisement request right now.",
      });
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 transition-all duration-300">
      <ActionPopup
        open={Boolean(popup)}
        type={popup?.type}
        title={popup?.title}
        message={popup?.message}
        persistent={popup?.persistent}
        onClose={popup?.persistent ? undefined : () => setPopup(null)}
        progress={popup?.progress}
        progressLabel={popup?.progressLabel}
      />

      {/* Premium Sandbox Payment Modal */}
      {showSandboxModal && sandboxOrderData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md overflow-hidden rounded-[36px] border border-orange-500/20 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-orange-400">
              <Sparkles className="h-6 w-6 animate-pulse" />
              <h3 className="text-xl font-bold text-white">PE Premium Sandbox Sheet</h3>
            </div>
            
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Your system is running in offline developer mode. This premium sandbox sheet simulates a live Razorpay transaction.
            </p>

            <div className="mt-4 rounded-2xl bg-slate-950/60 p-4 border border-white/5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Sponsor Booking:</span>
                <span className="font-semibold text-white truncate max-w-[200px]">{form.title}</span>
              </div>
              <div className="mt-2 flex justify-between text-sm border-t border-white/5 pt-2">
                <span className="text-slate-400">Billing Amount:</span>
                <span className="font-bold text-orange-400 text-lg">{formatCurrency(selectedPlan?.amount)}</span>
              </div>
            </div>

            {/* Tab Selection inside checkout */}
            <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-950/40 p-1 border border-white/5">
              <button
                type="button"
                onClick={() => setSandboxPaymentMethod("upi")}
                className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
                  sandboxPaymentMethod === "upi" ? "bg-orange-500 text-white shadow-md" : "text-slate-400 hover:text-white"
                }`}
              >
                <QrCode className="h-4 w-4" /> UPI QR Code
              </button>
              <button
                type="button"
                onClick={() => setSandboxPaymentMethod("card")}
                className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
                  sandboxPaymentMethod === "card" ? "bg-orange-500 text-white shadow-md" : "text-slate-400 hover:text-white"
                }`}
              >
                <CreditCard className="h-4 w-4" /> Credit Card
              </button>
            </div>

            {sandboxPaymentMethod === "upi" ? (
              <div className="mt-5 flex flex-col items-center justify-center bg-white/5 rounded-2xl p-6 border border-white/5">
                <div className="bg-white p-3 rounded-2xl shadow-inner relative group">
                  <div className="w-36 h-36 border border-slate-200 bg-slate-100 flex items-center justify-center flex-col">
                    {/* Simulated elegant QR */}
                    <div className="grid grid-cols-4 gap-1.5 p-1 w-full h-full opacity-80">
                      {Array.from({ length: 16 }).map((_, i) => (
                        <div
                          key={i}
                          className={`rounded-sm ${
                            (i * 7 + 13) % 3 === 0 || i === 0 || i === 3 || i === 12 || i === 15
                              ? "bg-slate-950"
                              : "bg-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-2xl transition-all duration-300">
                    <span className="text-[10px] text-white bg-slate-950/80 px-2 py-1 rounded-full font-mono">SCAN TO TEST</span>
                  </div>
                </div>
                <p className="mt-4 text-xs font-mono text-slate-400">Merchant: Palamu Express News</p>
                <p className="text-[10px] text-orange-300 mt-1">UPI ID: palamuexpress@okaxis (SANDBOX)</p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="relative rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 p-4 shadow-xl text-white overflow-hidden">
                  <div className="absolute -right-10 -bottom-10 h-28 w-28 rounded-full bg-white/10" />
                  <p className="text-[10px] uppercase tracking-[0.2em] font-semibold opacity-70">Palamu Express Sponsor</p>
                  <p className="mt-4 font-mono text-base tracking-widest">{mockCardNumber || "•••• •••• •••• ••••"}</p>
                  <div className="mt-6 flex justify-between items-end">
                    <div>
                      <p className="text-[8px] uppercase tracking-wider opacity-60">Card Holder</p>
                      <p className="text-xs font-semibold tracking-wide truncate max-w-[150px]">{mockCardName || "YOUR NAME"}</p>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-6 w-6 rounded-full bg-red-500/80" />
                      <div className="h-6 w-6 rounded-full bg-yellow-500/80 -ml-3" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <input
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                    placeholder="Card Number (Any mock format)"
                    value={mockCardNumber}
                    onChange={(e) => setMockCardNumber(e.target.value)}
                  />
                  <input
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                    placeholder="Cardholder Name"
                    value={mockCardName}
                    onChange={(e) => setMockCardName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowSandboxModal(false);
                  setSubmitting(false);
                }}
                className="rounded-xl border border-white/10 py-2.5 text-xs text-white hover:bg-white/5"
              >
                Cancel Booking
              </button>
              <button
                type="button"
                onClick={executeSandboxSuccessFlow}
                className="rounded-xl bg-orange-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600"
              >
                Simulate Success
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Slide Card before Razorpay Billing */}
      {checkoutDraft && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-slate-950/70 px-4 py-6 backdrop-blur-md sm:items-center sm:py-4">
          <div className="max-h-[calc(100vh-3rem)] w-full max-w-2xl overflow-y-auto rounded-[32px] border border-orange-300/20 bg-slate-950/95 p-6 shadow-[0_32px_80px_rgba(15,23,42,0.45)] sm:max-h-[calc(100vh-2rem)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">Checkout Preview</p>
                <h2 className="mt-2 text-xl font-bold text-white">Verify promotional details before payment</h2>
              </div>
              <button type="button" onClick={() => setCheckoutDraft(null)} className="rounded-full border border-white/10 px-4 py-1.5 text-xs text-white hover:bg-white/5">
                Edit Details
              </button>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-4 flex flex-col justify-center">
                <p className="text-xs font-semibold text-slate-400 mb-2">Campaign Creative Preview</p>
                <div className="flex h-56 items-center justify-center overflow-hidden rounded-2xl bg-slate-900/60">
                  <img src={checkoutDraft.bannerPreviewUrl} alt={form.title} className="h-full w-full object-contain" />
                </div>
              </div>
              
              <div className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.02] p-5">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-orange-400">{checkoutDraft.placementLabel}</p>
                  <p className="text-lg font-bold text-white mt-1 leading-snug truncate">{form.title}</p>
                </div>
                
                {form.description && (
                  <p className="text-xs leading-relaxed text-slate-400 border-t border-white/5 pt-2">{form.description}</p>
                )}

                <div className="grid gap-2 text-xs text-slate-400 bg-slate-950/30 p-3 rounded-xl">
                  <p>Placement: <span className="text-white">{checkoutDraft.placementLabel}</span></p>
                  <p>Duration Selected: <span className="text-white">{selectedPlan?.days} day{selectedPlan?.days > 1 ? "s" : ""}</span></p>
                  
                  {activeTrack === "article" ? (
                    <>
                      <p>Target District: <span className="text-white">{form.district}</span></p>
                      <p>Target Block: <span className="text-white">{form.block}</span></p>
                    </>
                  ) : (
                    <p>CTA Redirect Link: <span className="text-white truncate block max-w-[160px]">{form.targetUrl || "None (Banner Only)"}</span></p>
                  )}
                  
                  <p className="mt-2 text-sm border-t border-white/5 pt-2 flex justify-between font-bold">
                    <span>Total Bill:</span>
                    <span className="text-orange-400">{formatCurrency(selectedPlan?.amount)}</span>
                  </p>
                </div>

                <p className="rounded-xl border border-orange-300/10 bg-orange-500/5 p-3 text-[10px] leading-relaxed text-orange-200">
                  {isMockSandboxMode 
                    ? "Dev Mode Fallback: This will launch the simulated credit card / UPI QR transaction sheet for complete end-to-end testing."
                    : "Merchant Checkout: Payments are managed securely. Ad goes live dynamically after review and approval."
                  }
                </p>

                <button
                  type="button"
                  onClick={confirmCheckout}
                  disabled={submitting}
                  className="w-full rounded-xl bg-orange-500 py-3 font-semibold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 disabled:opacity-60 text-sm flex items-center justify-center gap-2"
                >
                  {submitting ? "Processing..." : `Book Campaign for ${formatCurrency(selectedPlan?.amount)}`}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Panel with Track Switcher */}
      <section className="relative overflow-hidden rounded-[36px] border border-orange-500/10 bg-slate-950 p-6 md:p-8">
        <div className="absolute right-0 top-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute left-0 bottom-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-amber-500/5 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-300">
              <Sparkles className="h-3.5 w-3.5 animate-spin" /> Premium Ad Portal
            </div>
            
            <h1 className="font-display text-3xl font-extrabold leading-tight text-white md:text-5xl">
              Elevate your local brand across Jharkhand
            </h1>
            
            <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
              Put your company, store, or special launch directly into the reading flow of Palamu Express readers. 
              Select your advertising model, complete checkout, and we'll take care of the rest.
            </p>

            {/* TRACK SWITCHER */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2 pt-2">
              <div
                onClick={() => handleTrackChange("banner")}
                className={`group cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
                  activeTrack === "banner"
                    ? "border-orange-500/40 bg-orange-500/5 shadow-inner"
                    : "border-white/5 bg-white/[0.01] hover:bg-white/[0.03]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`rounded-xl p-2.5 transition-all ${
                    activeTrack === "banner" ? "bg-orange-500 text-white" : "bg-white/5 text-slate-400 group-hover:text-white"
                  }`}>
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Track A: Homepage Banner</h3>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-400">Sponsor rails, grid slots, and banner ads.</p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => handleTrackChange("article")}
                className={`group cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
                  activeTrack === "article"
                    ? "border-emerald-500/40 bg-emerald-500/5 shadow-inner"
                    : "border-white/5 bg-white/[0.01] hover:bg-white/[0.03]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`rounded-xl p-2.5 transition-all ${
                    activeTrack === "article" ? "bg-emerald-500 text-white" : "bg-white/5 text-slate-400 group-hover:text-white"
                  }`}>
                    <Newspaper className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Track B: Promotional Article</h3>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-400">Write a story, launch event, or press release.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Sheet Container */}
          <div className="flex flex-col justify-center rounded-3xl border border-white/5 bg-white/[0.02] p-5 backdrop-blur-sm">
            <h3 className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Ad Placement Packages</h3>
            
            {isMockSandboxMode && (
              <div className="mt-2 rounded-xl bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 text-[10px] text-orange-200">
                Sandbox simulation mode is active. Fill inputs and simulate success instantly!
              </div>
            )}

            <div className="mt-4 space-y-2.5">
              {Object.entries(placementPricing).map(([placement, pricing]) => {
                const isSelected = placement === form.placement;
                const isPromo = placement === "promotional-article";
                
                return (
                  <div
                    key={placement}
                    className={`rounded-2xl border px-4 py-3 transition-all duration-150 ${
                      isSelected
                        ? isPromo
                          ? "border-emerald-500/40 bg-emerald-500/10"
                          : "border-orange-500/40 bg-orange-500/10"
                        : "border-white/5 bg-white/[0.01] hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-white">{pricing.shortLabel || placementLabels[placement]}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">Base rate: {formatCurrency(pricing.baseDailyRate)} / day</p>
                      </div>
                      
                      <div className="text-right">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isSelected
                            ? isPromo
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-orange-500/20 text-orange-300"
                            : "bg-slate-800 text-slate-400"
                        }`}>
                          {isSelected ? "Selected" : "Available"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Main Form Composer & Dynamic Sidebar Preview */}
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <form onSubmit={handleSubmit} className="rounded-[32px] border border-white/5 bg-slate-950 p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">
              {activeTrack === "article" ? "Promotional Article Campaign" : "Homepage Sponsor Campaign"}
            </h2>
            <p className="mt-1 text-xs leading- relaxed text-slate-400">
              Input advertiser identity, then select campaign parameters. Verification occurs in the Super Admin dashboard post payment handshake.
            </p>
          </div>

          {/* Advertiser Contact Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400/80 border-b border-white/5 pb-1">Advertiser Details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500/20"
                placeholder="Contact Name"
                value={form.advertiserName}
                onChange={(event) => setForm({ ...form, advertiserName: event.target.value })}
              />
              <input
                type="email"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500/20"
                placeholder="Email Address"
                value={form.advertiserEmail}
                onChange={(event) => setForm({ ...form, advertiserEmail: event.target.value.trimStart() })}
              />
              <input
                inputMode="numeric"
                maxLength="10"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500/20"
                placeholder="10-digit Mobile Number"
                value={form.advertiserPhone}
                onChange={(event) => setForm({ ...form, advertiserPhone: normalizePhoneNumber(event.target.value) })}
              />
              <input
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500/20"
                placeholder="Company / Brand Name"
                value={form.companyName}
                onChange={(event) => setForm({ ...form, companyName: event.target.value })}
              />
            </div>
          </div>

          {/* Campaign Creative Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400/80 border-b border-white/5 pb-1">Campaign Details</h3>
            
            {/* Dynamic input labels based on track */}
            <div className="space-y-3">
              <input
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500/20"
                placeholder={activeTrack === "article" ? "Article Headline (e.g. Grand Opening of Palamu Retail Hub)" : "Campaign Title (e.g. Summer Discount Offer)"}
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
              
              <textarea
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500/20"
                rows="3"
                placeholder={activeTrack === "article" ? "Short Article Excerpt (displayed as subtitle/snippet)" : "Short Campaign Excerpt / Description"}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </div>

            {/* Dynamic track-specific inputs */}
            {activeTrack === "article" ? (
              <div className="space-y-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Track B: Dynamic News Parameters</p>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400">Target District</label>
                    <select
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none"
                      value={form.district}
                      onChange={(e) => setForm({ ...form, district: e.target.value, block: jharkhandBlocksByDistrict[e.target.value]?.[0] || "" })}
                    >
                      {jharkhandDistricts.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400">Target Block / Area</label>
                    <select
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none"
                      value={form.block}
                      onChange={(e) => setForm({ ...form, block: e.target.value })}
                    >
                      {blockOptions.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Launch Story Body Content</label>
                  <textarea
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                    rows="8"
                    placeholder="Write the full press release, event details, launch offers, address coordinates, and product specifications here..."
                    value={form.promotionalContent}
                    onChange={(event) => setForm({ ...form, promotionalContent: event.target.value })}
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  type="url"
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500/20"
                  placeholder="Optional CTA Redirect URL (e.g. https://yoursite.com)"
                  value={form.targetUrl}
                  onChange={(event) => setForm({ ...form, targetUrl: event.target.value })}
                />
                <input
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500/20"
                  placeholder="CTA Label (e.g. Shop Now)"
                  value={form.ctaLabel}
                  onChange={(event) => setForm({ ...form, ctaLabel: event.target.value })}
                />
              </div>
            )}

            {/* Banner/Cover photo upload tool */}
            <div className="space-y-3">
              <ImagePicker
                label={activeTrack === "article" ? "Launch Cover Photo" : "Sponsor Banner Image"}
                helpText={activeTrack === "article" 
                  ? "Upload the cover photo for the promotional article, or leave empty and paste an image URL below."
                  : "Upload the high-impact creative banner you want to display on the home page."
                }
                value={form.imageUrl}
                onChange={(value) => setForm({ ...form, imageUrl: value })}
              />

              <input
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500/20"
                placeholder={activeTrack === "article" ? "Optional cover photo image URL link" : "Optional banner image URL link"}
                value={String(form.imageUrl || "").startsWith("data:") ? "" : form.imageUrl}
                onChange={(event) => setForm({ ...form, imageUrl: event.target.value })}
              />
            </div>
          </div>

          {/* Placement Duration */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400/80 border-b border-white/5 pb-1">Billing Parameters</h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Ad Placement Slot</label>
                <select
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-xs text-white focus:outline-none"
                  value={form.placement}
                  onChange={(event) => {
                    const nextPlacement = event.target.value;
                    const nextDuration = placementPricing[nextPlacement]?.durationPlans?.[0]?.days || 1;
                    setForm({ ...form, placement: nextPlacement, durationDays: nextDuration });
                  }}
                  disabled={activeTrack === "article"} // Forced to "promotional-article"
                >
                  {activeTrack === "article" ? (
                    <option value="promotional-article">Promotional Launch Article</option>
                  ) : (
                    Object.entries(placementLabels)
                      .filter(([key]) => key !== "promotional-article")
                      .map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Live Campaign Duration</label>
                <select
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-xs text-white focus:outline-none"
                  value={form.durationDays}
                  onChange={(event) => setForm({ ...form, durationDays: Number(event.target.value) })}
                  disabled={loadingOptions || !durationPlans.length}
                >
                  {durationPlans.map((plan) => (
                    <option key={`${form.placement}-${plan.days}`} value={plan.days}>
                      {plan.label} ({formatCurrency(plan.amount)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <textarea
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500/20"
              rows="2"
              placeholder="Any administrative notes or customization requests for the Super Admin..."
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || loadingOptions || !durationPlans.length}
            className={`w-full rounded-2xl py-3.5 text-sm font-bold text-white shadow-xl transition-all duration-200 flex items-center justify-center gap-2 ${
              activeTrack === "article" 
                ? "bg-emerald-500 shadow-emerald-500/10 hover:bg-emerald-600 disabled:bg-emerald-800/40"
                : "bg-orange-500 shadow-orange-500/10 hover:bg-orange-600 disabled:bg-orange-800/40"
            }`}
          >
            {submitting ? (
              <span>Compiling Booking Data...</span>
            ) : selectedPlan ? (
              <>
                <span>Review booking & proceed with payment ({formatCurrency(selectedPlan.amount)})</span>
                <ArrowRight className="h-4.5 w-4.5" />
              </>
            ) : (
              <span>Submit Campaign</span>
            )}
          </button>
        </form>

        {/* Live Dynamic Preview Mockup Sidebar */}
        <div className="space-y-6">
          <div className="rounded-[32px] border border-white/5 bg-slate-950 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Live Mockup Preview</span>
              <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-full ${
                activeTrack === "article" ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" : "bg-orange-500/10 text-orange-300 border border-orange-500/20"
              }`}>
                {activeTrack === "article" ? "Promoted Article" : "High-Traffic Banner"}
              </span>
            </div>

            <h3 className="text-base font-bold text-white line-clamp-2 leading-snug">
              {form.title || "Your Campaign Title or Headline will render here"}
            </h3>

            {bannerPreviewUrl ? (
              <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-slate-900 p-2 flex items-center justify-center h-48">
                <img
                  src={bannerPreviewUrl}
                  alt="Creative preview"
                  className="h-full w-full object-contain rounded-xl transition-transform duration-300 group-hover:scale-102"
                />
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-white/10 text-xs text-slate-500 text-center px-4 leading-relaxed bg-white/[0.005]">
                Upload a cover creative or paste a banner image URL link to inspect mockup display preview.
              </div>
            )}

            {form.description && (
              <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 bg-white/[0.01] p-3 rounded-xl">
                {form.description}
              </p>
            )}

            <div className="grid gap-2 text-xs text-slate-400 bg-slate-900/50 p-4 rounded-2xl border border-white/5">
              <p className="flex justify-between">
                <span>Placement Package:</span> 
                <span className="text-white font-semibold">{placementLabels[form.placement] || "-"}</span>
              </p>
              <p className="flex justify-between">
                <span>Campaign Duration:</span> 
                <span className="text-white font-semibold">{selectedPlan ? `${selectedPlan.days} days` : "-"}</span>
              </p>
              
              {activeTrack === "article" ? (
                <>
                  <p className="flex justify-between">
                    <span>District Area:</span> 
                    <span className="text-white font-semibold">{form.district} ({form.block})</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Target Feed Category:</span> 
                    <span className="text-emerald-400 font-bold">Promotions & Launches</span>
                  </p>
                </>
              ) : (
                <>
                  <p className="flex justify-between">
                    <span>CTA Label Text:</span> 
                    <span className="text-white font-semibold">{form.ctaLabel || "Visit Sponsor"}</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Target Redirect:</span> 
                    <span className="text-orange-400 font-semibold truncate max-w-[120px]">{form.targetUrl || "None"}</span>
                  </p>
                </>
              )}

              <p className="mt-2 flex justify-between border-t border-white/5 pt-2 font-bold text-sm">
                <span className="text-white">Amount Due:</span>
                <span className={activeTrack === "article" ? "text-emerald-400" : "text-orange-400"}>
                  {selectedPlan ? formatCurrency(selectedPlan.amount) : "-"}
                </span>
              </p>
            </div>

            {form.targetUrl && activeTrack === "banner" && (
              <a
                href={form.targetUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 py-2 text-xs text-white hover:bg-white/5 transition-all w-full"
              >
                <span>Preview Campaign Destination</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          <div className="rounded-[32px] border border-white/5 bg-slate-950 p-6 space-y-4 leading-6">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-orange-400" /> Fully Automated Flow
            </h4>
            <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
              <p>1. Complete the unified secure checkout using UPI, Netbanking, or Cards.</p>
              <p>2. Once processed successfully, a verification request logs straight onto the Super Admin desk.</p>
              <p>3. Upon editorial approval: standard ads publish immediately inside active page flows, and promotional articles instantly spawn a live news post with full SEO, AI takeaways, and WebSocket analytics features!</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
