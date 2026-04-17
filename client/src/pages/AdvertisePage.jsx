import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, ImageIcon, ShieldCheck } from "lucide-react";
import { http } from "../api/http";
import { ImagePicker } from "../components/onboarding/ImagePicker";
import { ActionPopup } from "../components/ui/ActionPopup";

const placementLabels = {
  "homepage-hero": "Homepage Hero Rail",
  "homepage-latest": "Latest Updates Sponsor Grid",
  "homepage-district": "District Coverage Sponsor Strip",
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
    shortLabel: "Latest Update Sponsor Section",
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
const PALAMU_EXPRESS_CHECKOUT_LOGO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256' viewBox='0 0 256 256'%3E%3Crect width='256' height='256' rx='48' fill='%23f97316'/%3E%3Ctext x='50%25' y='54%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial,sans-serif' font-size='108' font-weight='700' fill='white'%3EPE%3C/text%3E%3C/svg%3E";

const normalizePlacementPricing = (payload = {}) => {
  const incomingPricing = payload.placementPricing;
  if (incomingPricing && Object.keys(incomingPricing).length) {
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

  useEffect(() => {
    http
      .get("/ads/form-options")
      .then(({ data }) => {
        const pricing = normalizePlacementPricing(data);
        setPlacementPricing(pricing);
        setRazorpayKeyId(data.razorpayKeyId || "");
        const defaultPlacement = pricing[initialForm.placement] ? initialForm.placement : Object.keys(pricing)[0] || initialForm.placement;
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
        setForm((current) => ({
          ...current,
          placement: pricing[initialForm.placement] ? initialForm.placement : Object.keys(pricing)[0] || initialForm.placement,
          durationDays: pricing[initialForm.placement]?.durationPlans?.[0]?.days || 1,
        }));
        setPopup({
          type: "error",
          title: "Unable to load plans",
          message: "Live pricing could not be loaded from the server, so default placement rates are being shown for now.",
        });
      })
      .finally(() => setLoadingOptions(false));
  }, []);

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
  const usingTestMode = isTestRazorpayKey(razorpayKeyId);

  const openRazorpayCheckout = async ({ ad, order, razorpayKey }) => {
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
          persistent: true,
        });

        try {
          await http.post(`/ads/${ad._id}/verify-payment`, {
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });

          setPopup({
            type: "success",
            title: "Request submitted",
            message:
              "Payment was successful. Your advertisement request is now waiting for super admin approval before it appears on the home page.",
          });
          setForm((current) => ({
            ...initialForm,
            placement: current.placement,
            durationDays: placementPricing[current.placement]?.durationPlans?.[0]?.days || 1,
          }));
        } catch (verificationError) {
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

    if (!selectedPlan) {
      setPopup({
        type: "error",
        title: "Choose a duration",
        message: "Please select one of the available duration plans before continuing.",
      });
      return;
    }

    if (!razorpayKeyId) {
      setPopup({
        type: "error",
        title: "Payments unavailable",
        message: "Razorpay is not configured yet for this platform. Please contact the super admin.",
      });
      return;
    }

    if (!bannerPreviewUrl) {
      setPopup({
        type: "error",
        title: "Banner required",
        message: "Please upload your advertisement banner or provide a banner image URL before continuing.",
      });
      return;
    }

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
      title: "Creating payment order",
      message: "We are saving your advertisement details and preparing the Razorpay checkout.",
      persistent: true,
    });

    try {
      const { data } = await http.post("/ads/request", {
        ...form,
        durationDays: selectedPlan.days,
      });

      await openRazorpayCheckout({
        ad: data.ad,
        order: data.order,
        razorpayKey: data.razorpayKeyId,
      });
    } catch (error) {
      setPopup({
        type: "error",
        title: "Unable to continue",
        message: error.response?.data?.message || error.message || "We could not start the advertisement request right now.",
      });
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10">
      <ActionPopup
        open={Boolean(popup)}
        type={popup?.type}
        title={popup?.title}
        message={popup?.message}
        persistent={popup?.persistent}
        onClose={popup?.persistent ? undefined : () => setPopup(null)}
      />

      {checkoutDraft ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[32px] border border-orange-300/20 bg-slate-950/95 p-6 shadow-[0_32px_80px_rgba(15,23,42,0.45)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">Checkout Preview</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">Confirm banner before payment</h2>
              </div>
              <button type="button" onClick={() => setCheckoutDraft(null)} className="rounded-full border border-white/10 px-4 py-2 text-sm text-white">
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex h-72 items-center justify-center overflow-hidden rounded-2xl bg-slate-950/40">
                  <img src={checkoutDraft.bannerPreviewUrl} alt={form.title || "Advertisement banner preview"} className="h-full w-full object-contain" />
                </div>
              </div>
              <div className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-lg font-semibold text-white">{form.title || "Advertisement request"}</p>
                <p className="text-sm leading-6 text-slate-400">{form.description || "No campaign description added."}</p>
                <div className="grid gap-2 text-sm text-slate-400">
                  <p>Placement: <span className="text-white">{checkoutDraft.placementLabel}</span></p>
                  <p>Duration: <span className="text-white">{selectedPlan?.days} day{selectedPlan?.days > 1 ? "s" : ""}</span></p>
                  <p>Amount: <span className="text-white">{formatCurrency(selectedPlan?.amount)}</span></p>
                  <p>Banner source: <span className="text-white">{String(form.imageUrl || "").startsWith("http") ? "Image URL" : "Uploaded image"}</span></p>
                </div>
                <p className="rounded-2xl border border-orange-300/20 bg-orange-500/10 p-4 text-sm leading-6 text-orange-100">
                  This campaign banner preview is shown before Razorpay opens. Razorpay checkout itself uses the fixed Palamu Express logo for every payment.
                </p>
                <button type="button" onClick={confirmCheckout} disabled={submitting} className="w-full rounded-2xl bg-orange-500 px-4 py-3 font-semibold text-white disabled:opacity-60">
                  {submitting ? "Preparing..." : `Continue to Razorpay for ${formatCurrency(selectedPlan?.amount)}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <section className="panel overflow-hidden">
        <div className="grid gap-8 p-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-orange-300">Advertise With Us</p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight text-white md:text-6xl">
              Put your brand directly inside the Palamu Express home page reading flow.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400">
              Choose a homepage slot, upload your banner, pay securely with Razorpay, and send the campaign to the super admin for review.
              Your advertisement goes live only after approval.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <ImageIcon className="h-6 w-6 text-orange-300" />
                <p className="mt-4 text-sm font-semibold text-white">Banner upload or image URL</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">Send a hosted banner link or upload your creative directly from this form.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <ShieldCheck className="h-6 w-6 text-orange-300" />
                <p className="mt-4 text-sm font-semibold text-white">Payment before review</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">Razorpay checkout confirms the request before it enters the approval queue.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <CheckCircle2 className="h-6 w-6 text-orange-300" />
                <p className="mt-4 text-sm font-semibold text-white">Publishes after approval</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">Approved campaigns automatically appear on the homepage for the selected duration.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-orange-300/20 bg-gradient-to-br from-orange-500/12 via-slate-950 to-slate-950 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-200">Placement pricing</p>
            {usingTestMode ? (
              <div className="mt-4 rounded-2xl border border-amber-300/25 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
                Razorpay test mode is active. Use test credentials and sandbox payments only. These payments do not create real settlements.
              </div>
            ) : null}
            <div className="mt-5 space-y-3">
              {Object.entries(placementPricing).map(([placement, pricing]) => (
                <div
                  key={placement}
                  className={`rounded-3xl border p-4 ${placement === form.placement ? "border-orange-300/40 bg-orange-500/10" : "border-white/10 bg-white/[0.03]"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-white">{pricing.shortLabel || placementLabels[placement]}</p>
                      <p className="mt-1 text-sm text-slate-400">Starting from {formatCurrency(pricing.baseDailyRate)} per day</p>
                    </div>
                    <p className="text-sm font-semibold text-orange-200">{placement === form.placement ? "Selected" : "Available"}</p>
                  </div>
                </div>
              ))}
              {!Object.keys(placementPricing).length && !loadingOptions ? (
                <p className="rounded-3xl border border-rose-300/20 bg-rose-500/10 p-4 text-sm text-rose-200">
                  No pricing plans are configured yet.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <form onSubmit={handleSubmit} className="panel grid gap-5 p-8">
          <div>
            <h2 className="text-2xl font-semibold text-white">Advertisement Request Form</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Fill in your campaign details, then complete payment. The request is sent to the super admin dashboard after successful payment verification.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
              placeholder="Advertiser name"
              value={form.advertiserName}
              onChange={(event) => setForm({ ...form, advertiserName: event.target.value })}
            />
            <input
              type="email"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
              placeholder="Advertiser email"
              value={form.advertiserEmail}
              onChange={(event) => setForm({ ...form, advertiserEmail: event.target.value })}
            />
            <input
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
              placeholder="Phone number"
              value={form.advertiserPhone}
              onChange={(event) => setForm({ ...form, advertiserPhone: event.target.value })}
            />
            <input
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
              placeholder="Company or brand name"
              value={form.companyName}
              onChange={(event) => setForm({ ...form, companyName: event.target.value })}
            />
          </div>

          <input
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            placeholder="Campaign title"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />

          <textarea
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            rows="4"
            placeholder="Describe your advertisement, offer, or event"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />

          <ImagePicker
            label="Banner Image"
            helpText="Upload the banner you want to show on the home page, or leave this empty and paste an image URL below."
            value={form.imageUrl}
            onChange={(value) => setForm({ ...form, imageUrl: value })}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <input
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
              placeholder="Optional banner image URL"
              value={String(form.imageUrl || "").startsWith("data:") ? "" : form.imageUrl}
              onChange={(event) => setForm({ ...form, imageUrl: event.target.value })}
            />
            <input
              type="url"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
              placeholder="Optional target URL"
              value={form.targetUrl}
              onChange={(event) => setForm({ ...form, targetUrl: event.target.value })}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <select
              className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white"
              value={form.placement}
              onChange={(event) => {
                const nextPlacement = event.target.value;
                const nextDuration = placementPricing[nextPlacement]?.durationPlans?.[0]?.days || 1;
                setForm({ ...form, placement: nextPlacement, durationDays: nextDuration });
              }}
            >
              {Object.entries(placementLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white"
              value={form.durationDays}
              onChange={(event) => setForm({ ...form, durationDays: Number(event.target.value) })}
              disabled={loadingOptions || !durationPlans.length}
            >
              {durationPlans.map((plan) => (
                <option key={`${form.placement}-${plan.days}`} value={plan.days}>
                  {plan.label}
                </option>
              ))}
            </select>
            <input
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
              placeholder="CTA label"
              value={form.ctaLabel}
              onChange={(event) => setForm({ ...form, ctaLabel: event.target.value })}
            />
          </div>

          <textarea
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            rows="3"
            placeholder="Optional notes for the super admin"
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
          />

          <button
            type="submit"
            disabled={submitting || loadingOptions || !durationPlans.length}
            className="rounded-2xl bg-orange-500 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? "Processing..."
              : selectedPlan
                ? `Review banner and pay ${formatCurrency(selectedPlan.amount)}`
                : "Submit request"}
          </button>
        </form>

        <div className="space-y-6">
          <div className="panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">Selected campaign</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">{form.title || "Your campaign preview"}</h2>
            {bannerPreviewUrl ? (
              <div className="mt-5 flex h-56 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                <img
                  src={bannerPreviewUrl}
                  alt={form.title || "Campaign banner preview"}
                  className="h-full w-full object-contain"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              </div>
            ) : (
              <div className="mt-5 flex h-56 items-center justify-center rounded-2xl border border-dashed border-white/15 text-sm text-slate-400">
                Your banner preview will appear here before checkout.
              </div>
            )}
            <div className="mt-5 grid gap-3 text-sm text-slate-400">
              <p>Placement: <span className="text-white">{placementLabels[form.placement] || "-"}</span></p>
              <p>Duration: <span className="text-white">{selectedPlan ? `${selectedPlan.days} days` : "-"}</span></p>
              <p>Amount: <span className="text-white">{selectedPlan ? formatCurrency(selectedPlan.amount) : "-"}</span></p>
              <p>Base rate: <span className="text-white">{activePlacementPricing ? `${formatCurrency(activePlacementPricing.baseDailyRate)} per day` : "-"}</span></p>
              <p>Target URL: <span className="text-white">{form.targetUrl || "Optional, can be left blank"}</span></p>
            </div>
            {form.targetUrl ? (
              <a
                href={form.targetUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white"
              >
                Preview destination
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
          </div>

          <div className="panel p-6">
            <h3 className="text-xl font-semibold text-white">Approval flow</h3>
            <div className="mt-5 space-y-4 text-sm leading-7 text-slate-400">
              <p>1. You select the homepage placement and how many days the ad should stay live.</p>
              <p>2. Pricing updates automatically from the selected placement: Rs. 299/day district strip, Rs. 499/day latest updates, Rs. 699/day hero rail.</p>
              <p>3. After payment verification, the request appears in the super admin dashboard for review.</p>
              <p>4. Once approved, the banner publishes on the homepage and expires automatically after the selected duration.</p>
            </div>
          </div>

          {usingTestMode ? (
            <div className="panel border border-amber-300/20 bg-amber-500/10 p-6">
              <h3 className="text-xl font-semibold text-white">Test payment notice</h3>
              <p className="mt-3 text-sm leading-7 text-amber-100">
                This advertisement checkout is currently connected to Razorpay test keys. Complete only sandbox or demo transactions until the live Razorpay account is activated.
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
};
