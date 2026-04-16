import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { http } from "../api/http";
import { ImagePicker } from "../components/onboarding/ImagePicker";
import { WebcamCapture } from "../components/onboarding/WebcamCapture";
import { ActionPopup } from "../components/ui/ActionPopup";
import { jharkhandBlocksByDistrict, jharkhandDistricts } from "../data/districts";

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  aadhaarNumber: "",
  district: "",
  area: "",
  role: "reporter",
  profilePhotoUrl: "",
  aadhaarImageUrl: "",
  livePhotoUrl: "",
};

export const RegisterPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [popup, setPopup] = useState(null);
  const [otpInfo, setOtpInfo] = useState(null);
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const updateDigitsOnlyField = (field, maxLength) => (event) => {
    const digitsOnly = event.target.value.replace(/\D/g, "").slice(0, maxLength);
    setForm({ ...form, [field]: digitsOnly });
  };

  const showPopup = (title, message) => {
    setPopup({ type: "error", title, message });
  };

  const validateForm = () => {
    const baseRequiredFields = [
      { key: "fullName", label: "full name" },
      { key: "email", label: "email" },
      { key: "phone", label: "phone number" },
      { key: "password", label: "password" },
      { key: "district", label: "district" },
    ];

    for (const field of baseRequiredFields) {
      if (!String(form[field.key] || "").trim()) {
        return `Please enter your ${field.label} before submitting the enrollment form.`;
      }
    }

    const emailValue = String(form.email || "").trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(emailValue)) {
      return "Please enter a valid email address before submitting the enrollment form.";
    }

    const phoneDigits = String(form.phone || "").replace(/\D/g, "");
    if (phoneDigits.length !== 10) {
      return "Please enter a valid 10-digit mobile number before submitting the enrollment form.";
    }

    if ((form.role === "reporter" || form.role === "chief_editor") && !String(form.area || "").trim()) {
      return "Please select your block or area before submitting the enrollment form.";
    }

    if ((form.role === "reporter" || form.role === "chief_editor") && !String(form.aadhaarNumber || "").trim()) {
      return "Please enter your Aadhaar number before submitting the enrollment form.";
    }

    if (form.role === "reporter" || form.role === "chief_editor") {
      const aadhaarDigits = String(form.aadhaarNumber || "").replace(/\D/g, "");
      if (aadhaarDigits.length !== 12) {
        return "Please enter a valid 12-digit Aadhaar number before submitting the enrollment form.";
      }
    }

    if (form.role === "reporter" && !String(form.profilePhotoUrl || "").trim()) {
      return "Please upload your profile photo before submitting the enrollment form.";
    }

    if (form.role === "reporter" && !String(form.aadhaarImageUrl || "").trim()) {
      return "Please upload your Aadhaar image before submitting the enrollment form.";
    }

    if (form.role === "chief_editor" && !String(form.livePhotoUrl || "").trim()) {
      return "Please capture your live photo before submitting the enrollment form.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    const validationMessage = validateForm();
    if (validationMessage) {
      showPopup("Missing Details", validationMessage);
      return;
    }
    setSubmitting(true);
    setPopup({
      type: "loading",
      title: "Registering new user",
      message: "We are uploading the onboarding details, creating the account, and preparing verification for this new user.",
      persistent: true,
    });

    try {
      const { data } = await http.post("/auth/register", form);
      setOtpInfo({ userId: data.user._id, otp: data.developmentOtp });
      setMessage("Registration submitted. Verify the OTP below to complete phone verification.");
      setPopup({
        type: "success",
        title: "Enrollment submitted",
        message: "Your onboarding form has been saved successfully. Please verify the OTP to complete phone verification.",
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Registration failed");
      setPopup({
        type: "error",
        title: "Enrollment failed",
        message: requestError.response?.data?.message || "We could not submit your onboarding form right now.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isReporter = form.role === "reporter";
  const isChiefEditor = form.role === "chief_editor";
  const blocks = form.district ? jharkhandBlocksByDistrict[form.district] || [] : [];

  const handleVerifyOtp = async () => {
    if (!otpInfo?.userId || !otp) return;
    setError("");
    try {
      setPopup({
        type: "loading",
        title: "Verifying phone",
        message: "We are confirming your OTP and finishing the onboarding verification step.",
        persistent: true,
      });
      await http.patch(`/auth/verify-phone/${otpInfo.userId}`, { otp });
      setMessage("Phone verified successfully. You can now sign in after admin approval.");
      setPopup({
        type: "success",
        title: "Phone verified",
        message: "Your phone number is verified successfully. You can sign in after admin approval.",
      });
      setTimeout(() => navigate("/login"), 1200);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "OTP verification failed");
      setPopup({
        type: "error",
        title: "Verification failed",
        message: requestError.response?.data?.message || "We could not verify that OTP.",
      });
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <ActionPopup
        open={Boolean(popup)}
        type={popup?.type}
        title={popup?.title}
        message={popup?.message}
        persistent={popup?.persistent}
        onClose={popup?.persistent ? undefined : () => setPopup(null)}
      />
      <form onSubmit={handleSubmit} className="panel grid gap-5 p-8 md:grid-cols-2">
        <div className="md:col-span-2">
          <h1 className="font-display text-3xl text-white">Enrollment Portal</h1>
          <p className="mt-2 text-sm text-slate-500">
            Reporter KYC and chief editor enrollment in one unified onboarding form.
          </p>
          {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
          {message ? <p className="mt-3 text-sm text-green-400">{message}</p> : null}
        </div>

        <input autoFocus className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" placeholder="Full name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
        <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <input
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
          placeholder="Phone number"
          inputMode="numeric"
          maxLength={10}
          value={form.phone}
          onChange={updateDigitsOnlyField("phone", 10)}
        />
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-white"
            placeholder="Password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-400 hover:text-white"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <select className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
          <option value="reporter">Reporter</option>
          <option value="chief_editor">Chief Editor</option>
        </select>
        <select className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white" value={form.district} onChange={(event) => setForm({ ...form, district: event.target.value })}>
          <option value="">Select district</option>
          {jharkhandDistricts.map((district) => (
            <option key={district} value={district}>{district}</option>
          ))}
        </select>

        {(isReporter || isChiefEditor) && (
          <>
            <select className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white" value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })}>
              <option value="">Select block / area</option>
              {blocks.map((block) => (
                <option key={block} value={block}>{block}</option>
              ))}
            </select>
            <input
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
              placeholder="Aadhaar Number"
              inputMode="numeric"
              maxLength={12}
              value={form.aadhaarNumber}
              onChange={updateDigitsOnlyField("aadhaarNumber", 12)}
            />
          </>
        )}

        {isReporter && (
          <>
            <div className="md:col-span-2">
              <ImagePicker
                label="Profile Photo"
                helpText="Upload a clear headshot for your reporter profile."
                value={form.profilePhotoUrl}
                onChange={(value) => setForm({ ...form, profilePhotoUrl: value })}
              />
            </div>
            <div className="md:col-span-2">
              <ImagePicker
                label="Aadhaar Image"
                helpText="Upload the ID image for KYC review."
                value={form.aadhaarImageUrl}
                onChange={(value) => setForm({ ...form, aadhaarImageUrl: value })}
              />
            </div>
          </>
        )}

        {isChiefEditor && (
          <div className="md:col-span-2">
            <WebcamCapture value={form.livePhotoUrl} onCapture={(value) => setForm({ ...form, livePhotoUrl: value })} />
          </div>
        )}

        {otpInfo ? (
          <div className="rounded-3xl border border-orange-400/30 bg-orange-500/10 p-5 md:col-span-2">
            <p className="text-sm font-semibold text-orange-200">Development OTP Preview</p>
            <p className="mt-1 text-sm text-slate-400">
              OTP for local testing: <span className="font-mono text-lg text-white">{otpInfo.otp}</span>
            </p>
            <div className="mt-4 flex flex-col gap-3 md:flex-row">
              <input
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
              />
              <button type="button" onClick={handleVerifyOtp} className="rounded-2xl bg-green-600 px-5 py-3 font-semibold text-white">
                Verify OTP
              </button>
            </div>
          </div>
        ) : null}

        <button disabled={submitting} className="rounded-2xl bg-orange-500 px-4 py-3 font-semibold text-white disabled:opacity-60 md:col-span-2">
          {submitting ? "Submitting..." : "Submit Enrollment"}
        </button>
        <div className="text-center text-sm text-slate-400 md:col-span-2">
          Already registered? <Link to="/login" className="font-semibold text-orange-300 transition hover:text-orange-200">Login</Link>
        </div>
      </form>
    </div>
  );
};
