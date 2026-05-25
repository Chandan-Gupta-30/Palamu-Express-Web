import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, X, User, Mail, Phone, Lock, Globe, MapPin, Award, ShieldCheck, CheckCircle, ArrowRight, ArrowLeft, BookOpen, Heart } from "lucide-react";
import { http } from "../api/http";
import { ImagePicker } from "../components/onboarding/ImagePicker";
import { WebcamCapture } from "../components/onboarding/WebcamCapture";
import { ActionPopup } from "../components/ui/ActionPopup";
import { jharkhandBlocksByDistrict, jharkhandDistricts } from "../data/districts";
import { TermsModal } from "../components/onboarding/TermsModal";

// Vertical Stepper Timeline Component
const TimelineStep = ({ num, title, desc, active, completed, isLast }) => {
  return (
    <div className="relative flex gap-4 pb-8 last:pb-0 group">
      {/* Connector Line */}
      {!isLast && (
        <div 
          className={`absolute left-[15px] top-8 bottom-0 w-0.5 -translate-x-1/2 transition-all duration-500 ${
            completed 
              ? "bg-gradient-to-b from-green-500 to-slate-800" 
              : active 
                ? "bg-gradient-to-b from-orange-500/50 to-slate-800/10" 
                : "bg-white/5"
          }`} 
        />
      )}
      
      {/* Stepper Bubble */}
      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300">
        {completed ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 border border-green-400 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)] transition-all duration-300 transform group-hover:scale-110">
            ✓
          </div>
        ) : active ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-600 border border-orange-400 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)] animate-[pulse_2.5s_infinite] transition-all duration-300 transform group-hover:scale-110">
            {num}
          </div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 border border-white/10 text-slate-500 transition-all duration-300 transform group-hover:scale-110 group-hover:border-white/20 group-hover:text-slate-400">
            {num}
          </div>
        )}
      </div>

      {/* Description Info */}
      <div className="flex flex-col justify-center">
        <h3 className={`text-sm font-semibold transition-all duration-300 ${
          completed 
            ? "text-green-400 font-bold" 
            : active 
              ? "text-orange-300 font-bold" 
              : "text-slate-500"
        }`}>
          {title}
        </h3>
        <p className="mt-0.5 text-[11px] text-slate-400 leading-normal">{desc}</p>
      </div>
    </div>
  );
};

// Premium Custom Input Field Component
const FormInput = ({ placeholder, value, onChange, maxLength, inputMode, icon, type = "text", disabled = false, error = false }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative group">
      {icon && (
        <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
          disabled 
            ? "text-slate-600" 
            : focused 
              ? "text-orange-400" 
              : "text-slate-500 group-hover:text-slate-400"
        }`}>
          {icon}
        </div>
      )}
      <input
        type={type}
        disabled={disabled}
        maxLength={maxLength}
        inputMode={inputMode}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`w-full rounded-2xl border bg-white/[0.03] py-3.5 text-white placeholder-slate-500 outline-none transition duration-300 ${
          disabled 
            ? "border-green-500/20 bg-green-500/[0.02] text-green-300 cursor-not-allowed opacity-80" 
            : error
              ? "border-red-500/50 ring-4 ring-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
              : focused 
                ? "border-orange-500/80 ring-4 ring-orange-500/10 shadow-[0_0_20px_rgba(249,115,22,0.15)] bg-slate-950/40" 
                : "border-white/10 hover:border-white/20"
        } ${icon ? "pl-11 pr-4" : "px-4"}`}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
};

// Premium Custom Dropdown Select Component
const FormSelect = ({ value, onChange, options, icon, placeholder, disabled = false, error = false }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative group">
      {icon && (
        <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
          disabled
            ? "text-slate-600"
            : focused 
              ? "text-orange-400" 
              : "text-slate-500 group-hover:text-slate-400"
        }`}>
          {icon}
        </div>
      )}
      <select
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        value={value}
        onChange={onChange}
        className={`w-full appearance-none rounded-2xl border bg-white/[0.03] py-3.5 pr-10 text-white outline-none transition duration-300 ${
          disabled
            ? "border-white/5 text-slate-500 cursor-not-allowed opacity-50"
            : error
              ? "border-red-500/50 ring-4 ring-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
              : focused 
                ? "border-orange-500/80 ring-4 ring-orange-500/10 shadow-[0_0_20px_rgba(249,115,22,0.15)] bg-slate-950/40" 
                : "border-white/10 hover:border-white/20"
        } ${icon ? "pl-11" : "px-4"} cursor-pointer`}
      >
        <option value="" className="bg-slate-950 text-slate-500">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-slate-950 text-slate-300">
            {opt.label}
          </option>
        ))}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-white transition-colors duration-300">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  );
};

