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
  durationDays: 7,
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

export const AdvertisePage = () => {
  const [form, setForm] = useState(initialForm);
  const [durationPlans, setDurationPlans] = useState([]);
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [popup, setPopup] = useState(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    http
      .get("/ads/form-options")
      .then(({ data }) => {
        const plans = Array.isArray(data.durationPlans) ? data.durationPlans : [];
        setDurationPlans(plans);
        setRazorpayKeyId(data.razorpayKeyId || "");
        if (plans.length) {
          setForm((current) => ({
            ...current,
            durationDays: current.durationDays || plans[0].days,
          }));
        }
      })
      .catch(() => {
        setPopup({
          type: "error",
          title: "Unable to load plans",
          message: "We could not load the advertisement pricing plans right now. Please try again shortly.",
        });
      })
      .finally(() => setLoadingOptions(false));
  }, []);

  const selectedPlan = useMemo(
    () => durationPlans.find((plan) => plan.days === Number(form.durationDays)),
    [durationPlans, form.durationDays]
  );
  const usingTestMode = isTestRazorpayKey(razorpayKeyId);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedPlan) {
      setPopup({
        type: "error",
        title: "Choose a duration",
        message: "Please select one of the available home page duration plans before continuing.",
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

    setSubmitting(true);
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

      const Razorpay = await loadRazorpayScript();

      if (!Razorpay) {
        throw new Error("Razorpay checkout is unavailable in this browser.");
      }

      const checkout = new Razorpay({
        key: data.razorpayKeyId,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "Palamu Express",
        description: `${selectedPlan.label} advertisement request`,
        order_id: data.order.id,
        image: data.ad.imageUrl,
        prefill: {
          name: form.advertiserName,
          email: form.advertiserEmail,
          contact: form.advertiserPhone,
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
            await http.post(`/ads/${data.ad._id}/verify-payment`, {
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
              durationDays: current.durationDays,
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
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-200">Available plans</p>
          {usingTestMode ? (
            <div className="mt-4 rounded-2xl border border-amber-300/25 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
              Razorpay test mode is active. Use test credentials and sandbox payments only. These payments do not create real settlements.
            </div>
          ) : null}
          <div className="mt-5 space-y-3">
              {durationPlans.map((plan) => (
                <div
                  key={plan.days}
                  className={`rounded-3xl border p-4 ${plan.days === selectedPlan?.days ? "border-orange-300/40 bg-orange-500/10" : "border-white/10 bg-white/[0.03]"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-white">{plan.label}</p>
                      <p className="mt-1 text-sm text-slate-400">{plan.days} day{plan.days > 1 ? "s" : ""} on the Palamu Express home page</p>
                    </div>
                    <p className="text-lg font-semibold text-orange-200">{formatCurrency(plan.amount)}</p>
                  </div>
                </div>
              ))}
              {!durationPlans.length && !loadingOptions ? (
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
              value={form.imageUrl.startsWith("data:") ? "" : form.imageUrl}
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
              onChange={(event) => setForm({ ...form, placement: event.target.value })}
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
                <option key={plan.days} value={plan.days}>
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
                ? `Pay ${formatCurrency(selectedPlan.amount)} and submit request`
                : "Submit request"}
          </button>
        </form>

        <div className="space-y-6">
          <div className="panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">Selected campaign</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">{form.title || "Your campaign preview"}</h2>
            <div className="mt-5 grid gap-3 text-sm text-slate-400">
              <p>Placement: <span className="text-white">{placementLabels[form.placement] || "-"}</span></p>
              <p>Duration: <span className="text-white">{selectedPlan ? `${selectedPlan.days} days` : "-"}</span></p>
              <p>Amount: <span className="text-white">{selectedPlan ? formatCurrency(selectedPlan.amount) : "-"}</span></p>
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
              <p>1. You submit campaign details and choose a home page retention plan.</p>
              <p>2. Razorpay collects the payment securely for the selected duration.</p>
              <p>3. The payment-verified request appears in the super admin dashboard for approval.</p>
              <p>4. After approval, the banner publishes on the home page and remains active for the selected number of days.</p>
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