// Premium Interactive Real-time Media Badge Mockup
const MediaBadgeMockup = ({ form }) => {
  return (
    <div className="relative mx-auto w-full max-w-[320px] rounded-3xl border border-white/10 bg-slate-900/40 p-5 shadow-2xl backdrop-blur-xl overflow-hidden group">
      {/* Decorative Orbs inside Badge */}
      <div className="absolute -right-12 -top-12 h-28 w-28 rounded-full bg-orange-500/10 blur-[20px] group-hover:scale-125 transition-transform duration-700 pointer-events-none" />
      <div className="absolute -left-12 -bottom-12 h-28 w-28 rounded-full bg-emerald-500/5 blur-[20px] group-hover:scale-125 transition-transform duration-700 pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div>
          <span className="text-[9px] font-extrabold uppercase tracking-[0.25em] text-orange-400">Palamu Express</span>
          <h4 className="text-[10px] font-bold text-slate-300 tracking-wider">MEDIA DIVISION</h4>
        </div>
        <div className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-orange-300 border border-orange-500/20">
          PRESS CARD
        </div>
      </div>

      {/* Main Avatar & info block */}
      <div className="mt-4 flex flex-col items-center">
        {/* Rounded avatar frame */}
        <div className="relative h-24 w-24 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 p-1 flex items-center justify-center">
          {form.profilePhotoUrl || form.livePhotoUrl ? (
            <img
              src={form.profilePhotoUrl || form.livePhotoUrl}
              alt="Official Badge headshot"
              className="h-full w-full rounded-xl object-contain bg-slate-950/20"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-xl bg-slate-900/50 text-slate-500">
              <User size={36} className="stroke-[1.5]" />
            </div>
          )}
          
          {/* Active status bubble */}
          <span className="absolute bottom-1 right-1 flex h-3 w-3 rounded-full border border-slate-950 bg-green-500">
            <span className="absolute inset-0 rounded-full bg-green-400 animate-ping" />
          </span>
        </div>

        {/* Text descriptions */}
        <h3 className="mt-3 text-base font-bold text-white tracking-wide text-center uppercase">
          {form.fullName || "FULL NAME HERE"}
        </h3>
        
        <span className={`mt-1 rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest ${
          form.role === "chief_editor" 
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" 
            : "bg-orange-500/10 text-orange-400 border border-orange-500/25"
        }`}>
          {form.role === "chief_editor" ? "CHIEF EDITOR DESK" : "NEWS REPORTER"}
        </span>

        {/* Card Metadata info list */}
        <div className="mt-4 w-full space-y-1.5 border-t border-dashed border-white/10 pt-3 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-500 uppercase tracking-wider text-[8px] font-semibold">Jurisdiction</span>
            <span className="font-semibold text-slate-300">
              {form.district ? `${form.area || "All Blocks"}, ${form.district}` : "Not Configured"}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-slate-500 uppercase tracking-wider text-[8px] font-semibold">Contact Node</span>
            <span className="font-mono text-slate-300">
              {form.phone ? `+91 ${form.phone.slice(0, 5)}-${form.phone.slice(5)}` : "Not Provided"}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500 uppercase tracking-wider text-[8px] font-semibold">Security Check</span>
            <span className="flex items-center gap-1 font-semibold text-green-400">
              <CheckCircle size={9} className="fill-green-500/10" /> KYC Verified
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-center text-[7px] font-extrabold tracking-[0.3em] text-slate-600 uppercase border-t border-white/5 pt-2">
        OFFICIAL MEDIA CREDENTIAL
      </div>
    </div>
  );
};

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
  bloodGroup: "O+",
  education: "",
  termsAccepted: false,
};

export const RegisterPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [activeStep, setActiveStep] = useState(1);
  const [inlineError, setInlineError] = useState("");
  const [popup, setPopup] = useState(null);
  
  // Email states
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
  const [verifyingEmailOtp, setVerifyingEmailOtp] = useState(false);
  
  // Form submission states
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const showPopup = (title, message) => {
    setPopup({ type: "error", title, message });
  };

  const validateStep1 = () => {
    if (!String(form.fullName || "").trim()) {
      return "Please enter your full name (matching your Aadhaar details).";
    }
    const phoneDigits = String(form.phone || "").replace(/\D/g, "");
    if (phoneDigits.length !== 10) {
      return "Please enter your valid 10-digit mobile number.";
    }
    if (!String(form.password || "").trim()) {
      return "Please set a secure account password.";
    }
    const emailValue = String(form.email || "").trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(emailValue)) {
      return "Please enter a valid email address.";
    }
    if (!isEmailVerified) {
      return "Please verify your email address via the secure OTP code before continuing.";
    }
    return "";
  };

  const validateStep2 = () => {
    if (!String(form.district || "").trim()) {
      return "Please select your Jharkhand jurisdiction district.";
    }
    
    const isRepOrEditor = form.role === "reporter" || form.role === "chief_editor";
    if (isRepOrEditor && !String(form.area || "").trim()) {
      return "Please choose your local Block / Area jurisdiction.";
    }
    
    if (isRepOrEditor && !String(form.aadhaarNumber || "").trim()) {
      return "Please enter your 12-digit Aadhaar identification number.";
    }
    
    if (isRepOrEditor) {
      const aadhaarDigits = String(form.aadhaarNumber || "").replace(/\D/g, "");
      if (aadhaarDigits.length !== 12) {
        return "The Aadhaar number entered must be exactly 12 digits.";
      }
      if (!String(form.bloodGroup || "").trim()) {
        return "Please select your Blood Group.";
      }
      if (!String(form.education || "").trim()) {
        return "Please enter your Educational Qualification details.";
      }
    }
    
    if (form.role === "reporter" && !String(form.profilePhotoUrl || "").trim()) {
      return "Please upload your professional profile headshot for the press badge.";
    }
    
    if (form.role === "reporter" && !String(form.aadhaarImageUrl || "").trim()) {
      return "Please upload your scanned Aadhaar card for KYC verification.";
    }
    
    if (form.role === "chief_editor" && !String(form.livePhotoUrl || "").trim()) {
      return "Please capture a live camera photo to proceed with editor registration.";
    }
    
    return "";
  };

  const handleNextStep = () => {
    setInlineError("");
    if (activeStep === 1) {
      const validationError = validateStep1();
      if (validationError) {
        setInlineError(validationError);
        return;
      }
      setActiveStep(2);
    } else if (activeStep === 2) {
      const validationError = validateStep2();
      if (validationError) {
        setInlineError(validationError);
        return;
      }
      setActiveStep(3);
    }
  };

  const handlePrevStep = () => {
    setInlineError("");
    if (activeStep > 1) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleSendEmailOtp = async () => {
    const emailValue = String(form.email || "").trim();
    if (!emailValue || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      setInlineError("Please enter a valid email address first.");
      return;
    }

    setSendingEmailOtp(true);
    setInlineError("");
    try {
      await http.post("/auth/send-email-otp", { email: emailValue });
      setEmailOtpSent(true);
      setPopup({
        type: "success",
        title: "OTP Code Dispatched",
        message: "A secure verification OTP code has been successfully dispatched to your email.",
      });
    } catch (requestError) {
      setInlineError(requestError.response?.data?.message || "Failed to dispatch email OTP");
      setPopup({
        type: "error",
        title: "Dispatch Failed",
        message: requestError.response?.data?.message || "Unable to send verification email.",
      });
    } finally {
      setSendingEmailOtp(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    const emailValue = String(form.email || "").trim();
    const otpValue = String(emailOtp || "").trim();
    if (otpValue.length !== 6) {
      setInlineError("Please enter the complete 6-digit verification code.");
      return;
    }

    setVerifyingEmailOtp(true);
    setInlineError("");
    try {
      await http.post("/auth/verify-email-otp", { email: emailValue, otp: otpValue });
      setIsEmailVerified(true);
      setEmailOtpSent(false);
      setPopup({
        type: "success",
        title: "Email Verified",
        message: "Your email address has been successfully verified! You can now proceed.",
      });
    } catch (requestError) {
      setInlineError(requestError.response?.data?.message || "Email verification failed");
      setPopup({
        type: "error",
        title: "Verification Failed",
        message: requestError.response?.data?.message || "The verification code entered was incorrect or expired.",
      });
    } finally {
      setVerifyingEmailOtp(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setInlineError("");
    
    const step1Err = validateStep1();
    if (step1Err) {
      setActiveStep(1);
      setInlineError(step1Err);
      return;
    }

    const step2Err = validateStep2();
    if (step2Err) {
      setActiveStep(2);
      setInlineError(step2Err);
      return;
    }

    if (!form.termsAccepted) {
      setInlineError("Please accept the Terms & Conditions before finalizing your enrollment.");
      return;
    }

    setSubmitting(true);
    setPopup({
      type: "loading",
      title: "Creating Credentials",
      message: "We are uploading your onboarding details, securing your credentials, and submitting your media registry account.",
      persistent: true,
    });

    try {
      await http.post("/auth/register", form);
      setPopup(null);
      setShowSuccessPopup(true);
      setTimeout(() => {
        setShowSuccessPopup(false);
        navigate("/login");
      }, 3500);
    } catch (requestError) {
      setInlineError(requestError.response?.data?.message || "Registration failed");
      setPopup({
        type: "error",
        title: "Enrollment failed",
        message: requestError.response?.data?.message || "Could not submit your onboarding details at this time.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isReporter = form.role === "reporter";
  const isChiefEditor = form.role === "chief_editor";
  const blocks = form.district ? jharkhandBlocksByDistrict[form.district] || [] : [];
  
  // Format block & district options
  const districtOptions = jharkhandDistricts.map(d => ({ label: d, value: d }));
  const blockOptions = blocks.map(b => ({ label: b, value: b }));

  return (
    <div className="relative mx-auto min-h-screen max-w-7xl px-4 py-12 flex items-center justify-center overflow-hidden">
      
      {/* Custom Styles and Transitions */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.85; }
        }
        
        /* Custom scrollbar for right side form card */
        .onboarding-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .onboarding-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .onboarding-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 99px;
        }
        .onboarding-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }
      `}</style>

      {/* Luxury Background Glow Elements */}
      <div className="pointer-events-none absolute -left-40 top-1/4 h-[400px] w-[400px] rounded-full bg-orange-600/10 blur-[120px] animate-[pulse_8s_infinite]" />
      <div className="pointer-events-none absolute -right-40 bottom-1/4 h-[400px] w-[400px] rounded-full bg-emerald-600/10 blur-[120px] animate-[pulse_10s_infinite_1s]" />

      <ActionPopup
        open={Boolean(popup)}
        type={popup?.type}
        title={popup?.title}
        message={popup?.message}
        persistent={popup?.persistent}
        onClose={popup?.persistent ? undefined : () => setPopup(null)}
      />

      {/* Main Console card container */}
      <div className="relative w-full grid gap-0 lg:grid-cols-[380px_1fr] overflow-hidden rounded-[36px] border border-white/10 bg-slate-950/60 backdrop-blur-xl shadow-[0_30px_100px_rgba(0,0,0,0.8)]">

        {/* Left Column: Stunning Premium Branding & Dynamic Stepper Tracker */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-orange-950/30 p-8 lg:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/10">
          
          {/* Subtle lighting overlay */}
          <div className="absolute -left-12 -top-12 h-56 w-56 rounded-full bg-orange-500/10 blur-[70px] pointer-events-none" />
          <div className="absolute -right-12 -bottom-12 h-56 w-56 rounded-full bg-emerald-500/5 blur-[70px] pointer-events-none" />

          <div className="relative space-y-8">
            <div>
              <span className="rounded-full bg-orange-500/10 border border-orange-500/20 px-3.5 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-orange-300">
                Palamu Express
              </span>
              <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight text-white md:text-4xl">
                Onboarding <br />
                <span className="bg-gradient-to-r from-orange-400 via-amber-200 to-white bg-clip-text text-transparent">
                  Portal
                </span>
              </h1>
              <p className="mt-3 text-xs leading-5 text-slate-400">
                Join Garhwa & Palamu&apos;s leading digital media network. Complete identity validation and setup your official newsroom credentials securely.
              </p>
            </div>

            {/* Stepper Timeline Box */}
            <div className="rounded-3xl border border-white/5 bg-white/[0.01] p-5 space-y-1">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-4">Registration Flow</p>

              <div className="flex flex-col">
                <TimelineStep
                  num="1"
                  title="Credentials Setup"
                  desc="Set identity, security details and verify secure Email OTP."
                  active={activeStep === 1}
                  completed={activeStep > 1}
                  isLast={false}
                />
                <TimelineStep
                  num="2"
                  title="Jurisdiction & KYC"
                  desc="Choose district, area and upload regulatory KYC credentials."
                  active={activeStep === 2}
                  completed={activeStep > 2}
                  isLast={false}
                />
                <TimelineStep
                  num="3"
                  title="Review & Agreement"
                  desc="Inspect live badge mock card, scroll and sign terms."
                  active={activeStep === 3}
                  completed={showSuccessPopup}
                  isLast={true}
                />
              </div>
            </div>
          </div>

          <div className="relative mt-8 border-t border-white/5 pt-5 text-[10px] text-slate-500 leading-normal">
            Security Notice: Palamu Express uses state of the art cryptography and secure storage to safeguard Aadhaar records and profile captures.
          </div>
        </div>

        {/* Right Column: Premium Form Body with Guided Wizard */}
        <div className="p-8 lg:p-12 overflow-y-auto max-h-[85vh] onboarding-scrollbar flex flex-col justify-between">
          <form onSubmit={handleSubmit} className="space-y-8 flex-1 flex flex-col justify-between">
            
            {/* Inline Error Notification Display */}
            {inlineError && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-semibold text-red-300 flex items-center gap-3 animate-fadeIn">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                <p>{inlineError}</p>
              </div>
            )}

            {/* STEP 1: Personal Details & Email OTP */}
            {activeStep === 1 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 flex items-center justify-center rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                      <ShieldCheck size={14} />
                    </div>
                    <h2 className="text-lg font-bold text-white tracking-wide">Step 1: Account Configuration</h2>
                  </div>
                  <p className="text-xs text-slate-400">Please enter your basic identity, secure password and verify your email.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormInput
                    placeholder="Full Name (Aadhaar Match)"
                    value={form.fullName}
                    onChange={(val) => setForm({ ...form, fullName: val })}
                    icon={<User size={16} />}
                  />
                  <FormInput
                    placeholder="Phone Number (10 Digits)"
                    value={form.phone}
                    onChange={(val) => setForm({ ...form, phone: val.replace(/\D/g, "").slice(0, 10) })}
                    maxLength={10}
                    inputMode="numeric"
                    icon={<Phone size={16} />}
                  />

                  {/* Password input with toggle icon */}
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-slate-400">
                      <Lock size={16} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.03] pl-11 pr-12 py-3.5 text-white placeholder-slate-500 outline-none transition duration-300 focus:border-orange-500/80 focus:ring-4 focus:ring-orange-500/10 focus:shadow-[0_0_20px_rgba(249,115,22,0.15)] focus:bg-slate-950/40"
                      placeholder="Security Password"
                      value={form.password}
                      onChange={(event) => setForm({ ...form, password: event.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-400 hover:text-white transition duration-200"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  <FormSelect
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    icon={<Award size={16} />}
                    placeholder="Onboarding Role"
                    options={[
                      { label: "News Reporter", value: "reporter" },
                      { label: "Chief Editor Desk", value: "chief_editor" }
                    ]}
                  />

                  {/* Email Address - Spans both columns to be perfectly vertically aligned with other inputs */}
                  <div className="sm:col-span-2 grid gap-3 sm:grid-cols-[1fr_auto]">
                    <div className="relative">
                      <FormInput
                        placeholder="Email Address"
                        value={form.email}
                        disabled={isEmailVerified}
                        onChange={(val) => setForm({ ...form, email: val })}
                        icon={<Mail size={16} />}
                      />
                      {isEmailVerified && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-400 text-sm font-bold flex items-center gap-1 select-none">
                          <CheckCircle size={14} className="fill-green-400/10" /> Verified
                        </span>
                      )}
                    </div>
                    {isEmailVerified ? (
                      <span className="inline-flex items-center justify-center gap-2 rounded-2xl bg-green-500/15 border border-green-500/25 px-6 py-3.5 text-xs font-bold text-green-300">
                        ✓ Linked
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={sendingEmailOtp}
                        onClick={handleSendEmailOtp}
                        className="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 disabled:opacity-60 transition duration-300 px-6 py-3.5 text-xs font-bold text-white shadow-md shadow-orange-950/20 shrink-0"
                      >
                        {sendingEmailOtp ? "Dispatching..." : emailOtpSent ? "Resend OTP" : "Verify Email"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Email Verification OTP Code Input Box */}
                {emailOtpSent && !isEmailVerified && (
                  <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 space-y-3.5 shadow-lg animate-fadeIn">
                    <div>
                      <p className="text-xs font-bold text-white">Enter Email Verification OTP</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        We dispatched a secure 6-digit OTP passcode to your email node: <strong className="text-slate-300">{form.email}</strong>.
                      </p>
                    </div>



                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white tracking-[0.4em] text-center font-mono text-base outline-none focus:border-orange-500/80 focus:ring-4 focus:ring-orange-500/10"
                        placeholder="000000"
                        maxLength={6}
                        value={emailOtp}
                        onChange={(event) => setEmailOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      />
                      <button
                        type="button"
                        disabled={verifyingEmailOtp}
                        onClick={handleVerifyEmailOtp}
                        className="rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-60 transition duration-300 px-6 py-3 text-xs font-bold text-white flex items-center justify-center min-w-[120px]"
                      >
                        {verifyingEmailOtp ? "Confirming..." : "Confirm OTP"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: Jurisdiction & KYC Media uploads */}
            {activeStep === 2 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 flex items-center justify-center rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                      <MapPin size={14} />
                    </div>
                    <h2 className="text-lg font-bold text-white tracking-wide">Step 2: Jurisdiction & Digital KYC</h2>
                  </div>
                  <p className="text-xs text-slate-400">Configure your block jurisdiction and upload identification documents.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormSelect
                    value={form.district}
                    onChange={(e) => setForm({ ...form, district: e.target.value, area: "" })}
                    icon={<Globe size={16} />}
                    placeholder="Select Jurisdiction District"
                    options={districtOptions}
                  />

                  {(isReporter || isChiefEditor) && (
                    <FormSelect
                      value={form.area}
                      onChange={(e) => setForm({ ...form, area: e.target.value })}
                      disabled={!form.district}
                      icon={<MapPin size={16} />}
                      placeholder={form.district ? "Select Block / Area" : "Select District First"}
                      options={blockOptions}
                    />
                  )}

                  {(isReporter || isChiefEditor) && (
                    <div className="sm:col-span-2">
                      <FormInput
                        placeholder="Aadhaar Card Number (12 Digits)"
                        value={form.aadhaarNumber}
                        onChange={(val) => setForm({ ...form, aadhaarNumber: val.replace(/\D/g, "").slice(0, 12) })}
                        maxLength={12}
                        inputMode="numeric"
                        icon={<ShieldCheck size={16} />}
                      />
                    </div>
                  )}

                  {(isReporter || isChiefEditor) && (
                    <>
                      <FormSelect
                        value={form.bloodGroup}
                        onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                        icon={<Heart size={16} />}
                        placeholder="Select Blood Group"
                        options={[
                          { label: "A+", value: "A+" },
                          { label: "A-", value: "A-" },
                          { label: "B+", value: "B+" },
                          { label: "B-", value: "B-" },
                          { label: "AB+", value: "AB+" },
                          { label: "AB-", value: "AB-" },
                          { label: "O+", value: "O+" },
                          { label: "O-", value: "O-" }
                        ]}
                      />
                      <FormInput
                        placeholder="Educational Qualification (e.g. Graduate, PG)"
                        value={form.education}
                        onChange={(val) => setForm({ ...form, education: val })}
                        icon={<BookOpen size={16} />}
                      />
                    </>
                  )}
                </div>

                {/* Upload elements with sleek containers */}
                {(isReporter || isChiefEditor) && (
                  <div className="space-y-4">
                    <div className="border-t border-white/5 pt-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Supporting Media Documents</h4>
                    </div>

                    {isReporter && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <ImagePicker
                          label="Badge Profile Photo"
                          helpText="Upload a professional corporate headshot."
                          value={form.profilePhotoUrl}
                          onChange={(val) => setForm({ ...form, profilePhotoUrl: val })}
                        />
                        <ImagePicker
                          label="Aadhaar Card KYC scan"
                          helpText="Upload a clean visual photo scan."
                          value={form.aadhaarImageUrl}
                          onChange={(val) => setForm({ ...form, aadhaarImageUrl: val })}
                        />
                      </div>
                    )}

                    {isChiefEditor && (
                      <WebcamCapture
                        value={form.livePhotoUrl}
                        onCapture={(val) => setForm({ ...form, livePhotoUrl: val })}
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Review summary & Signed digital agreement */}
            {activeStep === 3 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 flex items-center justify-center rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                      <CheckCircle size={14} />
                    </div>
                    <h2 className="text-lg font-bold text-white tracking-wide">Step 3: Review Press Badge & Submit</h2>
                  </div>
                  <p className="text-xs text-slate-400">Review your generated official press card mockup and digitally sign the agreement.</p>
                </div>

                {/* Real-time ID badge mockup block */}
                <div className="flex justify-center items-center py-4 bg-white/[0.01] rounded-3xl border border-white/5 shadow-inner">
                  <MediaBadgeMockup form={form} />
                </div>

                {/* Digital Scroll Sign Box */}
                <div className="space-y-4 border-t border-white/5 pt-4">
                  <div className="flex items-start gap-3.5 rounded-2xl bg-white/[0.01] p-4 border border-white/5 hover:bg-white/[0.02] hover:border-white/10 transition duration-300">
                    <input
                      id="termsAccepted"
                      type="checkbox"
                      checked={form.termsAccepted || false}
                      onChange={(event) => {
                        if (!form.termsAccepted) {
                          event.preventDefault();
                          setPopup({
                            type: "error",
                            title: "Agreement Signature Required",
                            message: "You must read and scroll to the bottom of the Terms & Conditions Agreement, then click 'I Understand' to accept and sign.",
                          });
                          setShowTermsModal(true);
                        } else {
                          setForm({ ...form, termsAccepted: false });
                        }
                      }}
                      className="mt-1 h-5 w-5 rounded border-white/10 bg-white/5 text-orange-500 focus:ring-orange-500/50 cursor-pointer"
                    />
                    <label htmlFor="termsAccepted" className="text-xs leading-5 text-slate-300 select-none cursor-pointer">
                      I certify that all details provided in my KYC applications are authentic. I agree to digital onboarding terms set by the{" "}
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        className="font-bold text-orange-400 hover:text-orange-300 underline transition"
                      >
                        Palamu Express Media Agreement
                      </button>
                      .
                    </label>
                  </div>
                </div>

                <TermsModal
                  open={showTermsModal}
                  onClose={() => setShowTermsModal(false)}
                  userName={form.fullName}
                  onAccept={() => {
                    setForm({ ...form, termsAccepted: true });
                    setInlineError("");
                  }}
                />
              </div>
            )}

            {/* Stepper Navigation Actions */}
            <div className="mt-8 border-t border-white/5 pt-6 flex items-center justify-between gap-4">
              {activeStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="rounded-2xl border border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.05] transition duration-300 px-6 py-3.5 text-xs font-bold text-white flex items-center gap-2"
                >
                  <ArrowLeft size={14} /> Back
                </button>
              ) : (
                <div />
              )}

              {activeStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="rounded-2xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 transition duration-300 px-8 py-3.5 text-xs font-extrabold text-white shadow-lg shadow-orange-950/20 flex items-center gap-2 ml-auto"
                >
                  Continue <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting || !form.termsAccepted}
                  className="rounded-2xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 disabled:from-orange-500/20 disabled:to-orange-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition duration-300 px-8 py-3.5 text-xs font-extrabold text-white shadow-xl shadow-orange-950/30 flex items-center gap-2 ml-auto"
                >
                  {submitting ? "Submitting Registry..." : "Finalize Onboarding"}
                </button>
              )}
            </div>

            <div className="mt-6 text-center text-xs text-slate-400">
              Already enrolled in Newsroom?{" "}
              <Link to="/login" className="font-bold text-orange-400 hover:text-orange-300 transition underline">
                Sign In
              </Link>
            </div>

          </form>
        </div>
      </div>

      {/* Stunning Custom SVG Success Circle Check overlay popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 px-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.12),rgba(15,23,42,0.98)_65%)] p-8 text-center shadow-[0_32px_100px_rgba(0,0,0,0.7)] animate-[fadeIn_0.5s_cubic-bezier(0.16,1,0.3,1)_forwards]">
            <div className="flex items-center justify-center p-4">
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-green-500/10 border border-green-500/20 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.15)] animate-[pulse_2.5s_infinite]">
                <svg className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" style={{ strokeDasharray: 50, strokeDashoffset: 50, animation: "drawCheck 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s forwards" }} />
                </svg>
              </div>
            </div>

            <h2 className="mt-4 font-display text-2xl font-black text-white">
              Enrollment Submitted!
            </h2>
            <p className="mt-3 text-xs leading-5 text-slate-400">
              Congratulations! Your Palamu Express digital onboarding profile has been submitted and verified. Your credentials will be reviewed by admin.
            </p>
            
            <div className="mt-6 flex justify-center items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-green-400">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-ping" />
              Directing to login screen...
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
