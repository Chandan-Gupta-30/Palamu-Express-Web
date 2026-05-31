import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, FilePlus2, FolderKanban, IdCard, KeyRound, Megaphone, Mic, X, LayoutDashboard, Users, UserCheck, Inbox, Settings, BookOpen, AlertCircle, Calendar, ShieldAlert, BadgeCheck, FileText, CheckSquare, Layers, Menu, Lock, LogOut, Home, Activity, TrendingUp, Share2, Phone, Mail, MapPin, Award, Globe, Droplet, GraduationCap, Trash2, UserX, ShieldCheck, Check, Edit3, Bell, BellOff, Sliders, ChevronLeft, ChevronRight, Plus, List, LayoutGrid, FileSpreadsheet, Download, Sun, Moon, Square, Upload, Newspaper, Play, Pause } from "lucide-react";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  Filler
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ChartTitle,
  Tooltip,
  Legend,
  Filler
);
import { AudioStoryPlayer } from "../components/audio/AudioStoryPlayer";
import { VoiceNewsComposer } from "../components/audio/VoiceNewsComposer";
import { AudioWaveform } from "../components/audio/AudioWaveform";
import { MetricCard } from "../components/dashboard/MetricCard";
import { IDCardPreview } from "../components/dashboard/IDCardPreview";
import { PublishedArchiveSection } from "../components/dashboard/PublishedArchiveSection";
import { ImagePicker } from "../components/onboarding/ImagePicker";
import { WebcamCapture } from "../components/onboarding/WebcamCapture";
import { ActionPopup } from "../components/ui/ActionPopup";
import { useAuth } from "../context/AuthContext";
import { http } from "../api/http";
import { io } from "socket.io-client";
import { runtimeConfig } from "../config/runtime";
import { jharkhandBlocksByDistrict, jharkhandDistricts, newsCategories, newsCategoryLabels } from "../data/districts";
import { getArticleAuthorName, getArticlePageUrl, getArticlePublishedLabel } from "../utils/articles";

const adPlacements = [
  { value: "homepage-hero", label: "Homepage Hero Rail", hint: "Shows near the top of the homepage beside the lead story." },
  { value: "homepage-latest", label: "Latest Updates Sponsor Grid", hint: "Appears between headline sections without breaking article flow." },
  { value: "homepage-district", label: "District Coverage Sponsor Strip", hint: "Shows lower on the homepage near district-wise coverage." },
  { value: "homepage-popup", label: "Homepage Premium Pop-up Ad", hint: "Ejects a beautiful premium backdrop-blurred pop-up ad upon homepage load." },
  { value: "in-article", label: "In-Article Sponsor Injection", hint: "Injects custom sponsor banners directly inside news articles." },
  { value: "promotional-article", label: "Promotional Launch Article", hint: "Creates a fully approved, premium article under Promotions & Launches." },
];

const adStatuses = [
  { value: "pending_payment", label: "Pending Payment" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "expired", label: "Expired" },
  { value: "rejected", label: "Rejected" },
];

const managedRoleOptions = [
  { value: "reporter", label: "Reporter" },
  { value: "chief_editor", label: "Chief Editor" },
];

const approvalOptions = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const contactStatusOptions = [
  { value: "all", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "in_progress", label: "In Progress" },
  { value: "unresolved", label: "Unresolved" },
  { value: "resolved", label: "Resolved" },
];

const initialArticleForm = {
  title: "",
  excerpt: "",
  content: "",
  district: "",
  area: "",
  panchayat: "",
  breaking: false,
  coverImageUrl: "",
  audioUrl: "",
  audioDuration: 0,
  audioWaveform: [],
  audioTranscript: "",
  category: "",
};

const initialAdForm = {
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
  amount: 1500,
  priority: 10,
  ctaLabel: "Visit Sponsor",
  notes: "",
  status: "active",
  promotionalContent: "",
  district: "Palamu",
  block: "Medininagar",
  targetDistricts: [],
  targetBlocks: [],
  timeTargeting: { startHour: 0, endHour: 24 },
};

const initialInArticleAdForm = {
  title: "",
  companyName: "",
  imageUrl: "",
  targetUrl: "",
  adPosition: "middle",
  paragraphIndex: 2,
  durationDays: 7,
  amount: 0,
  priority: 10,
  ctaLabel: "Visit Sponsor",
  description: "",
  notes: "",
  status: "active",
  articleId: "",
};

const initialManagedUserForm = {
  fullName: "",
  email: "",
  phone: "",
  district: "",
  area: "",
  role: "reporter",
  approvalStatus: "pending",
  isEmailVerified: false,
  isFunctionalityDisabled: false,
  profilePhotoUrl: "",
  aadhaarImageUrl: "",
  livePhotoUrl: "",
  validUpto: "",
  bloodGroup: "O+",
  education: "",
};

const initialCredentialForm = {
  fullName: "",
  email: "",
  phone: "",
  currentPassword: "",
  newPassword: "",
  confirmNewPassword: "",
  district: "",
  area: "",
  aadhaarNumber: "",
  bloodGroup: "O+",
  education: "",
  profilePhotoUrl: "",
  aadhaarImageUrl: "",
  livePhotoUrl: "",
};

const initialContactAdminForm = {
  status: "new",
  adminNote: "",
};

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getAdvertisementActivityDate = (ad) => ad.paidAt || ad.reviewedAt || ad.startsAt || ad.createdAt || "";
const getArticleViews = (article) => Number(article?.pageViews || 0).toLocaleString("en-IN");
const joinMetaParts = (...parts) => parts.filter(Boolean).join(" | ");

const getTodayDateString = () => new Date().toISOString().slice(0, 10);

const dedupeArticlesById = (articles) => {
  if (!Array.isArray(articles)) return [];
  const seen = new Set();

  return articles.filter((article) => {
    if (!article) return false;
    const id = article._id || article.slug;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const DetailRow = ({ label, value, valueClassName = "text-white" }) => (
  <div className="flex items-start justify-between gap-4 border-b border-white/5 py-3 last:border-b-0 last:pb-0">
    <span className="text-sm text-slate-500">{label}</span>
    <span className={`text-right text-sm ${valueClassName}`}>{value}</span>
  </div>
);

const ManagedImagePreview = ({ title, src, alt }) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
    <p className="text-sm font-semibold text-white">{title}</p>
    {src ? (
      <div className="mt-4 flex h-56 items-center justify-center overflow-hidden rounded-2xl bg-slate-950/40">
        <img src={src} alt={alt} className="h-full w-full object-contain" />
      </div>
    ) : (
      <div className="mt-4 flex h-56 items-center justify-center rounded-2xl border border-dashed border-white/15 text-sm text-slate-500">
        No image available
      </div>
    )}
  </div>
);

const ConfirmActionModal = ({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  busy = false,
  cancelLabel = "Cancel",
  kicker = "Confirm Action",
  showInput = false,
  inputValue = "",
  onInputChange,
  inputPlaceholder = "Provide detailed reason or feedback here...",
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-slate-950/95 p-6 shadow-[0_32px_80px_rgba(15,23,42,0.45)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-300">{kicker}</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close confirmation popup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-4 text-sm leading-7 text-slate-300">{description}</p>

        {showInput && (
          <div className="mt-4">
            <textarea
              className="w-full min-h-[100px] rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 placeholder-slate-500 transition duration-200 resize-none"
              placeholder={inputPlaceholder}
              value={inputValue}
              onChange={(e) => onInputChange && onInputChange(e.target.value)}
            />
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

let dashboardCache = null;
let dashboardCacheTimestamp = 0;
const DASHBOARD_CACHE_TTL = 15 * 1000; // Cache dashboard data for 15 seconds

export const DashboardPage = ({ darkMode, onToggleDarkMode }) => {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  
  const chartGridColor = darkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(15, 23, 42, 0.08)";
  const chartTicksColor = darkMode ? "rgba(148, 163, 184, 0.7)" : "#475569";
  const chartLegendColor = darkMode ? "#ffffff" : "#0f172a";
  const [metrics, setMetrics] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsSearch, setAnalyticsSearch] = useState("");
  const [analyticsSort, setAnalyticsSort] = useState("views-desc");
  const [analyticsAdSearch, setAnalyticsAdSearch] = useState("");
  const [analyticsAdTab, setAnalyticsAdTab] = useState("all");
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [profile, setProfile] = useState(null);
  const [reporterCardUrl, setReporterCardUrl] = useState("");
  const [myArticles, setMyArticles] = useState([]);
  const [myArticlesSearch, setMyArticlesSearch] = useState("");
  const [pendingUsers, setPendingUsers] = useState([]);
  const [managedUsers, setManagedUsers] = useState([]);
  const [pendingArticles, setPendingArticles] = useState([]);
  const [ads, setAds] = useState([]);
  const [articleForm, setArticleForm] = useState(initialArticleForm);
  const [articleErrors, setArticleErrors] = useState({});
  const [adForm, setAdForm] = useState(initialAdForm);
  const [feedbacks, setFeedbacks] = useState({});
  const [actionPopup, setActionPopup] = useState(null);
  const [editingArticleId, setEditingArticleId] = useState("");
  const [editingAdId, setEditingAdId] = useState("");
  const [editingManagedUserId, setEditingManagedUserId] = useState("");
  const [articleStatusFilter, setArticleStatusFilter] = useState("all");
  const [articlePage, setArticlePage] = useState(1);
  const [myArticlesPageSize, setMyArticlesPageSize] = useState(5);
  const [pendingUserSearch, setPendingUserSearch] = useState("");
  const [managedUserSearch, setManagedUserSearch] = useState("");
  const [selectedManagedUser, setSelectedManagedUser] = useState(null);
  const [selectedPendingUser, setSelectedPendingUser] = useState(null);
  const [managedUserStatusFilter, setManagedUserStatusFilter] = useState("all");
  const [pendingArticleSearch, setPendingArticleSearch] = useState("");
  const [pendingArticlePage, setPendingArticlePage] = useState(1);
  const [pendingArticlePageSize, setPendingArticlePageSize] = useState(5);
  const [expandedArticleId, setExpandedArticleId] = useState(null);
  const [contactMessages, setContactMessages] = useState([]);
  const [contactSearch, setContactSearch] = useState("");
  const [contactStatusFilter, setContactStatusFilter] = useState("all");
  const [editingContactId, setEditingContactId] = useState("");
  const [contactAdminForm, setContactAdminForm] = useState(initialContactAdminForm);
  const [publishedArchiveDate, setPublishedArchiveDate] = useState(getTodayDateString);
  const [publishedArchiveArticles, setPublishedArchiveArticles] = useState([]);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [showArchiveDeleteModal, setShowArchiveDeleteModal] = useState(false);
  const [pendingAdDelete, setPendingAdDelete] = useState(null);
  const [pendingAdPause, setPendingAdPause] = useState(null);
  const [pendingPauseAllAds, setPendingPauseAllAds] = useState(false);
  const [inspectingAd, setInspectingAd] = useState(null);
  const [pendingArchiveArticleDelete, setPendingArchiveArticleDelete] = useState(null);
  const [pendingManagedUserDelete, setPendingManagedUserDelete] = useState(null);
  const [pendingArticleDeleteId, setPendingArticleDeleteId] = useState(null);
  const [pendingContactMessageDeleteId, setPendingContactMessageDeleteId] = useState(null);
  const [pendingAdRejectId, setPendingAdRejectId] = useState(null);
  const [isCreatingAd, setIsCreatingAd] = useState(false);
  const [adDeskSubTab, setAdDeskSubTab] = useState("all");
  const [pendingAdApproveId, setPendingAdApproveId] = useState(null);
  const [pendingAdFormSubmit, setPendingAdFormSubmit] = useState(false);
  const [adErrors, setAdErrors] = useState({});
  const [pendingUserRejectId, setPendingUserRejectId] = useState(null);
  const [pendingArticleRejectId, setPendingArticleRejectId] = useState(null);
  const [showClearExpiryConfirm, setShowClearExpiryConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [managedUserForm, setManagedUserForm] = useState(initialManagedUserForm);
  const [credentialForm, setCredentialForm] = useState(initialCredentialForm);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [credentialBusy, setCredentialBusy] = useState(false);
  const [showCredentialForm, setShowCredentialForm] = useState(false);

  // OTP Verification States for Credentials Update
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [pendingCredentialPayload, setPendingCredentialPayload] = useState(null);
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);

  // Real-Time Notification System States
  const [notifications, setNotifications] = useState([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [globalNotifications, setGlobalNotifications] = useState([]);
  const [globalNotificationsLoading, setGlobalNotificationsLoading] = useState(false);
  const [adminNotificationForm, setAdminNotificationForm] = useState({
    recipientId: "all",
    title: "",
    message: "",
  });
  const [notificationBusy, setNotificationBusy] = useState(false);

  // Support Queries and clear all states
  const [supportQueries, setSupportQueries] = useState([]);
  const [supportQueriesLoading, setSupportQueriesLoading] = useState(false);
  const [supportQueryForm, setSupportQueryForm] = useState({ subject: "", message: "" });
  const [supportQueryErrors, setSupportQueryErrors] = useState({});
  const [supportQueriesBusy, setSupportQueriesBusy] = useState(false);
  const [showClearAllQueriesConfirm, setShowClearAllQueriesConfirm] = useState(false);

  const [showReporterDesk, setShowReporterDesk] = useState(false);
  const [showVoiceDesk, setShowVoiceDesk] = useState(false);
  const [showAdRequestsPanel, setShowAdRequestsPanel] = useState(false);
  const [adSearch, setAdSearch] = useState("");
  const [adStatusFilter, setAdStatusFilter] = useState("all");
  const [adPlacementFilter, setAdPlacementFilter] = useState("all");
  const [adDateFilter, setAdDateFilter] = useState("");
  const [adViewMode, setAdViewMode] = useState("table");
  const [globalIdCardExpiry, setGlobalIdCardExpiry] = useState("");
  const [globalExpiryForm, setGlobalExpiryForm] = useState("");
  const [adPricingHero, setAdPricingHero] = useState(699);
  const [adPricingLatest, setAdPricingLatest] = useState(499);
  const [adPricingDistrict, setAdPricingDistrict] = useState(299);
  const [adPricingPopup, setAdPricingPopup] = useState(999);
  const [adPricingInArticle, setAdPricingInArticle] = useState(199);
  const [adPricingPromotional, setAdPricingPromotional] = useState(199);
  const [popupDisplayMode, setPopupDisplayMode] = useState("weighted_random");
  const [popupLockedAdId, setPopupLockedAdId] = useState("");
  const [districtInput, setDistrictInput] = useState("Palamu");
  const [blockInput, setBlockInput] = useState("");
  const [inArticleSearch, setInArticleSearch] = useState("");
  const [selectedAdArticle, setSelectedAdArticle] = useState(null);
  const [showManageInArticleAdsModal, setShowManageInArticleAdsModal] = useState(false);
  const [inArticleAdForm, setInArticleAdForm] = useState(initialInArticleAdForm);
  const [editingInArticleAdId, setEditingInArticleAdId] = useState("");
  const [showInArticleAdCreateForm, setShowInArticleAdCreateForm] = useState(false);
  const [inArticleAdErrors, setInArticleAdErrors] = useState({});
  const [allArticles, setAllArticles] = useState([]);
  const [allArticlesLoading, setAllArticlesLoading] = useState(false);
  const [inArticlePage, setInArticlePage] = useState(1);
  const [inArticlePageSize, setInArticlePageSize] = useState(5);

  // Microphone voice re-recording states for editing voice news
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const recordingStartRef = useRef(0);

  // Staged audio states for previewing before replacing
  const [stagedAudioUrl, setStagedAudioUrl] = useState("");
  const [stagedAudioDuration, setStagedAudioDuration] = useState(0);
  const [stagedAudioWaveform, setStagedAudioWaveform] = useState([]);
  const [stagedAudioName, setStagedAudioName] = useState("");

  // Live wave analysis while recording
  const [recordingWaveform, setRecordingWaveform] = useState([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const animationFrameRef = useRef(0);

  const formatDuration = (secs) => {
    if (isNaN(secs) || secs === Infinity) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const beginRecordingWaveformMonitoring = (stream) => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceRef.current = source;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const sample = () => {
        if (!analyserRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        const sliceSize = Math.max(1, Math.floor(dataArray.length / 36));
        const nextWaveform = Array.from({ length: 36 }, (_, index) => {
          const start = index * sliceSize;
          const chunk = dataArray.slice(start, start + sliceSize);
          const average = chunk.reduce((sum, value) => sum + value, 0) / Math.max(chunk.length, 1);
          return Math.max(0.08, average / 255);
        });

        setRecordingWaveform(nextWaveform);
        animationFrameRef.current = requestAnimationFrame(sample);
      };

      sample();
    } catch (e) {
      console.error("Failed to start audio recording waveform analysis:", e);
    }
  };

  const stopRecordingWaveformMonitoring = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }

    sourceRef.current?.disconnect();
    analyserRef.current?.disconnect();
    sourceRef.current = null;
    analyserRef.current = null;

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
    }
    audioContextRef.current = null;
  };

  const startRecordingAudio = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setActionPopup({
        type: "error",
        title: "Not Supported",
        message: "Your browser does not support audio recording.",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";

      const mediaRecorder = new MediaRecorder(stream, preferredMimeType ? { mimeType: preferredMimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, {
          type: preferredMimeType || "audio/webm",
        });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result;
          const duration = (Date.now() - recordingStartRef.current) / 1000;
          const mockWaveform = Array.from({ length: 48 }, () => Math.max(0.1, Math.random()));

          setStagedAudioUrl(base64data);
          setStagedAudioDuration(duration);
          setStagedAudioWaveform(mockWaveform);
          setStagedAudioName(`Microphone Recording (${Math.round(duration)}s)`);

          setActionPopup({
            type: "success",
            title: "Recording Staged",
            message: "Your recorded audio is ready for preview. Review it below and click 'Apply' to replace the article's audio.",
          });
        };
        reader.readAsDataURL(blob);

        stream.getTracks().forEach((track) => track.stop());
        stopRecordingWaveformMonitoring();
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingTime(0);
      recordingStartRef.current = Date.now();
      setRecordingWaveform(Array(36).fill(0.08));
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((Date.now() - recordingStartRef.current) / 1000);
      }, 200);

      beginRecordingWaveformMonitoring(stream);

    } catch (err) {
      console.error(err);
      setActionPopup({
        type: "error",
        title: "Mic Access Denied",
        message: "Microphone access was denied. Please allow microphone permissions and try again.",
      });
    }
  };

  const stopRecordingAudio = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
  };

  const handleAudioFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      setActionPopup({
        type: "error",
        title: "Invalid File",
        message: "Please choose a valid audio file (MP3, WAV, M4A, WEBM, etc.).",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const tempAudio = new Audio(dataUrl);
      tempAudio.onloadedmetadata = () => {
        const fileDuration = tempAudio.duration || 0;
        const mockWaveform = Array.from({ length: 48 }, () => Math.max(0.1, Math.random()));

        setStagedAudioUrl(dataUrl);
        setStagedAudioDuration(fileDuration);
        setStagedAudioWaveform(mockWaveform);
        setStagedAudioName(file.name);

        setActionPopup({
          type: "success",
          title: "Audio Staged",
          message: `"${file.name}" loaded and staged for preview. Review it below and click 'Apply' to replace the article's audio.`,
        });
      };
      
      tempAudio.onerror = () => {
        const mockWaveform = Array.from({ length: 48 }, () => Math.max(0.1, Math.random()));
        setStagedAudioUrl(dataUrl);
        setStagedAudioDuration(0);
        setStagedAudioWaveform(mockWaveform);
        setStagedAudioName(file.name);
        
        setActionPopup({
          type: "success",
          title: "Audio Staged",
          message: `"${file.name}" loaded and staged (duration could not be read). Click 'Apply' to replace.`,
        });
      };
    };
    
    reader.readAsDataURL(file);
  };

  const applyStagedAudio = () => {
    if (!stagedAudioUrl) return;

    setArticleForm((current) => ({
      ...current,
      audioUrl: stagedAudioUrl,
      audioDuration: stagedAudioDuration,
      audioWaveform: stagedAudioWaveform,
    }));

    setStagedAudioUrl("");
    setStagedAudioDuration(0);
    setStagedAudioWaveform([]);
    setStagedAudioName("");

    setActionPopup({
      type: "success",
      title: "Audio Replaced",
      message: "The new recorded/uploaded audio has been successfully applied and has replaced the old audio.",
    });
  };

  const discardStagedAudio = () => {
    setStagedAudioUrl("");
    setStagedAudioDuration(0);
    setStagedAudioWaveform([]);
    setStagedAudioName("");

    setActionPopup({
      type: "info",
      title: "Changes Discarded",
      message: "The newly recorded/uploaded audio preview has been discarded. The original audio remains unchanged.",
    });
  };

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("dashboard_active_tab") || "overview";
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inboxSubTab, setInboxSubTab] = useState("public");
  const [showAdminQueriesDropdown, setShowAdminQueriesDropdown] = useState(false);

  const articleBlocks = useMemo(
    () => (articleForm.district ? jharkhandBlocksByDistrict[articleForm.district] || [] : []),
    [articleForm.district]
  );

  const selectedPlacement = useMemo(
    () => adPlacements.find((placement) => placement.value === adForm.placement),
    [adForm.placement]
  );
  const reviewableAds = useMemo(
    () => (ads || []).filter((ad) => ad && ad.paymentStatus === "paid" && ad.status === "pending_approval"),
    [ads]
  );
  const pendingAdRequestsCount = useMemo(
    () => reviewableAds.length,
    [reviewableAds]
  );
  const visibleManagedAds = useMemo(
    () =>
      (ads || []).filter((ad) => {
        if (!ad) return false;
        if (adPlacementFilter === "all") {
          if (ad.placement === "in-article") return false;
        } else {
          if (ad.placement !== adPlacementFilter) return false;
        }
        const matchesStatus = adStatusFilter === "all" || ad.status === adStatusFilter;
        const activityDateValue = getAdvertisementActivityDate(ad);
        const activityDate = activityDateValue ? new Date(activityDateValue).toISOString().slice(0, 10) : "";
        const matchesDate = !adDateFilter || activityDate === adDateFilter;
        const matchesSearch = [ad.title, ad.advertiserName, ad.companyName, ad.advertiserEmail, ad.advertiser?.email, ad.placement, ad.status]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes((adSearch || "").toLowerCase());

        return matchesStatus && matchesDate && matchesSearch;
      }),
    [ads, adDateFilter, adSearch, adStatusFilter, adPlacementFilter]
  );

  const unreadCount = useMemo(() => {
    return (notifications || []).filter((n) => n && !n.isRead).length;
  }, [notifications]);

  const unreadQueriesCount = useMemo(() => {
    return (contactMessages || []).filter((m) => m && (m.status === "new" || m.status === "unresolved")).length;
  }, [contactMessages]);

  const currentEditingMessage = useMemo(() => {
    return contactMessages.find((m) => m._id === editingContactId) || null;
  }, [contactMessages, editingContactId]);

  const isFunctionalityDisabled = Boolean(profile?.isFunctionalityDisabled);
  const canAccessNewsDesk = (user?.role === "super_admin" || (profile?.approvalStatus === "approved" && profile?.isEmailVerified)) && !isFunctionalityDisabled;
  const canAccessVoiceDesk = (user?.role === "super_admin" || canAccessNewsDesk) && !isFunctionalityDisabled;
  const showDashboardActions = user?.role === "reporter" || user?.role === "chief_editor" || user?.role === "super_admin";
  const showDisabledDashboardState =
    isFunctionalityDisabled && (user?.role === "reporter" || user?.role === "chief_editor");
  const showReporterCardAction = (user?.role === "reporter" || user?.role === "chief_editor") && reporterCardUrl;
  const uniqueMyArticles = useMemo(() => dedupeArticlesById(myArticles), [myArticles]);
  const uniquePendingArticles = useMemo(() => dedupeArticlesById(pendingArticles), [pendingArticles]);
  const filteredArticles = uniqueMyArticles.filter((article) => {
    if (!article) return false;
    const matchesStatus = articleStatusFilter === "all" || article.status === articleStatusFilter;
    const matchesSearch = !(myArticlesSearch || "").trim() || 
      (article.title || "").toLowerCase().includes(myArticlesSearch.toLowerCase()) || 
      (article.excerpt || "").toLowerCase().includes(myArticlesSearch.toLowerCase()) ||
      (article.district || "").toLowerCase().includes(myArticlesSearch.toLowerCase()) ||
      (article.area || "").toLowerCase().includes(myArticlesSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });
  const pagedArticles = filteredArticles.slice((articlePage - 1) * myArticlesPageSize, articlePage * myArticlesPageSize);
  const totalArticlePages = Math.max(1, Math.ceil(filteredArticles.length / myArticlesPageSize));
  const visiblePendingUsers = (pendingUsers || []).filter((pendingUser) =>
    pendingUser && [pendingUser.fullName, pendingUser.phone, pendingUser.district, pendingUser.area]
      .filter(Boolean)
      .map(val => String(val))
      .join(" ")
      .toLowerCase()
      .includes((pendingUserSearch || "").toLowerCase())
  );
  const visibleManagedUsers = (managedUsers || []).filter((managedUser) =>
    managedUser && (managedUserStatusFilter === "all" || managedUser.approvalStatus === managedUserStatusFilter) &&
    [managedUser.fullName, managedUser.phone, managedUser.email, managedUser.role, managedUser.district, managedUser.area, managedUser.approvalStatus]
      .filter(Boolean)
      .map(val => String(val))
      .join(" ")
      .toLowerCase()
      .includes((managedUserSearch || "").toLowerCase())
  );
  const visiblePendingArticles = uniquePendingArticles.filter((article) =>
    article && [article.title, article.district, article.area, article.author?.fullName]
      .filter(Boolean)
      .map(val => String(val))
      .join(" ")
      .toLowerCase()
      .includes((pendingArticleSearch || "").toLowerCase())
  );
  const totalPendingArticlePages = Math.ceil(visiblePendingArticles.length / pendingArticlePageSize) || 1;
  const pagedPendingArticles = useMemo(() => {
    const startIndex = (pendingArticlePage - 1) * pendingArticlePageSize;
    return visiblePendingArticles.slice(startIndex, startIndex + pendingArticlePageSize);
  }, [visiblePendingArticles, pendingArticlePage, pendingArticlePageSize]);
  const visibleContactMessages = (contactMessages || []).filter((message) => {
    if (!message) return false;
    const matchesSubTab = inboxSubTab === "journalist" ? Boolean(message.userId) : !message.userId;
    const matchesStatus = contactStatusFilter === "all" || message.status === contactStatusFilter;
    const matchesSearch = [message.fullName, message.email, message.phone, message.subject, message.message, message.status]
      .filter(Boolean)
      .map(val => String(val))
      .join(" ")
      .toLowerCase()
      .includes((contactSearch || "").toLowerCase());

    return matchesSubTab && matchesStatus && matchesSearch;
  });

  const handleAction = async (action, successMessage) => {
    setBusyAction(successMessage);
    setActionPopup({
      type: "loading",
      title: "Updating dashboard",
      message: "Please wait while we complete this newsroom action.",
      persistent: true,
    });
    try {
      await action();
      setActionPopup({
        type: "success",
        title: "Action completed",
        message: successMessage,
      });
    } catch (error) {
      setActionPopup({
        type: "error",
        title: "Action failed",
        message: error.response?.data?.message || "Action failed",
      });
    } finally {
      setBusyAction("");
    }
  };

  const handleActionWithProgress = async (action, successMessage, progressTitle = "Processing", progressMessage = "Please wait while we complete this action.", progressLabel = "Accredited Action Progress") => {
    setBusyAction(successMessage);
    
    // Set initial loading state with progress = 0
    setActionPopup({
      type: "loading",
      title: progressTitle,
      message: progressMessage,
      progress: 0,
      progressLabel,
      persistent: true,
    });

    let progressVal = 0;
    const interval = setInterval(() => {
      progressVal += Math.random() * 12 + 3;
      if (progressVal >= 90) {
        progressVal = 90;
        clearInterval(interval);
      }
      setActionPopup((prev) => prev ? { ...prev, progress: Math.min(progressVal, 90) } : null);
    }, 180);

    try {
      await action();
      clearInterval(interval);
      
      // Flash 100% complete
      setActionPopup({
        type: "loading",
        title: progressTitle,
        message: "Action completed successfully!",
        progress: 100,
        progressLabel: "Action Complete",
        persistent: true,
      });

      await new Promise((r) => setTimeout(r, 450));

      setActionPopup({
        type: "success",
        title: "Action completed",
        message: successMessage,
      });
    } catch (error) {
      clearInterval(interval);
      setActionPopup({
        type: "error",
        title: "Action failed",
        message: error.response?.data?.message || "Action failed",
      });
    } finally {
      setBusyAction("");
    }
  };

  const triggerPdfDownload = async (url, filename, documentLabel) => {
    await handleActionWithProgress(async () => {
      // Fetch the PDF file as a blob
      const response = await http.get(url, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/pdf" });
      
      // Create a temporary link to download the blob
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);
    }, 
    `${documentLabel} downloaded successfully.`, 
    "Generating Document",
    `Compiling registered office details, loading live verification QR codes, and rendering high-fidelity signatory credentials for ${documentLabel}...`,
    "PDF Rendering & Compiling"
    );
  };

  const openArticleFromDashboard = (article) => {
    if (!article?.slug) return;

    navigate(`/article/${article.slug}`, {
      state: {
        dashboardReturn: {
          path: "/dashboard",
          label: "Back to Dashboard",
        },
      },
    });
  };

  const refreshProfile = () => {
    http.get("/users/me").then(({ data }) => setProfile(data.user)).catch(() => {});
  };

  const downloadAdsCSVReport = () => {
    try {
      const headers = [
        "S.No",
        "Campaign Title",
        "Sponsor Brand",
        "Placement Slot",
        "Targeted Article",
        "Spot Position",
        "Amount (INR)",
        "Duration (Days)",
        "Impressions",
        "Clicks",
        "CTR (%)",
        "Status",
        "Launch Date"
      ];

      const csvRows = [headers.join(",")];

      ads.forEach((ad, index) => {
        const targetArticle = allArticles.find((art) => art._id === ad.articleId);
        const ctr = ad.viewsCount > 0 ? ((ad.clicksCount / ad.viewsCount) * 100).toFixed(2) : "0.00";
        const placementLabel = adPlacements.find((p) => p.value === ad.placement)?.label || ad.placement;
        const articleTitle = targetArticle ? targetArticle.title : ad.placement === "in-article" ? "All Articles" : "N/A";
        const spotPosition = ad.adPosition ? String(ad.adPosition).replaceAll("-", " ") : "N/A";
        const activityDate = getAdvertisementActivityDate(ad) ? new Date(getAdvertisementActivityDate(ad)).toLocaleDateString("en-IN") : "N/A";

        const escapeCSV = (str) => {
          if (str === null || str === undefined) return "";
          let val = String(str);
          if (val.includes(",") || val.includes('"') || val.includes("\n")) {
            val = val.replace(/"/g, '""');
            return `"${val}"`;
          }
          return val;
        };

        const row = [
          index + 1,
          escapeCSV(ad.title),
          escapeCSV(ad.companyName || "Sponsor Brand"),
          escapeCSV(placementLabel),
          escapeCSV(articleTitle),
          escapeCSV(spotPosition),
          ad.amount || 0,
          ad.durationDays || 0,
          ad.viewsCount || 0,
          ad.clicksCount || 0,
          `${ctr}%`,
          escapeCSV(ad.status),
          escapeCSV(activityDate)
        ];

        csvRows.push(row.join(","));
      });

      const csvContent = "\ufeff" + csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const today = new Date().toISOString().slice(0, 10);
      link.setAttribute("href", url);
      link.setAttribute("download", `Palamu_Express_Ads_Report_${today}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setActionPopup({
        type: "success",
        title: "Report Exported",
        message: "Successfully generated and downloaded overall ads CSV spreadsheet.",
      });
    } catch (err) {
      console.error(err);
      setActionPopup({
        type: "error",
        title: "Export Failed",
        message: "An error occurred while compiling the CSV dataset.",
      });
    }
  };

  const downloadAdsPDFReport = () => {
    try {
      const activeAdsCount = ads.filter((a) => a.status === "active").length;
      const totalAdBilling = ads.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      const totalImpressions = ads.reduce((sum, a) => sum + (a.viewsCount || 0), 0);
      const totalClicks = ads.reduce((sum, a) => sum + (a.clicksCount || 0), 0);
      const averageCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";

      // 1. Compute Campaigns Count by Placement
      const placementCounts = {
        "homepage-hero": 0,
        "homepage-latest": 0,
        "homepage-district": 0,
        "homepage-popup": 0,
        "in-article": 0,
        "promotional-article": 0,
        "other": 0
      };
      ads.forEach((ad) => {
        if (placementCounts[ad.placement] !== undefined) {
          placementCounts[ad.placement]++;
        } else {
          placementCounts.other++;
        }
      });
      const placementCountData = [
        { label: "Homepage Hero", value: placementCounts["homepage-hero"], color: "#f97316" },
        { label: "Homepage Latest", value: placementCounts["homepage-latest"], color: "#3b82f6" },
        { label: "Homepage District", value: placementCounts["homepage-district"], color: "#a855f7" },
        { label: "Homepage Popup", value: placementCounts["homepage-popup"], color: "#e11d48" },
        { label: "In-Article Injections", value: placementCounts["in-article"], color: "#10b981" },
        { label: "Promotional Articles", value: placementCounts["promotional-article"], color: "#ec4899" },
        { label: "Other Slots", value: placementCounts.other, color: "#64748b" }
      ];

      // 2. Compute Clicks Distribution by Placement
      const placementClicks = {
        "homepage-hero": 0,
        "homepage-latest": 0,
        "homepage-district": 0,
        "homepage-popup": 0,
        "in-article": 0,
        "promotional-article": 0,
        "other": 0
      };
      ads.forEach((ad) => {
        const clicks = Number(ad.clicksCount || 0);
        if (placementClicks[ad.placement] !== undefined) {
          placementClicks[ad.placement] += clicks;
        } else {
          placementClicks.other += clicks;
        }
      });
      const placementClicksData = [
        { label: "Homepage Hero", value: placementClicks["homepage-hero"], color: "#f97316" },
        { label: "Homepage Latest", value: placementClicks["homepage-latest"], color: "#3b82f6" },
        { label: "Homepage District", value: placementClicks["homepage-district"], color: "#a855f7" },
        { label: "Homepage Popup", value: placementClicks["homepage-popup"], color: "#e11d48" },
        { label: "In-Article Injections", value: placementClicks["in-article"], color: "#10b981" },
        { label: "Promotional Articles", value: placementClicks["promotional-article"], color: "#ec4899" },
        { label: "Other Slots", value: placementClicks.other, color: "#64748b" }
      ];

      // 3. Dynamic SVG Donut Generator Helper
      const generateSVGDonut = (chartTitle, dataList, displayTotal, unitText = "") => {
        const radiusVal = 50;
        const validSlices = dataList.filter((d) => d.value > 0);
        
        // Exact sum of active values for perfect coverage math
        const mathTotal = dataList.reduce((sum, d) => sum + (d.value || 0), 0);

        if (validSlices.length === 0 || mathTotal === 0) {
          return `
            <div style="border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; text-align: center; background-color: #f8fafc; flex: 1; min-height: 180px; display: flex; flex-direction: column; justify-content: center;">
              <h4 style="margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; font-weight: 700;">${chartTitle}</h4>
              <div style="color: #94a3b8; font-style: italic; font-size: 11px;">No active data recorded for this metrics scope.</div>
            </div>
          `;
        }

        let slicesMarkup = "";
        let legendMarkup = "";

        // If there's only 1 active slice, render it as a full circle
        if (validSlices.length === 1) {
          const slice = validSlices[0];
          slicesMarkup = `
            <circle
              cx="80"
              cy="80"
              r="${radiusVal}"
              fill="transparent"
              stroke="${slice.color}"
              stroke-width="15"
            />
          `;
          legendMarkup = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px; font-size: 10px;">
              <div style="display: flex; align-items: center; gap: 6px; text-align: left; max-width: 140px;">
                <svg width="10" height="10" style="flex-shrink: 0; display: inline-block; vertical-align: middle;"><circle cx="5" cy="5" r="4.5" fill="${slice.color}" /></svg>
                <span style="color: #475569; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${slice.label}</span>
              </div>
              <span style="color: #0f172a; font-weight: 700; font-family: sans-serif; white-space: nowrap; margin-left: 10px;">
                ${slice.value.toLocaleString("en-IN")}${unitText} 
                <span style="color: #64748b; font-weight: 400; font-size: 9px;">(100.0%)</span>
              </span>
            </div>
          `;
        } else {
          // Mathematically trace arcs
          let startAngle = -Math.PI / 2; // Start at 12 o'clock (-90 degrees)

          validSlices.forEach((slice) => {
            const slicePercent = slice.value / mathTotal;
            const angleDelta = slicePercent * 2 * Math.PI;
            const endAngle = startAngle + angleDelta;

            // Start coordinates
            const x1 = 80 + radiusVal * Math.cos(startAngle);
            const y1 = 80 + radiusVal * Math.sin(startAngle);

            // End coordinates
            const x2 = 80 + radiusVal * Math.cos(endAngle);
            const y2 = 80 + radiusVal * Math.sin(endAngle);

            // large arc flag
            const largeArcFlag = slicePercent > 0.5 ? 1 : 0;

            slicesMarkup += `
              <path
                d="M ${x1.toFixed(3)} ${y1.toFixed(3)} A ${radiusVal} ${radiusVal} 0 ${largeArcFlag} 1 ${x2.toFixed(3)} ${y2.toFixed(3)}"
                fill="none"
                stroke="${slice.color}"
                stroke-width="15"
              />
            `;

            const sharePercent = (slicePercent * 100).toFixed(1);
            legendMarkup += `
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px; font-size: 10px;">
                <div style="display: flex; align-items: center; gap: 6px; text-align: left; max-width: 140px;">
                  <svg width="10" height="10" style="flex-shrink: 0; display: inline-block; vertical-align: middle;"><circle cx="5" cy="5" r="4.5" fill="${slice.color}" /></svg>
                  <span style="color: #475569; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${slice.label}</span>
                </div>
                <span style="color: #0f172a; font-weight: 700; font-family: sans-serif; white-space: nowrap; margin-left: 10px;">
                  ${slice.value.toLocaleString("en-IN")}${unitText} 
                  <span style="color: #64748b; font-weight: 400; font-size: 9px;">(${sharePercent}%)</span>
                </span>
              </div>
            `;

            // Update start angle for next slice
            startAngle = endAngle;
          });
        }

        return `
          <div style="border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; background-color: #f8fafc; display: flex; align-items: center; gap: 20px; flex: 1; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div style="position: relative; width: 130px; height: 130px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
              <svg width="130" height="130" viewBox="0 0 160 160" style="transform: rotate(0deg);">
                <circle cx="80" cy="80" r="${radiusVal}" fill="transparent" stroke="#f1f5f9" stroke-width="15" />
                ${slicesMarkup}
              </svg>
              <div style="position: absolute; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
                <span style="font-size: 8px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">Total</span>
                <span style="font-size: 14px; font-weight: 800; color: #0f172a; font-family: sans-serif; margin-top: 1px;">${displayTotal.toLocaleString("en-IN")}</span>
              </div>
            </div>
            <div style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
              <h4 style="margin: 0 0 10px 0; font-size: 11px; text-transform: uppercase; color: #0f172a; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; letter-spacing: 0.03em; text-align: left;">${chartTitle}</h4>
              <div style="display: flex; flex-direction: column;">
                ${legendMarkup}
              </div>
            </div>
          </div>
        `;
      };

      const campaignsChartHTML = generateSVGDonut("Campaign Placements", placementCountData, ads.length, " Ads");
      const clicksChartHTML = generateSVGDonut("Clicks Distribution", placementClicksData, totalClicks);

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        setActionPopup({
          type: "error",
          title: "Popup Blocked",
          message: "Please allow popups to open and print the PDF report.",
        });
        return;
      }

      const today = new Date().toLocaleDateString("en-IN", {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      let overallTableRows = "";
      ads.forEach((ad, idx) => {
        const placementLabel = adPlacements.find((p) => p.value === ad.placement)?.label || ad.placement;
        const billing = Number(ad.amount || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" });
        const date = getAdvertisementActivityDate(ad) ? new Date(getAdvertisementActivityDate(ad)).toLocaleDateString("en-IN") : "N/A";
        
        overallTableRows += `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td style="font-weight: bold;">${ad.title}</td>
            <td>${ad.companyName || "Sponsor Brand"}</td>
            <td>${placementLabel}</td>
            <td style="text-align: right;">${billing}</td>
            <td style="text-align: center;">${ad.durationDays || 0} Days</td>
            <td style="text-align: center;">
              <span class="status-badge status-${ad.status}">${String(ad.status).replaceAll("_", " ")}</span>
            </td>
            <td style="text-align: center;">${date}</td>
          </tr>
        `;
      });

      let individualTableRows = "";
      let inArticleIdx = 1;
      ads.forEach((ad) => {
        const ctr = ad.viewsCount > 0 ? ((ad.clicksCount / ad.viewsCount) * 100).toFixed(2) : "0.00";
        const targetArticle = allArticles.find((art) => art._id === ad.articleId);
        const articleTitle = targetArticle ? targetArticle.title : ad.placement === "in-article" ? "All Articles (Broadcast)" : null;
        if (!articleTitle) return;

        const spotPosition = ad.adPosition ? String(ad.adPosition).replaceAll("-", " ") : "In-article Placement";

        individualTableRows += `
          <tr>
            <td style="text-align: center;">${inArticleIdx++}</td>
            <td style="font-weight: bold;">${ad.title}</td>
            <td>${ad.companyName || "Sponsor Brand"}</td>
            <td style="font-size: 11px;">${articleTitle}</td>
            <td style="text-align: center; text-transform: capitalize;">${spotPosition}</td>
            <td style="text-align: center; font-weight: bold;">${Number(ad.viewsCount || 0).toLocaleString("en-IN")}</td>
            <td style="text-align: center; font-weight: bold; color: #ea580c;">${Number(ad.clicksCount || 0).toLocaleString("en-IN")}</td>
            <td style="text-align: center; font-weight: bold; color: #059669;">${ctr}%</td>
            <td style="text-align: center;">
              <span class="status-badge status-${ad.status}">${ad.status}</span>
            </td>
          </tr>
        `;
      });

      if (!individualTableRows) {
        individualTableRows = `
          <tr>
            <td colspan="9" style="text-align: center; color: #64748b; font-style: italic; padding: 20px;">
              No individual targeted in-article campaigns mapped yet.
            </td>
          </tr>
        `;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Palamu Express - Ads Performance Report</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
            
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            
            body {
              font-family: 'Outfit', sans-serif;
              color: #0f172a;
              background-color: #ffffff;
              margin: 0;
              padding: 40px;
              font-size: 12px;
              line-height: 1.5;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            
            .header-container {
              border-bottom: 3px solid #f97316;
              padding-bottom: 20px;
              margin-bottom: 30px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            
            .brand-title {
              font-size: 26px;
              font-weight: 800;
              color: #0f172a;
              margin: 0;
              letter-spacing: -0.03em;
            }
            
            .brand-title span {
              color: #f97316;
            }
            
            .report-title {
              font-size: 16px;
              font-weight: 600;
              color: #475569;
              margin: 5px 0 0 0;
              text-transform: uppercase;
              letter-spacing: 0.1em;
            }
            
            .meta-info {
              text-align: right;
              font-size: 10px;
              color: #64748b;
            }
            
            .metrics-grid {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 15px;
              margin-bottom: 35px;
            }
            
            .metric-card {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 15px;
              background-color: #f8fafc;
              text-align: center;
            }
            
            .metric-label {
              font-size: 9px;
              font-weight: 700;
              text-transform: uppercase;
              color: #64748b;
              letter-spacing: 0.05em;
              display: block;
              margin-bottom: 5px;
            }
            
            .metric-value {
              font-size: 18px;
              font-weight: 700;
              color: #0f172a;
            }
            
            .section-heading {
              font-size: 14px;
              font-weight: 700;
              color: #0f172a;
              margin: 30px 0 15px 0;
              border-left: 4px solid #f97316;
              padding-left: 10px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
              font-size: 11px;
            }
            
            th {
              background-color: #0f172a;
              color: #ffffff;
              font-weight: 600;
              text-align: left;
              padding: 10px 12px;
              border: 1px solid #0f172a;
              text-transform: uppercase;
              font-size: 9px;
              letter-spacing: 0.05em;
            }
            
            td {
              padding: 10px 12px;
              border: 1px solid #e2e8f0;
              color: #334155;
            }
            
            tr:nth-child(even) {
              background-color: #f8fafc;
            }
            
            .status-badge {
              font-size: 8px;
              font-weight: 700;
              text-transform: uppercase;
              padding: 3px 8px;
              border-radius: 50px;
              display: inline-block;
            }
            
            .status-active {
              background-color: #dcfce7;
              color: #15803d;
            }
            
            .status-expired {
              background-color: #f1f5f9;
              color: #475569;
            }
            
            .status-pending_approval, .status-pending_payment {
              background-color: #fef9c3;
              color: #a16207;
            }
            
            .status-rejected {
              background-color: #fee2e2;
              color: #b91c1c;
            }
            
            .footer {
              margin-top: 50px;
              border-top: 1px solid #e2e8f0;
              padding-top: 15px;
              text-align: center;
              font-size: 9px;
              color: #94a3b8;
            }
            
            @media print {
              body {
                padding: 20px;
              }
              
              .no-print {
                display: none;
              }
              
              .page-break {
                page-break-before: always;
              }
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div>
              <h1 class="brand-title">PALAMU<span>EXPRESS</span></h1>
              <h2 class="report-title">Advertising Desk Performance Audit</h2>
            </div>
            <div class="meta-info">
              <div><strong>Generated On:</strong> ${today}</div>
              <div><strong>System Role:</strong> Platform Super Administrator</div>
              <div><strong>Scope:</strong> Global Marketing Analytics</div>
            </div>
          </div>
          
          <div class="metrics-grid">
            <div class="metric-card">
              <span class="metric-label">Total Ad Billings</span>
              <span class="metric-value" style="color: #16a34a;">Rs. ${totalAdBilling.toLocaleString("en-IN")}</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">Active Slots</span>
              <span class="metric-value" style="color: #2563eb;">${activeAdsCount} Live</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">Gross Impressions</span>
              <span class="metric-value">${totalImpressions.toLocaleString("en-IN")}</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">Total Clicks</span>
              <span class="metric-value" style="color: #ea580c;">${totalClicks.toLocaleString("en-IN")}</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">Average CTR</span>
              <span class="metric-value" style="color: #059669;">${averageCtr}%</span>
            </div>
          </div>
          
          <!-- Beautiful Visual Charts Dashboard Panel -->
          <div style="display: flex; gap: 20px; margin-bottom: 25px;">
            ${campaignsChartHTML}
            ${clicksChartHTML}
          </div>
          
          <h3 class="section-heading">1. Overall Campaigns Directory</h3>
          <table>
            <thead>
              <tr>
                <th style="width: 5%; text-align: center;">S.No</th>
                <th style="width: 25%;">Campaign Title</th>
                <th style="width: 15%;">Sponsor Brand</th>
                <th style="width: 15%;">Placement Slot</th>
                <th style="width: 15%; text-align: right;">Amount (INR)</th>
                <th style="width: 10%; text-align: center;">Duration</th>
                <th style="width: 10%; text-align: center;">Status</th>
                <th style="width: 10%; text-align: center;">Launch Date</th>
              </tr>
            </thead>
            <tbody>
              ${overallTableRows}
            </tbody>
          </table>
          
          <div class="page-break"></div>
          
          <div class="header-container" style="margin-top: 20px;">
            <div>
              <h1 class="brand-title" style="font-size: 20px;">PALAMU<span>EXPRESS</span></h1>
            </div>
            <div class="meta-info">
              <div>Ads Audit Report (Continued)</div>
            </div>
          </div>
          
          <h3 class="section-heading">2. Individual targeted In-Article Ads Performance</h3>
          <table>
            <thead>
              <tr>
                <th style="width: 5%; text-align: center;">S.No</th>
                <th style="width: 20%;">Campaign Title</th>
                <th style="width: 15%;">Brand</th>
                <th style="width: 25%;">Targeted Article Context</th>
                <th style="width: 15%; text-align: center;">Ad Spot Position</th>
                <th style="width: 10%; text-align: center;">Impressions</th>
                <th style="width: 10%; text-align: center;">Clicks</th>
                <th style="width: 8%; text-align: center;">CTR</th>
                <th style="width: 10%; text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${individualTableRows}
            </tbody>
          </table>
          
          <div class="footer">
            © ${new Date().getFullYear()} Palamu Express Administration Portal. Strictly Confidential. Page 2 of 2
          </div>
          
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();

      setActionPopup({
        type: "success",
        title: "Report Rendered",
        message: "PDF Report generated and browser print utility invoked.",
      });
    } catch (err) {
      console.error(err);
      setActionPopup({
        type: "error",
        title: "Print Failed",
        message: "An error occurred while compiling the PDF visual print node.",
      });
    }
  };

  const refreshDashboardPayload = async (force = false) => {
    const now = Date.now();
    const hasCache = Boolean(dashboardCache);

    if (hasCache) {
      const cached = dashboardCache;
      if (cached.metrics) setMetrics(cached.metrics);
      if (cached.pendingUsers) setPendingUsers(cached.pendingUsers);
      if (cached.pendingArticles) setPendingArticles(cached.pendingArticles);
      if (cached.managedUsers) setManagedUsers(cached.managedUsers);
      if (cached.ads) setAds(cached.ads);
      if (cached.contactMessages) setContactMessages(cached.contactMessages);
      if (cached.myArticles) setMyArticles(cached.myArticles);
      if (cached.publishedArchiveArticles) setPublishedArchiveArticles(cached.publishedArchiveArticles);
      if (cached.globalIdCardExpiry !== undefined) {
        setGlobalIdCardExpiry(cached.globalIdCardExpiry);
        setGlobalExpiryForm(cached.globalIdCardExpiry || "");
      }
      if (cached.popupDisplayMode !== undefined) setPopupDisplayMode(cached.popupDisplayMode);
      if (cached.popupLockedAdId !== undefined) setPopupLockedAdId(cached.popupLockedAdId);
      if (cached["adPricing_homepage-hero"] !== undefined) setAdPricingHero(cached["adPricing_homepage-hero"]);
      if (cached["adPricing_homepage-latest"] !== undefined) setAdPricingLatest(cached["adPricing_homepage-latest"]);
      if (cached["adPricing_homepage-district"] !== undefined) setAdPricingDistrict(cached["adPricing_homepage-district"]);
      if (cached["adPricing_homepage-popup"] !== undefined) setAdPricingPopup(cached["adPricing_homepage-popup"]);
      if (cached["adPricing_in-article"] !== undefined) setAdPricingInArticle(cached["adPricing_in-article"]);
      if (cached["adPricing_promotional-article"] !== undefined) setAdPricingPromotional(cached["adPricing_promotional-article"]);
      setIsInitialLoad(false);
    }

    const needsRefetch = force || !hasCache || (now - dashboardCacheTimestamp >= DASHBOARD_CACHE_TTL);

    if (!needsRefetch) {
      return;
    }

    if (!hasCache && isInitialLoad) {
      setDashboardLoading(true);
    }

    try {
      const { data } = await http.get("/admin/dashboard-payload");
      
      dashboardCache = data;
      dashboardCacheTimestamp = Date.now();

      if (data.metrics) setMetrics(data.metrics);
      if (data.pendingUsers) setPendingUsers(data.pendingUsers);
      if (data.pendingArticles) setPendingArticles(data.pendingArticles);
      if (data.managedUsers) setManagedUsers(data.managedUsers);
      if (data.ads) setAds(data.ads);
      if (data.contactMessages) setContactMessages(data.contactMessages);
      if (data.myArticles) setMyArticles(data.myArticles);
      if (data.publishedArchiveArticles) setPublishedArchiveArticles(data.publishedArchiveArticles);
      if (data.globalIdCardExpiry !== undefined) {
        setGlobalIdCardExpiry(data.globalIdCardExpiry);
        setGlobalExpiryForm(data.globalIdCardExpiry || "");
      }
      if (data.popupDisplayMode !== undefined) setPopupDisplayMode(data.popupDisplayMode);
      if (data.popupLockedAdId !== undefined) setPopupLockedAdId(data.popupLockedAdId);
      if (data["adPricing_homepage-hero"] !== undefined) setAdPricingHero(data["adPricing_homepage-hero"]);
      if (data["adPricing_homepage-latest"] !== undefined) setAdPricingLatest(data["adPricing_homepage-latest"]);
      if (data["adPricing_homepage-district"] !== undefined) setAdPricingDistrict(data["adPricing_homepage-district"]);
      if (data["adPricing_homepage-popup"] !== undefined) setAdPricingPopup(data["adPricing_homepage-popup"]);
      if (data["adPricing_in-article"] !== undefined) setAdPricingInArticle(data["adPricing_in-article"]);
      if (data["adPricing_promotional-article"] !== undefined) setAdPricingPromotional(data["adPricing_promotional-article"]);
      setIsInitialLoad(false);
    } catch (err) {
      console.error("Failed to load dashboard payload:", err);
    } finally {
      setDashboardLoading(false);
    }
  };

  const refreshMyArticles = () => refreshDashboardPayload(true);
  const refreshEditorialQueue = () => refreshDashboardPayload(true);
  const refreshChiefMetrics = () => refreshDashboardPayload(true);
  const refreshAdminData = () => refreshDashboardPayload(true);

  const refreshPublishedArchive = (dateValue = publishedArchiveDate) => {
    if (!dateValue || !user || !["super_admin", "chief_editor"].includes(user.role)) {
      setPublishedArchiveArticles([]);
      return;
    }

    http
      .get("/articles/published/archive", { params: { date: dateValue } })
      .then(({ data }) => setPublishedArchiveArticles(data.articles))
      .catch(() => setPublishedArchiveArticles([]));
  };

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const { data } = await http.get("/analytics");
      setAnalytics(data);
    } catch (err) {
      console.error("Failed to load analytics payload:", err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchAllArticles = async () => {
    setAllArticlesLoading(true);
    try {
      const { data } = await http.get("/articles?status=all");
      setAllArticles(data.articles || []);
    } catch (err) {
      console.error("Failed to fetch all articles for ad placements:", err);
    } finally {
      setAllArticlesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "ad_desk" && adDeskSubTab === "in_article" && user?.role === "super_admin") {
      fetchAllArticles();
    }
  }, [activeTab, adDeskSubTab, user]);

  const syncManagedUserState = (updatedUser) => {
    if (!updatedUser?._id) return;

    setManagedUsers((current) =>
      current.map((managedUser) => (managedUser._id === updatedUser._id ? updatedUser : managedUser))
    );
    setPendingUsers((current) => {
      if (updatedUser.approvalStatus !== "pending") {
        return current.filter((pendingUser) => pendingUser._id !== updatedUser._id);
      }
      return current.map((pendingUser) => (pendingUser._id === updatedUser._id ? updatedUser : pendingUser));
    });
    setProfile((current) => (current?._id === updatedUser._id ? updatedUser : current));
  };

  useEffect(() => {
    if (!user) return;

    refreshProfile();
    refreshDashboardPayload();
    fetchNotifications();
    if (user.role === "super_admin") {
      fetchGlobalNotifications();
    }

    if (user.role === "reporter" || user.role === "chief_editor") {
      fetchMyQueries();
      http.get("/users/id-card").then(({ data }) => setReporterCardUrl(data.idCardUrl)).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    const dailyRate = (() => {
      switch (adForm.placement) {
        case "homepage-hero": return Number(adPricingHero);
        case "homepage-latest": return Number(adPricingLatest);
        case "homepage-district": return Number(adPricingDistrict);
        case "homepage-popup": return Number(adPricingPopup);
        case "in-article": return Number(adPricingInArticle);
        case "promotional-article": return Number(adPricingPromotional);
        default: return 0;
      }
    })();
    const duration = Number(adForm.durationDays || 0);
    setAdForm((prev) => ({
      ...prev,
      amount: dailyRate * duration
    }));
  }, [
    adForm.placement,
    adForm.durationDays,
    adPricingHero,
    adPricingLatest,
    adPricingDistrict,
    adPricingPopup,
    adPricingInArticle,
    adPricingPromotional
  ]);

  useEffect(() => {
    const dailyRate = Number(adPricingInArticle || 0);
    const duration = Number(inArticleAdForm.durationDays || 0);
    setInArticleAdForm((prev) => ({
      ...prev,
      amount: dailyRate * duration
    }));
  }, [inArticleAdForm.durationDays, adPricingInArticle]);

  useEffect(() => {
    localStorage.setItem("dashboard_active_tab", activeTab);
    if (activeTab !== "write_news" && activeTab !== "credentials") {
      localStorage.setItem("dashboard_prev_active_tab", activeTab);
    }
    if (activeTab === "credentials") {
      resetCredentialForm();
    }
  }, [activeTab]);

  // Polling and Live socket subscription for the real-time Notification system
  useEffect(() => {
    if (!user) return undefined;

    // Polling interval every 20 seconds
    const pollInterval = setInterval(() => {
      fetchNotifications();
      if (user.role === "super_admin") {
        fetchGlobalNotifications();
      }
    }, 20000);

    // Live Socket connections
    const token = localStorage.getItem("portal_token");
    const socket = io(runtimeConfig.socketUrl, {
      auth: { token }
    });

    socket.on("notification:received", (payload) => {
      const isRelevant = 
        payload.notification.userId === "all" || 
        payload.notification.userId === user._id;

      if (isRelevant) {
        fetchNotifications();
        setActionPopup({
          type: "success",
          title: `New Alert: ${payload.notification.title}`,
          message: payload.notification.message,
        });
      }
    });

    socket.on("notification:deleted", () => {
      fetchNotifications();
      if (user.role === "super_admin") {
        fetchGlobalNotifications();
      }
    });

    socket.on("notification:refresh", () => {
      fetchNotifications();
      if (user.role === "super_admin") {
        fetchGlobalNotifications();
      }
    });

    socket.on("query:updated", (payload) => {
      if (user?.role === "reporter" || user?.role === "chief_editor") {
        fetchMyQueries();
      }
      if (user?.role === "super_admin") {
        refreshDashboardPayload(true);
      }
    });

    socket.on("ad:live-update", (payload) => {
      setAds((currentAds) => {
        if (!currentAds) return [];
        return currentAds.map((ad) => {
          if (ad._id === payload.adId) {
            return {
              ...ad,
              viewsCount: payload.viewsCount,
              clicksCount: payload.clicksCount,
            };
          }
          return ad;
        });
      });
    });

    socket.on("ad:status-update", (payload) => {
      setAds((currentAds) => {
        if (!currentAds) return [];
        return currentAds.map((ad) => {
          if (ad._id === payload.adId) {
            return {
              ...ad,
              status: payload.status,
              startsAt: payload.startsAt,
              endsAt: payload.endsAt,
            };
          }
          return ad;
        });
      });
    });

    return () => {
      clearInterval(pollInterval);
      socket.disconnect();
    };
  }, [user?._id]);

  useEffect(() => {
    if (!user || !["super_admin", "chief_editor"].includes(user.role)) return;
    refreshPublishedArchive(publishedArchiveDate);
  }, [publishedArchiveDate, user]);

  useEffect(() => {
    if (!profile) return;

    setCredentialForm((current) => ({
      ...current,
      fullName: profile.fullName || "",
      email: profile.email || "",
      phone: profile.phone || "",
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    }));
  }, [profile]);

  // Effect to manage 60-second OTP resend countdown
  useEffect(() => {
    let timer;
    if (showOtpModal && resendCountdown > 0) {
      timer = setTimeout(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [showOtpModal, resendCountdown]);

  useEffect(() => {
    if (activeTab === "analytics") {
      fetchAnalytics();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "analytics") return undefined;

    const token = localStorage.getItem("portal_token");
    const socket = io(runtimeConfig.socketUrl, {
      auth: { token }
    });

    socket.emit("analytics:subscribe");

    socket.on("analytics:traffic-update", (payload) => {
      setAnalytics((current) => {
        if (!current) return current;
        return {
          ...current,
          liveVisitors: payload.liveVisitors
        };
      });
    });

    socket.on("analytics:live-update", (payload) => {
      setAnalytics((current) => {
        if (!current) return current;

        // Verify reporter matches authorId if caller is reporter
        if (user?.role === "reporter" && payload.authorId !== user._id) {
          return current;
        }

        let totalViewsDelta = 0;
        let totalSharesDelta = 0;

        const updatedArticles = current.topArticles.map((art) => {
          if (art.slug === payload.slug) {
            if (payload.pageViews !== undefined) {
              totalViewsDelta = payload.pageViews - (art.pageViews || 0);
              return { ...art, pageViews: payload.pageViews };
            }
            if (payload.shareCount !== undefined) {
              totalSharesDelta = payload.shareCount - (art.shareCount || 0);
              return { ...art, shareCount: payload.shareCount };
            }
          }
          return art;
        });

        return {
          ...current,
          totalViews: current.totalViews + totalViewsDelta,
          totalShares: current.totalShares + totalSharesDelta,
          topArticles: updatedArticles
        };
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [activeTab, user?._id]);

  const sortedArticleAnalytics = useMemo(() => {
    if (!analytics?.topArticles) return [];
    
    // Filter
    let items = analytics.topArticles.filter((art) =>
      art.title.toLowerCase().includes(analyticsSearch.toLowerCase())
    );

    // Sort
    items.sort((a, b) => {
      const aViews = a.pageViews || 0;
      const bViews = b.pageViews || 0;
      const aShares = a.shareCount || 0;
      const bShares = b.shareCount || 0;
      const aIndex = aViews * 1 + aShares * 3;
      const bIndex = bViews * 1 + bShares * 3;

      if (analyticsSort === "views-desc") return bViews - aViews;
      if (analyticsSort === "views-asc") return aViews - bViews;
      if (analyticsSort === "shares-desc") return bShares - aShares;
      if (analyticsSort === "index-desc") return bIndex - aIndex;
      return 0;
    });

    return items;
  }, [analytics, analyticsSearch, analyticsSort]);

  const cards = useMemo(() => {
    if (user?.role === "reporter") {
      return [
        { label: "My Stories", value: uniqueMyArticles.length, hint: "Draft, pending, rejected, and published" },
        { label: "Verification", value: canAccessNewsDesk ? "Ready" : "Locked", hint: "Desk unlocks after approval and phone verification" },
        { label: "Reporter Card", value: reporterCardUrl ? "Available" : "Pending", hint: "Generated automatically for approved reporters" },
      ];
    }

    if (user?.role === "chief_editor") {
      return [
        { label: "My Stories", value: uniqueMyArticles.length, hint: "Draft, pending, rejected, and published" },
        { label: "Verification", value: canAccessNewsDesk ? "Ready" : "Locked", hint: "Desk unlocks after approval and phone verification" },
        { label: "Pending News", value: pendingArticles.length, hint: "Reporter stories waiting for editorial action" },
        { label: "Chief Editor Card", value: reporterCardUrl ? "Available" : "Pending", hint: "Generated automatically for approved chief editors" },
      ];
    }

    if (user?.role === "super_admin") {
      const m = metrics || {
        users: 0,
        pendingUsers: 0,
        pendingArticles: 0,
        publishedArticles: 0,
        activeAds: 0,
        contactMessages: 0,
        newContactMessages: 0,
      };

      return [
        { label: "Users", value: m.users, hint: "All registered accounts" },
        { label: "Pending Users", value: m.pendingUsers, hint: "Reporter approvals waiting" },
        { label: "Pending News", value: m.pendingArticles, hint: "Stories waiting for publication" },
        { label: "Published News", value: m.publishedArticles, hint: "Live Palamu Express stories" },
        { label: "Active Ads", value: m.activeAds, hint: "Currently visible sponsored placements" },
        { label: "Pending Ads", value: pendingAdRequestsCount, hint: "Sponsor requests waiting review" },
        { label: "Contact Requests", value: contactMessages.length, hint: "Total support messages" },
        { label: "New Messages", value: unreadQueriesCount, hint: "Unread support messages" },
      ];
    }

    return [];
  }, [
    user?.role,
    uniqueMyArticles.length,
    canAccessNewsDesk,
    reporterCardUrl,
    pendingArticles.length,
    metrics,
    pendingAdRequestsCount,
    contactMessages.length,
    unreadQueriesCount,
  ]);

  const resetArticleForm = () => {
    setArticleForm(initialArticleForm);
    setEditingArticleId("");
    setArticleErrors({});
    setStagedAudioUrl("");
    setStagedAudioDuration(0);
    setStagedAudioWaveform([]);
    setStagedAudioName("");
    setRecordingWaveform([]);
  };

  const resetAdForm = () => {
    setAdForm(initialAdForm);
    setEditingAdId("");
    setIsCreatingAd(false);
    setAdErrors({});
  };

  const resetManagedUserForm = () => {
    setManagedUserForm(initialManagedUserForm);
    setEditingManagedUserId("");
  };

  const resetContactAdminForm = () => {
    setContactAdminForm(initialContactAdminForm);
    setEditingContactId("");
  };

  function resetCredentialForm() {
    setCredentialForm({
      fullName: profile?.fullName || "",
      email: profile?.email || "",
      phone: profile?.phone || "",
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
      district: profile?.district || "",
      area: profile?.area || "",
      aadhaarNumber: profile?.aadhaarNumber || "",
      bloodGroup: profile?.bloodGroup || "O+",
      education: profile?.education || "",
      profilePhotoUrl: profile?.profilePhotoUrl || "",
      aadhaarImageUrl: profile?.aadhaarImageUrl || "",
      livePhotoUrl: profile?.livePhotoUrl || "",
    });
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  }

  const openCredentialForm = () => {
    setActiveTab("credentials");
  };

  const closeCredentialForm = () => {
    const prevTab = localStorage.getItem("dashboard_prev_active_tab") || "overview";
    setActiveTab(prevTab);
    resetCredentialForm();
  };

  const openReporterDesk = () => {
    setActiveTab("write_news");
  };

  const closeReporterDesk = () => {
    const prevTab = localStorage.getItem("dashboard_prev_active_tab") || "overview";
    setActiveTab(prevTab);
    resetArticleForm();
  };

  const openVoiceDesk = () => {
    setShowVoiceDesk(true);
  };

  const closeVoiceDesk = () => {
    setShowVoiceDesk(false);
  };

  const submitArticle = async (event) => {
    event.preventDefault();

    const errors = {};
    if (!String(articleForm.title || "").trim()) {
      errors.title = true;
    }
    if (!String(articleForm.district || "").trim()) {
      errors.district = true;
    }
    if (articleBlocks.length > 0 && !String(articleForm.area || "").trim()) {
      errors.area = true;
    }
    if (!String(articleForm.excerpt || "").trim()) {
      errors.excerpt = true;
    }
    if (!String(articleForm.content || "").trim()) {
      errors.content = true;
    }
    if (!String(articleForm.coverImageUrl || "").trim()) {
      errors.coverImageUrl = true;
    }
    if (!String(articleForm.category || "").trim()) {
      errors.category = true;
    }

    if (Object.keys(errors).length > 0) {
      setArticleErrors(errors);
      setActionPopup({
        type: "error",
        title: "Submission Blocked",
        message: "Please fill out all the highlighted article fields correctly, including the headline, jurisdiction district/block, short excerpt, full news content, and cover image scan, before submitting.",
      });
      return;
    }

    setArticleErrors({});
    await handleActionWithProgress(async () => {
      if (editingArticleId) {
        await http.patch(`/articles/${editingArticleId}`, articleForm);
      } else {
        await http.post("/articles", articleForm);
      }
      resetArticleForm();
      refreshMyArticles();
      if (user?.role === "chief_editor" || user?.role === "super_admin") {
        refreshEditorialQueue();
      }
      if (user?.role === "chief_editor") {
        refreshChiefMetrics();
        refreshPublishedArchive();
      }
      if (user?.role === "super_admin") {
        refreshAdminData();
        refreshPublishedArchive();
      }
      const prevTab = localStorage.getItem("dashboard_prev_active_tab") || "my_stories";
      setActiveTab(prevTab);
    }, editingArticleId
      ? user?.role === "chief_editor"
        ? "Published article updated successfully."
        : "Article updated and returned to review queue."
      : user?.role === "chief_editor"
        ? "News published to homepage."
        : user?.role === "super_admin"
          ? "News published to homepage."
          : "News submitted for editorial review.",
    editingArticleId ? "Updating News Article" : "Publishing News Article",
    editingArticleId
      ? "Saving editorial updates, rebuilding dynamic cache parameters, and pushing live sync blocks to the Palamu Express content feed..."
      : "Uploading media assets, indexing news block meta tags, generating AI summary pipelines, and pushing live news to the Palamu Express content feed...",
    "Editorial Publishing Pipeline"
    );
  };

  const handleVoiceNewsSubmitted = () => {
    if (user?.role === "reporter" || user?.role === "chief_editor" || user?.role === "super_admin") {
      refreshMyArticles();
    }

    if (user?.role === "super_admin") {
      refreshAdminData();
    }

    if (user?.role === "chief_editor") {
      refreshEditorialQueue();
      refreshChiefMetrics();
      refreshPublishedArchive();
    }

    if (user?.role === "super_admin") {
      refreshPublishedArchive();
    }

    setActionPopup({
      type: "success",
      title: "Voice news ready",
      message:
        user?.role === "reporter"
          ? "Voice news submitted for editorial review."
          : "Voice news published successfully.",
    });
  };

  const startEditArticle = (article) => {
    setActiveTab("write_news");
    setEditingArticleId(article._id);
    setArticleErrors({});
    setArticleForm({
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      district: article.district,
      area: article.area,
      panchayat: article.panchayat || "",
      breaking: article.breaking,
      coverImageUrl: article.coverImageUrl || "",
      audioUrl: article.audioUrl || "",
      audioDuration: article.audioDuration || 0,
      audioWaveform: article.audioWaveform || [],
      audioTranscript: article.audioTranscript || "",
      category: article.category || "",
    });
  };

  const deleteArticle = (articleId) => {
    setPendingArticleDeleteId(articleId);
  };

  const confirmDeleteArticle = async () => {
    if (!pendingArticleDeleteId) return;
    const targetId = pendingArticleDeleteId;
    setPendingArticleDeleteId(null);
    await handleAction(async () => {
      await http.delete(`/articles/${targetId}`);
      refreshMyArticles();
    }, "Article deleted.");
  };

  const copyArticleLink = async (article) => {
    const articleUrl = getArticlePageUrl(article.slug);

    try {
      await navigator.clipboard.writeText(articleUrl);
      setActionPopup({
        type: "success",
        title: "Link copied",
        message: "The article link has been copied to your clipboard.",
      });
    } catch (_) {
      setActionPopup({
        type: "error",
        title: "Copy failed",
        message: "We could not copy the article link right now.",
      });
    }
  };

  const deleteArchiveArticle = async (articleId) => {
    await handleAction(async () => {
      await http.delete(`/articles/${articleId}`);
      if (editingArticleId === articleId) {
        resetArticleForm();
      }
      refreshMyArticles();
      refreshPublishedArchive();
      if (user?.role === "super_admin") {
        await refreshAdminData();
      }
      if (user?.role === "chief_editor") {
        refreshEditorialQueue();
        refreshChiefMetrics();
      }
    }, "Published article deleted.");
  };

  const pauseAllActiveAds = async () => {
    await handleAction(async () => {
      await http.patch("/ads/pause-all");
      await refreshAdminData();
    }, "All running advertisements paused.");
  };

  const toggleAdPause = (ad) => {
    setPendingAdPause(ad);
  };

  const submitAd = async (event) => {
    if (event && event.preventDefault) event.preventDefault();
    await handleAction(async () => {
      const payload = {
        ...adForm,
        activateNow: adForm.status === "active",
      };

      if (editingAdId) {
        await http.patch(`/ads/${editingAdId}`, payload);
      } else {
        await http.post("/ads", payload);
      }

      resetAdForm();
      refreshAdminData();
    }, editingAdId ? "Advertisement updated successfully." : "Advertisement published successfully.");
  };

  const handleAdFormSubmitClick = (event) => {
    if (event && event.preventDefault) event.preventDefault();

    const errors = {};
    if (!adForm.advertiserName?.trim()) errors.advertiserName = "Advertiser name is required";
    if (!adForm.companyName?.trim()) errors.companyName = "Company or Brand name is required";
    if (!adForm.title?.trim()) errors.title = "Campaign title is required";
    if (!adForm.imageUrl?.trim()) errors.imageUrl = "Campaign banner is required";
    if (!adForm.durationDays || adForm.durationDays <= 0) errors.durationDays = "Duration must be at least 1 day";
    if (adForm.amount === undefined || adForm.amount < 0) errors.amount = "Billing price cannot be negative";

    if (Object.keys(errors).length > 0) {
      setAdErrors(errors);
      setActionPopup({
        title: "Validation Error",
        message: "Please complete all required fields and correct the highlighted errors.",
        type: "error",
      });
      return;
    }

    setAdErrors({});
    setPendingAdFormSubmit(true);
  };

  const startEditAd = (ad) => {
    setAdErrors({});
    setIsCreatingAd(false);
    setEditingAdId(ad._id);
    setAdForm({
      advertiserName: ad.advertiserName || "",
      advertiserEmail: ad.advertiserEmail || "",
      advertiserPhone: ad.advertiserPhone || "",
      companyName: ad.companyName || "",
      title: ad.title || "",
      description: ad.description || "",
      imageUrl: ad.imageUrl || "",
      targetUrl: ad.targetUrl || "",
      placement: ad.placement || "homepage-latest",
      durationDays: ad.durationDays || 7,
      amount: ad.amount || 0,
      priority: ad.priority || 10,
      ctaLabel: ad.ctaLabel || "Visit Sponsor",
      notes: ad.notes || "",
      status: ad.status || "active",
      promotionalContent: ad.promotionalContent || "",
      district: ad.district || "Palamu",
      block: ad.block || "Medininagar",
      targetDistricts: ad.targetDistricts || [],
      targetBlocks: ad.targetBlocks || [],
      timeTargeting: ad.timeTargeting || { startHour: 0, endHour: 24 },
    });
  };

  const focusManageAdsSection = () => {
    setActiveTab("ad_desk");
  };

  const deleteAd = async (adId) => {
    await handleAction(async () => {
      await http.delete(`/ads/${adId}`);
      if (editingAdId === adId) {
        resetAdForm();
      }
      refreshAdminData();
    }, "Advertisement deleted.");
  };

  const handleInArticleAdSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!String(inArticleAdForm.title || "").trim()) errors.title = true;
    if (!String(inArticleAdForm.imageUrl || "").trim()) errors.imageUrl = true;
    
    if (Object.keys(errors).length > 0) {
      setInArticleAdErrors(errors);
      return;
    }
    
    setInArticleAdErrors({});
    await handleAction(async () => {
      const payload = {
        ...inArticleAdForm,
        placement: "in-article",
        articleId: inArticleAdForm.articleId || selectedAdArticle?._id || "",
        amount: Number(inArticleAdForm.amount || 0),
        advertiserName: "Super Admin",
        advertiserEmail: user?.email || "admin@palamuexpress.in",
        advertiserPhone: user?.phone || "0000000000",
        activateNow: true,
      };
      
      if (editingInArticleAdId) {
        await http.patch(`/ads/${editingInArticleAdId}`, payload);
      } else {
        await http.post("/ads", payload);
      }
      
      setShowInArticleAdCreateForm(false);
      setEditingInArticleAdId("");
      setInArticleAdForm(initialInArticleAdForm);
      refreshAdminData();
    }, editingInArticleAdId ? "In-article ad campaign updated." : "In-article ad campaign injected successfully.");
  };

  const deleteInArticleAd = async (adId) => {
    await handleAction(async () => {
      await http.delete(`/ads/${adId}`);
      if (editingInArticleAdId === adId) {
        setEditingInArticleAdId("");
        setInArticleAdForm(initialInArticleAdForm);
      }
      refreshAdminData();
    }, "In-article ad campaign deleted successfully.");
  };

  const togglePauseInArticleAd = async (ad) => {
    const nextStatus = ad.status === "active" ? "paused" : "active";
    await handleAction(async () => {
      await http.patch(`/ads/${ad._id}`, {
        ...ad,
        status: nextStatus,
        activateNow: false
      });
      refreshAdminData();
    }, `In-article ad campaign ${nextStatus === "paused" ? "paused" : "resumed"} successfully.`);
  };

  const approveAd = async (adId) => {
    await handleAction(async () => {
      await http.patch(`/ads/${adId}/approve`);
      refreshAdminData();
    }, "Advertisement approved and published.");
  };

  const rejectAd = (adId) => {
    setPendingAdRejectId(adId);
  };

  const confirmRejectAd = async () => {
    if (!pendingAdRejectId) return;
    const targetId = pendingAdRejectId;
    const reason = feedbacks[`ad-${targetId}`] || "Advertisement was rejected during review.";
    setPendingAdRejectId(null);
    await handleAction(async () => {
      await http.patch(`/ads/${targetId}/reject`, { reason });
      refreshAdminData();
    }, "Advertisement rejected.");
  };

  const startEditManagedUser = (managedUser) => {
    setEditingManagedUserId(managedUser._id);
    setManagedUserForm({
      fullName: managedUser.fullName || "",
      email: managedUser.email || "",
      phone: managedUser.phone || "",
      district: managedUser.district || "",
      area: managedUser.area || "",
      role: managedUser.role || "reporter",
      approvalStatus: managedUser.approvalStatus || "pending",
      isEmailVerified: Boolean(managedUser.isEmailVerified),
      isFunctionalityDisabled: Boolean(managedUser.isFunctionalityDisabled),
      profilePhotoUrl: managedUser.profilePhotoUrl || "",
      aadhaarImageUrl: managedUser.aadhaarImageUrl || "",
      livePhotoUrl: managedUser.livePhotoUrl || "",
      validUpto: managedUser.validUpto || "",
      bloodGroup: managedUser.bloodGroup || "O+",
      education: managedUser.education || "",
    });
  };

  const saveManagedUser = async (userId) => {
    await handleAction(async () => {
      const payload = {
        ...managedUserForm,
        isEmailVerified: Boolean(managedUserForm.isEmailVerified),
        isFunctionalityDisabled: Boolean(managedUserForm.isFunctionalityDisabled),
      };
      const { data } = await http.patch(`/users/${userId}`, payload);
      const updatedUser = {
        ...data.user,
        isEmailVerified: Boolean(data.user?.isEmailVerified),
        isFunctionalityDisabled: Boolean(data.user?.isFunctionalityDisabled),
      };

      syncManagedUserState(updatedUser);

      if (profile?._id === userId) {
        const refreshedUser = await refreshUser();
        setProfile(refreshedUser);
      }

      resetManagedUserForm();
      await refreshAdminData();
    }, "User updated.");
  };

  const deleteManagedUser = async (userId) => {
    await handleAction(async () => {
      await http.delete(`/users/${userId}`);
      if (editingManagedUserId === userId) {
        resetManagedUserForm();
      }
      await refreshAdminData();
    }, "User deleted.");
  };

  const startEditContact = (contactMessage) => {
    setEditingContactId(contactMessage._id);
    setContactAdminForm({
      status: contactMessage.status || "new",
      adminNote: contactMessage.adminNote || "",
    });
  };

  const saveContactMessage = async (contactId) => {
    await handleAction(async () => {
      await http.patch(`/contact/${contactId}`, contactAdminForm);
      resetContactAdminForm();
      refreshAdminData();
    }, "Contact message updated.");
  };

  const deleteContactMessage = (contactId) => {
    setPendingContactMessageDeleteId(contactId);
  };

  const confirmDeleteContactMessage = async () => {
    if (!pendingContactMessageDeleteId) return;
    const targetId = pendingContactMessageDeleteId;
    setPendingContactMessageDeleteId(null);
    await handleAction(async () => {
      await http.delete(`/contact/${targetId}`);
      if (editingContactId === targetId) {
        resetContactAdminForm();
      }
      refreshAdminData();
    }, "Contact message deleted.");
  };

  const approveUser = async (userId) => {
    await handleAction(async () => {
      const { data } = await http.patch(`/users/${userId}/approve`);
      syncManagedUserState(data.user);
      if (selectedManagedUser?._id === userId) {
        setSelectedManagedUser(data.user);
      }
      refreshAdminData();
    }, "User approved.");
  };

  const rejectUser = (userId) => {
    setPendingUserRejectId(userId);
  };

  const confirmRejectUser = async () => {
    if (!pendingUserRejectId) return;
    const targetId = pendingUserRejectId;
    setPendingUserRejectId(null);
    await handleAction(async () => {
      const { data } = await http.patch(`/users/${targetId}/reject`, { feedback: feedbacks[`user-${targetId}`] || "KYC details require corrections" });
      syncManagedUserState(data.user);
      if (selectedManagedUser?._id === targetId) {
        setSelectedManagedUser(data.user);
      }
      refreshAdminData();
    }, "User rejected with feedback.");
  };

  const approveArticle = async (articleId) => {
    await handleAction(async () => {
      await http.patch(`/articles/${articleId}/approve`);
      if (user?.role === "super_admin") {
        refreshAdminData();
      }
      if (user?.role === "chief_editor") {
        refreshEditorialQueue();
        refreshMyArticles();
        refreshChiefMetrics();
        refreshPublishedArchive();
      }
    }, "Article published to homepage.");
  };

  const rejectArticle = (articleId) => {
    setPendingArticleRejectId(articleId);
  };

  const confirmRejectArticle = async () => {
    if (!pendingArticleRejectId) return;
    const targetId = pendingArticleRejectId;
    setPendingArticleRejectId(null);
    await handleAction(async () => {
      await http.patch(`/articles/${targetId}/reject`, { feedback: feedbacks[`article-${targetId}`] || "Please revise and resubmit" });
      if (user?.role === "super_admin") {
        refreshAdminData();
      }
      if (user?.role === "chief_editor") {
        refreshEditorialQueue();
        refreshMyArticles();
        refreshChiefMetrics();
      }
    }, "Article rejected with editorial feedback.");
  };

  const saveGlobalExpiry = async (event) => {
    event.preventDefault();
    if (!globalExpiryForm) {
      setActionPopup({
        type: "error",
        title: "Date Required",
        message: "Please choose a valid global accreditation expiry date before clicking Save.",
      });
      return;
    }

    await handleAction(async () => {
      const { data } = await http.patch("/admin/settings", { globalIdCardExpiry: globalExpiryForm });
      setGlobalIdCardExpiry(data.globalIdCardExpiry);
      setGlobalExpiryForm(data.globalIdCardExpiry);
      
      if (dashboardCache) {
        dashboardCache.globalIdCardExpiry = data.globalIdCardExpiry;
      }
      
      await refreshAdminData();
    }, "Global ID card expiry date updated successfully.");
  };

  const saveCustomPricing = async (event) => {
    if (event && event.preventDefault) event.preventDefault();
    await handleAction(async () => {
      await http.patch("/admin/settings", {
        "adPricing_homepage-hero": Number(adPricingHero),
        "adPricing_homepage-latest": Number(adPricingLatest),
        "adPricing_homepage-district": Number(adPricingDistrict),
        "adPricing_homepage-popup": Number(adPricingPopup),
        "adPricing_in-article": Number(adPricingInArticle),
        "adPricing_promotional-article": Number(adPricingPromotional),
      });
      
      // Update cache
      if (dashboardCache) {
        dashboardCache["adPricing_homepage-hero"] = Number(adPricingHero);
        dashboardCache["adPricing_homepage-latest"] = Number(adPricingLatest);
        dashboardCache["adPricing_homepage-district"] = Number(adPricingDistrict);
        dashboardCache["adPricing_homepage-popup"] = Number(adPricingPopup);
        dashboardCache["adPricing_in-article"] = Number(adPricingInArticle);
        dashboardCache["adPricing_promotional-article"] = Number(adPricingPromotional);
      }
      
      await refreshAdminData();
    }, "Ad package pricing rates updated successfully.");
  };

  const savePopupSettings = async (mode, lockedId) => {
    await handleAction(async () => {
      const payload = {
        popupDisplayMode: mode !== undefined ? mode : popupDisplayMode,
        popupLockedAdId: lockedId !== undefined ? lockedId : popupLockedAdId,
      };
      
      const { data } = await http.patch("/admin/settings", payload);
      
      if (data.popupDisplayMode !== undefined) {
        setPopupDisplayMode(data.popupDisplayMode);
        if (dashboardCache) dashboardCache.popupDisplayMode = data.popupDisplayMode;
      }
      if (data.popupLockedAdId !== undefined) {
        setPopupLockedAdId(data.popupLockedAdId);
        if (dashboardCache) dashboardCache.popupLockedAdId = data.popupLockedAdId;
      }
      
      await refreshAdminData();
    }, "Pop-up interstitial settings updated successfully.");
  };

  const clearGlobalExpiry = () => {
    setShowClearExpiryConfirm(true);
  };

  const confirmClearGlobalExpiry = async () => {
    setShowClearExpiryConfirm(false);
    await handleAction(async () => {
      const { data } = await http.patch("/admin/settings", { globalIdCardExpiry: "" });
      setGlobalIdCardExpiry("");
      setGlobalExpiryForm("");
      
      if (dashboardCache) {
        dashboardCache.globalIdCardExpiry = "";
      }
      
      await refreshAdminData();
    }, "Global ID card expiry date removed successfully.");
  };

  const deletePublishedArticlesForDate = async () => {
    if (!publishedArchiveDate) {
      setActionPopup({
        type: "error",
        title: "Date required",
        message: "Choose a published date before deleting archived news.",
      });
      return;
    }

    setArchiveBusy(true);
    setActionPopup({
      type: "loading",
      title: "Deleting archive",
      message: "We are removing the selected published news archive from the homepage records.",
      persistent: true,
    });

    try {
      const { data } = await http.delete("/articles/published/archive", {
        params: { date: publishedArchiveDate },
      });

      setActionPopup({
        type: "success",
        title: "Archive deleted",
        message: data.message || "Published news archive cleared.",
      });
      refreshPublishedArchive();
      if (user?.role === "super_admin") {
        refreshAdminData();
      }
      if (user?.role === "chief_editor") {
        refreshChiefMetrics();
        refreshEditorialQueue();
        refreshMyArticles();
      }
    } catch (error) {
      setActionPopup({
        type: "error",
        title: "Deletion failed",
        message: error.response?.data?.message || "Unable to delete published news for the selected date",
      });
    } finally {
      setArchiveBusy(false);
    }
  };

  const requestPublishedArchiveDelete = () => {
    if (!publishedArchiveDate) {
      setActionPopup({
        type: "error",
        title: "Date required",
        message: "Choose a published date before deleting archived news.",
      });
      return;
    }

    if (!publishedArchiveArticles.length) {
      setActionPopup({
        type: "error",
        title: "Nothing to delete",
        message: "No published articles are available for the selected date.",
      });
      return;
    }

    setShowArchiveDeleteModal(true);
  };

  const confirmPublishedArchiveDelete = async () => {
    await deletePublishedArticlesForDate();
    setShowArchiveDeleteModal(false);
  };

  const onboardingTitle =
    user?.role === "super_admin"
      ? "Super Admin Account"
      : user?.role === "chief_editor"
        ? "Chief Editor Onboarding"
        : "Reporter Onboarding";

  const finalizeUpdateCredentials = async (payload) => {
    setCredentialBusy(true);
    setActionPopup({
      type: "loading",
      title: "Finalizing updates",
      message: "Saving your new account credentials securely.",
      persistent: true,
    });

    try {
      const { data } = await http.patch("/users/me/credentials", payload);
      setProfile(data.user);
      await refreshUser();
      setCredentialForm({
        fullName: data.user.fullName || "",
        email: data.user.email || "",
        phone: data.user.phone || "",
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
        district: data.user.district || "",
        area: data.user.area || "",
        aadhaarNumber: data.user.aadhaarNumber || "",
        bloodGroup: data.user.bloodGroup || "O+",
        education: data.user.education || "",
        profilePhotoUrl: data.user.profilePhotoUrl || "",
        aadhaarImageUrl: data.user.aadhaarImageUrl || "",
        livePhotoUrl: data.user.livePhotoUrl || "",
      });
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setShowOtpModal(false);
      setPendingCredentialPayload(null);
      setActionPopup({
        type: "success",
        title: "Credentials updated",
        message: data.message || "Your account credentials have been successfully updated.",
      });
    } catch (error) {
      setShowOtpModal(false);
      setPendingCredentialPayload(null);
      setOtpCode("");
      setOtpError("");
      setActionPopup({
        type: "error",
        title: "Update failed",
        message: error.response?.data?.message || "Unable to finalize credentials update.",
      });
    } finally {
      setCredentialBusy(false);
    }
  };

  const verifyAndSaveCredentials = async () => {
    if (String(otpCode || "").trim().length !== 6) {
      setOtpError("Please enter a valid 6-digit OTP code.");
      return;
    }

    setOtpBusy(true);
    setOtpError("");
    const verifyEmail = String(profile?.email || "").trim() || String(pendingCredentialPayload?.email || "").trim();

    try {
      await http.post("/auth/verify-email-otp", {
        email: verifyEmail,
        otp: String(otpCode || "").trim(),
      });
      
      // Close OTP modal immediately since verification succeeded
      setShowOtpModal(false);
      setOtpCode("");
      setOtpError("");

      await finalizeUpdateCredentials(pendingCredentialPayload);
    } catch (err) {
      setOtpError(err.response?.data?.message || "OTP verification failed. Please check the code and try again.");
    } finally {
      setOtpBusy(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0 || otpBusy) return;

    setOtpBusy(true);
    setOtpError("");
    setOtpCode("");

    const sendToEmail = String(profile?.email || "").trim() || String(pendingCredentialPayload?.email || "").trim();

    try {
      await http.post("/auth/send-email-otp", { email: sendToEmail });
      setResendCountdown(60);
      setActionPopup({
        type: "success",
        title: "Verification code resent",
        message: `A fresh 6-digit code has been dispatched to ${sendToEmail}.`,
      });
    } catch (err) {
      setOtpError(err.response?.data?.message || "Failed to resend OTP. Please try again.");
    } finally {
      setOtpBusy(false);
    }
  };

  const submitCredentials = async (event) => {
    event.preventDefault();

    if (!String(credentialForm.fullName || "").trim()) {
      setActionPopup({
        type: "error",
        title: "Full name required",
        message: "Please enter your full name before updating credentials.",
      });
      return;
    }

    if (!/^\d{10}$/.test(String(credentialForm.phone || "").trim())) {
      setActionPopup({
        type: "error",
        title: "Invalid phone number",
        message: "Phone number must be exactly 10 digits.",
      });
      return;
    }

    if (String(credentialForm.email || "").trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(credentialForm.email || "").trim())) {
      setActionPopup({
        type: "error",
        title: "Invalid email",
        message: "Enter a valid email address.",
      });
      return;
    }

    if (credentialForm.newPassword && credentialForm.newPassword.length < 6) {
      setActionPopup({
        type: "error",
        title: "Password too short",
        message: "New password must be at least 6 characters.",
      });
      return;
    }

    if (credentialForm.newPassword && credentialForm.newPassword !== credentialForm.confirmNewPassword) {
      setActionPopup({
        type: "error",
        title: "Password mismatch",
        message: "New password and confirm password must match.",
      });
      return;
    }

    const isRepOrEditor = user?.role === "reporter" || user?.role === "chief_editor";

    if (isRepOrEditor) {
      if (!String(credentialForm.district || "").trim()) {
        setActionPopup({
          type: "error",
          title: "District required",
          message: "Please select your jurisdiction district.",
        });
        return;
      }
      if (!String(credentialForm.area || "").trim()) {
        setActionPopup({
          type: "error",
          title: "Block / Area required",
          message: "Please select your Block / Area jurisdiction.",
        });
        return;
      }
      const aadhaarDigits = String(credentialForm.aadhaarNumber || "").replace(/\D/g, "");
      if (aadhaarDigits.length !== 12) {
        setActionPopup({
          type: "error",
          title: "Invalid Aadhaar number",
          message: "The Aadhaar number entered must be exactly 12 digits.",
        });
        return;
      }
      if (!String(credentialForm.profilePhotoUrl || "").trim()) {
        setActionPopup({
          type: "error",
          title: "Profile photo required",
          message: "Please upload your formal profile photo.",
        });
        return;
      }
      if (!String(credentialForm.aadhaarImageUrl || "").trim()) {
        setActionPopup({
          type: "error",
          title: "Aadhaar Scan required",
          message: "Please upload a clear scan of your Aadhaar card.",
        });
        return;
      }
    }

    const payload = {
      fullName: String(credentialForm.fullName || "").trim(),
      email: String(credentialForm.email || "").trim(),
      phone: String(credentialForm.phone || "").trim(),
      currentPassword: credentialForm.currentPassword,
      newPassword: credentialForm.newPassword,
      district: credentialForm.district,
      area: credentialForm.area,
      aadhaarNumber: credentialForm.aadhaarNumber,
      bloodGroup: credentialForm.bloodGroup,
      education: credentialForm.education,
      profilePhotoUrl: credentialForm.profilePhotoUrl,
      aadhaarImageUrl: credentialForm.aadhaarImageUrl,
      livePhotoUrl: credentialForm.livePhotoUrl,
    };

    const isSensitiveChanged = 
      String(credentialForm.email || "").trim().toLowerCase() !== String(profile?.email || "").trim().toLowerCase() ||
      String(credentialForm.phone || "").trim() !== String(profile?.phone || "").trim();

    if (isSensitiveChanged) {
      const oldEmail = String(profile?.email || "").trim();
      const sendToEmail = oldEmail || String(payload.email || "").trim();

      if (!sendToEmail) {
        setActionPopup({
          type: "error",
          title: "Email verification required",
          message: "Please ensure a registered email address exists on this account to verify sensitive changes.",
        });
        return;
      }

      setCredentialBusy(true);
      setActionPopup({
        type: "loading",
        title: "Sending Verification OTP",
        message: `We are sending a 6-digit verification code to ${sendToEmail}...`,
        persistent: true,
      });

      try {
        await http.post("/auth/send-email-otp", { email: sendToEmail });
        
        setPendingCredentialPayload(payload);
        setOtpCode("");
        setOtpError("");
        setShowOtpModal(true);
        setResendCountdown(60);
        
        setActionPopup({
          type: "success",
          title: "Verification code sent",
          message: `Enter the code sent to ${sendToEmail} to finalize your credential updates.`,
        });
      } catch (err) {
        setActionPopup({
          type: "error",
          title: "OTP delivery failed",
          message: err.response?.data?.message || "Failed to dispatch email verification OTP.",
        });
      } finally {
        setCredentialBusy(false);
      }
      return;
    }

    // Direct update if no sensitive fields are updated
    await finalizeUpdateCredentials(payload);
  };

  // ----------------------------------------------------
  // REAL-TIME NOTIFICATION SYSTEM CONTROLLERS
  // ----------------------------------------------------
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const { data } = await http.get("/notifications");
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await http.patch(`/notifications/${id}/read`);
      setNotifications((current) =>
        current.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.isRead) {
        await handleMarkRead(notif._id);
      }
      setShowNotificationsDropdown(false);

      const isSuperAdmin = user?.role === "super_admin";

      if (notif.articleId) {
        setActiveTab("queue");
        setExpandedArticleId(notif.articleId);
        setPendingArticleSearch("");
        setPendingArticlePage(1);
      } else if (notif.onboardingUserId) {
        if (isSuperAdmin) {
          setActiveTab("approvals");
          setPendingUserSearch("");
        } else {
          if (profile?.approvalStatus === "approved") {
            setActiveTab("press_credentials");
          } else {
            setActiveTab("credentials");
          }
        }
      } else if (
        String(notif.title || "").toLowerCase().includes("article") || 
        String(notif.title || "").toLowerCase().includes("news") || 
        String(notif.message || "").toLowerCase().includes("pending review")
      ) {
        setActiveTab("queue");
        setPendingArticleSearch("");
        setPendingArticlePage(1);
      } else if (
        String(notif.title || "").toLowerCase().includes("onboarding") || 
        String(notif.title || "").toLowerCase().includes("kyc") || 
        String(notif.message || "").toLowerCase().includes("onboarding approval") ||
        String(notif.title || "").toLowerCase().includes("rejected") ||
        String(notif.message || "").toLowerCase().includes("rejected") ||
        String(notif.message || "").toLowerCase().includes("rejection")
      ) {
        if (isSuperAdmin) {
          setActiveTab("approvals");
          setPendingUserSearch("");
        } else {
          if (profile?.approvalStatus === "approved") {
            setActiveTab("press_credentials");
          } else {
            setActiveTab("credentials");
          }
        }
      }
    } catch (err) {
      console.error("Failed handling notification click redirection:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await http.post("/notifications/mark-all-read");
      setNotifications((current) =>
        current.map((n) => ({ ...n, isRead: true }))
      );
      setActionPopup({
        type: "success",
        title: "Notifications Updated",
        message: "All active notifications have been marked as read.",
      });
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  const handleClearNotification = async (id) => {
    try {
      await http.delete(`/notifications/${id}/clear`);
      setNotifications((current) => current.filter((n) => n._id !== id));
    } catch (err) {
      console.error("Failed to clear notification:", err);
    }
  };

  const handleClearAll = async () => {
    try {
      await http.post("/notifications/clear-all");
      setNotifications([]);
      setActionPopup({
        type: "success",
        title: "Inbox Cleared",
        message: "All notifications have been cleared from your view.",
      });
    } catch (err) {
      console.error("Failed to clear all notifications:", err);
    }
  };

  const fetchGlobalNotifications = async () => {
    if (user?.role !== "super_admin") return;
    try {
      setGlobalNotificationsLoading(true);
      const { data } = await http.get("/notifications/admin/all");
      setGlobalNotifications(data.notifications || []);
    } catch (err) {
      console.error("Failed to fetch global notifications:", err);
    } finally {
      setGlobalNotificationsLoading(false);
    }
  };

  const handleAdminSendNotification = async (event) => {
    event.preventDefault();
    if (!adminNotificationForm.title.trim() || !adminNotificationForm.message.trim()) {
      setActionPopup({
        type: "error",
        title: "Fields Required",
        message: "Please fill in both the title and the message fields.",
      });
      return;
    }

    setNotificationBusy(true);
    try {
      await http.post("/notifications/admin", {
        title: adminNotificationForm.title.trim(),
        message: adminNotificationForm.message.trim(),
        recipientId: adminNotificationForm.recipientId,
      });
      
      setAdminNotificationForm((curr) => ({
        ...curr,
        title: "",
        message: "",
        recipientId: "all"
      }));

      setActionPopup({
        type: "success",
        title: "Notification Dispatched",
        message: "Your message has been pushed to the selected audience.",
      });

      await fetchGlobalNotifications();
    } catch (err) {
      setActionPopup({
        type: "error",
        title: "Failed to Push Notification",
        message: err.response?.data?.message || "Something went wrong.",
      });
    } finally {
      setNotificationBusy(false);
    }
  };

  const handleAdminDeleteGlobal = async (id) => {
    try {
      await http.delete(`/notifications/admin/${id}`);
      setGlobalNotifications((current) => current.filter((n) => n._id !== id));
      setActionPopup({
        type: "success",
        title: "Notification Retracted",
        message: "The notification has been globally deleted and pulled back from all dashboards.",
      });
    } catch (err) {
      setActionPopup({
        type: "error",
        title: "Deletion Failed",
        message: err.response?.data?.message || "Failed to delete notification globally.",
      });
    }
  };

  const fetchMyQueries = async () => {
    if (!user || !["reporter", "chief_editor"].includes(user.role)) return;
    try {
      setSupportQueriesLoading(true);
      const { data } = await http.get("/contact/my-queries");
      setSupportQueries(data.messages || []);
    } catch (err) {
      console.error("Failed to fetch support queries:", err);
    } finally {
      setSupportQueriesLoading(false);
    }
  };

  const handleQueryNotificationClick = (msg) => {
    setActiveTab("contact_inbox");
    setInboxSubTab(msg.userId ? "journalist" : "public");
    startEditContact(msg);
    setShowAdminQueriesDropdown(false);
    setSidebarOpen(false);

    // Give React HMR state changes time to shift layout before scrolling
    setTimeout(() => {
      const el = document.getElementById(`contact-message-${msg._id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-orange-500", "scale-[1.01]");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-orange-500", "scale-[1.01]");
        }, 2000);
      }
    }, 150);
  };

  const handleSendSupportQuery = async (event) => {
    event.preventDefault();

    const errors = {};
    if (!supportQueryForm.subject.trim()) errors.subject = true;
    if (!supportQueryForm.message.trim()) errors.message = true;

    if (Object.keys(errors).length > 0) {
      setSupportQueryErrors(errors);
      setActionPopup({
        type: "error",
        title: "Fields Required",
        message: "Please fill out both the subject and query message fields before sending.",
      });
      return;
    }

    setSupportQueriesBusy(true);
    setSupportQueryErrors({});

    try {
      const payload = {
        fullName: profile?.fullName || user?.fullName || "Journalist",
        email: profile?.email || user?.email,
        phone: profile?.phone || user?.phone || "",
        subject: supportQueryForm.subject.trim(),
        message: supportQueryForm.message.trim(),
        status: "unresolved",
      };

      await http.post("/contact", payload);

      setSupportQueryForm({ subject: "", message: "" });
      
      setActionPopup({
        type: "success",
        title: "Query Dispatched",
        message: "Your support message has been sent to the Super Admin. You will be notified in real-time when a resolution or action is taken.",
      });

      await fetchMyQueries();
    } catch (error) {
      setActionPopup({
        type: "error",
        title: "Failed to Send Query",
        message: error.response?.data?.message || "Something went wrong.",
      });
    } finally {
      setSupportQueriesBusy(false);
    }
  };

  const renderSupportDesk = () => {
    return (
      <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-400">Support Desk</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white md:text-4xl">
            Reporter & Editor Assistance
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Submit a direct query or operational request to the Platform Super Admin. Track resolution status in real-time.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* LEFT: COMPOSER */}
          <div className="panel p-6 bg-slate-900/40 border border-white/5 lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Create Support Query</h2>
              <p className="mt-1 text-xs text-slate-500">
                Pushes a direct query message to the Super Admin's reader inbox.
              </p>
            </div>

            <form onSubmit={handleSendSupportQuery} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="support-query-subject" className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                  Query Subject
                </label>
                <input
                  id="support-query-subject"
                  type="text"
                  placeholder="e.g. ID Card Renewal / Tech Issue"
                  value={supportQueryForm.subject}
                  onChange={(e) =>
                    setSupportQueryForm((prev) => ({
                      ...prev,
                      subject: e.target.value,
                    }))
                  }
                  maxLength={100}
                  disabled={supportQueriesBusy}
                  className={`w-full rounded-2xl border bg-white/[0.02] px-4 py-3.5 text-sm text-white placeholder-slate-600 focus:border-orange-500 focus:bg-orange-500/5 focus:outline-none transition ${
                    supportQueryErrors.subject ? "border-rose-500 focus:ring-rose-500/20" : "border-white/10 focus:ring-orange-500/20"
                  }`}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="support-query-message" className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                  Message / Query Details
                </label>
                <textarea
                  id="support-query-message"
                  rows={6}
                  placeholder="Describe your query in detail. The Super Admin will review it and reply with action notes."
                  value={supportQueryForm.message}
                  onChange={(e) =>
                    setSupportQueryForm((prev) => ({
                      ...prev,
                      message: e.target.value,
                    }))
                  }
                  maxLength={1000}
                  disabled={supportQueriesBusy}
                  className={`w-full rounded-2xl border bg-white/[0.02] px-4 py-3.5 text-sm text-white placeholder-slate-600 focus:border-orange-500 focus:bg-orange-500/5 focus:outline-none transition resize-none ${
                    supportQueryErrors.message ? "border-rose-500 focus:ring-rose-500/20" : "border-white/10 focus:ring-orange-500/20"
                  }`}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={supportQueriesBusy}
                className="w-full flex items-center justify-center rounded-2xl bg-orange-600 px-4 py-3.5 text-sm font-semibold text-white hover:bg-orange-500 active:scale-[0.98] shadow-lg shadow-orange-950/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {supportQueriesBusy ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  "Send Query"
                )}
              </button>
            </form>
          </div>

          {/* RIGHT: TICKET HISTORY */}
          <div className="panel p-6 bg-slate-900/40 border border-white/5 lg:col-span-3 space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Active Support Queries</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Track real-time status of your queries.
                </p>
              </div>
              <button
                type="button"
                onClick={fetchMyQueries}
                disabled={supportQueriesLoading}
                className="rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/5 transition disabled:opacity-50"
              >
                {supportQueriesLoading ? "Refreshing..." : "Refresh list"}
              </button>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {supportQueries.map((query) => (
                <div
                  key={query._id}
                  className="rounded-2xl border border-white/5 bg-white/[0.01] p-4 space-y-3 transition hover:bg-white/[0.02] hover:border-white/10"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      query.status === "resolved"
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : query.status === "in_progress"
                          ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}>
                      {String(query.status || "unresolved").replaceAll("_", " ")}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold tracking-wide">
                      {new Date(query.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white leading-tight">{query.subject}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed break-words">{query.message}</p>
                  
                  {query.adminNote && (
                    <div className="rounded-xl bg-orange-500/5 border border-orange-500/10 p-3 mt-1.5 space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400">Response from Admin</p>
                      <p className="text-xs text-slate-300 leading-relaxed italic pr-2 break-all">
                        {query.adminNote}
                      </p>
                    </div>
                  )}
                </div>
              ))}

              {!supportQueriesLoading && supportQueries.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Inbox className="h-12 w-12 text-slate-700 mb-4" />
                  <p className="text-sm font-bold text-slate-400">No support tickets</p>
                  <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-normal">
                    Need assistance or have a tech issue? Send a direct message to the Super Admin using the composer on the left.
                  </p>
                </div>
              )}

              {supportQueriesLoading && (
                <div className="flex min-h-[200px] items-center justify-center py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ----------------------------------------------------
  // SUB-RENDER WORKSPACE VIEWS
  // ----------------------------------------------------

  const renderOverview = () => {
    return (
      <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-white/5 pb-6">
          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-400">Workspace Overview</p>
            <h1 className="font-display text-3xl font-bold text-white md:text-4xl">
              Welcome back, {profile?.fullName || user?.fullName || "Journalist"}
            </h1>
            <p className="text-sm text-slate-400">Here is your customized editorial briefing, metrics, and verification records.</p>
          </div>

        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <MetricCard key={card.label} {...card} />
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 max-w-5xl">
          {/* Profile Details Card */}
          <div className="panel p-6 border border-white/5 bg-slate-900/10">
            <h3 className="text-lg font-bold text-white border-b border-white/5 pb-3 flex items-center gap-2">
              <UserCheck size={18} className="text-orange-400" />
              {user?.role === "super_admin" ? "Super Admin Account" : user?.role === "chief_editor" ? "Chief Editor Credentials" : "Reporter Credentials"}
            </h3>
            {profile ? (
              <div className="mt-4 space-y-1">
                <DetailRow label="Role" value={String(profile.role || "-").replaceAll("_", " ")} />
                <DetailRow label="Approval Status" value={profile.approvalStatus || "-"} />
                <DetailRow label="Email Verified" value={profile.isEmailVerified ? "Yes" : "No"} />
                <DetailRow label="Phone" value={profile.phone || "-"} />
                <DetailRow label="Email" value={profile.email || "-"} />
                <DetailRow label="Joined On" value={formatDate(profile.createdAt)} />
                {(user?.role === "reporter" || user?.role === "chief_editor") && (
                  <>
                    <DetailRow label="District" value={profile.district || "-"} />
                    <DetailRow label="Area / Block" value={profile.area || "-"} />
                    <DetailRow label="Blood Group" value={profile.bloodGroup || "-"} />
                    <DetailRow label="Education" value={profile.education || "-"} />
                    <DetailRow 
                      label="ID Expiry Date" 
                      value={profile.validUpto 
                        ? new Date(profile.validUpto).toLocaleDateString() 
                        : globalIdCardExpiry 
                          ? `${new Date(globalIdCardExpiry).toLocaleDateString()} (Global)` 
                          : "Permanent / Auto-Renewal"} 
                    />
                  </>
                )}
                {user?.role === "reporter" && <DetailRow label="Reporter Code" value={profile.reporterCode || "Not generated yet"} />}
                {user?.role === "chief_editor" && <DetailRow label="Chief Editor Code" value={profile.chiefEditorCode || "Not generated yet"} />}
                {profile.rejectionFeedback && <DetailRow label="Admin Feedback" value={profile.rejectionFeedback} valueClassName="text-right text-rose-300" />}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Loading profile data...</p>
            )}
          </div>

          {/* Desk Notes Card */}
          <div className="panel p-6 border border-white/5 bg-slate-900/10">
            <h3 className="text-lg font-bold text-white border-b border-white/5 pb-3 flex items-center gap-2">
              <BookOpen size={18} className="text-orange-400" />
              {user?.role === "super_admin" ? "Admin Access Notes" : "Desk Access Notes"}
            </h3>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-400">
              {user?.role === "super_admin" ? (
                <>
                  <p>Your dashboard controls reporter approvals, story publishing, advertisement priority, and overall homepage sponsor visibility.</p>
                  <p>Higher priority ads appear earlier in each homepage placement. Use small numbers like 1, 2, and 3 for your most important campaigns.</p>
                  <p>When an ad is marked active, it becomes eligible for homepage display until its duration window ends.</p>
                </>
              ) : user?.role === "chief_editor" ? (
                <>
                  <p>Your chief editor desk opens after approval, email verification, and active newsroom access. Super admin can temporarily disable these actions when needed.</p>
                  <p>Use the editorial queue to publish strong reports quickly or send revision feedback back to the reporter desk.</p>
                  <p>Your dashboard also shows live newsroom metrics so you can monitor pending and published coverage.</p>
                </>
              ) : (
                <>
                  <p>Your reporter desk opens after approval, email verification, and active newsroom access. Super admin can temporarily disable these actions when needed.</p>
                  <p>Use the excerpt field for a concise summary and the full content field for the complete report copy.</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPressCredentials = () => {
    if (!profile) return null;

    if (profile.approvalStatus !== "approved") {
      return (
        <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
          <div className="border-b border-white/5 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-400">Accredited Credentials</p>
            <h2 className="text-2xl font-bold text-white mt-1">Press Documents</h2>
            <p className="text-xs text-slate-400 mt-1">Access, download, and verify your digital accreditation staff ID card and official appointment documents.</p>
          </div>
          
          <div className="text-center py-16 rounded-3xl border border-dashed border-white/10 bg-slate-900/10 max-w-2xl mx-auto mt-6">
            <IdCard className="h-12 w-12 text-slate-500 mx-auto mb-4 animate-pulse" />
            <h3 className="text-lg font-bold text-white">Credentials Generating</h3>
            <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto leading-relaxed">
              Your official Press ID Card, Designation Letters, and Police Authorization documentation are automatically compiled as soon as your onboarding profile is approved by the Super Admin.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
        <div className="border-b border-white/5 pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-400">Accredited Credentials</p>
          <h2 className="text-2xl font-bold text-white mt-1">Press Documents</h2>
          <p className="text-xs text-slate-400 mt-1">Access, download, and verify your digital accreditation staff ID card and official appointment documents.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3 items-start">
          {/* Left Column: ID Card Preview (Spans 1 col on lg, takes auto height) */}
          <div className="lg:col-span-1">
            <IDCardPreview profile={profile} cardUrl={reporterCardUrl} globalIdCardExpiry={globalIdCardExpiry} />
          </div>

          {/* Right Column: Letters (Spans 2 cols on lg) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="panel p-6 border border-white/5 bg-slate-900/10 flex flex-col justify-between rounded-3xl shadow-xl">
              <div className="w-full text-center sm:text-left mb-4">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <FileText className="h-5 w-5 text-orange-500" />
                  <h2 className="text-xl font-semibold text-white">Official Documentation</h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">Designation & Police Facilitation Letters</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <p className="text-[9px] text-orange-400 font-bold uppercase tracking-wider">Official Appointment Letter</p>
                    <p className="text-sm font-bold text-white">Press Designation & Contract Terms</p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Legal appointment letter certifying your designated reporting status under Palamu Express Digital Media.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => triggerPdfDownload(
                      `/users/download-appt/${profile._id}`,
                      `Palamu_Express_Appointment_Letter_${profile.reporterCode || profile.chiefEditorCode || "Staff"}.pdf`,
                      "Official Appointment Letter"
                    )}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 w-full text-xs font-bold rounded-xl bg-orange-600 text-white hover:bg-orange-500 transition shadow-md shadow-orange-950/20 cursor-pointer"
                  >
                    <Download size={13} />
                    Download Appointment Letter
                  </button>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <p className="text-[9px] text-orange-400 font-bold uppercase tracking-wider">Press Authorization Letter</p>
                    <p className="text-sm font-bold text-white">Accredited Credentials Authorization</p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Formal credentials letter requesting police authorities and administrative bodies to facilitate your regional reporting operations.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => triggerPdfDownload(
                      `/users/download-auth/${profile._id}`,
                      `Palamu_Express_Authorization_Letter_${profile.reporterCode || profile.chiefEditorCode || "Staff"}.pdf`,
                      "Credentials Authorization Letter"
                    )}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 w-full text-xs font-bold rounded-xl bg-orange-600 text-white hover:bg-orange-500 transition shadow-md shadow-orange-950/20 cursor-pointer"
                  >
                    <Download size={13} />
                    Download Authorization Letter
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderWriteNews = () => {
    return (
      <div id="reporter-desk-panel" className="panel p-6 border border-white/5 bg-slate-900/10 animate-[fadeIn_0.4s_ease-out]">
        <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-400">Content Composer</p>
            <h2 className="text-2xl font-bold text-white mt-1">
              {user?.role === "super_admin" ? "Super Admin News Desk" : user?.role === "chief_editor" ? "Chief Editor Desk" : "Reporter Desk"}
            </h2>
          </div>
          <div className="flex gap-2">
            {editingArticleId ? (
              <button
                type="button"
                onClick={() => {
                  resetArticleForm();
                  const prevTab = localStorage.getItem("dashboard_prev_active_tab") || "overview";
                  setActiveTab(prevTab);
                }}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5 transition"
              >
                Cancel Edit
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const prevTab = localStorage.getItem("dashboard_prev_active_tab") || "overview";
                  setActiveTab(prevTab);
                }}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition flex items-center gap-1.5"
              >
                <X size={14} />
                Close
              </button>
            )}
          </div>
        </div>

        {!canAccessNewsDesk ? (
          <div className="mt-6 flex flex-col items-center justify-center p-8 text-center border border-dashed border-white/10 rounded-2xl">
            <Lock size={36} className="text-slate-500 mb-3" />
            <p className="text-slate-400 text-sm max-w-md">
              {isFunctionalityDisabled
                ? "Your newsroom actions are currently disabled by the super admin. Article publishing and review tools are temporarily unavailable."
                : "Your news desk unlocks after super admin approval and email verification."}
            </p>
          </div>
        ) : (
          <form onSubmit={submitArticle} className="mt-5 grid gap-4 md:grid-cols-2">
            <input
              id="article-headline-input"
              className={`rounded-2xl border px-4 py-3 text-white md:col-span-2 transition-all duration-300 outline-none ${
                articleErrors.title
                  ? "bg-red-500/[0.07] border-white/10 shadow-[0_0_20px_rgba(239,68,68,0.06)]"
                  : "bg-white/5 border-white/10 focus:border-orange-500/80 focus:ring-4 focus:ring-orange-500/10"
              }`}
              placeholder="Headline"
              value={articleForm.title}
              onChange={(event) => {
                setArticleForm({ ...articleForm, title: event.target.value });
                if (articleErrors.title) setArticleErrors({ ...articleErrors, title: false });
              }}
            />
            <select
              className={`rounded-2xl border px-4 py-3 text-white transition-all duration-300 outline-none ${
                articleErrors.district
                  ? "bg-red-500/[0.07] border-white/10 shadow-[0_0_20px_rgba(239,68,68,0.06)]"
                  : "bg-slate-900 border-white/10 focus:border-orange-500/80 focus:ring-4 focus:ring-orange-500/10"
              }`}
              value={articleForm.district}
              onChange={(event) => {
                setArticleForm({ ...articleForm, district: event.target.value, area: "" });
                if (articleErrors.district) setArticleErrors({ ...articleErrors, district: false });
              }}
            >
              <option value="">Select district</option>
              {jharkhandDistricts.map((district) => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
            <select
              className={`rounded-2xl border px-4 py-3 text-white transition-all duration-300 outline-none ${
                articleErrors.area
                  ? "bg-red-500/[0.07] border-white/10 shadow-[0_0_20px_rgba(239,68,68,0.06)]"
                  : "bg-slate-900 border-white/10 focus:border-orange-500/80 focus:ring-4 focus:ring-orange-500/10"
              }`}
              disabled={!articleForm.district}
              value={articleForm.area}
              onChange={(event) => {
                setArticleForm({ ...articleForm, area: event.target.value });
                if (articleErrors.area) setArticleErrors({ ...articleErrors, area: false });
              }}
            >
              <option value="">Select block</option>
              {articleBlocks.map((block) => (
                <option key={block} value={block}>{block}</option>
              ))}
            </select>
            <select
              className={`rounded-2xl border px-4 py-3 text-white md:col-span-2 transition-all duration-300 outline-none ${
                articleErrors.category
                  ? "bg-red-500/[0.07] border-white/10 shadow-[0_0_20px_rgba(239,68,68,0.06)]"
                  : "bg-slate-900 border-white/10 focus:border-orange-500/80 focus:ring-4 focus:ring-orange-500/10"
              }`}
              value={articleForm.category}
              onChange={(event) => {
                setArticleForm({ ...articleForm, category: event.target.value });
                if (articleErrors.category) setArticleErrors({ ...articleErrors, category: false });
              }}
            >
              <option value="">Select category</option>
              {newsCategories.map((category) => (
                <option key={category} value={category}>{newsCategoryLabels[category]}</option>
              ))}
            </select>
            <input
              className="rounded-2xl border bg-white/5 px-4 py-3 text-white transition-all duration-300 outline-none border-white/10 focus:border-orange-500/80 focus:ring-4 focus:ring-orange-500/10 md:col-span-2"
              placeholder="Panchayat / Local Area (Optional)"
              value={articleForm.panchayat}
              onChange={(event) => setArticleForm({ ...articleForm, panchayat: event.target.value })}
            />
            <textarea
              className={`rounded-2xl border px-4 py-3 text-white md:col-span-2 transition-all duration-300 outline-none ${
                articleErrors.excerpt
                  ? "bg-red-500/[0.07] border-white/10 shadow-[0_0_20px_rgba(239,68,68,0.06)]"
                  : "bg-white/5 border-white/10 focus:border-orange-500/80 focus:ring-4 focus:ring-orange-500/10"
              }`}
              rows="3"
              placeholder="Short excerpt"
              value={articleForm.excerpt}
              onChange={(event) => {
                setArticleForm({ ...articleForm, excerpt: event.target.value });
                if (articleErrors.excerpt) setArticleErrors({ ...articleErrors, excerpt: false });
              }}
            />
            <textarea
              className={`rounded-2xl border px-4 py-3 text-white md:col-span-2 transition-all duration-300 outline-none ${
                articleErrors.content
                  ? "bg-red-500/[0.07] border-white/10 shadow-[0_0_20px_rgba(239,68,68,0.06)]"
                  : "bg-white/5 border-white/10 focus:border-orange-500/80 focus:ring-4 focus:ring-orange-500/10"
              }`}
              rows="8"
              placeholder="Full article content"
              value={articleForm.content}
              onChange={(event) => {
                setArticleForm({ ...articleForm, content: event.target.value });
                if (articleErrors.content) setArticleErrors({ ...articleErrors, content: false });
              }}
            />

            {articleForm.audioUrl && (
              <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Voice News Audio File</h4>
                    <p className="text-xs text-slate-400 mt-1">Manage the audio file, re-record, or upload a pre-recorded bulletin.</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    <Mic size={10} className="text-emerald-400 shrink-0" />
                    Voice Format
                  </span>
                </div>

                {/* Audio Preview Box */}
                {articleForm.audioUrl && (
                  <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Current Audio Preview</p>
                    <audio src={articleForm.audioUrl} controls className="w-full" />
                  </div>
                )}

                {/* Actions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Re-record Option */}
                  <div className="rounded-xl border border-white/5 bg-slate-900/30 p-4 flex flex-col justify-between space-y-4">
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300">Option A: Re-record Audio</h5>
                      <p className="text-xs text-slate-500 mt-1">Use your microphone to record a new voice bulletin directly in your browser.</p>
                    </div>

                    {isRecording ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="flex items-center gap-1.5 text-red-400">
                            <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-ping" />
                            Recording...
                          </span>
                          <span>{formatDuration(recordingTime)}</span>
                        </div>
                        
                        {/* Real-time mic wave meter visualization */}
                        <div className="rounded-xl border border-red-500/15 bg-red-950/15 p-2">
                          <AudioWaveform waveform={recordingWaveform} active={isRecording} compact className="h-10 border-0 bg-transparent py-0 px-0" />
                        </div>

                        <button
                          type="button"
                          onClick={stopRecordingAudio}
                          className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold py-2 px-3 text-xs transition animate-[pulse_2s_infinite]"
                        >
                          <Square size={12} />
                          Stop Recording
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={startRecordingAudio}
                        className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-400 font-semibold py-2.5 px-3 text-xs transition w-full"
                      >
                        <Mic size={12} />
                        Start Re-recording
                      </button>
                    )}
                  </div>

                  {/* Upload Pre-recorded Option */}
                  <div className="rounded-xl border border-white/5 bg-slate-900/30 p-4 flex flex-col justify-between space-y-4">
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300">Option B: Upload Audio File</h5>
                      <p className="text-xs text-slate-500 mt-1">Upload a pre-recorded audio file (.mp3, .wav, .m4a, or .webm format).</p>
                    </div>
                    <div>
                      <label className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-400 font-semibold py-2.5 px-3 text-xs cursor-pointer transition w-full">
                        <Upload size={12} />
                        Choose Audio File
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={handleAudioFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Staged Preview Console (Previewing recorded/uploaded audio before replacing) */}
                {stagedAudioUrl && (
                  <div className="rounded-2xl border border-orange-500/25 bg-orange-500/[0.03] p-4 space-y-3 animate-[fadeIn_0.3s_ease-out] shadow-md mt-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">Audio Preview Staged</span>
                        <h5 className="text-xs font-semibold text-white mt-0.5 truncate max-w-[280px]" title={stagedAudioName}>
                          Previewing: {stagedAudioName}
                        </h5>
                      </div>
                      <span className="rounded-full bg-orange-500/10 px-2.5 py-0.5 text-[9px] uppercase tracking-wider text-orange-400 font-bold border border-orange-500/20">
                        Not Applied Yet
                      </span>
                    </div>

                    <audio src={stagedAudioUrl} controls className="w-full" />

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                      <button
                        type="button"
                        onClick={discardStagedAudio}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-red-500/25 hover:bg-red-500/10 hover:text-red-400 transition"
                      >
                        <Trash2 size={12} />
                        Discard
                      </button>
                      <button
                        type="button"
                        onClick={applyStagedAudio}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.25)] transition"
                      >
                        <Check size={12} />
                        Apply & Replace Old Audio
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="md:col-span-2">
              <div className={`rounded-2xl p-0.5 transition-all duration-300 ${
                articleErrors.coverImageUrl
                  ? "bg-red-500/[0.04] shadow-[0_0_25px_rgba(239,68,68,0.08)] border border-white/5"
                  : ""
              }`}>
                <ImagePicker
                  label="Article Cover Image"
                  helpText="Upload a strong visual to make the story look professional on cards and article pages."
                  value={articleForm.coverImageUrl}
                  onChange={(value) => {
                    setArticleForm({ ...articleForm, coverImageUrl: value });
                    if (articleErrors.coverImageUrl) setArticleErrors({ ...articleErrors, coverImageUrl: false });
                  }}
                />
              </div>
            </div>
            <label className="flex items-center gap-3 text-sm text-slate-500 md:col-span-2">
              <input type="checkbox" checked={articleForm.breaking} onChange={(event) => setArticleForm({ ...articleForm, breaking: event.target.checked })} />
              Mark as breaking news
            </label>
            <button
              type="submit"
              disabled={Boolean(busyAction)}
              className="rounded-2xl bg-orange-500 hover:bg-orange-400 disabled:bg-orange-500/20 disabled:text-white/40 disabled:cursor-not-allowed transition-all duration-300 px-4 py-3 font-semibold text-white md:col-span-2 shadow-lg"
            >
              {busyAction ? "Saving..." : editingArticleId ? "Update Article" : user?.role === "super_admin" ? "Publish News" : "Submit News"}
            </button>
          </form>
        )}
      </div>
    );
  };

  const renderArchiveLogs = () => {
    return (
      <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
        <PublishedArchiveSection
          selectedDate={publishedArchiveDate}
          onDateChange={setPublishedArchiveDate}
          articles={publishedArchiveArticles}
          onRefresh={() => refreshPublishedArchive()}
          onDelete={requestPublishedArchiveDelete}
          busy={archiveBusy}
          onEditArticle={startEditArticle}
          onDeleteArticle={(article) => setPendingArchiveArticleDelete(article)}
          onCopyLink={copyArticleLink}
          onOpenArticle={openArticleFromDashboard}
        />
      </div>
    );
  };

  const renderMyStories = () => {
    return (
      <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
        <div className="panel p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-400">Content Library</p>
              <h2 className="text-2xl font-bold text-white mt-1">
                {user?.role === "super_admin" ? "All Platform Articles" : "My Articles"}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder="Search by title, area..."
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none focus:border-orange-500/80 focus:ring-4 focus:ring-orange-500/10 w-full sm:w-60 transition"
                value={myArticlesSearch}
                onChange={(e) => {
                  setMyArticlesSearch(e.target.value);
                  setArticlePage(1);
                }}
              />
              <select
                className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-2 text-sm text-white focus:outline-none"
                value={articleStatusFilter}
                onChange={(event) => {
                  setArticleStatusFilter(event.target.value);
                  setArticlePage(1);
                }}
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>
          {/* Tabular CMS Interface */}
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/5 bg-slate-900/10 backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Article Details</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Category</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Publish Date</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Views</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Format</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {pagedArticles.map((article) => {
                    const statusColors = 
                      article.status === "published"
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                        : article.status === "rejected"
                        ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                        : article.status === "pending"
                        ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                        : "bg-slate-500/10 text-slate-300 border-slate-500/20";
                    
                    const getCategoryStyles = (category) => {
                      switch (category) {
                        case "politics": return "bg-orange-500/10 text-orange-400 border-orange-500/20";
                        case "crime": return "bg-rose-500/10 text-rose-400 border-rose-500/20";
                        case "sports": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                        case "business": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
                        case "agriculture": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
                        case "education": return "bg-violet-500/10 text-violet-400 border-violet-500/20";
                        case "public_grievances": return "bg-red-500/10 text-red-400 border-red-500/20";
                        case "health": return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
                        case "technology": return "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20";
                        default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
                      }
                    };

                    const badgeStyle = getCategoryStyles(article.category);
                    
                    return (
                      <tr key={article._id} className="hover:bg-white/[0.01] transition duration-150 group">
                        {/* Column 1: Article details (Cover Image + Title) */}
                        <td className="px-6 py-4 max-w-sm">
                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-slate-950/60 border border-white/5 flex items-center justify-center">
                              {article.coverImageUrl ? (
                                <img src={article.coverImageUrl} alt={article.title} className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full bg-gradient-to-br from-orange-500/20 via-slate-800 to-slate-900 flex items-center justify-center">
                                  <FileText className="h-5 w-5 text-orange-400/40" />
                                </div>
                              )}
                              {article.audioUrl && (
                                <span className="absolute bottom-1 right-1 rounded bg-emerald-500 p-0.5 text-white" title="Voice News">
                                  <Mic size={8} />
                                </span>
                              )}
                            </div>
                            
                            <div className="min-w-0">
                              <h4 
                                onClick={() => openArticleFromDashboard(article)}
                                className="font-bold text-white hover:text-orange-400 transition cursor-pointer truncate text-sm line-clamp-1 outline-none"
                                title={article.title}
                              >
                                {article.title}
                              </h4>
                              <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                <MapPin size={10} className="text-slate-600 shrink-0" />
                                <span className="truncate max-w-[200px]">
                                  {[article.district, article.area].filter(Boolean).join(" • ") || "-"}
                                </span>
                              </div>
                              {article.editorFeedback && (
                                <div className="mt-1.5 text-[11px] text-rose-300 font-medium bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-lg inline-block max-w-[280px]" title={article.editorFeedback}>
                                  <span className="font-semibold text-rose-400">Feedback:</span> {article.editorFeedback}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Column 2: Status */}
                        <td className="px-6 py-4">
                          <span className={`inline-block rounded px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${statusColors}`}>
                            {article.status}
                          </span>
                        </td>

                        {/* Column 3: Category Badges */}
                        <td className="px-6 py-4">
                          {article.category ? (
                            <span className={`inline-block rounded px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${badgeStyle}`}>
                              {newsCategoryLabels[article.category] || article.category}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500 italic">Uncategorized</span>
                          )}
                        </td>

                        {/* Column 4: Published date detail */}
                        <td className="px-6 py-4">
                          <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                            <Calendar size={12} className="text-slate-500" />
                            {getArticlePublishedLabel(article)}
                          </div>
                        </td>

                        {/* Column 5: Pageviews count */}
                        <td className="px-6 py-4">
                          <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                            <Eye size={12} className="text-slate-500" />
                            {getArticleViews(article)}
                          </div>
                        </td>

                        {/* Column 6: Feedback / Audio story preview */}
                        <td className="px-6 py-4">
                          {article.audioUrl ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                              <Mic size={12} className="text-emerald-400 shrink-0 animate-pulse" />
                              Voice News
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-400">
                              <FileText size={12} className="text-blue-400 shrink-0" />
                              Text Article
                            </span>
                          )}
                        </td>

                        {/* Column 7: Action icons aligned cleanly */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => openArticleFromDashboard(article)}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/20 hover:text-white"
                              title="View Article"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyArticleLink(article);
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/20 hover:text-white"
                              title="Copy Share Link"
                            >
                              <Share2 size={14} />
                            </button>
                            
                            {(article.status !== "published" || user?.role === "super_admin" || user?.role === "chief_editor") && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditArticle(article);
                                  }}
                                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-900 transition hover:bg-slate-100"
                                  title="Edit Article"
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteArticle(article._id);
                                  }}
                                  className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-600/10 border border-rose-500/20 text-rose-400 transition hover:bg-rose-600 hover:text-white hover:border-rose-600"
                                  title="Delete Article"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Empty Search Result State */}
            {!pagedArticles.length && (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white/[0.01]">
                <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 text-slate-400 mb-4 animate-pulse">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-semibold text-white">No articles match your query or filter</h3>
                <p className="mt-1.5 text-xs text-slate-500 max-w-sm leading-5">
                  Try clearing your search query or choosing a different status filter to view your stories list.
                </p>
              </div>
            )}
          </div>

          {/* Pagination Footer */}
          {filteredArticles.length > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5 pt-5">
              <div className="text-xs text-slate-500">
                Showing <span className="font-semibold text-white">{(articlePage - 1) * myArticlesPageSize + 1}</span> to{" "}
                <span className="font-semibold text-white">{Math.min(articlePage * myArticlesPageSize, filteredArticles.length)}</span> of{" "}
                <span className="font-semibold text-white">{filteredArticles.length}</span> entries
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                {/* Page Size Select */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Rows per page:</span>
                  <select
                    className="rounded-xl border border-white/10 bg-slate-950 px-2 py-1 text-xs text-white focus:outline-none"
                    value={myArticlesPageSize}
                    onChange={(e) => {
                      setMyArticlesPageSize(Number(e.target.value));
                      setArticlePage(1);
                    }}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                  </select>
                </div>
                
                {/* Page switching buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={articlePage === 1}
                    onClick={() => setArticlePage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white disabled:opacity-40 hover:bg-white/5 transition"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-slate-400 px-2">
                    Page {articlePage} of {totalArticlePages}
                  </span>
                  <button
                    type="button"
                    disabled={articlePage === totalArticlePages}
                    onClick={() => setArticlePage((p) => Math.min(totalArticlePages, p + 1))}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white disabled:opacity-40 hover:bg-white/5 transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderApprovals = () => {
    return (
      <div className="panel p-6 border border-white/5 bg-slate-900/10 animate-[fadeIn_0.4s_ease-out]">
        <div className="border-b border-white/5 pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-400">Onboarding Verification Queue</p>
          <h2 className="text-2xl font-bold text-white mt-1">Reporter Approvals</h2>
          <p className="text-xs text-slate-400 mt-1">Review onboarding applications, verify Aadhaar KYC scans, and authorize digital press card credentials.</p>
        </div>

        <input 
          className="mt-5 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition" 
          placeholder="Search pending reporters by name, phone, district..." 
          value={pendingUserSearch} 
          onChange={(event) => setPendingUserSearch(event.target.value)} 
        />

        <div className="mt-6 space-y-3">
          {visiblePendingUsers.map((pendingUser) => (
            <div 
              key={pendingUser._id} 
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/20 px-5 py-4 transition hover:border-white/20 hover:bg-slate-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Left section: Profile & Name & Role */}
              <div className="flex items-center gap-4 min-w-0">
                <div className="h-11 w-11 rounded-xl overflow-hidden bg-slate-955 border border-white/10 flex items-center justify-center shrink-0">
                  {pendingUser.profilePhotoUrl || pendingUser.livePhotoUrl ? (
                    <img src={pendingUser.profilePhotoUrl || pendingUser.livePhotoUrl} alt={pendingUser.fullName} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-slate-400">
                      {pendingUser.fullName ? pendingUser.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "PE"}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-white text-sm truncate" title={pendingUser.fullName}>{pendingUser.fullName}</p>
                    <span className="inline-block rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider shrink-0">
                      {String(pendingUser.role || "reporter").replaceAll("_", " ")}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">{pendingUser.email || "No email provided"}</p>
                </div>
              </div>

              {/* Middle section: Compact Meta Details */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 uppercase tracking-wider text-[8px] font-bold">Phone:</span>
                  <span className="font-mono font-semibold text-slate-200">{pendingUser.phone}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 uppercase tracking-wider text-[8px] font-bold">District:</span>
                  <span className="font-semibold text-slate-200">{pendingUser.district || "-"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 uppercase tracking-wider text-[8px] font-bold">Area:</span>
                  <span className="font-semibold text-slate-200 truncate max-w-[150px]">{pendingUser.area || "-"}</span>
                </div>
              </div>

              {/* Right section: Review Action */}
              <button 
                type="button" 
                onClick={() => setSelectedPendingUser(pendingUser)} 
                className="rounded-xl bg-orange-600 hover:bg-orange-500 transition text-xs font-bold text-white px-5 py-2.5 flex items-center justify-center gap-1.5 shadow-md shadow-orange-950/20 shrink-0 self-stretch md:self-auto"
              >
                <span>Review Onboarding</span>
                <ChevronRight size={12} />
              </button>
            </div>
          ))}
        </div>
        
        {!visiblePendingUsers.length ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-white/10 bg-slate-900/5 mt-6">
            <ShieldAlert className="h-8 w-8 text-slate-500 mx-auto mb-2" />
            <p className="text-slate-400 text-sm font-semibold">No reporter approvals waiting</p>
            <p className="text-slate-500 text-xs mt-1">Pending user registration requests will appear here for review.</p>
          </div>
        ) : null}
      </div>
    );
  };

  const renderDirectory = () => {
    const DetailRow = ({ icon: Icon, label, value, valueClassName = "" }) => (
      <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-b-0">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon size={13} className="text-slate-400 flex-shrink-0" />}
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">{label}</span>
        </div>
        <span className={`text-slate-200 font-medium text-xs text-right max-w-[60%] truncate ${valueClassName}`}>{value}</span>
      </div>
    );

    if (selectedManagedUser) {
      return (
        <div className="panel p-6 border border-white/5 bg-slate-900/10 animate-[fadeIn_0.4s_ease-out]">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-4 mb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-400">Platform Users</p>
              <h2 className="text-2xl font-bold text-white mt-1">Journalist Profile Details</h2>
              <p className="text-xs text-slate-400 mt-1.5">Manage permissions, review verification documents, and check live credentials.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedManagedUser(null);
                resetManagedUserForm();
              }}
              className="rounded-full border border-white/10 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/5 hover:border-white/20 transition flex items-center gap-2"
            >
              <span>← Back to Directory</span>
            </button>
          </div>

          <div 
            className="w-full bg-slate-950/40 border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.85)] relative flex flex-col md:flex-row overflow-hidden rounded-[24px] sm:rounded-[32px]"
          >
            {editingManagedUserId === selectedManagedUser._id ? (
              /* Edit View inside the Panel */
              <div className="w-full p-6 md:p-8 flex flex-col justify-between space-y-6">
                <div className="border-b border-white/5 pb-4 pr-12">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-400">Edit User Details</p>
                  <h2 className="text-2xl font-bold text-white mt-1">Update {selectedManagedUser.fullName}</h2>
                </div>
                
                <div className="space-y-4 text-xs">
                  {managedUserForm.role === "reporter" ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <ManagedImagePreview title="Profile Photo" src={managedUserForm.profilePhotoUrl} alt="Profile" />
                      <ManagedImagePreview title="Aadhaar Photo" src={managedUserForm.aadhaarImageUrl} alt="Aadhaar" />
                      <div className="sm:col-span-2">
                        <ImagePicker label="Reupload Profile Photo" value={managedUserForm.profilePhotoUrl} onChange={(value) => setManagedUserForm({ ...managedUserForm, profilePhotoUrl: value })} />
                      </div>
                      <div className="sm:col-span-2">
                        <ImagePicker label="Reupload Aadhaar Photo" value={managedUserForm.aadhaarImageUrl} onChange={(value) => setManagedUserForm({ ...managedUserForm, aadhaarImageUrl: value })} />
                      </div>
                    </div>
                  ) : null}

                  {managedUserForm.role === "chief_editor" ? (
                    <div className="space-y-4">
                      <ManagedImagePreview title="Live Photo" src={managedUserForm.livePhotoUrl} alt="Live Photo" />
                      <WebcamCapture value={managedUserForm.livePhotoUrl} onCapture={(value) => setManagedUserForm({ ...managedUserForm, livePhotoUrl: value })} />
                    </div>
                  ) : null}

                  <div className="grid gap-4 sm:grid-cols-2 pt-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase pl-1">Full Name</span>
                      <input className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:outline-none" value={managedUserForm.fullName} onChange={(event) => setManagedUserForm({ ...managedUserForm, fullName: event.target.value })} placeholder="Full name" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase pl-1">Email</span>
                      <input className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:outline-none" value={managedUserForm.email} onChange={(event) => setManagedUserForm({ ...managedUserForm, email: event.target.value })} placeholder="Email" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase pl-1">Phone</span>
                      <input className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:outline-none" value={managedUserForm.phone} onChange={(event) => setManagedUserForm({ ...managedUserForm, phone: event.target.value })} placeholder="Phone" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase pl-1">Role</span>
                      <select className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-white focus:outline-none" value={managedUserForm.role} onChange={(event) => setManagedUserForm({ ...managedUserForm, role: event.target.value })}>
                        {managedRoleOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase pl-1">District</span>
                      <input className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:outline-none" value={managedUserForm.district} onChange={(event) => setManagedUserForm({ ...managedUserForm, district: event.target.value })} placeholder="District" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase pl-1">Area / Block</span>
                      <input className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:outline-none" value={managedUserForm.area} onChange={(event) => setManagedUserForm({ ...managedUserForm, area: event.target.value })} placeholder="Area / Block" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase pl-1">Approval Status</span>
                      <select className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-white focus:outline-none" value={managedUserForm.approvalStatus} onChange={(event) => setManagedUserForm({ ...managedUserForm, approvalStatus: event.target.value })}>
                        {approvalOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase pl-1">Valid Upto Expiry Date</span>
                      <input type="date" className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-white focus:outline-none" value={managedUserForm.validUpto ? managedUserForm.validUpto.slice(0, 10) : ""} onChange={(event) => setManagedUserForm({ ...managedUserForm, validUpto: event.target.value })} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase pl-1">Blood Group</span>
                      <select className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-white focus:outline-none" value={managedUserForm.bloodGroup || "O+"} onChange={(event) => setManagedUserForm({ ...managedUserForm, bloodGroup: event.target.value })}>
                        {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase pl-1">Educational Qualification</span>
                      <input className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:outline-none" value={managedUserForm.education || ""} onChange={(event) => setManagedUserForm({ ...managedUserForm, education: event.target.value })} placeholder="Graduate, Postgraduate, etc." />
                    </div>
                  </div>

                  <div className="grid gap-3 pt-3">
                    <label className="flex items-center gap-3 rounded-xl border border-white/10 px-4 py-2.5 text-xs text-slate-400 cursor-pointer hover:bg-white/5 transition">
                      <input type="checkbox" checked={managedUserForm.isEmailVerified} onChange={(event) => setManagedUserForm({ ...managedUserForm, isEmailVerified: event.target.checked })} />
                      Email verified
                    </label>
                    <label className="flex items-center gap-3 rounded-xl border border-white/10 px-4 py-2.5 text-xs text-slate-400 cursor-pointer hover:bg-white/5 transition">
                      <input type="checkbox" checked={managedUserForm.isFunctionalityDisabled} onChange={(event) => setManagedUserForm({ ...managedUserForm, isFunctionalityDisabled: event.target.checked })} />
                      Disable all newsroom actions
                    </label>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 border-t border-white/5 pt-4 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      resetManagedUserForm();
                    }}
                    className="w-full sm:w-auto rounded-full border border-white/10 px-5 py-2 text-xs font-bold text-white hover:bg-white/5 transition text-center justify-center flex items-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await saveManagedUser(selectedManagedUser._id);
                      const currentUsers = managedUsers;
                      const nextUser = currentUsers.find(u => u._id === selectedManagedUser._id) || selectedManagedUser;
                      setSelectedManagedUser(nextUser);
                    }}
                    className="w-full sm:w-auto rounded-full bg-emerald-600 px-6 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition text-center justify-center flex items-center"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              /* Premium Detailed Profile View split layout */
              <>
                {/* Left Column: ID Preview & Primary Info */}
                <div className="w-full md:w-80 bg-slate-900/30 border-b md:border-b-0 md:border-r border-white/5 p-6 flex flex-col items-center justify-between text-center gap-6 flex-shrink-0">
                  <div className="w-full space-y-4 mt-4">
                    {/* Brand Header */}
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[9px] font-black uppercase tracking-[0.25em] text-orange-500">Palamu Express</span>
                      <span className="text-[10px] font-bold text-slate-500 tracking-wider">PRESS AUTHORITY</span>
                    </div>

                    {/* Profile Photo */}
                    <div className="relative mx-auto mt-2">
                      <div className={`h-28 w-28 rounded-[28px] overflow-hidden bg-slate-955 border-2 ${
                        selectedManagedUser.approvalStatus === "approved"
                          ? "border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                          : selectedManagedUser.approvalStatus === "pending"
                            ? "border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.25)] animate-pulse"
                            : "border-rose-500 shadow-[0_0_20px_rgba(239,68,68,0.25)]"
                      } flex items-center justify-center`}>
                        {selectedManagedUser.profilePhotoUrl || selectedManagedUser.livePhotoUrl ? (
                          <img src={selectedManagedUser.profilePhotoUrl || selectedManagedUser.livePhotoUrl} alt={selectedManagedUser.fullName} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-3xl font-black text-slate-400">
                            {selectedManagedUser.fullName ? selectedManagedUser.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "PE"}
                          </span>
                        )}
                      </div>

                      {selectedManagedUser.approvalStatus === "approved" && (
                        <div className="absolute -bottom-1 -right-1 rounded-full bg-emerald-500 p-1 border-4 border-slate-955 text-white flex items-center justify-center">
                          <ShieldCheck size={16} className="fill-emerald-500 text-slate-955" />
                        </div>
                      )}
                    </div>

                    {/* Primary Names & Roles */}
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-white leading-tight px-2">{selectedManagedUser.fullName}</h3>
                      <div className="flex justify-center gap-1.5 flex-wrap pt-1">
                        <span className={`rounded-full px-2.5 py-0.5 text-[8px] font-black tracking-widest uppercase ${
                          selectedManagedUser.role === "chief_editor"
                            ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                            : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                        }`}>
                          {String(selectedManagedUser.role || "").replaceAll("_", " ")}
                        </span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[8px] font-black tracking-widest uppercase ${
                          selectedManagedUser.approvalStatus === "approved"
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : selectedManagedUser.approvalStatus === "pending"
                              ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 animate-pulse"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}>
                          {selectedManagedUser.approvalStatus}
                        </span>
                      </div>
                    </div>

                    {/* Code Badge */}
                    <div className="mt-2 rounded-xl bg-white/5 border border-white/5 py-2 px-3 text-center">
                      <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Accreditation Code</p>
                      <p className="text-xs font-mono font-bold text-slate-300 mt-0.5">
                        {selectedManagedUser.reporterCode || selectedManagedUser.chiefEditorCode || "PE-REP-PENDING"}
                      </p>
                    </div>
                  </div>

                  {/* Quick Edit/Delete buttons in left column */}
                  <div className="w-full grid grid-cols-2 gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => startEditManagedUser(selectedManagedUser)}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 py-2.5 text-xs font-bold text-white hover:bg-white/5 hover:border-white/20 transition duration-200"
                    >
                      <Edit3 size={12} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingManagedUserDelete(selectedManagedUser);
                        setSelectedManagedUser(null);
                      }}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-950/40 border border-rose-500/20 px-3 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-900/30 hover:border-rose-500/40 transition duration-200"
                    >
                      <Trash2 size={12} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                {/* Right Column: Metadata details & KYC doc previews */}
                <div className="flex-1 p-6 md:p-8 flex flex-col justify-between min-h-0">
                  <div className="space-y-6">
                    {/* Subsection: Directory Profile Details */}
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-3 border-b border-white/5 pb-2">Profile Credentials</h4>
                      <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 text-xs">
                        <DetailRow icon={Phone} label="Mobile Phone" value={selectedManagedUser.phone} />
                        <DetailRow icon={Mail} label="Official Email" value={selectedManagedUser.email || "-"} />
                        <DetailRow icon={MapPin} label="District Jurisdiction" value={selectedManagedUser.district || "-"} />
                        <DetailRow icon={MapPin} label="Block / Area" value={selectedManagedUser.area || "-"} />
                        <DetailRow icon={Droplet} label="Blood Group" value={selectedManagedUser.bloodGroup || "-"} />
                        <DetailRow icon={GraduationCap} label="Education" value={selectedManagedUser.education || "-"} />
                        <DetailRow icon={Award} label="Aadhaar Number" value={selectedManagedUser.aadhaarNumber || "-"} />
                        <DetailRow
                          icon={ShieldCheck}
                          label="Email Verification"
                          value={selectedManagedUser.isEmailVerified ? "Verified" : "Pending"}
                          valueClassName={selectedManagedUser.isEmailVerified ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}
                        />
                        <DetailRow
                          icon={UserX}
                          label="Account Status"
                          value={selectedManagedUser.isFunctionalityDisabled ? "Disabled (Banned)" : "Active & Enabled"}
                          valueClassName={selectedManagedUser.isFunctionalityDisabled ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}
                        />
                        <DetailRow
                          icon={Calendar}
                          label="Accreditation Expiry"
                          value={selectedManagedUser.validUpto 
                            ? new Date(selectedManagedUser.validUpto).toLocaleDateString("en-IN") 
                            : globalIdCardExpiry 
                              ? `${new Date(globalIdCardExpiry).toLocaleDateString("en-IN")} (Global)` 
                              : "Permanent / Auto-Renewal"
                          }
                        />
                      </div>
                    </div>

                    {/* Subsection: KYC Verification Documents */}
                    <div className="border-t border-white/5 pt-4 space-y-3">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">KYC Verification Documents</h4>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {selectedManagedUser.role === "reporter" && selectedManagedUser.profilePhotoUrl && (
                          <div className="group/kyc relative overflow-hidden rounded-xl border border-white/10 bg-slate-900/50 p-2">
                            <p className="text-[9px] text-slate-400 font-black mb-1.5 uppercase tracking-wider">Registered Profile Photo</p>
                            <div className="h-32 overflow-hidden rounded-lg bg-slate-955 flex items-center justify-center">
                              <img src={selectedManagedUser.profilePhotoUrl} alt="Profile Scan" className="w-full h-full object-contain transition-transform duration-300 group-hover/kyc:scale-105" />
                            </div>
                          </div>
                        )}
                        {selectedManagedUser.role === "reporter" && selectedManagedUser.aadhaarImageUrl && (
                          <div className="group/kyc relative overflow-hidden rounded-xl border border-white/10 bg-slate-900/50 p-2">
                            <p className="text-[9px] text-slate-400 font-black mb-1.5 uppercase tracking-wider">Aadhaar Card Document</p>
                            <div className="h-32 overflow-hidden rounded-lg bg-slate-955 flex items-center justify-center">
                              <img src={selectedManagedUser.aadhaarImageUrl} alt="Aadhaar Scan" className="w-full h-full object-contain transition-transform duration-300 group-hover/kyc:scale-105" />
                            </div>
                          </div>
                        )}
                        {selectedManagedUser.role === "chief_editor" && selectedManagedUser.livePhotoUrl && (
                          <div className="sm:col-span-2 group/kyc relative overflow-hidden rounded-xl border border-white/10 bg-slate-900/50 p-2">
                            <p className="text-[9px] text-slate-400 font-black mb-1.5 uppercase tracking-wider">Live Verification Camera Capture</p>
                            <div className="h-44 overflow-hidden rounded-lg bg-slate-955 flex items-center justify-center">
                              <img src={selectedManagedUser.livePhotoUrl} alt="Live Verification Scan" className="w-full h-full object-contain transition-transform duration-300 group-hover/kyc:scale-105" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Subsection: Accredited Documents & Letters */}
                    {selectedManagedUser.approvalStatus === "approved" && (
                      <div className="border-t border-white/5 pt-4 space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Accredited Documents & Letters</h4>
                        
                        <div className="grid gap-3 sm:grid-cols-3">
                          {/* Press ID Card */}
                          <button
                            type="button"
                            onClick={() => triggerPdfDownload(
                              `/users/download-card/${selectedManagedUser._id}`,
                              `Palamu_Express_ID_Card_${selectedManagedUser.reporterCode || selectedManagedUser.chiefEditorCode || "Staff"}.pdf`,
                              "Digital Press Card"
                            )}
                            className="group flex flex-col justify-between text-left w-full rounded-xl border border-white/10 bg-slate-900/40 p-3 hover:border-orange-500/50 hover:bg-orange-500/[0.02] transition cursor-pointer"
                          >
                            <div className="flex gap-2.5">
                              <div className="mt-0.5 flex-shrink-0 h-7 w-7 rounded-lg bg-orange-600/10 border border-orange-500/20 flex items-center justify-center text-orange-400 group-hover:bg-orange-600 group-hover:text-white transition">
                                <IdCard size={14} />
                              </div>
                              <div>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider group-hover:text-orange-400 transition">Digital Press Card</p>
                                <p className="text-[11.5px] font-bold text-white mt-0.5">Official ID Card PDF</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold text-orange-400 mt-3 flex items-center gap-1 group-hover:underline">
                              Download ID PDF &rarr;
                            </span>
                          </button>

                          {/* Appointment Letter */}
                          <button
                            type="button"
                            onClick={() => triggerPdfDownload(
                              `/users/download-appt/${selectedManagedUser._id}`,
                              `Palamu_Express_Appointment_Letter_${selectedManagedUser.reporterCode || selectedManagedUser.chiefEditorCode || "Staff"}.pdf`,
                              "Official Appointment Letter"
                            )}
                            className="group flex flex-col justify-between text-left w-full rounded-xl border border-white/10 bg-slate-900/40 p-3 hover:border-orange-500/50 hover:bg-orange-500/[0.02] transition cursor-pointer"
                          >
                            <div className="flex gap-2.5">
                              <div className="mt-0.5 flex-shrink-0 h-7 w-7 rounded-lg bg-orange-600/10 border border-orange-500/20 flex items-center justify-center text-orange-400 group-hover:bg-orange-600 group-hover:text-white transition">
                                <FileText size={14} />
                              </div>
                              <div>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider group-hover:text-orange-400 transition">Appointment Letter</p>
                                <p className="text-[11.5px] font-bold text-white mt-0.5">Official Appointment PDF</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold text-orange-400 mt-3 flex items-center gap-1 group-hover:underline">
                              Download Appt PDF &rarr;
                            </span>
                          </button>

                          {/* Authorization Letter */}
                          <button
                            type="button"
                            onClick={() => triggerPdfDownload(
                              `/users/download-auth/${selectedManagedUser._id}`,
                              `Palamu_Express_Authorization_Letter_${selectedManagedUser.reporterCode || selectedManagedUser.chiefEditorCode || "Staff"}.pdf`,
                              "Credentials Authorization Letter"
                            )}
                            className="group flex flex-col justify-between text-left w-full rounded-xl border border-white/10 bg-slate-900/40 p-3 hover:border-orange-500/50 hover:bg-orange-500/[0.02] transition cursor-pointer"
                          >
                            <div className="flex gap-2.5">
                              <div className="mt-0.5 flex-shrink-0 h-7 w-7 rounded-lg bg-orange-600/10 border border-orange-500/20 flex items-center justify-center text-orange-400 group-hover:bg-orange-600 group-hover:text-white transition">
                                <ShieldCheck size={14} />
                              </div>
                              <div>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider group-hover:text-orange-400 transition">Authorization Letter</p>
                                <p className="text-[11.5px] font-bold text-white mt-0.5">Press Credentials PDF</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold text-orange-400 mt-3 flex items-center gap-1 group-hover:underline">
                              Download Credentials &rarr;
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Admin Control Actions */}
                  <div className="border-t border-white/5 pt-5 mt-6 flex flex-col sm:flex-row gap-3 justify-center sm:justify-end items-center w-full">
                    {/* Action: Disable / Enable */}
                    <button
                      type="button"
                      onClick={async () => {
                        const nextDisabledState = !selectedManagedUser.isFunctionalityDisabled;
                        await handleAction(async () => {
                          const payload = { isFunctionalityDisabled: nextDisabledState };
                          const { data } = await http.patch(`/users/${selectedManagedUser._id}`, payload);
                          syncManagedUserState(data.user);
                          setSelectedManagedUser(data.user);
                          await refreshAdminData();
                        }, nextDisabledState ? "User functionality disabled." : "User functionality enabled.");
                      }}
                      className={`w-full sm:w-auto rounded-full px-5 py-2.5 text-xs font-bold text-center justify-center flex items-center transition duration-200 ${
                        selectedManagedUser.isFunctionalityDisabled
                          ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
                          : "bg-slate-900 hover:bg-slate-800 text-rose-400 border border-rose-500/20 hover:border-rose-500/40"
                      }`}
                    >
                      {selectedManagedUser.isFunctionalityDisabled ? "Enable Access" : "Disable / Ban User"}
                    </button>

                    {/* Action: Approve / Reject (Ban) */}
                    {selectedManagedUser.approvalStatus !== "approved" ? (
                      <button
                        type="button"
                        onClick={async () => {
                          await approveUser(selectedManagedUser._id);
                          const currentUsers = managedUsers;
                          const nextUser = currentUsers.find(u => u._id === selectedManagedUser._id) || selectedManagedUser;
                          setSelectedManagedUser(nextUser);
                        }}
                        className="w-full sm:w-auto rounded-full bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-[0_4px_12px_rgba(16,185,129,0.2)] text-center justify-center flex items-center transition"
                      >
                        Approve Journalist
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (!feedbacks[`user-${selectedManagedUser._id}`]) {
                            setFeedbacks({
                              ...feedbacks,
                              [`user-${selectedManagedUser._id}`]: "KYC details require corrections"
                            });
                          }
                          setPendingUserRejectId(selectedManagedUser._id);
                        }}
                        className="w-full sm:w-auto rounded-full bg-slate-900 text-amber-400 border border-amber-500/20 hover:bg-slate-800 hover:border-amber-500/40 px-5 py-2.5 text-xs font-bold text-center justify-center flex items-center transition"
                      >
                        Reject Credentials
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="panel p-6 border border-white/5 bg-slate-900/10 animate-[fadeIn_0.4s_ease-out]">
        <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-400">Platform Users</p>
            <h2 className="text-2xl font-bold text-white mt-1">Journalist & Editor Directory</h2>
            <p className="text-xs text-slate-400 mt-1.5">View profiles, verify credentials, download ID cards, manage access, or approve/reject applicants.</p>
          </div>
        </div>
        
        {/* Search & Filters */}
        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px]">
          <input 
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition text-sm" 
            placeholder="Search registered reporters and chief editors by name, email, phone..." 
            value={managedUserSearch} 
            onChange={(event) => setManagedUserSearch(event.target.value)} 
          />
          <select 
            className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition text-sm cursor-pointer" 
            value={managedUserStatusFilter} 
            onChange={(event) => setManagedUserStatusFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Directory List View (Horizontal Rows) */}
        <div className="mt-6 space-y-3">
          {visibleManagedUsers.map((managedUser) => {
            const isApproved = managedUser.approvalStatus === "approved";
            const isPending = managedUser.approvalStatus === "pending";
            const isDisabled = Boolean(managedUser.isFunctionalityDisabled);
            const reporterCode = managedUser.reporterCode || managedUser.chiefEditorCode || "PE-REP-PENDING";

            return (
              <div
                id={`managed-user-${managedUser._id}`}
                key={managedUser._id}
                onClick={() => setSelectedManagedUser(managedUser)}
                className="group relative overflow-hidden rounded-[20px] border border-white/5 bg-slate-955/40 p-4 transition-all duration-300 hover:bg-slate-900/40 hover:border-orange-500/30 hover:shadow-[0_8px_30px_rgba(249,115,22,0.06)] flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer"
              >
                {/* Visual Glow Effect */}
                <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-orange-500/5 blur-[50px] transition-all duration-300 group-hover:bg-orange-500/10" />

                {/* Left Side: Avatar & Primary Metadata */}
                <div className="flex items-center gap-4 min-w-0">
                  {/* Avatar Container */}
                  <div className="relative flex-shrink-0">
                    <div className={`h-12 w-12 rounded-[14px] overflow-hidden bg-slate-900 border-2 transition-all duration-300 ${
                      isApproved 
                        ? "border-emerald-500/30 group-hover:border-emerald-500/60" 
                        : isPending 
                          ? "border-amber-500/30 group-hover:border-amber-500/60" 
                          : "border-rose-500/30 group-hover:border-rose-500/60"
                    } flex items-center justify-center`}>
                      {managedUser.profilePhotoUrl || managedUser.livePhotoUrl ? (
                        <img
                          src={managedUser.profilePhotoUrl || managedUser.livePhotoUrl}
                          alt={managedUser.fullName}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <span className="text-sm font-black text-slate-400">
                          {managedUser.fullName ? managedUser.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "PE"}
                        </span>
                      )}
                    </div>
                    {isApproved && (
                      <div className="absolute -bottom-1 -right-1 rounded-full bg-emerald-500 p-0.5 border border-slate-950 text-white flex items-center justify-center">
                        <ShieldCheck size={9} className="fill-emerald-500 text-slate-955" />
                      </div>
                    )}
                  </div>

                  {/* Name and Mono Code */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-white group-hover:text-orange-400 transition truncate">
                        {managedUser.fullName}
                      </h3>
                      <span className={`rounded-full px-2 py-0.5 text-[8px] font-extrabold tracking-widest uppercase ${
                        managedUser.role === "chief_editor"
                          ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                          : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                      }`}>
                        {String(managedUser.role || "").replaceAll("_", " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1 font-mono text-[9px] text-slate-400">
                        <Award size={10} />
                        {reporterCode}
                      </span>
                      <span className="flex items-center gap-1 text-slate-400 truncate">
                        <MapPin size={10} />
                        {joinMetaParts(managedUser.district, managedUser.area)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Middle: Contact Info */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Phone size={12} className="text-slate-500" />
                    <span className="font-mono text-slate-300">{managedUser.phone}</span>
                  </span>
                  {managedUser.email && (
                    <span className="flex items-center gap-1.5 max-w-[200px] truncate text-slate-300">
                      <Mail size={12} className="text-slate-500 font-bold" />
                      <span>{managedUser.email}</span>
                    </span>
                  )}
                </div>

                {/* Right Side: Status Badges and Trigger Button */}
                <div className="flex items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 border-white/5 pt-3 lg:pt-0">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider ${
                      isDisabled
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    }`}>
                      {isDisabled ? "Banned" : "Active"}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider ${
                      isApproved
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : isPending
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}>
                      {managedUser.approvalStatus}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 rounded-xl bg-orange-500/0 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-orange-400 border border-orange-500/0 transition-all duration-300 group-hover:bg-orange-500/10 group-hover:border-orange-500/20">
                    <span>Manage Profile</span>
                    <span className="translate-x-0 transition-transform group-hover:translate-x-1">→</span>
                  </div>
                </div>
              </div>
            );
          })}
          {!visibleManagedUsers.length ? (
            <div className="py-12 text-center border border-white/5 rounded-2xl bg-white/[0.01]">
              <p className="text-slate-500 italic text-sm">No registered journalists or chief editors match your search criteria.</p>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  const renderQueue = () => {
    return (
      <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
        <div className="panel p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-400">Editorial Review Queue</p>
              <h2 className="text-2xl font-bold text-white mt-1">News Publishing Queue</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder="Search pending stories..."
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none focus:border-orange-500/80 focus:ring-4 focus:ring-orange-500/10 w-full sm:w-60 transition"
                value={pendingArticleSearch}
                onChange={(e) => {
                  setPendingArticleSearch(e.target.value);
                  setPendingArticlePage(1);
                }}
              />
            </div>
          </div>

          {/* Tabular CMS Interface */}
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/5 bg-slate-900/10 backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Article Details</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Reporter</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Category</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Submission Date</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Format</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {pagedPendingArticles.map((article) => {
                    const isExpanded = expandedArticleId === article._id;
                    const getCategoryStyles = (category) => {
                      switch (category) {
                        case "politics": return "bg-orange-500/10 text-orange-400 border-orange-500/20";
                        case "crime": return "bg-rose-500/10 text-rose-400 border-rose-500/20";
                        case "sports": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                        case "business": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
                        case "agriculture": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
                        case "education": return "bg-violet-500/10 text-violet-400 border-violet-500/20";
                        case "public_grievances": return "bg-red-500/10 text-red-400 border-red-500/20";
                        case "health": return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
                        case "technology": return "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20";
                        default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
                      }
                    };

                    const badgeStyle = getCategoryStyles(article.category);
                    
                    return (
                      <>
                        <tr 
                          key={article._id} 
                          onClick={() => setExpandedArticleId(isExpanded ? null : article._id)}
                          className={`hover:bg-white/[0.01] transition duration-150 group cursor-pointer ${isExpanded ? "bg-white/[0.02]" : ""}`}
                        >
                          {/* Column 1: Article details (Cover Image + Title) */}
                          <td className="px-6 py-4 max-w-sm">
                            <div className="flex items-center gap-3">
                              <div className="relative shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-slate-950/60 border border-white/5 flex items-center justify-center">
                                {article.coverImageUrl ? (
                                  <img src={article.coverImageUrl} alt={article.title} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full w-full bg-gradient-to-br from-orange-500/20 via-slate-800 to-slate-900 flex items-center justify-center">
                                    <FileText className="h-5 w-5 text-orange-400/40" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-white group-hover:text-orange-400 transition truncate text-sm line-clamp-1">
                                  {article.title}
                                </h4>
                                <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                  <MapPin size={10} className="text-slate-600 shrink-0" />
                                  <span className="truncate max-w-[200px]">
                                    {[article.district, article.area].filter(Boolean).join(" • ") || "-"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Column 2: Reporter Details */}
                          <td className="px-6 py-4">
                            <div className="text-xs text-slate-300 font-semibold truncate max-w-[150px]">
                              {article.author?.fullName || "Journalist"}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {article.author?.phone || "-"}
                            </div>
                          </td>

                          {/* Column 3: Category */}
                          <td className="px-6 py-4">
                            {article.category ? (
                              <span className={`inline-block rounded px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${badgeStyle}`}>
                                {newsCategoryLabels[article.category] || article.category}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500 italic">Uncategorized</span>
                            )}
                          </td>

                          {/* Column 4: Submission date */}
                          <td className="px-6 py-4">
                            <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                              <Calendar size={12} className="text-slate-500" />
                              {formatDateTime(article.createdAt)}
                            </div>
                          </td>

                          {/* Column 5: Format */}
                          <td className="px-6 py-4">
                            {article.audioUrl ? (
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-400" title="Audio / Voice news story">
                                <Mic size={10} /> Voice
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-orange-400" title="Written article">
                                <FileText size={10} /> Standard
                              </span>
                            )}
                          </td>

                          {/* Column 6: Action triggers */}
                          <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => setExpandedArticleId(isExpanded ? null : article._id)}
                                className={`flex h-8 w-8 items-center justify-center rounded-full border border-white/10 transition ${isExpanded ? "bg-orange-500 text-white border-orange-500" : "bg-white/5 text-slate-300 hover:border-white/20 hover:text-white"}`}
                                title={isExpanded ? "Collapse Details" : "Expand for Review"}
                              >
                                <Sliders size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => approveArticle(article._id)}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 transition hover:bg-emerald-600 hover:text-white hover:border-emerald-600"
                                title="Approve & Publish Story"
                              >
                                <Check size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Collapsible Row Expansion */}
                        {isExpanded && (
                          <tr key={article._id + "-expanded"} className="bg-slate-950/40">
                            <td colSpan="6" className="px-6 py-6 border-b border-white/5">
                              <div className="grid gap-6 lg:grid-cols-3 animate-[fadeIn_0.3s_ease-out]">
                                {/* Cover Photo & Metadata Block */}
                                <div className="lg:col-span-1 space-y-4">
                                  {article.coverImageUrl ? (
                                    <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-slate-900 border border-white/5">
                                      <img src={article.coverImageUrl} alt={article.title} className="h-full w-full object-cover" />
                                    </div>
                                  ) : (
                                    <div className="aspect-[16/10] w-full rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 border border-white/5 flex flex-col items-center justify-center text-slate-600 p-4">
                                      <FileText size={32} className="text-orange-500/20 mb-2 animate-pulse" />
                                      <p className="text-xs font-semibold text-slate-500">No cover image uploaded</p>
                                    </div>
                                  )}
                                  
                                  {article.audioUrl && (
                                    <div className="panel p-4 bg-slate-900/50 border border-white/5 space-y-3">
                                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                                        <Mic size={12} /> Embedded Audio Bulletin
                                      </p>
                                      <AudioStoryPlayer article={article} compact={false} className="w-full" />
                                    </div>
                                  )}

                                  {/* Story Metadata rows */}
                                  <div className="panel p-4 bg-slate-900/30 border border-white/5 text-xs space-y-2.5">
                                    <div className="flex justify-between border-b border-white/5 pb-2">
                                      <span className="text-slate-500">Reporter:</span>
                                      <span className="font-semibold text-white">{article.author?.fullName || "Unassigned"}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-white/5 pb-2">
                                      <span className="text-slate-500">District Focus:</span>
                                      <span className="font-semibold text-orange-400">{article.district || "Jharkhand"}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-white/5 pb-2">
                                      <span className="text-slate-500">Block / Area:</span>
                                      <span className="font-semibold text-white">{article.area || "-"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Category Tag:</span>
                                      <span className="font-bold text-white uppercase tracking-wider">{newsCategoryLabels[article.category] || article.category}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Full Story Text Viewer */}
                                <div className="lg:col-span-2 flex flex-col justify-between space-y-5">
                                  <div className="space-y-4">
                                    <div>
                                      <h3 className="text-lg font-bold text-white font-display leading-tight">{article.title}</h3>
                                      {article.excerpt && (
                                        <p className="mt-2 text-xs text-slate-400 bg-white/[0.01] border border-white/5 p-3 rounded-xl italic leading-relaxed">
                                          <strong>Excerpt Summary:</strong> {article.excerpt}
                                        </p>
                                      )}
                                    </div>
                                    
                                    <div className="space-y-2">
                                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Article Content</h4>
                                      <div className="max-h-[250px] overflow-y-auto pr-2 text-sm text-slate-300 leading-relaxed bg-[#06080e]/40 border border-white/5 p-4 rounded-xl whitespace-pre-wrap">
                                        {article.content || "No text content provided."}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Editor Revision Composer and Actions */}
                                  <div className="space-y-3.5 pt-4 border-t border-white/5">
                                    <div className="space-y-1.5">
                                      <label className="text-[10px] font-bold uppercase tracking-wider text-rose-400 pl-1">Rejection Feedback / Editorial Revision Instructions</label>
                                      <textarea
                                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-xs text-white outline-none focus:border-rose-500/80 focus:ring-4 focus:ring-rose-500/10 placeholder-slate-600 transition duration-300"
                                        rows="2"
                                        placeholder="Explain why this news is rejected or what details the reporter needs to add/correct..."
                                        value={feedbacks[`article-${article._id}`] || ""}
                                        onChange={(event) => setFeedbacks({ ...feedbacks, [`article-${article._id}`]: event.target.value })}
                                      />
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                      <button 
                                        type="button" 
                                        onClick={() => setExpandedArticleId(null)}
                                        className="rounded-xl border border-white/10 px-4 py-2.5 text-xs text-slate-400 hover:text-white hover:bg-white/5 transition"
                                      >
                                        Close panel
                                      </button>
                                      <div className="flex gap-2">
                                        <button 
                                          type="button" 
                                          onClick={() => rejectArticle(article._id)}
                                          className="rounded-xl bg-rose-600/10 border border-rose-500/20 text-rose-400 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition px-5 py-2.5 text-xs font-semibold"
                                        >
                                          Reject Submission
                                        </button>
                                        <button 
                                          type="button" 
                                          onClick={() => approveArticle(article._id)}
                                          className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition px-5 py-2.5 text-xs font-bold flex items-center gap-1.5"
                                        >
                                          <Check size={14} /> Publish & Approve
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Empty Search Result State */}
            {!pagedPendingArticles.length && (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white/[0.01]">
                <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 text-slate-400 mb-4 animate-pulse">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-semibold text-white">No articles pending approval</h3>
                <p className="mt-1.5 text-xs text-slate-500 max-w-sm leading-5">
                  Great job! All submitted stories have been processed and approved. No reports are waiting in the editorial review queue.
                </p>
              </div>
            )}
          </div>

          {/* Pagination Footer */}
          {visiblePendingArticles.length > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5 pt-5">
              <div className="text-xs text-slate-500">
                Showing <span className="font-semibold text-white">{(pendingArticlePage - 1) * pendingArticlePageSize + 1}</span> to{" "}
                <span className="font-semibold text-white">{Math.min(pendingArticlePage * pendingArticlePageSize, visiblePendingArticles.length)}</span> of{" "}
                <span className="font-semibold text-white">{visiblePendingArticles.length}</span> entries
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                {/* Page Size Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Rows per page:</span>
                  <select
                    className="rounded-xl border border-white/10 bg-slate-950 px-2 py-1 text-xs text-white focus:outline-none"
                    value={pendingArticlePageSize}
                    onChange={(e) => {
                      setPendingArticlePageSize(Number(e.target.value));
                      setPendingArticlePage(1);
                    }}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                  </select>
                </div>
                
                {/* Page switching buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={pendingArticlePage === 1}
                    onClick={() => setPendingArticlePage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white disabled:opacity-40 hover:bg-white/5 transition"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-slate-400 px-2">
                    Page {pendingArticlePage} of {totalPendingArticlePages}
                  </span>
                  <button
                    type="button"
                    disabled={pendingArticlePage === totalPendingArticlePages}
                    onClick={() => setPendingArticlePage((p) => Math.min(totalPendingArticlePages, p + 1))}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white disabled:opacity-40 hover:bg-white/5 transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAdDesk = () => {
    const activeAdsCount = ads.filter((a) => a.status === "active").length;
    const totalAdBilling = ads.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    return (
      <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
        {/* Cockpit Header with primary Campaign Launch Trigger */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-400">Marketing Cockpit</p>
            <h2 className="text-2xl font-bold text-white mt-1">Advertisement Desk</h2>
            <p className="text-xs text-slate-500 mt-1">Manage active homepage sponsor grids and review incoming advertiser requests.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              resetAdForm();
              setIsCreatingAd(true);
            }}
            className="rounded-full bg-orange-500 hover:bg-orange-400 text-white px-5 py-2.5 text-sm font-semibold transition-all duration-250 flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 self-start sm:self-center"
          >
            <Megaphone size={16} /> Launch New Campaign
          </button>
        </div>

        {/* Metrics Bar */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
          <div className="panel p-4 border border-white/5 bg-slate-900/10 flex flex-col justify-center">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active Campaigns</span>
            <span className="text-2xl font-bold text-white mt-1">{activeAdsCount} Live</span>
          </div>
          <div className="panel p-4 border border-white/5 bg-slate-900/10 flex flex-col justify-center">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Ad Billings</span>
            <span className="text-2xl font-bold text-green-400 mt-1">Rs. {totalAdBilling.toLocaleString("en-IN")}</span>
          </div>
          <div className="panel p-4 border border-white/5 bg-slate-900/10 flex flex-col justify-center col-span-2 md:col-span-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pending Approvals</span>
            <span className={`text-2xl font-bold mt-1 ${pendingAdRequestsCount > 0 ? "text-orange-400 animate-pulse" : "text-white"}`}>
              {pendingAdRequestsCount} Request{pendingAdRequestsCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* Sub Navigation Tabs for Unified Ad Desk */}
        <div className="flex gap-4 border-b border-white/5 pb-2 overflow-x-auto">
          <button
            onClick={() => setAdDeskSubTab("all")}
            className={`pb-2 text-sm font-semibold border-b-2 whitespace-nowrap transition-all duration-200 ${
              adDeskSubTab === "all" ? "border-orange-500 text-orange-400 font-bold" : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Campaigns Directory ({visibleManagedAds.length})
          </button>
          <button
            onClick={() => setAdDeskSubTab("review")}
            className={`pb-2 text-sm font-semibold border-b-2 whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${
              adDeskSubTab === "review" ? "border-orange-500 text-orange-400 font-bold" : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Review Queue
            {pendingAdRequestsCount > 0 && (
              <span className="rounded-full bg-orange-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-lg animate-pulse">
                {pendingAdRequestsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setAdDeskSubTab("in_article")}
            className={`pb-2 text-sm font-semibold border-b-2 whitespace-nowrap transition-all duration-200 ${
              adDeskSubTab === "in_article" ? "border-orange-500 text-orange-400 font-bold" : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            In-Article Ad Placements
          </button>
          <button
            onClick={() => setAdDeskSubTab("analytics")}
            className={`pb-2 text-sm font-semibold border-b-2 whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${
              adDeskSubTab === "analytics" ? "border-orange-500 text-orange-400 font-bold" : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Activity size={14} className="text-orange-400 animate-pulse" />
            Performance Analytics
          </button>
          <button
            onClick={() => setAdDeskSubTab("pricing")}
            className={`pb-2 text-sm font-semibold border-b-2 whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${
              adDeskSubTab === "pricing" ? "border-orange-500 text-orange-400 font-bold" : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Sliders size={14} className="text-orange-400" />
            Package Pricing
          </button>
          <button
            onClick={() => setAdDeskSubTab("popups")}
            className={`pb-2 text-sm font-semibold border-b-2 whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${
              adDeskSubTab === "popups" ? "border-orange-500 text-orange-400 font-bold" : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Layers size={14} className="text-orange-400" />
            Pop-up Desk
          </button>
        </div>

        {adDeskSubTab === "all" && (
          /* ALL CAMPAIGNS DIRECTORY */
          <div className="space-y-6">
            {/* Search & Filters */}
            <div className="grid gap-3 sm:grid-cols-[1fr_180px_180px_150px]">
              <input
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none text-sm"
                placeholder="Search campaigns by brand, title, advertiser..."
                value={adSearch}
                onChange={(event) => setAdSearch(event.target.value)}
              />
              <select
                className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white focus:outline-none text-sm font-semibold text-orange-400"
                value={adPlacementFilter}
                onChange={(event) => setAdPlacementFilter(event.target.value)}
              >
                <option value="all" className="text-white">All Ad Slots</option>
                {adPlacements.map((p) => (
                  <option key={p.value} value={p.value} className="text-white">
                    {p.label}
                  </option>
                ))}
              </select>
              <select
                className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white focus:outline-none text-sm"
                value={adStatusFilter}
                onChange={(event) => setAdStatusFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                {adStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              <input
                type="date"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none text-sm"
                value={adDateFilter}
                onChange={(event) => setAdDateFilter(event.target.value)}
              />
            </div>

            {/* Control Bar for Exports and View Mode Toggle */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-b border-white/5 py-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAdViewMode("table")}
                  className={`rounded-xl px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 transition ${
                    adViewMode === "table" ? "bg-orange-500 text-white" : "bg-white/5 text-slate-400 hover:text-white"
                  }`}
                >
                  <List size={14} /> Tabular View
                </button>
                <button
                  type="button"
                  onClick={() => setAdViewMode("card")}
                  className={`rounded-xl px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 transition ${
                    adViewMode === "card" ? "bg-orange-500 text-white" : "bg-white/5 text-slate-400 hover:text-white"
                  }`}
                >
                  <LayoutGrid size={14} /> Card View
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={downloadAdsCSVReport}
                  className="rounded-xl bg-green-600/10 border border-green-500/20 text-green-400 hover:bg-green-600 hover:text-white px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                >
                  <FileSpreadsheet size={14} /> Export CSV (Excel)
                </button>
                <button
                  type="button"
                  onClick={downloadAdsPDFReport}
                  className="rounded-xl bg-orange-600/10 border border-orange-500/20 text-orange-400 hover:bg-orange-600 hover:text-white px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                >
                  <FileText size={14} /> Export PDF Report
                </button>
                 <button
                  type="button"
                  onClick={() => setPendingPauseAllAds(true)}
                  className="rounded-xl bg-rose-600/10 border border-rose-500/20 text-rose-400 hover:bg-rose-600 hover:text-white px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                >
                  <ShieldAlert size={14} /> Pause All Active Ads
                </button>
              </div>
            </div>

            {adViewMode === "table" ? (
              /* TABULAR VIEW OF CAMPAIGNS DIRECTORY */
              <div className="panel overflow-hidden border border-white/5 bg-slate-900/10 rounded-3xl">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1200px] border-collapse text-left text-xs text-slate-350">
                    <thead className="border-b border-white/5 bg-white/[0.02] text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="px-5 py-3 text-center" style={{ width: "5%" }}>S.No</th>
                        <th className="px-5 py-3">Banner & Title</th>
                        <th className="px-5 py-3">Company / Brand</th>
                        <th className="px-5 py-3">Placement Slot</th>
                        <th className="px-5 py-3 text-right">Pricing (INR)</th>
                        <th className="px-5 py-3 text-center">Duration</th>
                        <th className="px-5 py-3 text-center">Stats (Views / Clicks / CTR)</th>
                        <th className="px-5 py-3 text-center">Status</th>
                        <th className="px-5 py-3 text-center">Actions</th>
                        <th className="px-5 py-3 text-center" style={{ width: "120px" }}></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {visibleManagedAds.map((ad, idx) => {
                        const ctr = ad.viewsCount > 0 ? ((ad.clicksCount / ad.viewsCount) * 100).toFixed(2) : "0.00";
                        const placementLabel = adPlacements.find(p => p.value === ad.placement)?.label || ad.placement;
                        return (
                          <tr key={ad._id} className="hover:bg-white/[0.01] transition-colors duration-150">
                            <td className="px-5 py-4 text-center font-semibold text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                {ad.imageUrl ? (
                                  <img src={ad.imageUrl} alt={ad.title} className="h-8 w-12 object-cover rounded-lg border border-white/10 flex-shrink-0" />
                                ) : (
                                  <div className="h-8 w-12 rounded-lg border border-dashed border-white/15 bg-white/[0.01] flex items-center justify-center text-[9px] text-slate-500">No Image</div>
                                )}
                                <div className="truncate max-w-[180px]">
                                  <p className="font-bold text-white truncate text-xs" title={ad.title}>{ad.title}</p>
                                  <p className="text-[10px] text-slate-500 truncate mt-0.5" title={ad.advertiserName}>Advertiser: {ad.advertiserName || "Admin"}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-slate-300 font-medium whitespace-nowrap">
                              {ad.companyName || "Sponsor Brand"}
                            </td>
                            <td className="px-5 py-4 text-slate-400 whitespace-nowrap">
                              {placementLabel}
                            </td>
                            <td className="px-5 py-4 text-right text-green-400 font-bold whitespace-nowrap">
                              Rs. {Number(ad.amount || 0).toLocaleString("en-IN")}
                            </td>
                            <td className="px-5 py-4 text-center text-slate-300 font-medium whitespace-nowrap">
                              {ad.durationDays || 0} Days
                            </td>
                            <td className="px-5 py-4 text-center whitespace-nowrap">
                              <div className="inline-flex items-center gap-2 bg-white/[0.02] border border-white/5 rounded-xl px-2.5 py-1">
                                <span className="text-white font-medium" title="Impressions">{Number(ad.viewsCount || 0).toLocaleString("en-IN")}</span>
                                <span className="text-slate-600">/</span>
                                <span className="text-orange-400 font-medium" title="Clicks">{Number(ad.clicksCount || 0).toLocaleString("en-IN")}</span>
                                <span className="text-slate-600">/</span>
                                <span className="text-emerald-400 font-extrabold" title="CTR">{ctr}%</span>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-center whitespace-nowrap">
                              <span className={`rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider ${
                                ad.status === "active"
                                  ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                  : ad.status === "paused"
                                    ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                                    : ad.status === "expired"
                                      ? "bg-slate-500/10 text-slate-400 border border-slate-500/10"
                                      : ad.status === "pending_approval" || ad.status === "pending_payment"
                                        ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 animate-pulse"
                                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              }`}>
                                {String(ad.status).replaceAll("_", " ")}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-2">
                                {(ad.status === "active" || ad.status === "paused") && (
                                  <button
                                    type="button"
                                    onClick={() => toggleAdPause(ad)}
                                    className={`rounded-lg p-1.5 transition duration-150 border ${
                                      ad.status === "active"
                                        ? "bg-orange-500/10 hover:bg-orange-600 border-orange-500/20 hover:border-transparent text-orange-400 hover:text-white"
                                        : "bg-emerald-500/10 hover:bg-emerald-600 border-emerald-500/20 hover:border-transparent text-emerald-450 hover:text-white animate-pulse"
                                    }`}
                                    title={ad.status === "active" ? "Pause Campaign" : "Resume Campaign"}
                                  >
                                    {ad.status === "active" ? <Pause size={13} /> : <Play size={13} />}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => startEditAd(ad)}
                                  className="rounded-lg bg-white/5 hover:bg-white text-slate-400 hover:text-slate-900 p-1.5 transition duration-150"
                                  title="Edit Campaign"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPendingAdDelete(ad)}
                                  className="rounded-lg bg-rose-500/5 hover:bg-rose-600 border border-rose-500/10 hover:border-transparent text-rose-400 hover:text-white p-1.5 transition duration-150"
                                  title="Delete"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                            <td className="px-5 py-4" style={{ width: "120px" }}></td>
                          </tr>
                        );
                      })}
                      {!visibleManagedAds.length && (
                        <tr>
                          <td colSpan={10} className="px-5 py-12 text-center text-slate-500 italic">
                            No campaigns found matching your criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* Directory Cards Grid */
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {visibleManagedAds.map((ad) => (
                  <div key={ad._id} className="panel p-5 border border-white/5 bg-slate-900/10 flex flex-col justify-between">
                    <div>
                      {ad.imageUrl ? (
                        <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-950/40 p-2 mb-4 aspect-[16/9] flex items-center justify-center">
                          <img src={ad.imageUrl} alt={ad.title} className="max-h-full max-w-full object-contain" />
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.01] mb-4 aspect-[16/9] flex items-center justify-center text-xs text-slate-500">
                          No image banner uploaded
                        </div>
                      )}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                            ad.status === "active"
                              ? "bg-green-500/10 text-green-300 border border-green-500/20"
                              : ad.status === "paused"
                                ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                                : ad.status === "expired"
                                  ? "bg-slate-500/10 text-slate-300 border border-slate-500/20"
                                  : ad.status === "pending_approval" || ad.status === "pending_payment"
                                    ? "bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 animate-pulse"
                                    : "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                          }`}>
                            {String(ad.status).replaceAll("_", " ")}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Priority {ad.priority}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-white leading-tight truncate" title={ad.title}>{ad.title}</h4>
                        <p className="text-xs text-slate-500 font-semibold">{ad.companyName} • Rs. {Number(ad.amount || 0).toLocaleString("en-IN")} ({ad.durationDays} Days)</p>
                        <p className="text-xs text-slate-450 leading-relaxed line-clamp-2 min-h-[2.5rem]" title={ad.description || "No description provided"}>
                          {ad.description || "No campaign description provided."}
                        </p>
                        <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                          <div>
                            <span className="block text-[9px] uppercase tracking-wider text-slate-550">Placement</span>
                            <span className="text-white font-medium truncate block">{adPlacements.find(p => p.value === ad.placement)?.label || ad.placement}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] uppercase tracking-wider text-slate-550">Advertiser</span>
                            <span className="text-white font-medium truncate block" title={ad.advertiserName}>{ad.advertiserName || "Admin"}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-white/5 flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEditAd(ad)}
                        className="flex-grow rounded-full bg-white text-slate-900 hover:bg-slate-100 px-4 py-2 text-xs font-bold transition shadow-md hover:scale-[1.03] active:scale-[0.97]"
                      >
                        Edit Campaign
                      </button>
                      {(ad.status === "active" || ad.status === "paused") && (
                        <button
                          type="button"
                          onClick={() => toggleAdPause(ad)}
                          className={`rounded-full px-4 py-2 text-xs font-bold transition shadow-md hover:scale-[1.03] active:scale-[0.97] border ${
                            ad.status === "active"
                              ? "bg-orange-500/10 hover:bg-orange-600 border-orange-500/20 hover:border-transparent text-orange-400 hover:text-white"
                              : "bg-indigo-500/10 hover:bg-indigo-600 border-indigo-500/20 hover:border-transparent text-indigo-400 hover:text-white animate-pulse"
                          }`}
                        >
                          {ad.status === "active" ? "Pause" : "Resume"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setPendingAdDelete(ad)}
                        className="rounded-full bg-rose-600/10 border border-rose-500/20 text-rose-400 hover:bg-rose-600 hover:text-white px-4 py-2 text-xs font-bold transition shadow-md"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {!visibleManagedAds.length ? (
                  <div className="col-span-full py-16 text-center text-slate-500">
                    No active or registered campaigns match your criteria.
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}

        {adDeskSubTab === "review" && (
          /* PENDING REVIEW QUEUE */
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {reviewableAds.map((ad) => (
                <div key={ad._id} className="panel p-5 border border-white/5 bg-[#0b0f19]/80 flex flex-col justify-between animate-[fadeIn_0.3s_ease-out]">
                  <div>
                    {ad.imageUrl ? (
                      <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-950/40 p-2 mb-4 aspect-[16/9] flex items-center justify-center">
                        <img src={ad.imageUrl} alt={ad.title} className="max-h-full max-w-full object-contain" />
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.01] mb-4 aspect-[16/9] flex items-center justify-center text-xs text-slate-550">
                        No image banner provided
                      </div>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-yellow-500/15 border border-yellow-500/20 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-yellow-300 animate-pulse">
                          Pending Approval
                        </span>
                        <span className="rounded-full bg-green-500/15 border border-green-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-green-300">
                          Paid
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white leading-tight truncate" title={ad.title}>{ad.title}</h4>
                      <p className="text-xs text-slate-500 font-semibold">{ad.companyName} • Rs. {Number(ad.amount || 0).toLocaleString("en-IN")} ({ad.durationDays} Days)</p>
                      
                      <div className="pt-3 border-t border-white/5 space-y-2 text-xs text-slate-400">
                        <p><span className="text-slate-500 font-semibold">Contact:</span> {ad.advertiserName} ({ad.advertiserPhone || ad.advertiserEmail || "No contact info"})</p>
                        <p><span className="text-slate-500 font-semibold">Placement:</span> {adPlacements.find(p => p.value === ad.placement)?.label || ad.placement}</p>
                        {ad.notes && (
                          <div className="mt-2 rounded-xl bg-white/[0.02] border border-white/5 p-2 text-[11px] italic">
                            Sponsor notes: {ad.notes}
                          </div>
                        )}
                      </div>

                      {/* Rejection Feedback Composition Box */}
                      <input
                        className="w-full mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-orange-500/30"
                        placeholder="Rejection feedback reason (required only if rejecting)"
                        value={feedbacks[`ad-${ad._id}`] || ""}
                        onChange={(event) => setFeedbacks({ ...feedbacks, [`ad-${ad._id}`]: event.target.value })}
                      />
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-white/5 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setInspectingAd(ad)}
                      className="w-full rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500 hover:text-white px-4 py-2 text-xs font-bold transition shadow-md flex items-center justify-center gap-1.5"
                    >
                      <Eye size={13} /> Inspect & Edit Campaign
                    </button>
                    <div className="flex gap-2 w-full">
                      <button
                        type="button"
                        onClick={() => setPendingAdApproveId(ad._id)}
                        className="flex-grow rounded-full bg-green-600 hover:bg-green-500 text-white px-4 py-2 text-xs font-bold transition shadow-md hover:scale-[1.03] active:scale-[0.97]"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => rejectAd(ad._id)}
                        className="flex-grow rounded-full bg-rose-600/10 border border-rose-500/20 text-rose-400 hover:bg-rose-600 hover:text-white px-4 py-2 text-xs font-bold transition shadow-md"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {!reviewableAds.length ? (
                <div className="col-span-full py-20 text-center text-slate-500 text-sm">
                  Review queue is empty. There are no pending paid campaigns.
                </div>
              ) : null}
            </div>
          </div>
        )}

        {adDeskSubTab === "in_article" && (
          /* IN-ARTICLE AD PLACEMENTS TABLE */
          <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
            {/* Search filter */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <input
                className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none text-sm placeholder:text-slate-650"
                placeholder="Filter articles by title, author or category..."
                value={inArticleSearch}
                onChange={(e) => {
                  setInArticleSearch(e.target.value);
                  setInArticlePage(1);
                }}
              />
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                {allArticlesLoading ? "Loading Articles..." : `${allArticles.length} Articles Total`}
              </span>
            </div>

            {/* Articles CMS Table */}
            <div className="panel overflow-hidden border border-white/5 bg-slate-900/10 rounded-3xl">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm text-slate-350">
                  <thead className="border-b border-white/5 bg-white/[0.02] text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-6 py-4">Article</th>
                      <th className="px-6 py-4">Author & Location</th>
                      <th className="px-6 py-4 text-center">Category</th>
                      <th className="px-6 py-4 text-center">Running Ads</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {allArticlesLoading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                            <span>Loading platform newsroom directory...</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      allArticles
                        .filter(art => {
                          const q = inArticleSearch.toLowerCase().trim();
                          if (!q) return true;
                          return (
                            art.title.toLowerCase().includes(q) ||
                            (art.excerpt || "").toLowerCase().includes(q) ||
                            (art.author?.fullName || "").toLowerCase().includes(q) ||
                            (art.category || "").toLowerCase().includes(q)
                          );
                        })
                        .slice((inArticlePage - 1) * inArticlePageSize, inArticlePage * inArticlePageSize)
                        .map((art) => {
                          const articleAds = ads.filter(
                            (a) => a.placement === "in-article" && a.status === "active" && (a.articleId === art._id || a.articleId === "all")
                          );
                          return (
                            <tr key={art._id} className="hover:bg-white/[0.02] transition-colors duration-150">
                              <td className="px-6 py-4 max-w-xs md:max-w-md">
                                <div className="flex items-center gap-4">
                                  {art.coverImageUrl ? (
                                    <img src={art.coverImageUrl} alt={art.title} className="h-12 w-12 flex-shrink-0 rounded-xl object-cover border border-white/10" />
                                  ) : (
                                    <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-white/5 border border-dashed border-white/10 flex items-center justify-center text-[10px] text-slate-550 font-bold">No Cover</div>
                                  )}
                                  <div className="truncate">
                                    <p className="font-semibold text-white truncate text-sm" title={art.title}>{art.title}</p>
                                    <p className="text-xs text-slate-500 truncate mt-0.5" title={art.excerpt}>{art.excerpt || "No summary excerpt available."}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <p className="font-medium text-white text-xs">{getArticleAuthorName(art)}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">{art.district} • {art.area || "HQ"}</p>
                              </td>
                              <td className="px-6 py-4 text-center whitespace-nowrap">
                                <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-slate-300">
                                  {newsCategoryLabels[art.category] || art.category || "General"}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center whitespace-nowrap">
                                {articleAds.length > 0 ? (
                                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                                    {articleAds.length} Ad{articleAds.length === 1 ? "" : "s"} Running
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-slate-500/10 border border-slate-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500">
                                    No Injected Ads
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedAdArticle(art);
                                    setInArticleAdForm({
                                      ...initialInArticleAdForm,
                                      articleId: art._id,
                                    });
                                    setEditingInArticleAdId("");
                                    setShowInArticleAdCreateForm(false);
                                    setShowManageInArticleAdsModal(true);
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 hover:bg-orange-400 text-white px-3.5 py-1.5 text-xs font-bold transition-all shadow-md active:scale-95 animate-pulse hover:animate-none"
                                >
                                  <Sliders size={12} /> Manage Ads
                                </button>
                              </td>
                            </tr>
                          );
                        })
                    )}
                    {!allArticlesLoading &&
                      !allArticles.filter(art => {
                        const q = inArticleSearch.toLowerCase().trim();
                        if (!q) return true;
                        return (
                          art.title.toLowerCase().includes(q) ||
                          (art.excerpt || "").toLowerCase().includes(q) ||
                          (art.author?.fullName || "").toLowerCase().includes(q) ||
                          (art.category || "").toLowerCase().includes(q)
                        );
                      }).length && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                            No articles found matching your criteria.
                          </td>
                        </tr>
                      )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {allArticles.filter(art => {
                const q = inArticleSearch.toLowerCase().trim();
                if (!q) return true;
                return (
                  art.title.toLowerCase().includes(q) ||
                  (art.excerpt || "").toLowerCase().includes(q) ||
                  (art.author?.fullName || "").toLowerCase().includes(q) ||
                  (art.category || "").toLowerCase().includes(q)
                );
              }).length > 0 && (
                <div className="border-t border-white/5 bg-white/[0.01] px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <span className="text-xs text-slate-500">
                    Showing <span className="font-semibold text-white">{(inArticlePage - 1) * inArticlePageSize + 1}</span> to{" "}
                    <span className="font-semibold text-white">
                      {Math.min(
                        inArticlePage * inArticlePageSize,
                        allArticles.filter(art => {
                          const q = inArticleSearch.toLowerCase().trim();
                          if (!q) return true;
                          return (
                            art.title.toLowerCase().includes(q) ||
                            (art.excerpt || "").toLowerCase().includes(q) ||
                            (art.author?.fullName || "").toLowerCase().includes(q) ||
                            (art.category || "").toLowerCase().includes(q)
                          );
                        }).length
                      )}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-white">
                      {
                        allArticles.filter(art => {
                          const q = inArticleSearch.toLowerCase().trim();
                          if (!q) return true;
                          return (
                            art.title.toLowerCase().includes(q) ||
                            (art.excerpt || "").toLowerCase().includes(q) ||
                            (art.author?.fullName || "").toLowerCase().includes(q) ||
                            (art.category || "").toLowerCase().includes(q)
                          );
                        }).length
                      }
                    </span>{" "}
                    entries
                  </span>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Rows per page:</span>
                      <select
                        className="rounded-xl border border-white/10 bg-slate-950 px-2 py-1 text-xs text-white focus:outline-none"
                        value={inArticlePageSize}
                        onChange={(e) => {
                          setInArticlePageSize(Number(e.target.value));
                          setInArticlePage(1);
                        }}
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={inArticlePage === 1}
                        onClick={() => setInArticlePage(prev => Math.max(1, prev - 1))}
                        className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="text-xs text-slate-400 font-semibold px-2">
                        {inArticlePage} / {Math.max(1, Math.ceil(allArticles.filter(art => {
                          const q = inArticleSearch.toLowerCase().trim();
                          if (!q) return true;
                          return (
                            art.title.toLowerCase().includes(q) ||
                            (art.excerpt || "").toLowerCase().includes(q) ||
                            (art.author?.fullName || "").toLowerCase().includes(q) ||
                            (art.category || "").toLowerCase().includes(q)
                          );
                        }).length / inArticlePageSize))}
                      </span>
                      <button
                        type="button"
                        disabled={
                          inArticlePage ===
                          Math.max(1, Math.ceil(allArticles.filter(art => {
                            const q = inArticleSearch.toLowerCase().trim();
                            if (!q) return true;
                            return (
                              art.title.toLowerCase().includes(q) ||
                              (art.excerpt || "").toLowerCase().includes(q) ||
                              (art.author?.fullName || "").toLowerCase().includes(q) ||
                              (art.category || "").toLowerCase().includes(q)
                            );
                          }).length / inArticlePageSize))
                        }
                        onClick={() =>
                          setInArticlePage(prev =>
                            Math.min(
                              prev + 1,
                              Math.ceil(allArticles.filter(art => {
                                const q = inArticleSearch.toLowerCase().trim();
                                if (!q) return true;
                                return (
                                  art.title.toLowerCase().includes(q) ||
                                  (art.excerpt || "").toLowerCase().includes(q) ||
                                  (art.author?.fullName || "").toLowerCase().includes(q) ||
                                  (art.category || "").toLowerCase().includes(q)
                                );
                              }).length / inArticlePageSize)
                            )
                          )
                        }
                        className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {adDeskSubTab === "analytics" && (
          /* REAL-TIME AD PERFORMANCE ANALYTICS */
          <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
            {(() => {
              const totalImpressions = ads.reduce((sum, a) => sum + (a.viewsCount || 0), 0);
              const totalClicks = ads.reduce((sum, a) => sum + (a.clicksCount || 0), 0);
              const averageCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";
              const activeCount = ads.filter(a => a.status === "active").length;

              const placementsMap = {
                "homepage-hero": { label: "Homepage Hero", imp: 0, cli: 0 },
                "homepage-latest": { label: "Homepage Latest", imp: 0, cli: 0 },
                "homepage-district": { label: "Homepage District", imp: 0, cli: 0 },
                "homepage-popup": { label: "Homepage Popup Modal", imp: 0, cli: 0 },
                "in-article": { label: "In-Article Injections", imp: 0, cli: 0 }
              };

              ads.forEach(a => {
                if (placementsMap[a.placement]) {
                  placementsMap[a.placement].imp += (a.viewsCount || 0);
                  placementsMap[a.placement].cli += (a.clicksCount || 0);
                }
              });

              return (
                <>
                  {/* Real-time Performance Export controls */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white/[0.01] border border-white/5 rounded-3xl p-4 mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-white">Live Ad Performance Auditing</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">Real-time overall and individual metrics compiled via active Websockets.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={downloadAdsCSVReport}
                        className="rounded-xl bg-green-600/10 border border-green-500/20 text-green-400 hover:bg-green-600 hover:text-white px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 transition shadow-md hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <FileSpreadsheet size={13} /> Export Excel (CSV)
                      </button>
                      <button
                        type="button"
                        onClick={downloadAdsPDFReport}
                        className="rounded-xl bg-orange-600/10 border border-orange-500/20 text-orange-400 hover:bg-orange-600 hover:text-white px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 transition shadow-md hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <FileText size={13} /> Export Audit Report (PDF)
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                    <div className="panel p-5 border border-white/5 bg-slate-900/10 flex flex-col justify-center rounded-3xl shadow-lg">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Ad Impressions</span>
                      <span className="text-3xl font-extrabold text-white mt-1.5">{totalImpressions.toLocaleString("en-IN")}</span>
                      <span className="text-[10px] text-orange-400 font-medium mt-1">Direct bulletin views</span>
                    </div>
                    <div className="panel p-5 border border-white/5 bg-slate-900/10 flex flex-col justify-center rounded-3xl shadow-lg">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Clicks</span>
                      <span className="text-3xl font-extrabold text-orange-400 mt-1.5">{totalClicks.toLocaleString("en-IN")}</span>
                      <span className="text-[10px] text-orange-550 font-medium mt-1">CTA target visits</span>
                    </div>
                    <div className="panel p-5 border border-white/5 bg-slate-900/10 flex flex-col justify-center rounded-3xl shadow-lg">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Average CTR</span>
                      <span className="text-3xl font-extrabold text-emerald-400 mt-1.5">{averageCtr}%</span>
                      <span className="text-[10px] text-emerald-500 font-medium mt-1">Click-through rate</span>
                    </div>
                    <div className="panel p-5 border border-white/5 bg-slate-900/10 flex flex-col justify-center rounded-3xl shadow-lg">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active slots</span>
                      <span className="text-3xl font-extrabold text-blue-400 mt-1.5">{activeCount} Campaigns</span>
                      <span className="text-[10px] text-blue-500 font-medium mt-1">Live active campaigns</span>
                    </div>
                  </div>

                  <div className="panel p-6 border border-white/5 bg-slate-900/10 rounded-3xl min-h-[380px] flex flex-col shadow-xl">
                    <div className="border-b border-white/5 pb-3 mb-5">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <TrendingUp size={18} className="text-orange-400" />
                        Sponsor Campaign Performance by Placement
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">Comparative visual breakdown of real-time impressions and clicks across slot placements.</p>
                    </div>
                    <div className="flex-1 min-h-[280px] relative">
                      <Bar
                        data={{
                          labels: Object.values(placementsMap).map(p => p.label),
                          datasets: [
                            {
                              label: "Impressions (Views)",
                              data: Object.values(placementsMap).map(p => p.imp),
                              backgroundColor: "rgba(249, 115, 22, 0.75)",
                              hoverBackgroundColor: "rgba(249, 115, 22, 0.95)",
                              borderRadius: 8,
                            },
                            {
                              label: "Clicks (Visits)",
                              data: Object.values(placementsMap).map(p => p.cli),
                              backgroundColor: "rgba(16, 185, 129, 0.75)",
                              hoverBackgroundColor: "rgba(16, 185, 129, 0.95)",
                              borderRadius: 8,
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              grid: { color: chartGridColor },
                              ticks: { color: chartTicksColor, font: { size: 10 } }
                            },
                            x: {
                              grid: { display: false },
                              ticks: { color: chartTicksColor, font: { size: 10 } }
                            }
                          },
                          plugins: {
                            legend: {
                              display: true,
                              position: "top",
                              labels: { color: chartLegendColor, font: { size: 11, weight: "600" } }
                            },
                            tooltip: {
                              backgroundColor: "rgba(15, 23, 42, 0.95)",
                              titleColor: "#fff",
                              borderColor: "rgba(255, 255, 255, 0.1)",
                              borderWidth: 1,
                              padding: 10,
                              cornerRadius: 12
                            }
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Individual Campaign Performance Analytics */}
                  <div className="panel p-6 border border-white/5 bg-slate-900/10 rounded-3xl shadow-xl mt-6 animate-[fadeIn_0.3s_ease-out]">
                    <div className="border-b border-white/5 pb-4 mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <BookOpen size={18} className="text-orange-400" />
                          Individual Campaign Performance Analytics
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">Detailed performance audit, click-through rates (CTR), and pricing ROI of all active ad placements.</p>
                      </div>

                      {/* Sub-Revenue Dynamic Tracker */}
                      {(() => {
                        const filteredAds = ads.filter(a => {
                          if (analyticsAdTab === "homepage" && a.placement === "in-article") return false;
                          if (analyticsAdTab === "in-article" && a.placement !== "in-article") return false;
                          return true;
                        });
                        const totalRevenue = filteredAds.reduce((sum, a) => sum + (a.amount || 0), 0);
                        return (
                          <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-2xl px-4 py-2 self-start lg:self-center">
                            <div>
                              <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold">Category Billings</span>
                              <span className="text-sm font-bold text-green-400">Rs. {totalRevenue.toLocaleString("en-IN")}</span>
                            </div>
                            <div className="h-8 w-px bg-white/10" />
                            <div>
                              <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold">Campaigns</span>
                              <span className="text-sm font-bold text-white">{filteredAds.length} Total</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Filter and Tab Controls */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
                      <div className="flex items-center gap-4 border-b border-white/5 pb-1 overflow-x-auto">
                        <button
                          type="button"
                          onClick={() => setAnalyticsAdTab("all")}
                          className={`pb-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-all duration-200 ${
                            analyticsAdTab === "all" ? "border-orange-500 text-orange-400 font-bold" : "border-transparent text-slate-400 hover:text-white"
                          }`}
                        >
                          All Placements
                        </button>
                        <button
                          type="button"
                          onClick={() => setAnalyticsAdTab("homepage")}
                          className={`pb-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-all duration-200 ${
                            analyticsAdTab === "homepage" ? "border-orange-500 text-orange-400 font-bold" : "border-transparent text-slate-400 hover:text-white"
                          }`}
                        >
                          Home Page Ads
                        </button>
                        <button
                          type="button"
                          onClick={() => setAnalyticsAdTab("in-article")}
                          className={`pb-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-all duration-200 ${
                            analyticsAdTab === "in-article" ? "border-orange-500 text-orange-400 font-bold" : "border-transparent text-slate-400 hover:text-white"
                          }`}
                        >
                          In-Article Injections
                        </button>
                      </div>

                      <input
                        className="w-full sm:w-64 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:outline-none text-xs placeholder:text-slate-600"
                        placeholder="Search by campaign, brand, or slot..."
                        value={analyticsAdSearch}
                        onChange={(e) => setAnalyticsAdSearch(e.target.value)}
                      />
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-white/5">
                      <table className="w-full border-collapse text-left text-xs text-slate-350">
                        <thead className="border-b border-white/5 bg-white/[0.02] text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          <tr>
                            <th className="px-5 py-3 text-center" style={{ width: "5%" }}>S.No</th>
                            <th className="px-5 py-3">Sponsor Campaign</th>
                            <th className="px-5 py-3">Placement Slot / Targeted Story</th>
                            <th className="px-5 py-3 text-center">Placement Type</th>
                            <th className="px-5 py-3 text-right">Ad Pricing (INR)</th>
                            <th className="px-5 py-3 text-center">Impressions</th>
                            <th className="px-5 py-3 text-center">Clicks</th>
                            <th className="px-5 py-3 text-center">CTR</th>
                            <th className="px-5 py-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {(() => {
                            const filtered = ads.filter(a => {
                              // Filter by Tab
                              if (analyticsAdTab === "homepage" && a.placement === "in-article") return false;
                              if (analyticsAdTab === "in-article" && a.placement !== "in-article") return false;

                              // Filter by Search Query
                              const q = analyticsAdSearch.toLowerCase().trim();
                              if (!q) return true;
                              const targetArticle = allArticles.find(art => art._id === a.articleId);
                              return (
                                a.title.toLowerCase().includes(q) ||
                                (a.companyName || "").toLowerCase().includes(q) ||
                                (a.placement || "").toLowerCase().includes(q) ||
                                (targetArticle?.title || "").toLowerCase().includes(q)
                              );
                            });

                            if (filtered.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={9} className="px-5 py-8 text-center text-slate-500 italic">
                                    No ad campaigns found matching your criteria.
                                  </td>
                                </tr>
                              );
                            }

                            return filtered.map((a, idx) => {
                              const targetArticle = allArticles.find(art => art._id === a.articleId);
                              const ctr = a.viewsCount > 0 ? ((a.clicksCount / a.viewsCount) * 100).toFixed(2) : "0.00";
                              
                              let placementLabel = "";
                              if (a.placement === "in-article") {
                                placementLabel = targetArticle 
                                  ? `Article: ${targetArticle.title}`
                                  : a.articleId === "all" ? "All Articles (Broadcast)" : "In-Article Injection";
                              } else {
                                const matchedPlacement = adPlacements.find(p => p.value === a.placement);
                                placementLabel = matchedPlacement ? matchedPlacement.label : a.placement;
                              }

                              const getPlacementBadgeStyle = (placement) => {
                                switch (placement) {
                                  case "homepage-hero": return "bg-orange-500/10 text-orange-400 border border-orange-500/20";
                                  case "homepage-latest": return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                                  case "homepage-district": return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
                                  case "homepage-popup": return "bg-rose-600/10 text-rose-300 border border-rose-600/20";
                                  case "in-article": return "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
                                  case "promotional-article": return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                                  default: return "bg-slate-500/10 text-slate-400 border border-slate-500/10";
                                }
                              };

                              return (
                                <tr key={a._id} className="hover:bg-white/[0.01] transition-colors duration-150">
                                  <td className="px-5 py-3 text-center font-semibold text-slate-450">
                                    {idx + 1}
                                  </td>
                                  <td className="px-5 py-3">
                                    <div className="flex items-center gap-3">
                                      {a.imageUrl && (
                                        <img src={a.imageUrl} alt={a.title} className="h-8 w-12 object-cover rounded-lg border border-white/10 flex-shrink-0" />
                                      )}
                                      <div className="truncate max-w-[150px]">
                                        <p className="font-bold text-white truncate text-xs" title={a.title}>{a.title}</p>
                                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{a.companyName || "Sponsor Brand"}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-3 max-w-[220px] truncate">
                                    {a.placement === "in-article" && targetArticle ? (
                                      <span className="text-white hover:text-orange-400 cursor-pointer font-medium text-xs" onClick={() => openArticleFromDashboard(targetArticle)} title={targetArticle.title}>
                                        {placementLabel}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 text-xs font-medium" title={placementLabel}>{placementLabel}</span>
                                    )}
                                  </td>
                                  <td className="px-5 py-3 text-center whitespace-nowrap">
                                    <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getPlacementBadgeStyle(a.placement)}`}>
                                      {a.placement === "in-article" 
                                        ? `${String(a.adPosition).replaceAll("-", " ")}${a.adPosition === "between-paragraphs" ? ` (Para ${a.paragraphIndex})` : ""}`
                                        : a.placement.replaceAll("-", " ")
                                      }
                                    </span>
                                  </td>
                                  <td className="px-5 py-3 text-right text-green-400 font-bold whitespace-nowrap text-xs">
                                    Rs. {Number(a.amount || 0).toLocaleString("en-IN")}
                                  </td>
                                  <td className="px-5 py-3 text-center text-white font-semibold whitespace-nowrap text-xs">
                                    {Number(a.viewsCount || 0).toLocaleString("en-IN")}
                                  </td>
                                  <td className="px-5 py-3 text-center text-orange-400 font-semibold whitespace-nowrap text-xs">
                                    {Number(a.clicksCount || 0).toLocaleString("en-IN")}
                                  </td>
                                  <td className="px-5 py-3 text-center text-emerald-400 font-extrabold whitespace-nowrap text-xs">
                                    {ctr}%
                                  </td>
                                  <td className="px-5 py-3 text-center whitespace-nowrap">
                                    <span className={`rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider ${
                                      a.status === "active"
                                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                        : "bg-slate-500/10 text-slate-400 border border-slate-500/10"
                                    }`}>
                                      {a.status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}
        {adDeskSubTab === "pricing" && (
          /* DYNAMIC AD PACKAGE PRICING CONTROLS */
          <div className="panel p-6 bg-slate-900/40 border border-white/5 rounded-3xl space-y-6 animate-[fadeIn_0.3s_ease-out]">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-bold text-white">Sponsorship Package Pricing Desk</h2>
              <p className="text-xs text-slate-450 leading-relaxed">
                Platform Super Admin console to adjust the daily base billing rates for all advertisement placements. 
                Updates are saved dynamically in Firestore and are reflected live on the public booking checkout.
              </p>
            </div>

            <form onSubmit={saveCustomPricing} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {/* Hero Rail */}
                <div className="panel p-5 bg-[#0b0f19]/80 border border-white/5 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-orange-400">
                      <Megaphone size={16} />
                      <h4 className="text-sm font-bold text-white">Homepage Hero Rail</h4>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Shows near the top of the homepage alongside primary featured stories. High impact visual placement.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Base Daily Rate (INR)</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-orange-500/20"
                      value={adPricingHero}
                      onChange={(e) => setAdPricingHero(e.target.value)}
                    />
                  </div>
                </div>

                {/* Latest Updates Grid */}
                <div className="panel p-5 bg-[#0b0f19]/80 border border-white/5 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-orange-400">
                      <Megaphone size={16} />
                      <h4 className="text-sm font-bold text-white">Latest Updates Grid</h4>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Appears in-between major latest news rails in standard reading flow. Highly scrolled feed zone.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Base Daily Rate (INR)</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-orange-500/20"
                      value={adPricingLatest}
                      onChange={(e) => setAdPricingLatest(e.target.value)}
                    />
                  </div>
                </div>

                {/* District Coverage Strip */}
                <div className="panel p-5 bg-[#0b0f19]/80 border border-white/5 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-orange-400">
                      <Megaphone size={16} />
                      <h4 className="text-sm font-bold text-white">District Coverage Strip</h4>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Sponsor banner appearing lower on the homepage near the district news filter lists. Local target segment.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Base Daily Rate (INR)</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-orange-500/20"
                      value={adPricingDistrict}
                      onChange={(e) => setAdPricingDistrict(e.target.value)}
                    />
                  </div>
                </div>

                {/* In-Article injection */}
                <div className="panel p-5 bg-[#0b0f19]/80 border border-white/5 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-orange-400">
                      <Megaphone size={16} />
                      <h4 className="text-sm font-bold text-white">In-Article Injection</h4>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Custom banners injected dynamically between editorial paragraphs inside single article views. Focused readership.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Base Daily Rate (INR)</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-orange-500/20"
                      value={adPricingInArticle}
                      onChange={(e) => setAdPricingInArticle(e.target.value)}
                    />
                  </div>
                </div>

                {/* Promotional Launch Article */}
                <div className="panel p-5 bg-[#0b0f19]/80 border border-white/5 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <Newspaper size={16} />
                      <h4 className="text-sm font-bold text-white">Promotional Launch Article</h4>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Full paid press releases and business event updates published directly under Promotions & Launches.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Base Daily Rate (INR)</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                      value={adPricingPromotional}
                      onChange={(e) => setAdPricingPromotional(e.target.value)}
                    />
                  </div>
                </div>

                {/* Homepage Premium Pop-up Ad */}
                <div className="panel p-5 bg-[#0b0f19]/80 border border-white/5 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-rose-400">
                      <Sliders size={16} />
                      <h4 className="text-sm font-bold text-white">Homepage Premium Pop-up</h4>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      High-impact animated backdrop-blurred pop-up interstitial ad triggering instantly upon home page load.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Base Daily Rate (INR)</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-rose-500/20"
                      value={adPricingPopup}
                      onChange={(e) => setAdPricingPopup(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-white/5">
                <button
                  type="submit"
                  className="rounded-full bg-orange-600 hover:bg-orange-500 text-white px-6 py-2.5 text-xs font-bold transition shadow-lg shadow-orange-950/30 flex items-center gap-1.5"
                >
                  <Check size={14} /> Save Ad Package Prices
                </button>
              </div>
            </form>
          </div>
        )}

        {adDeskSubTab === "popups" && (
          /* POPUPS WORKSPACE MANAGEMENT PANEL */
          <div className="panel p-6 bg-slate-900/40 border border-white/5 rounded-3xl space-y-6 animate-[fadeIn_0.3s_ease-out]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Layers size={18} className="text-orange-400" />
                  Premium Homepage Pop-up Interstitial Desk
                </h2>
                <p className="text-xs text-slate-455 leading-relaxed">
                  Super Admin cockpit to manage active, priority-weighted pop-up campaign loops. 
                  Target specific Jharkhand districts, blocks, and restrict displaying hours dynamically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetAdForm();
                  setAdForm({
                    ...initialAdForm,
                    placement: "homepage-popup",
                    amount: Number(adPricingPopup) * 7,
                    durationDays: 7
                  });
                  setIsCreatingAd(true);
                }}
                className="rounded-full bg-orange-500 hover:bg-orange-400 text-white px-5 py-2.5 text-xs font-bold transition-all duration-250 flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 self-start sm:self-center"
              >
                <Plus size={14} /> Launch Pop-up Campaign
              </button>
            </div>

            {/* Pop-up Spin Algorithms & Visibility Control Console */}
            <div className="panel p-6 border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-md rounded-3xl space-y-6 shadow-xl relative overflow-hidden">
              {/* Premium decorative gradient highlight */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    <Sliders size={20} className="animate-[pulse_2s_infinite]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Pop-up Interstitial Display Routing</h3>
                    <p className="text-xs text-slate-400">Manage visibility and rotate campaign displays in real-time on the homepage.</p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => savePopupSettings("loop_carousel")}
                  className={`rounded-full px-5 py-2.5 text-xs font-bold transition-all duration-300 flex items-center gap-2 border shadow-md hover:scale-105 active:scale-95 ${
                    popupDisplayMode === "loop_carousel"
                      ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white border-transparent shadow-orange-950/50 animate-pulse"
                      : "bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border-orange-500/20"
                  }`}
                >
                  <Layers size={14} /> Loop All Active Popups (Carousel)
                </button>
              </div>

              {/* Selection cards for spin algorithms */}
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    id: "weighted_random",
                    title: "Weighted Random",
                    desc: "Serves campaigns based on their priority weight (High weight appears proportionally more often).",
                    badge: "Dynamic"
                  },
                  {
                    id: "sequence",
                    title: "Sequenced Rotation",
                    desc: "Rotates active pop-up campaigns sequentially on each user visit session via localized rotation.",
                    badge: "Fair Share"
                  },
                  {
                    id: "locked_single",
                    title: "Locked Spotlight",
                    desc: "Pins exactly one selected active campaign. Ideal for urgent notifications and premium sponsorships.",
                    badge: "Pinned"
                  },
                  {
                    id: "loop_carousel",
                    title: "Carousel Slideshow",
                    desc: "Fades and transitions all active pop-ups inside a dynamic front-end slider carousel loop.",
                    badge: "Infinite Loop"
                  }
                ].map((algo) => {
                  const isActive = popupDisplayMode === algo.id;
                  return (
                    <div
                      key={algo.id}
                      onClick={() => savePopupSettings(algo.id)}
                      className={`relative cursor-pointer rounded-2xl p-4 border transition-all duration-300 flex flex-col justify-between h-full group select-none hover:scale-[1.01] ${
                        isActive
                          ? "bg-orange-950/20 border-orange-500/40 shadow-lg shadow-orange-950/20"
                          : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-bold transition-colors ${isActive ? "text-orange-400" : "text-white group-hover:text-orange-400"}`}>
                            {algo.title}
                          </span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider transition-colors ${
                            isActive 
                              ? "bg-orange-500/20 text-orange-300"
                              : "bg-white/5 text-slate-400"
                          }`}>
                            {algo.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-450 leading-relaxed transition-colors group-hover:text-slate-350">{algo.desc}</p>
                      </div>
                      
                      <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-white/5 text-[10px] font-bold">
                        {isActive ? (
                          <span className="text-orange-400 flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" /> Active Routing
                          </span>
                        ) : (
                          <span className="text-slate-500 group-hover:text-slate-400 transition-colors">Click to activate</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Conditional Spotlight Selector Panel */}
              {popupDisplayMode === "locked_single" && (
                <div className="p-4 rounded-2xl bg-orange-950/10 border border-orange-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-[fadeIn_0.25s_ease-out]">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-orange-500/10 text-orange-400 flex items-center justify-center border border-orange-500/20">
                      <Lock size={14} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Select Pinned Campaign</h4>
                      <p className="text-[10px] text-slate-400">Specify which active campaign is shown exclusively to visitors.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    {(() => {
                      const activePopups = ads.filter(a => a && a.placement === "homepage-popup" && a.status === "active");
                      if (!activePopups.length) {
                        return (
                          <span className="text-xs text-orange-300/80 italic font-semibold">
                            ⚠️ No active pop-up campaigns live. Please activate a pop-up first!
                          </span>
                        );
                      }
                      
                      return (
                        <select
                          className="w-full md:w-80 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-orange-500/20"
                          value={popupLockedAdId}
                          onChange={(e) => savePopupSettings("locked_single", e.target.value)}
                        >
                          <option value="">-- Choose active campaign --</option>
                          {activePopups.map((ad) => {
                            const rawPriority = Number(ad.priority || 10);
                            const weight = Math.max(1, 11 - rawPriority);
                            return (
                              <option key={ad._id} value={ad._id}>
                                {ad.title || "Untitled Campaign"} ({ad.advertiserName || "No Brand"} - Weight: {weight})
                              </option>
                            );
                          })}
                        </select>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Metrics */}
            {(() => {
              const popupAds = ads.filter(ad => ad && ad.placement === "homepage-popup");
              const activeCount = popupAds.filter(a => a.status === "active").length;
              const totalViews = popupAds.reduce((sum, a) => sum + Number(a.viewsCount || 0), 0);
              const totalClicks = popupAds.reduce((sum, a) => sum + Number(a.clicksCount || 0), 0);
              const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) : "0.00";
              
              return (
                <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                  <div className="panel p-4 border border-white/5 bg-slate-950/40 rounded-2xl flex flex-col">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Campaigns</span>
                    <span className="text-lg font-bold text-white mt-1">{popupAds.length} Created</span>
                  </div>
                  <div className="panel p-4 border border-white/5 bg-slate-950/40 rounded-2xl flex flex-col">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active in Loop</span>
                    <span className="text-lg font-bold text-green-400 mt-1 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                      {activeCount} Live
                    </span>
                  </div>
                  <div className="panel p-4 border border-white/5 bg-slate-950/40 rounded-2xl flex flex-col">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Impressions</span>
                    <span className="text-lg font-bold text-orange-400 mt-1">{totalViews.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="panel p-4 border border-white/5 bg-slate-950/40 rounded-2xl flex flex-col">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Average Pop-up CTR</span>
                    <span className="text-lg font-bold text-white mt-1">{ctr}%</span>
                  </div>
                </div>
              );
            })()}

            {/* Pop-up Ads Directory Table */}
            <div className="panel overflow-hidden border border-white/5 bg-slate-900/10 rounded-3xl">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px] border-collapse text-left text-xs text-slate-350">
                  <thead className="border-b border-white/5 bg-white/[0.02] text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-3 text-center" style={{ width: "5%" }}>S.No</th>
                      <th className="px-5 py-3">Campaign & Brand</th>
                      <th className="px-5 py-3 text-center" style={{ width: "12%" }}>Priority Weight</th>
                      <th className="px-5 py-3">Target Geofencing</th>
                      <th className="px-5 py-3">Active Hours</th>
                      <th className="px-5 py-3 text-right">Pricing (INR)</th>
                      <th className="px-5 py-3 text-center">Duration</th>
                      <th className="px-5 py-3 text-center">CTR Stats</th>
                      <th className="px-5 py-3 text-center">Status</th>
                      <th className="px-5 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(() => {
                      const popupAds = ads.filter(ad => ad && ad.placement === "homepage-popup");
                      
                      if (!popupAds.length) {
                        return (
                          <tr>
                            <td colSpan={10} className="px-5 py-16 text-center text-slate-500 italic text-sm">
                              No premium pop-up campaigns found. Click "Launch Pop-up Campaign" to create your first interstitial ad!
                            </td>
                          </tr>
                        );
                      }
                      
                      const formatHr = (h) => {
                        if (h === undefined || h === null) return "All Day";
                        if (h === 0) return "12 AM";
                        if (h === 12) return "12 PM";
                        if (h === 24) return "12 AM";
                        return h > 12 ? `${h - 12} PM` : `${h} AM`;
                      };

                      return popupAds.map((ad, idx) => {
                        const ctr = ad.viewsCount > 0 ? ((ad.clicksCount / ad.viewsCount) * 100).toFixed(2) : "0.00";
                        const rawPriority = Number(ad.priority || 10);
                        const weight = Math.max(1, 11 - rawPriority);
                        
                        return (
                          <tr key={ad._id} className="hover:bg-white/[0.01] transition-colors duration-150">
                            <td className="px-5 py-4 text-center font-semibold text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                {ad.imageUrl ? (
                                  <img src={ad.imageUrl} alt={ad.title} className="h-8 w-12 object-cover rounded-lg border border-white/10 flex-shrink-0" />
                                ) : (
                                  <div className="h-8 w-12 rounded-lg border border-dashed border-white/15 bg-white/[0.01] flex items-center justify-center text-[9px] text-slate-500">No Image</div>
                                )}
                                <div className="truncate max-w-[180px]">
                                  <p className="font-bold text-white truncate text-xs" title={ad.title}>{ad.title}</p>
                                  <p className="text-[10px] text-slate-500 truncate mt-0.5" title={ad.companyName}>Brand: {ad.companyName || "Sponsor"}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-center whitespace-nowrap">
                              <div className="flex flex-col items-center justify-center">
                                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                  rawPriority <= 3 
                                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                    : rawPriority <= 7
                                      ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                                      : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                                }`}>
                                  Level {rawPriority}
                                </span>
                                <span className="text-[8px] text-slate-500 mt-1 font-semibold">Weight: {weight}x weight</span>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              {ad.targetDistricts?.length > 0 ? (
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                  {ad.targetDistricts.map((d) => (
                                    <span key={d} className="rounded bg-orange-500/10 border border-orange-500/15 px-1.5 py-0.5 text-[9px] font-bold text-orange-400">
                                      {d}
                                    </span>
                                  ))}
                                  {ad.targetBlocks?.length > 0 && (
                                    <span className="rounded bg-slate-800 border border-white/5 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400">
                                      +{ad.targetBlocks.length} Blocks
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-500 font-semibold italic flex items-center gap-1">
                                  <Globe size={11} className="text-slate-500 animate-spin-slow" />
                                  Jharkhand Broadcast
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap font-medium text-slate-300">
                              {ad.timeTargeting && (ad.timeTargeting.startHour > 0 || ad.timeTargeting.endHour < 24) ? (
                                <span className="text-orange-400 font-bold">
                                  {formatHr(ad.timeTargeting.startHour)} - {formatHr(ad.timeTargeting.endHour)}
                                </span>
                              ) : (
                                <span className="text-slate-500 italic">All Day (24h loop)</span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-right font-bold text-white whitespace-nowrap">
                              Rs. {Number(ad.amount || 0).toLocaleString("en-IN")}
                            </td>
                            <td className="px-5 py-4 text-center font-medium text-slate-400 whitespace-nowrap">
                              {ad.durationDays} Days
                            </td>
                            <td className="px-5 py-4 text-center whitespace-nowrap">
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-white text-xs">{Number(ad.viewsCount || 0).toLocaleString("en-IN")} Views</span>
                                <span className="text-[10px] text-slate-500 mt-0.5">{Number(ad.clicksCount || 0).toLocaleString("en-IN")} Clicks ({ctr}% CTR)</span>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-center whitespace-nowrap">
                              <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                ad.status === "active"
                                  ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                  : ad.status === "expired"
                                    ? "bg-slate-500/10 text-slate-400 border border-slate-500/10"
                                    : ad.status === "pending_approval" || ad.status === "pending_payment"
                                      ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 animate-pulse"
                                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              }`}>
                                {String(ad.status).replaceAll("_", " ")}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => startEditAd(ad)}
                                  className="rounded-lg bg-orange-500/5 hover:bg-orange-600 border border-orange-500/10 hover:border-transparent text-orange-400 hover:text-white p-1.5 transition duration-150"
                                  title="Edit Campaign"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPendingAdDelete(ad)}
                                  className="rounded-lg bg-rose-500/5 hover:bg-rose-600 border border-rose-500/10 hover:border-transparent text-rose-400 hover:text-white p-1.5 transition duration-150"
                                  title="Delete Campaign"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderNotificationsControl = () => {
    return (
      <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-400">System Controls</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white md:text-4xl">
            Notification Control Panel
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Push real-time broadcast system alerts to all staff or publish targeted notifications to specific reporters and chief editors.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* LEFT: PUSH NOTIFICATION FORM */}
          <div className="panel p-6 bg-slate-900/40 border border-white/5 lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Push Alert Message</h2>
              <p className="mt-1 text-xs text-slate-500">
                Pushes a system alert badge and notification record.
              </p>
            </div>

            <form onSubmit={handleAdminSendNotification} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="admin-notification-recipient" className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                  Target Recipient
                </label>
                <select
                  id="admin-notification-recipient"
                  value={adminNotificationForm.recipientId}
                  onChange={(e) =>
                    setAdminNotificationForm((prev) => ({
                      ...prev,
                      recipientId: e.target.value,
                    }))
                  }
                  disabled={notificationBusy}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3.5 text-sm font-medium text-white focus:border-orange-500 focus:bg-orange-500/5 focus:outline-none transition"
                >
                  <option value="all" className="bg-[#0b0f19] text-white">All Staff Members (Broadcast)</option>
                  {managedUsers
                    .filter((u) => u._id !== user?._id)
                    .map((u) => (
                      <option key={u._id} value={u._id} className="bg-[#0b0f19] text-white">
                        {u.fullName} ({String(u.role).replaceAll("_", " ")})
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="admin-notification-title" className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                  Alert Title
                </label>
                <input
                  id="admin-notification-title"
                  type="text"
                  placeholder="e.g. Server Maintenance Notice"
                  value={adminNotificationForm.title}
                  onChange={(e) =>
                    setAdminNotificationForm((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  maxLength={100}
                  disabled={notificationBusy}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3.5 text-sm text-white placeholder-slate-600 focus:border-orange-500 focus:bg-orange-500/5 focus:outline-none transition"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="admin-notification-message" className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                  Alert Description / Message
                </label>
                <textarea
                  id="admin-notification-message"
                  rows={5}
                  placeholder="Enter details here... Pushed alerts appear instantly on live recipient top-bars."
                  value={adminNotificationForm.message}
                  onChange={(e) =>
                    setAdminNotificationForm((prev) => ({
                      ...prev,
                      message: e.target.value,
                    }))
                  }
                  maxLength={500}
                  disabled={notificationBusy}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3.5 text-sm text-white placeholder-slate-600 focus:border-orange-500 focus:bg-orange-500/5 focus:outline-none transition resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={notificationBusy}
                className="w-full flex items-center justify-center rounded-2xl bg-orange-600 px-4 py-3.5 text-sm font-semibold text-white hover:bg-orange-500 active:scale-[0.98] shadow-lg shadow-orange-950/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {notificationBusy ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  "Push Live Alert"
                )}
              </button>
            </form>
          </div>

          {/* RIGHT: GLOBAL ALERTS HISTORY */}
          <div className="panel p-6 bg-slate-900/40 border border-white/5 lg:col-span-3 space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Active Alert History</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Manage previously pushed announcements globally.
                </p>
              </div>
              <button
                type="button"
                onClick={fetchGlobalNotifications}
                disabled={globalNotificationsLoading}
                className="rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/5 transition disabled:opacity-50"
              >
                {globalNotificationsLoading ? "Refreshing..." : "Refresh list"}
              </button>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {globalNotifications.map((notif) => (
                <div
                  key={notif._id}
                  className="rounded-2xl border border-white/5 bg-white/[0.01] p-4 flex items-start justify-between gap-4 transition hover:bg-white/[0.02] hover:border-white/10"
                >
                  <div className="space-y-1.5 flex-grow pr-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        notif.type === "broadcast"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                      }`}>
                        {notif.type === "broadcast" ? "Broadcast Alert" : "Direct Alert"}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        Recipient: <strong className="text-white">{notif.recipientName || "Staff"}</strong>
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white">{notif.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed pr-2 break-all">{notif.message}</p>
                    <p className="text-[10px] text-slate-500 font-semibold tracking-wide">
                      Sent on: {new Date(notif.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAdminDeleteGlobal(notif._id)}
                    className="rounded-full bg-white/5 p-2 text-slate-400 hover:bg-rose-500/15 hover:text-rose-400 transition flex-shrink-0"
                    title="Globally delete / retract this alert"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              {!globalNotificationsLoading && globalNotifications.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <BellOff className="h-12 w-12 text-slate-700 mb-4" />
                  <p className="text-sm font-bold text-slate-400">No active system pushes</p>
                  <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-normal">
                    Pushed broadcast messages or targeted alerts will show here. You can retract them globally at any time using the delete button.
                  </p>
                </div>
              )}

              {globalNotificationsLoading && (
                <div className="flex min-h-[200px] items-center justify-center py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderExpiryControl = () => {
    return (
      <div className="panel p-6 border border-orange-500/20 bg-[radial-gradient(circle_at_top,rgba(234,88,12,0.08),rgba(15,23,42,0.96)_50%)] animate-[fadeIn_0.4s_ease-out]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between border-b border-white/5 pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-400">System Parameter Control</p>
            <h2 className="text-2xl font-bold text-white mt-1">Global ID Expiry Control</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Set a centralized system-wide accreditation expiration date for all reporters and chief editors. Individual user custom overrides take absolute priority over this rule.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-slate-900 border border-white/10 px-3 py-1 text-slate-500 font-medium">
                Priority Hierarchy: User Specific Override &gt; Global Config Expiry &gt; Rolling 1-Year Expiry
              </span>
            </div>
          </div>
          <div className="w-full max-w-xs space-y-2 lg:text-right">
            <span className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Current Expiry Rule
            </span>
            <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${globalIdCardExpiry ? "bg-orange-500/15 text-orange-300 border border-orange-500/30" : "bg-slate-900 text-slate-500 border border-white/5"}`}>
              {globalIdCardExpiry ? formatDate(globalIdCardExpiry) : "Inactive (System uses Rolling 1-Year)"}
            </span>
          </div>
        </div>

        <form onSubmit={saveGlobalExpiry} className="mt-6 flex flex-wrap items-end gap-4">
          <div className="w-full sm:max-w-xs">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-400" htmlFor="global-expiry-date-picker">
              Choose System Expiry Date
            </label>
            <input
              id="global-expiry-date-picker"
              type="date"
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
              value={globalExpiryForm}
              onChange={(event) => setGlobalExpiryForm(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={Boolean(busyAction)}
              className="rounded-full bg-orange-600 hover:bg-orange-500 transition-all duration-300 px-5 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-50"
            >
              Save Expiry Rule
            </button>
            {globalIdCardExpiry ? (
              <button
                type="button"
                onClick={clearGlobalExpiry}
                disabled={Boolean(busyAction)}
                className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold text-rose-400 hover:bg-rose-500/10 transition-all duration-300 disabled:opacity-50"
              >
                Clear Expiry Rule
              </button>
            ) : null}
          </div>
        </form>
      </div>
    );
  };

  const renderContactInbox = () => {
    return (
      <div className="panel p-6 border border-white/5 bg-slate-900/10 animate-[fadeIn_0.4s_ease-out]">
        <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-4 mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-400">Reader & Support Inbox</p>
            <h2 className="text-2xl font-bold text-white mt-1">Communications Inbox</h2>
          </div>
          <div className="flex gap-3">
            {editingContactId ? (
              <button type="button" onClick={resetContactAdminForm} className="rounded-full border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5 transition">
                Cancel Edit
              </button>
            ) : (
              contactMessages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClearAllQueriesConfirm(true)}
                  className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 transition"
                >
                  Clear All
                </button>
              )
            )}
          </div>
        </div>

        {/* Sub Navigation Tabs for Consolidated Inbox */}
        <div className="flex gap-4 border-b border-white/5 pb-2 mb-5">
          <button
            onClick={() => {
              setInboxSubTab("public");
              resetContactAdminForm();
            }}
            className={`pb-2 text-sm font-semibold border-b-2 transition-all duration-200 ${
              inboxSubTab === "public" ? "border-orange-500 text-orange-400 font-bold" : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Public Inquiries ({contactMessages.filter(m => !m.userId).length})
          </button>
          <button
            onClick={() => {
              setInboxSubTab("journalist");
              resetContactAdminForm();
            }}
            className={`pb-2 text-sm font-semibold border-b-2 transition-all duration-200 ${
              inboxSubTab === "journalist" ? "border-orange-500 text-orange-400 font-bold" : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Journalist Support Queries ({contactMessages.filter(m => m.userId).length})
          </button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px]">
          <input
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none"
            placeholder="Search by name, email, phone, subject, or message"
            value={contactSearch}
            onChange={(event) => setContactSearch(event.target.value)}
          />
          <select
            className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white focus:outline-none"
            value={contactStatusFilter}
            onChange={(event) => setContactStatusFilter(event.target.value)}
          >
            {contactStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div className="mt-5 space-y-4">
          {visibleContactMessages.map((contactMessage) => (
            <div id={`contact-message-${contactMessage._id}`} key={contactMessage._id} className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 hover:bg-white/[0.04] transition duration-200">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2.5 max-w-[80%]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      contactMessage.userId ? "bg-rose-500/15 text-rose-300 border border-rose-500/20" : "bg-orange-500/15 text-orange-300 border border-orange-500/20"
                    }`}>
                      {contactMessage.userId ? "Journalist Support" : "Public Inquiry"}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${
                        contactMessage.status === "resolved"
                          ? "bg-green-500/15 text-green-300 border border-green-500/20"
                          : contactMessage.status === "in_progress"
                            ? "bg-yellow-500/15 text-yellow-300 border border-yellow-500/20"
                            : contactMessage.status === "unresolved"
                              ? "bg-rose-500/15 text-rose-300 border border-rose-500/20 animate-pulse"
                              : "bg-orange-500/15 text-orange-300 border border-orange-500/20"
                      }`}
                    >
                      {String(contactMessage.status || "new").replaceAll("_", " ")}
                    </span>
                    <span className="text-[11px] text-slate-550">
                      • Submitted {formatDate(contactMessage.createdAt)}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white leading-tight">{contactMessage.subject}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-semibold">{contactMessage.fullName} • {contactMessage.email} • {contactMessage.phone || "No phone number"}</p>
                  <p className="text-sm text-slate-300 leading-relaxed max-w-3xl whitespace-pre-wrap">{contactMessage.message}</p>
                  {contactMessage.adminNote && (
                    <div className="mt-3 rounded-xl border border-white/5 bg-slate-950/40 p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Administrative Note</span>
                      <p className="text-xs text-slate-400 italic leading-relaxed">{contactMessage.adminNote}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => startEditContact(contactMessage)} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition shadow-lg hover:scale-105 active:scale-95 duration-150">Resolve</button>
                  <button type="button" onClick={() => deleteContactMessage(contactMessage._id)} className="rounded-full bg-rose-600/10 border border-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-400 hover:bg-rose-600 hover:text-white transition shadow-lg duration-150">Delete</button>
                </div>
              </div>
            </div>
          ))}
          {!visibleContactMessages.length ? <p className="text-slate-500 py-12 text-center">No messages matching your current filter.</p> : null}
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    const isRepOrEditor = user?.role === "reporter" || user?.role === "chief_editor";
    const blocks = credentialForm.district ? jharkhandBlocksByDistrict[credentialForm.district] || [] : [];

    return (
      <div id="account-credentials-panel" className="panel p-6 border border-white/5 bg-slate-900/10 animate-[fadeIn_0.4s_ease-out]">
        
        {/* Rejection Feedback Alert */}
        {profile?.approvalStatus === "rejected" && (
          <div className="mb-6 rounded-[24px] border border-rose-500/20 bg-rose-500/10 p-5">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-rose-500/20 p-2 text-rose-400 border border-rose-500/30">
                <AlertCircle size={20} />
              </div>
              <div className="flex-grow">
                <h4 className="text-base font-bold text-rose-300">Onboarding Request Rejected</h4>
                <p className="mt-1 text-sm text-slate-300">
                  Your onboarding application was rejected by the super admin. Please review the official feedback below, correct your KYC details, and resubmit your profile for review.
                </p>
                {profile?.rejectionFeedback && (
                  <div className="mt-3 rounded-xl bg-slate-950/50 border border-white/5 p-3 font-mono text-xs text-rose-200">
                    <strong>Admin Feedback:</strong> {profile.rejectionFeedback}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-400">Security & Credentials</p>
            <h2 className="text-2xl font-bold text-white mt-1">
              {profile?.approvalStatus === "rejected" ? "Refill Onboarding KYC & Settings" : "Account Settings"}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {profile?.approvalStatus === "rejected" 
                ? "Correct your personal, jurisdiction, security details, and KYC files to resubmit." 
                : "Update your login phone, email, display name, password, and KYC parameters."}
            </p>
          </div>
          <button type="button" onClick={resetCredentialForm} className="rounded-full border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5 transition">
            Reset Form
          </button>
        </div>
        
        <form onSubmit={submitCredentials} className="mt-5 space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            
            {/* Row 1: Full name and Email */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">Full Name</label>
              <input
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none"
                placeholder="Full name"
                value={credentialForm.fullName}
                onChange={(event) => setCredentialForm({ ...credentialForm, fullName: event.target.value })}
              />
              <p className="mt-2 text-xs text-slate-500">This name must match your Aadhaar card details.</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">Email Address</label>
              <input
                type="email"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none"
                placeholder="Email address"
                value={credentialForm.email}
                onChange={(event) => setCredentialForm({ ...credentialForm, email: event.target.value })}
              />
              <p className="mt-2 text-xs text-slate-500">Email is used for secure communications and document delivery.</p>
            </div>

            {/* Row 2: Phone number */}
            <div className="lg:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">Login Phone Number</label>
              <input
                inputMode="numeric"
                maxLength="10"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none"
                placeholder="10-digit login phone number"
                value={credentialForm.phone}
                onChange={(event) =>
                  setCredentialForm({
                    ...credentialForm,
                    phone: event.target.value.replace(/\D/g, "").slice(0, 10),
                  })
                }
              />
              <p className="mt-2 text-xs text-slate-500">This phone number is your login ID, so keep it unique and exactly 10 digits.</p>
            </div>

            {/* If user is reporter or chief editor, show all KYC and uploads fields */}
            {isRepOrEditor && (
              <>
                <div className="lg:col-span-2 border-t border-white/5 pt-5 mt-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400 mb-4">Jurisdiction & Digital KYC Details</p>
                </div>

                {/* District Select */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2 font-semibold flex items-center gap-1.5"><Globe size={13} className="text-slate-400" /> District</label>
                  <select
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white focus:outline-none cursor-pointer"
                    value={credentialForm.district}
                    onChange={(e) => setCredentialForm({ ...credentialForm, district: e.target.value, area: "" })}
                  >
                    <option value="" className="text-slate-500">Select Jurisdiction District</option>
                    {jharkhandDistricts.map((d) => (
                      <option key={d} value={d} className="bg-slate-950 text-slate-300">{d}</option>
                    ))}
                  </select>
                </div>

                {/* Block / Area Select */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2 font-semibold flex items-center gap-1.5"><MapPin size={13} className="text-slate-400" /> Block / Area</label>
                  <select
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!credentialForm.district}
                    value={credentialForm.area}
                    onChange={(e) => setCredentialForm({ ...credentialForm, area: e.target.value })}
                  >
                    <option value="" className="text-slate-500">{credentialForm.district ? "Select Block / Area" : "Select District First"}</option>
                    {blocks.map((b) => (
                      <option key={b} value={b} className="bg-slate-950 text-slate-300">{b}</option>
                    ))}
                  </select>
                </div>

                {/* Aadhaar Number */}
                <div className="lg:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2 font-semibold flex items-center gap-1.5"><ShieldAlert size={13} className="text-slate-400" /> Aadhaar Card Number</label>
                  <input
                    inputMode="numeric"
                    maxLength="12"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none"
                    placeholder="12-digit Aadhaar identification number"
                    value={credentialForm.aadhaarNumber}
                    onChange={(event) =>
                      setCredentialForm({
                        ...credentialForm,
                        aadhaarNumber: event.target.value.replace(/\D/g, "").slice(0, 12),
                      })
                    }
                  />
                </div>

                {/* Blood Group */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2 font-semibold flex items-center gap-1.5"><Droplet size={13} className="text-slate-400" /> Blood Group</label>
                  <select
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white focus:outline-none cursor-pointer"
                    value={credentialForm.bloodGroup}
                    onChange={(e) => setCredentialForm({ ...credentialForm, bloodGroup: e.target.value })}
                  >
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => (
                      <option key={g} value={g} className="bg-slate-950 text-slate-300">{g}</option>
                    ))}
                  </select>
                </div>

                {/* Education */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2 font-semibold flex items-center gap-1.5"><GraduationCap size={13} className="text-slate-400" /> Educational Qualification</label>
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none"
                    placeholder="Highest qualification (e.g. Graduate, Post Graduate)"
                    value={credentialForm.education}
                    onChange={(event) => setCredentialForm({ ...credentialForm, education: event.target.value })}
                  />
                </div>

                {/* Document Pickers */}
                <div className="lg:col-span-2 border-t border-white/5 pt-5 mt-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400 mb-4">Verification Media Documents</p>
                  <p className="text-xs text-slate-400 mb-4">Please upload highly clear digital scans or captures to facilitate swift background audit approvals.</p>
                </div>

                <div className="lg:col-span-2 grid gap-5 md:grid-cols-2 lg:grid-cols-2 animate-[fadeIn_0.4s_ease-out]">
                  <ImagePicker 
                    label="Profile Photo (Formal)" 
                    value={credentialForm.profilePhotoUrl} 
                    onChange={(val) => setCredentialForm({ ...credentialForm, profilePhotoUrl: val })} 
                  />
                  <ImagePicker 
                    label="Aadhaar Card Scan" 
                    value={credentialForm.aadhaarImageUrl} 
                    onChange={(val) => setCredentialForm({ ...credentialForm, aadhaarImageUrl: val })} 
                  />
                </div>
              </>
            )}

            {/* Row 3: Security & Passwords */}
            <div className="lg:col-span-2 border-t border-white/5 pt-5 mt-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400 mb-2">Change Password</p>
              <p className="text-xs text-slate-400 mb-4">Leave the password fields empty if you only want to update KYC or credential details.</p>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-white focus:outline-none"
                  placeholder="Current password"
                  value={credentialForm.currentPassword}
                  onChange={(event) => setCredentialForm({ ...credentialForm, currentPassword: event.target.value })}
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition"
                  onClick={() => setShowCurrentPassword((value) => !value)}
                  aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                >
                  {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-white focus:outline-none"
                  placeholder="New password"
                  value={credentialForm.newPassword}
                  onChange={(event) => setCredentialForm({ ...credentialForm, newPassword: event.target.value })}
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition"
                  onClick={() => setShowNewPassword((value) => !value)}
                  aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="lg:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-white focus:outline-none"
                  placeholder="Confirm new password"
                  value={credentialForm.confirmNewPassword}
                  onChange={(event) => setCredentialForm({ ...credentialForm, confirmNewPassword: event.target.value })}
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button className="rounded-2xl bg-orange-500 hover:bg-orange-400 transition px-4 py-3.5 font-bold text-white lg:col-span-2 shadow-lg shadow-orange-950/20 tracking-wide uppercase text-sm mt-4">
              {credentialBusy 
                ? "Saving..." 
                : profile?.approvalStatus === "rejected" 
                  ? "Resubmit Profile for Onboarding Review" 
                  : "Update Account Details"}
            </button>
          </div>
        </form>
      </div>
    );
  };

  const renderAnalytics = () => {
    if (analyticsLoading && !analytics) {
      return renderSkeleton();
    }

    return (
      <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-400">Live Workspace Analytics</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white md:text-4xl flex items-center gap-3">
            Performance Dashboard
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
            </span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Real-time tracking of active website users, hourly traffic volume peaks, and total article virality index.
          </p>
        </div>

        {/* Top Analytics Cards */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="panel p-6 border border-white/5 bg-slate-900/10 relative overflow-hidden flex flex-col justify-between min-h-[140px] rounded-3xl">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Active Readers Now</p>
              <h3 className="mt-4 font-display text-4xl font-extrabold text-orange-400 flex items-baseline gap-2">
                <span key={analytics?.liveVisitors} className="animate-counter-pop">
                  {analytics?.liveVisitors || 0}
                </span>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </h3>
            </div>
            <p className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
              <Activity size={12} className="text-emerald-400" />
              Live traffic fluctuating based on actual concurrent views
            </p>
          </div>

          <div className="panel p-6 border border-white/5 bg-slate-900/10 relative overflow-hidden flex flex-col justify-between min-h-[140px] rounded-3xl">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Cumulative Story Views</p>
              <h3 className="mt-4 font-display text-4xl font-extrabold text-orange-400">
                {analytics?.totalViews || 0}
              </h3>
            </div>
            <p className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
              <Eye size={12} className="text-orange-400" />
              Total page views recorded across active news articles
            </p>
          </div>

          <div className="panel p-6 border border-white/5 bg-slate-900/10 relative overflow-hidden flex flex-col justify-between min-h-[140px] rounded-3xl">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Social Shares Count</p>
              <h3 className="mt-4 font-display text-4xl font-extrabold text-orange-400">
                {analytics?.totalShares || 0}
              </h3>
            </div>
            <p className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
              <Share2 size={12} className="text-emerald-400" />
              Total social media shares triggered by the public
            </p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Peak Hour Traffic Line Chart */}
          <div className="panel p-6 border border-white/5 bg-slate-900/10 rounded-3xl flex flex-col min-h-[380px]">
            <div className="border-b border-white/5 pb-3 mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp size={18} className="text-orange-400" />
                Peak Hour Traffic Density
              </h3>
              <p className="text-xs text-slate-400 mt-1">24-hour distribution showing high traffic volume slots.</p>
            </div>
            <div className="flex-1 min-h-[250px] relative">
              {analytics?.peakHours && (
                <Line
                  data={{
                    labels: analytics.peakHours.map(ph => ph.hour),
                    datasets: [
                      {
                        label: "Traffic Volume Index",
                        data: analytics.peakHours.map(ph => ph.volume),
                        borderColor: "rgba(249, 115, 22, 0.8)",
                        backgroundColor: "rgba(249, 115, 22, 0.08)",
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2,
                        pointBackgroundColor: "rgba(249, 115, 22, 1)",
                        pointHoverRadius: 6,
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        grid: { color: chartGridColor },
                        ticks: { color: chartTicksColor, font: { size: 10 } }
                      },
                      x: {
                        grid: { display: false },
                        ticks: { color: chartTicksColor, font: { size: 10 } }
                      }
                    },
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: "rgba(15, 23, 42, 0.95)",
                        titleColor: "#fff",
                        bodyColor: "#f97316",
                        borderColor: "rgba(255, 255, 255, 0.1)",
                        borderWidth: 1,
                        padding: 10,
                        cornerRadius: 12
                      }
                    }
                  }}
                />
              )}
            </div>
          </div>

          {/* User Retention Doughnut/Bar Chart */}
          <div className="panel p-6 border border-white/5 bg-slate-900/10 rounded-3xl flex flex-col min-h-[380px]">
            <div className="border-b border-white/5 pb-3 mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users size={18} className="text-orange-400" />
                Audience Retention Cohorts
              </h3>
              <p className="text-xs text-slate-400 mt-1">Percentage of unique returning visitors over custom milestones.</p>
            </div>
            <div className="flex-1 min-h-[250px] relative">
              {analytics?.retentionRate && (
                <Bar
                  data={{
                    labels: ["Day 1", "Day 7", "Day 14", "Day 30"],
                    datasets: [
                      {
                        label: "User Retention Rate (%)",
                        data: [
                          analytics.retentionRate.day1,
                          analytics.retentionRate.day7,
                          analytics.retentionRate.day14,
                          analytics.retentionRate.day30
                        ],
                        backgroundColor: [
                          "rgba(249, 115, 22, 0.85)",
                          "rgba(245, 158, 11, 0.8)",
                          "rgba(16, 185, 129, 0.75)",
                          "rgba(99, 102, 241, 0.75)"
                        ],
                        borderRadius: 12,
                        borderWidth: 0,
                        barThickness: 32,
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        max: 100,
                        grid: { color: chartGridColor },
                        ticks: { color: chartTicksColor, font: { size: 10 } }
                      },
                      x: {
                        grid: { display: false },
                        ticks: { color: chartTicksColor, font: { size: 10 } }
                      }
                    },
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: "rgba(15, 23, 42, 0.95)",
                        titleColor: "#fff",
                        bodyColor: "#f97316",
                        borderColor: "rgba(255, 255, 255, 0.1)",
                        borderWidth: 1,
                        padding: 10,
                        cornerRadius: 12
                      }
                    }
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Article-wise Traffic Volume Table */}
        <div className="panel p-6 border border-white/5 bg-slate-900/10 rounded-3xl">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4 mb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-400">Analytical Ranking</p>
              <h2 className="text-xl font-bold text-white mt-1">Article-Wise Traffic & Share Indexes</h2>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <input
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                placeholder="Search headlines..."
                value={analyticsSearch}
                onChange={(e) => setAnalyticsSearch(e.target.value)}
              />
              <select
                className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                value={analyticsSort}
                onChange={(e) => setAnalyticsSort(e.target.value)}
              >
                <option value="views-desc">Views (High → Low)</option>
                <option value="views-asc">Views (Low → High)</option>
                <option value="shares-desc">Shares (High → Low)</option>
                <option value="index-desc">Virality Index (High → Low)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead>
                <tr className="border-b border-white/5 text-xs font-bold uppercase text-slate-500">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Article Headline</th>
                  <th className="py-3 px-4">District</th>
                  <th className="py-3 px-4 text-center">Views</th>
                  <th className="py-3 px-4 text-center">Shares</th>
                  <th className="py-3 px-4 text-center">Virality Index</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sortedArticleAnalytics.map((art, index) => {
                  const viralityIndex = (art.pageViews || 0) * 1 + (art.shareCount || 0) * 3;
                  return (
                    <tr key={art._id || art.slug} className="hover:bg-white/[0.02] transition-all">
                      <td className="py-4 px-4 font-mono text-slate-500 text-center text-xs font-bold">{index + 1}</td>
                      <td className="py-4 px-4 font-semibold text-white max-w-xs md:max-w-sm truncate">
                        <Link
                          to={`/article/${art.slug}`}
                          className="hover:text-orange-400 hover:underline transition"
                        >
                          {art.title}
                        </Link>
                      </td>
                      <td className="py-4 px-4 text-slate-400 text-xs uppercase tracking-wider">{art.district || "General"}</td>
                      <td className="py-4 px-4 text-center font-mono text-orange-400 font-bold">{art.pageViews || 0}</td>
                      <td className="py-4 px-4 text-center font-mono text-emerald-400 font-bold">{art.shareCount || 0}</td>
                      <td className="py-4 px-4 text-center font-mono text-amber-400 font-bold">{viralityIndex}</td>
                    </tr>
                  );
                })}
                {sortedArticleAnalytics.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-500 italic">No article analytics matches your query.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderSkeleton = () => {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Header briefing skeleton */}
        <div className="space-y-3">
          <div className="h-3.5 w-32 bg-slate-800 rounded" />
          <div className="h-8 w-64 bg-slate-800 rounded" />
          <div className="h-3 w-96 bg-slate-800 rounded" />
        </div>

        {/* Metrics cards grid skeleton */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={`sk-card-${index}`} className="panel p-6 space-y-3 bg-slate-900/10 border-white/5">
              <div className="h-3 w-16 bg-slate-800 rounded" />
              <div className="h-8 w-12 bg-slate-800 rounded" />
              <div className="h-2.5 w-24 bg-slate-800 rounded" />
            </div>
          ))}
        </div>

        {/* Main panels skeleton */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="panel p-6 space-y-4 bg-slate-900/10 border-white/5 lg:col-span-1">
            <div className="h-4 w-32 bg-slate-800 rounded" />
            <div className="space-y-2.5 pt-2">
              <div className="h-3 w-full bg-slate-800 rounded" />
              <div className="h-3 w-5/6 bg-slate-800 rounded" />
              <div className="h-3 w-4/5 bg-slate-800 rounded" />
              <div className="h-3 w-full bg-slate-800 rounded" />
            </div>
          </div>
          <div className="panel p-6 space-y-4 bg-slate-900/10 border-white/5 md:col-span-1 lg:col-span-2">
            <div className="h-4 w-32 bg-slate-800 rounded" />
            <div className="space-y-2.5 pt-2">
              <div className="h-3 w-full bg-slate-800 rounded" />
              <div className="h-3 w-11/12 bg-slate-800 rounded" />
              <div className="h-3 w-5/6 bg-slate-800 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#05070c] text-slate-100 flex flex-col lg:flex-row">
      {/* GLOBAL MODALS, TOASTS & COMPOSERS */}
      <ActionPopup
        open={Boolean(actionPopup)}
        type={actionPopup?.type}
        title={actionPopup?.title}
        message={actionPopup?.message}
        persistent={actionPopup?.persistent}
        onClose={actionPopup?.persistent ? undefined : () => setActionPopup(null)}
        progress={actionPopup?.progress}
        progressLabel={actionPopup?.progressLabel}
      />
      
      <ConfirmActionModal
        open={showArchiveDeleteModal}
        title="Delete published news for the selected date"
        description={`This will permanently remove all homepage articles published on ${publishedArchiveDate}. This action cannot be undone.`}
        confirmLabel="Delete All Articles"
        busy={archiveBusy}
        cancelLabel="Keep Articles"
        onCancel={() => {
          if (!archiveBusy) {
            setShowArchiveDeleteModal(false);
          }
        }}
        onConfirm={confirmPublishedArchiveDelete}
      />

      {/* Premium Inspect & Edit Modal */}
      {inspectingAd && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-[fadeIn_0.25s_ease-out]">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-[32px] border border-white/10 bg-[#0f172a]/95 p-6 shadow-2xl space-y-6">
            
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <span className="rounded-full bg-orange-500/10 border border-orange-500/20 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-orange-400">
                  Ad Campaign Inspection
                </span>
                <h3 className="mt-2 text-xl font-bold text-white leading-tight">{inspectingAd.title}</h3>
                <p className="text-xs text-slate-500 mt-1 font-semibold">Submitted by {inspectingAd.companyName || "Sponsor Brand"}</p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingAd(null)}
                className="rounded-full border border-white/10 p-2 text-slate-400 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Layout content */}
            <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                {inspectingAd.imageUrl ? (
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 p-2 max-h-48 flex items-center justify-center">
                    <img src={inspectingAd.imageUrl} alt={inspectingAd.title} className="max-h-40 max-w-full object-contain" />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.01] p-8 text-center text-xs text-slate-500">
                    No banner / cover image supplied.
                  </div>
                )}

                {inspectingAd.description && (
                  <div className="space-y-1">
                    <span className="block text-[9px] uppercase tracking-wider text-slate-550">Short Summary / Excerpt</span>
                    <p className="text-xs leading-relaxed text-slate-300 bg-white/[0.01] p-3 rounded-xl border border-white/5">{inspectingAd.description}</p>
                  </div>
                )}

                {inspectingAd.placement === "promotional-article" && inspectingAd.promotionalContent && (
                  <div className="space-y-1">
                    <span className="block text-[9px] uppercase tracking-wider text-emerald-400 font-bold">Promotional Story Body</span>
                    <div className="max-h-44 overflow-y-auto text-xs leading-relaxed text-slate-350 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 font-mono whitespace-pre-wrap">
                      {inspectingAd.promotionalContent}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4 rounded-2xl bg-white/[0.01] border border-white/5 p-4 text-xs text-slate-400">
                <div className="space-y-2.5">
                  <p className="flex justify-between border-b border-white/5 pb-1">
                    <span>Ad Placement Slot:</span>
                    <span className="text-white font-bold">{adPlacements.find(p => p.value === inspectingAd.placement)?.label || inspectingAd.placement}</span>
                  </p>
                  <p className="flex justify-between border-b border-white/5 pb-1">
                    <span>Running Duration:</span>
                    <span className="text-white font-bold">{inspectingAd.durationDays} Days</span>
                  </p>
                  <p className="flex justify-between border-b border-white/5 pb-1">
                    <span>Pricing Invoiced:</span>
                    <span className="text-green-400 font-bold">Rs. {Number(inspectingAd.amount || 0).toLocaleString("en-IN")}</span>
                  </p>
                  
                  {inspectingAd.placement === "promotional-article" ? (
                    <>
                      <p className="flex justify-between border-b border-white/5 pb-1">
                        <span>Target District:</span>
                        <span className="text-white font-bold">{inspectingAd.district || "Palamu"}</span>
                      </p>
                      <p className="flex justify-between border-b border-white/5 pb-1">
                        <span>Target block:</span>
                        <span className="text-white font-bold">{inspectingAd.block || "Medininagar"}</span>
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="flex justify-between border-b border-white/5 pb-1">
                        <span>CTA Button Text:</span>
                        <span className="text-white font-bold">{inspectingAd.ctaLabel || "Visit Sponsor"}</span>
                      </p>
                      <p className="flex justify-between border-b border-white/5 pb-1">
                        <span>Redirect URL:</span>
                        <span className="text-orange-400 font-bold truncate max-w-[120px]">{inspectingAd.targetUrl || "None"}</span>
                      </p>
                    </>
                  )}

                  <p className="flex flex-col gap-0.5 border-b border-white/5 pb-1">
                    <span>Advertiser Contact:</span>
                    <span className="text-white font-semibold">{inspectingAd.advertiserName} ({inspectingAd.advertiserPhone || inspectingAd.advertiserEmail})</span>
                  </p>
                </div>

                {inspectingAd.notes && (
                  <div className="mt-3 rounded-xl bg-orange-500/5 border border-orange-500/10 p-2.5 text-[10px] text-orange-200 leading-normal">
                    <span className="font-semibold block uppercase tracking-wider text-[8px] text-orange-400 mb-0.5">Advertiser Notes</span>
                    {inspectingAd.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-4">
              <button
                type="button"
                onClick={() => {
                  setInspectingAd(null);
                  startEditAd(inspectingAd);
                }}
                className="rounded-full bg-white text-slate-900 hover:bg-slate-150 px-5 py-2 text-xs font-bold transition shadow-md hover:scale-105 active:scale-95"
              >
                Edit Parameters First
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const id = inspectingAd._id;
                    setInspectingAd(null);
                    setPendingAdApproveId(id);
                  }}
                  className="rounded-full bg-green-600 hover:bg-green-500 text-white px-5 py-2 text-xs font-bold transition shadow-md hover:scale-105 active:scale-95"
                >
                  Approve & Publish
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const id = inspectingAd._id;
                    setInspectingAd(null);
                    rejectAd(id);
                  }}
                  className="rounded-full bg-rose-600/10 border border-rose-500/20 text-rose-450 hover:bg-rose-600 hover:text-white px-5 py-2 text-xs font-bold transition"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <ConfirmActionModal
        open={Boolean(pendingAdPause)}
        title={pendingAdPause?.status === "active" ? "Pause Advertisement" : "Resume Advertisement"}
        description={
          pendingAdPause?.status === "active"
            ? `Are you sure you want to pause the campaign "${pendingAdPause?.title || "this advertisement"}"? This will temporarily deactivate the sponsor ad banner on target page views, but preserves all paid duration.`
            : `Are you sure you want to resume the campaign "${pendingAdPause?.title || "this advertisement"}"? The sponsor banner will go live immediately inside page flows, and its duration will be extended by the time it was paused.`
        }
        confirmLabel={pendingAdPause?.status === "active" ? "Pause Campaign" : "Resume Campaign"}
        cancelLabel="Go Back"
        kicker="Campaign Cockpit"
        busy={busyAction === "Advertisement campaign paused successfully." || busyAction === "Advertisement campaign resumed successfully."}
        onCancel={() => {
          if (busyAction !== "Advertisement campaign paused successfully." && busyAction !== "Advertisement campaign resumed successfully.") {
            setPendingAdPause(null);
          }
        }}
        onConfirm={async () => {
          if (!pendingAdPause?._id) return;
          const targetAd = pendingAdPause;
          setPendingAdPause(null);
          
          const isPausing = targetAd.status === "active";
          await handleAction(async () => {
            await http.patch(`/ads/${targetAd._id}/toggle-pause`);
            await refreshAdminData();
          }, isPausing ? "Advertisement campaign paused successfully." : "Advertisement campaign resumed successfully.");
        }}
      />

      <ConfirmActionModal
        open={pendingPauseAllAds}
        title="Pause All Running Advertisements"
        description="Are you sure you want to pause ALL active running advertisements? This will temporarily suspend all sponsor campaigns on the platform and set them to expired."
        confirmLabel="Pause All Active Campaigns"
        cancelLabel="Cancel"
        kicker="Emergency Pause Cockpit"
        busy={busyAction === "All running advertisements paused."}
        onCancel={() => {
          if (busyAction !== "All running advertisements paused.") {
            setPendingPauseAllAds(false);
          }
        }}
        onConfirm={async () => {
          setPendingPauseAllAds(false);
          await pauseAllActiveAds();
        }}
      />

      <ConfirmActionModal
        open={Boolean(pendingAdDelete)}
        title="Delete advertisement"
        description={`This will permanently delete "${pendingAdDelete?.title || "this advertisement"}". This action cannot be undone.`}
        confirmLabel="Delete Advertisement"
        cancelLabel="Keep Advertisement"
        kicker="Delete Advertisement"
        busy={busyAction === "Advertisement deleted."}
        onCancel={() => {
          if (busyAction !== "Advertisement deleted.") {
            setPendingAdDelete(null);
          }
        }}
        onConfirm={async () => {
          if (!pendingAdDelete?._id) return;
          const targetId = pendingAdDelete._id;
          setPendingAdDelete(null);
          await deleteAd(targetId);
        }}
      />
      
      <ConfirmActionModal
        open={Boolean(pendingArchiveArticleDelete)}
        title="Delete published article"
        description={`This will permanently delete "${pendingArchiveArticleDelete?.title || "this article"}". This action cannot be undone.`}
        confirmLabel="Delete Article"
        cancelLabel="Keep Article"
        kicker="Delete Article"
        busy={busyAction === "Published article deleted."}
        onCancel={() => {
          if (busyAction !== "Published article deleted.") {
            setPendingArchiveArticleDelete(null);
          }
        }}
        onConfirm={async () => {
          if (!pendingArchiveArticleDelete?._id) return;
          const targetId = pendingArchiveArticleDelete._id;
          setPendingArchiveArticleDelete(null);
          await deleteArchiveArticle(targetId);
        }}
      />
      
      <ConfirmActionModal
        open={Boolean(pendingManagedUserDelete)}
        title="Delete newsroom user"
        description={`This will permanently delete "${pendingManagedUserDelete?.fullName || "this user"}" and remove their newsroom access. This action cannot be undone.`}
        confirmLabel="Delete User"
        cancelLabel="Keep User"
        kicker="Delete User"
        busy={busyAction === "User deleted."}
        onCancel={() => {
          if (busyAction !== "User deleted.") {
            setPendingManagedUserDelete(null);
          }
        }}
        onConfirm={async () => {
          if (!pendingManagedUserDelete?._id) return;
          const targetId = pendingManagedUserDelete._id;
          setPendingManagedUserDelete(null);
          await deleteManagedUser(targetId);
        }}
      />
      
      <ConfirmActionModal
        open={Boolean(pendingArticleDeleteId)}
        title="Delete article draft"
        description="This will permanently delete this article draft. This action cannot be undone."
        confirmLabel="Delete Draft"
        cancelLabel="Keep Draft"
        kicker="Delete Draft"
        busy={busyAction === "Article deleted."}
        onCancel={() => {
          if (busyAction !== "Article deleted.") {
            setPendingArticleDeleteId(null);
          }
        }}
        onConfirm={confirmDeleteArticle}
      />

      <ConfirmActionModal
        open={Boolean(pendingContactMessageDeleteId)}
        title="Delete contact message"
        description="This will permanently delete this contact request from the inbox. This action cannot be undone."
        confirmLabel="Delete Message"
        cancelLabel="Keep Message"
        kicker="Delete Contact Message"
        busy={busyAction === "Contact message deleted."}
        onCancel={() => {
          if (busyAction !== "Contact message deleted.") {
            setPendingContactMessageDeleteId(null);
          }
        }}
        onConfirm={confirmDeleteContactMessage}
      />

      <ConfirmActionModal
        open={Boolean(pendingAdRejectId)}
        title="Reject advertisement request"
        description="Are you sure you want to reject this advertisement request? This will decline the request and notify the advertiser."
        confirmLabel="Reject Advertisement"
        cancelLabel="Cancel"
        kicker="Reject Advertisement"
        busy={busyAction === "Advertisement rejected."}
        onCancel={() => {
          if (busyAction !== "Advertisement rejected.") {
            setPendingAdRejectId(null);
          }
        }}
        onConfirm={confirmRejectAd}
      />

      <ConfirmActionModal
        open={Boolean(pendingAdApproveId)}
        title="Approve advertisement request"
        description="Are you sure you want to approve this advertisement request? The campaign will immediately become active and publish on the homepage."
        confirmLabel="Approve Advertisement"
        cancelLabel="Cancel"
        kicker="Approve Ad Request"
        busy={busyAction === "Advertisement approved and published."}
        onCancel={() => {
          if (busyAction !== "Advertisement approved and published.") {
            setPendingAdApproveId(null);
          }
        }}
        onConfirm={async () => {
          if (!pendingAdApproveId) return;
          const targetId = pendingAdApproveId;
          setPendingAdApproveId(null);
          await approveAd(targetId);
        }}
      />

      <ConfirmActionModal
        open={pendingAdFormSubmit}
        title={editingAdId ? "Update advertisement campaign" : "Publish advertisement campaign"}
        description={
          editingAdId 
            ? `Are you sure you want to save the changes to the campaign "${adForm.title || "this advertisement"}"?` 
            : `Are you sure you want to register and activate the campaign "${adForm.title || "this advertisement"}" for ${adForm.companyName || "the advertiser"}?`
        }
        confirmLabel={editingAdId ? "Save Changes" : "Confirm & Publish"}
        cancelLabel="Go Back"
        kicker="Sponsorship Composer"
        busy={busyAction === "Advertisement updated successfully." || busyAction === "Advertisement published successfully."}
        onCancel={() => {
          if (busyAction !== "Advertisement updated successfully." && busyAction !== "Advertisement published successfully.") {
            setPendingAdFormSubmit(false);
          }
        }}
        onConfirm={async () => {
          setPendingAdFormSubmit(false);
          await submitAd();
        }}
      />

      {selectedPendingUser && (
        <div className="fixed inset-0 z-[125] flex items-center justify-center bg-slate-950/85 px-4 py-6 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-[32px] border border-white/10 bg-slate-950 shadow-[0_32px_80px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden max-h-[90vh] animate-[fadeIn_0.3s_ease-out]">
            
            {/* Header */}
            <div className="flex items-center justify-between gap-4 border-b border-white/5 p-6 bg-slate-900/40 shrink-0">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-400">Application Review Console</p>
                <h2 className="mt-1 text-2xl font-black text-white">Review Onboarding Credentials</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPendingUser(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:text-white transition duration-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Scroll Area */}
            <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1 text-xs">
              <div className="grid gap-6 md:grid-cols-[280px_1fr]">
                
                {/* Left Column: Summary */}
                <div className="flex flex-col items-center text-center bg-slate-900/20 border border-white/5 rounded-2xl p-5">
                  <div className="relative">
                    <div className="h-28 w-28 rounded-[28px] overflow-hidden bg-slate-950 border-2 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.25)] flex items-center justify-center">
                      {selectedPendingUser.profilePhotoUrl || selectedPendingUser.livePhotoUrl ? (
                        <img src={selectedPendingUser.profilePhotoUrl || selectedPendingUser.livePhotoUrl} alt={selectedPendingUser.fullName} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-3xl font-black text-slate-400">
                          {selectedPendingUser.fullName ? selectedPendingUser.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "PE"}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <h3 className="mt-4 text-base font-extrabold text-white leading-tight">{selectedPendingUser.fullName}</h3>
                  
                  <div className="mt-2.5 flex justify-center gap-1.5 flex-wrap">
                    <span className="rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2.5 py-0.5 text-[8.5px] font-black tracking-wider uppercase">
                      {String(selectedPendingUser.role || "reporter").replaceAll("_", " ")}
                    </span>
                    <span className="rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 text-[8.5px] font-black tracking-wider uppercase animate-pulse">
                      Pending Approval
                    </span>
                  </div>
                </div>

                {/* Right Column: Key details */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 border-b border-white/5 pb-2">Profile Metadata</h4>
                  <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                    <DetailRow label="Mobile Phone" value={selectedPendingUser.phone} />
                    <DetailRow label="Official Email" value={selectedPendingUser.email || "-"} />
                    <DetailRow label="District Jurisdiction" value={selectedPendingUser.district || "-"} />
                    <DetailRow label="Block / Area" value={selectedPendingUser.area || "-"} />
                    <DetailRow label="Blood Group" value={selectedPendingUser.bloodGroup || "O+"} />
                    <DetailRow label="Education" value={selectedPendingUser.education || "-"} />
                    <DetailRow label="Aadhaar Number" value={selectedPendingUser.aadhaarNumber || "-"} />
                    <DetailRow label="Email Verification" value={selectedPendingUser.isEmailVerified ? "Verified" : "Unverified"} valueClassName={selectedPendingUser.isEmailVerified ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"} />
                  </div>
                </div>
              </div>

              {/* KYC Document Previews */}
              <div className="border-t border-white/5 pt-5 space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">KYC Verification Documents</h4>
                <div className="grid gap-6 sm:grid-cols-2">
                  {(selectedPendingUser.profilePhotoUrl || selectedPendingUser.livePhotoUrl) && (
                    <div className="group/kyc relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40 p-3">
                      <p className="text-[9px] text-slate-400 font-black mb-2 uppercase tracking-wider">Registered Profile Photo</p>
                      <div className="h-48 overflow-hidden rounded-xl bg-slate-955 flex items-center justify-center">
                        <img src={selectedPendingUser.profilePhotoUrl || selectedPendingUser.livePhotoUrl} alt="Profile Scan" className="w-full h-full object-contain transition-transform duration-300 group-hover/kyc:scale-105" />
                      </div>
                    </div>
                  )}
                  {selectedPendingUser.aadhaarImageUrl && (
                    <div className="group/kyc relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40 p-3">
                      <p className="text-[9px] text-slate-400 font-black mb-2 uppercase tracking-wider">Aadhaar Card Document (ID Card)</p>
                      <div className="h-48 overflow-hidden rounded-xl bg-slate-955 flex items-center justify-center">
                        <img src={selectedPendingUser.aadhaarImageUrl} alt="Aadhaar Scan" className="w-full h-full object-contain transition-transform duration-300 group-hover/kyc:scale-105" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Optional Rejection Feedback input inside the modal */}
              <div className="border-t border-white/5 pt-5 space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Editorial Feedback (For Rejections)</h4>
                <textarea
                  className="w-full min-h-[80px] rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 placeholder-slate-500 transition duration-200 resize-none"
                  placeholder="Optional rejection feedback... Describe corrections needed (e.g. Aadhaar image blurry, details incomplete, etc.)."
                  value={feedbacks[`user-${selectedPendingUser._id}`] || ""}
                  onChange={(e) => setFeedbacks({ ...feedbacks, [`user-${selectedPendingUser._id}`]: e.target.value })}
                />
              </div>
            </div>

            {/* Bottom Actions footer bar */}
            <div className="border-t border-white/5 p-6 bg-slate-900/40 flex flex-wrap justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedPendingUser(null)}
                className="rounded-full border border-white/10 px-5 py-2.5 text-xs font-semibold text-white hover:bg-white/5 hover:border-white/20 transition duration-200"
              >
                Close Review
              </button>
              
              <button
                type="button"
                onClick={async () => {
                  const targetId = selectedPendingUser._id;
                  setSelectedPendingUser(null);
                  setPendingUserRejectId(targetId);
                }}
                className="rounded-full bg-rose-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-rose-500 transition duration-200"
              >
                Reject Request
              </button>
              
              <button
                type="button"
                onClick={async () => {
                  const targetId = selectedPendingUser._id;
                  setSelectedPendingUser(null);
                  await approveUser(targetId);
                }}
                className="rounded-full bg-green-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-green-500 transition duration-200"
              >
                Approve Onboarding
              </button>
            </div>

          </div>
        </div>
      )}

      <ConfirmActionModal
        open={Boolean(pendingUserRejectId)}
        title="Reject credentials / application"
        description="Are you sure you want to reject this user's credentials? Please specify the detailed reason or corrections required below so they can re-apply."
        confirmLabel="Reject Credentials"
        cancelLabel="Cancel"
        kicker="Reject Reporter"
        showInput={true}
        inputValue={feedbacks[`user-${pendingUserRejectId}`] || ""}
        onInputChange={(val) => setFeedbacks({ ...feedbacks, [`user-${pendingUserRejectId}`]: val })}
        inputPlaceholder="Describe the corrections needed (e.g. Aadhaar scan blurry, missing credentials, wrong district, etc.)..."
        busy={busyAction === "User rejected with feedback."}
        onCancel={() => {
          if (busyAction !== "User rejected with feedback.") {
            setPendingUserRejectId(null);
          }
        }}
        onConfirm={confirmRejectUser}
      />

      <ConfirmActionModal
        open={Boolean(pendingArticleRejectId)}
        title="Reject submitted story"
        description="Are you sure you want to reject this submitted story? This will send the story back to the draft stage and notify the author."
        confirmLabel="Reject Story"
        cancelLabel="Cancel"
        kicker="Reject Story"
        busy={busyAction === "Article rejected with editorial feedback."}
        onCancel={() => {
          if (busyAction !== "Article rejected with editorial feedback.") {
            setPendingArticleRejectId(null);
          }
        }}
        onConfirm={confirmRejectArticle}
      />

      <ConfirmActionModal
        open={showClearAllQueriesConfirm}
        title="Clear all contact messages"
        description="Are you sure you want to permanently clear all contact inbox messages and queries? This action cannot be undone."
        confirmLabel="Clear All Messages"
        cancelLabel="Cancel"
        kicker="Inbox Control"
        busy={busyAction === "All contact messages cleared."}
        onCancel={() => {
          if (busyAction !== "All contact messages cleared.") {
            setShowClearAllQueriesConfirm(false);
          }
        }}
        onConfirm={async () => {
          await handleAction(async () => {
            await http.post("/contact/clear-all");
            setContactMessages([]);
            setShowClearAllQueriesConfirm(false);
          }, "All contact messages cleared.");
        }}
      />

      {/* IN-ARTICLE AD PLACEMENTS MANAGEMENT MODAL */}
      {showManageInArticleAdsModal && selectedAdArticle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md px-4 py-6 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-[32px] border border-orange-500/20 bg-slate-950 p-6 shadow-2xl overflow-y-auto max-h-[90vh] space-y-6 animate-[fadeIn_0.3s_ease-out]">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/5 pb-4 gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400">Ad Injection Server</span>
                <h3 className="text-xl font-bold text-white mt-1">Manage Ads: {selectedAdArticle.title}</h3>
                <p className="text-xs text-slate-500 mt-1">Target and inject sponsor banner placements directly within this specific news story block.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowManageInArticleAdsModal(false);
                  setSelectedAdArticle(null);
                }}
                className="rounded-full border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-bold text-white transition-all"
              >
                Close Manager
              </button>
            </div>

            {(() => {
              const articleTargetedAds = ads.filter(a => a.placement === "in-article" && a.articleId === selectedAdArticle._id);
              const artImpressions = articleTargetedAds.reduce((sum, a) => sum + (a.viewsCount || 0), 0);
              const artClicks = articleTargetedAds.reduce((sum, a) => sum + (a.clicksCount || 0), 0);
              const artCtr = artImpressions > 0 ? ((artClicks / artImpressions) * 100).toFixed(2) : "0.00";

              return (
                <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
                  {/* Left Column: Targeted Campaigns List */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Active Injections ({articleTargetedAds.length})</h4>
                      {!showInArticleAdCreateForm && (
                        <button
                          type="button"
                          onClick={() => {
                            setInArticleAdForm({
                              ...initialInArticleAdForm,
                              articleId: selectedAdArticle._id,
                            });
                            setEditingInArticleAdId("");
                            setShowInArticleAdCreateForm(true);
                          }}
                          className="rounded-full bg-orange-600 hover:bg-orange-500 text-white px-3.5 py-1.5 text-xs font-bold transition flex items-center gap-1"
                        >
                          <Plus size={12} /> Inject Sponsor Banner
                        </button>
                      )}
                    </div>

                    {/* Article-specific Performance metrics */}
                    <div className="grid gap-3 grid-cols-3 bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                      <div className="text-center">
                        <span className="block text-[9px] uppercase tracking-wider text-slate-550">Impressions</span>
                        <span className="text-base font-extrabold text-white mt-0.5 block">{artImpressions}</span>
                      </div>
                      <div className="text-center border-x border-white/5">
                        <span className="block text-[9px] uppercase tracking-wider text-slate-555">Clicks</span>
                        <span className="text-base font-extrabold text-orange-400 mt-0.5 block">{artClicks}</span>
                      </div>
                      <div className="text-center">
                        <span className="block text-[9px] uppercase tracking-wider text-slate-555">CTR</span>
                        <span className="text-base font-extrabold text-emerald-400 mt-0.5 block">{artCtr}%</span>
                      </div>
                    </div>

                    <div className="space-y-3 overflow-y-auto max-h-[40vh] pr-2">
                      {articleTargetedAds.map((ad) => (
                        <div key={ad._id} className="p-4 rounded-2xl border border-white/5 bg-slate-900/40 space-y-3">
                          <div className="flex gap-3 justify-between items-start">
                            <div className="flex gap-3 items-center">
                              {ad.imageUrl && (
                                <img src={ad.imageUrl} alt={ad.title} className="h-10 w-16 object-cover rounded-lg border border-white/10 flex-shrink-0" />
                              )}
                              <div>
                                <h5 className="font-bold text-white text-xs">{ad.title}</h5>
                                <p className="text-[10px] text-slate-550 mt-0.5">{ad.companyName || "Sponsor Brand"}</p>
                              </div>
                            </div>
                            <span className={`rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider ${
                              ad.status === "active"
                                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                : ad.status === "paused"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-slate-500/10 text-slate-400 border border-slate-500/10"
                            }`}>
                              {ad.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-2 border-t border-white/5">
                            <p><span className="text-slate-550 font-semibold">Spot:</span> {String(ad.adPosition).replaceAll("-", " ")} {ad.adPosition === "between-paragraphs" ? `(After Para ${ad.paragraphIndex})` : ""}</p>
                            <p><span className="text-slate-550 font-semibold">Priority:</span> {ad.priority}</p>
                            <p><span className="text-slate-550 font-semibold">Views:</span> {ad.viewsCount || 0}</p>
                            <p><span className="text-slate-550 font-semibold">Clicks:</span> {ad.clicksCount || 0}</p>
                          </div>

                          <div className="flex gap-2 justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => togglePauseInArticleAd(ad)}
                              className={`rounded-full border px-3 py-1 text-[10px] font-bold transition ${
                                ad.status === "active"
                                  ? "bg-amber-600/10 border-amber-500/20 text-amber-400 hover:bg-amber-600 hover:text-white"
                                  : "bg-emerald-600/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-600 hover:text-white"
                              }`}
                            >
                              {ad.status === "active" ? "Pause" : "Resume"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingInArticleAdId(ad._id);
                                setInArticleAdForm({
                                  title: ad.title,
                                  companyName: ad.companyName || "",
                                  imageUrl: ad.imageUrl || "",
                                  targetUrl: ad.targetUrl || "",
                                  adPosition: ad.adPosition || "middle",
                                  paragraphIndex: ad.paragraphIndex !== undefined ? Number(ad.paragraphIndex) : 2,
                                  durationDays: ad.durationDays || 7,
                                  amount: ad.amount || 0,
                                  priority: ad.priority || 10,
                                  ctaLabel: ad.ctaLabel || "Visit Sponsor",
                                  description: ad.description || "",
                                  notes: ad.notes || "",
                                  status: ad.status || "active",
                                  articleId: ad.articleId || "",
                                });
                                setShowInArticleAdCreateForm(true);
                              }}
                              className="rounded-full bg-white text-slate-900 px-3 py-1 text-[10px] font-bold hover:bg-slate-100 transition"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteInArticleAd(ad._id)}
                              className="rounded-full bg-rose-600/10 border border-rose-500/20 text-rose-400 hover:bg-rose-600 hover:text-white px-3 py-1 text-[10px] font-bold transition"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                      {articleTargetedAds.length === 0 && (
                        <div className="py-12 border border-dashed border-white/10 rounded-2xl text-center text-slate-550 text-xs italic">
                          No in-article ad campaigns configured for this story block.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: In-Article Ad Injected Form */}
                  <div>
                    {showInArticleAdCreateForm ? (
                      <form onSubmit={handleInArticleAdSubmit} className="panel p-5 bg-slate-900/40 border border-white/5 rounded-2xl space-y-4 animate-[fadeIn_0.2s_ease-out]">
                        <div>
                          <h4 className="text-sm font-bold text-white">{editingInArticleAdId ? "Update Campaign Details" : "Inject Sponsor Campaign"}</h4>
                          <p className="text-[10px] text-slate-550 mt-0.5">Define targeted positioning, brand content, and tracking configs.</p>
                        </div>

                        <div className="space-y-3 text-xs">
                          {/* Title */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold uppercase text-slate-550">Ad Campaign Title</label>
                            <input
                              className={`w-full rounded-xl border bg-white/5 px-3 py-2 text-white focus:outline-none ${
                                inArticleAdErrors.title ? "border-rose-500" : "border-white/10"
                              }`}
                              placeholder="e.g. Ranchi Real Estate Offer"
                              value={inArticleAdForm.title}
                              onChange={(e) => setInArticleAdForm({ ...inArticleAdForm, title: e.target.value })}
                            />
                          </div>

                          {/* Company Name */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold uppercase text-slate-555">Brand Name</label>
                            <input
                              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:outline-none"
                              placeholder="e.g. Ranchi Builders Ltd"
                              value={inArticleAdForm.companyName}
                              onChange={(e) => setInArticleAdForm({ ...inArticleAdForm, companyName: e.target.value })}
                            />
                          </div>

                          {/* Ad Image banner */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-semibold uppercase text-slate-555 font-bold">Banner Image Asset *</label>
                            <ImagePicker
                              label="In-Article Banner Upload"
                              helpText="Choose local image file or insert a direct URL below."
                              value={inArticleAdForm.imageUrl}
                              onChange={(value) => setInArticleAdForm({ ...inArticleAdForm, imageUrl: value })}
                            />
                            <input
                              className={`w-full rounded-xl border bg-white/5 px-3 py-2 text-xs text-white focus:outline-none ${
                                inArticleAdErrors.imageUrl ? "border-rose-500 bg-rose-500/5" : "border-white/10"
                              }`}
                              placeholder="Or paste a direct asset URL: https://hosted.com/banner.jpg"
                              value={inArticleAdForm.imageUrl.startsWith("data:") ? "" : inArticleAdForm.imageUrl}
                              onChange={(e) => setInArticleAdForm({ ...inArticleAdForm, imageUrl: e.target.value })}
                            />
                          </div>

                          {/* Target Destination CTA */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold uppercase text-slate-555">Destination URL</label>
                              <input
                                type="url"
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:outline-none"
                                placeholder="e.g. https://brand.com"
                                value={inArticleAdForm.targetUrl}
                                onChange={(e) => setInArticleAdForm({ ...inArticleAdForm, targetUrl: e.target.value })}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold uppercase text-slate-555">CTA Label</label>
                              <input
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:outline-none"
                                placeholder="Visit Sponsor"
                                value={inArticleAdForm.ctaLabel}
                                onChange={(e) => setInArticleAdForm({ ...inArticleAdForm, ctaLabel: e.target.value })}
                              />
                            </div>
                          </div>

                          {/* Placement Position */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold uppercase text-slate-555">Ad Position Spot</label>
                              <select
                                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white focus:outline-none"
                                value={inArticleAdForm.adPosition}
                                onChange={(e) => setInArticleAdForm({ ...inArticleAdForm, adPosition: e.target.value })}
                              >
                                <option value="top">Top of article</option>
                                <option value="middle">Middle of article</option>
                                <option value="bottom">Bottom of article</option>
                                <option value="between-paragraphs">Between paragraphs</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold uppercase text-slate-555">Paragraph Index</label>
                              <input
                                type="number"
                                min={1}
                                disabled={inArticleAdForm.adPosition !== "between-paragraphs"}
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed"
                                value={inArticleAdForm.paragraphIndex}
                                onChange={(e) => setInArticleAdForm({ ...inArticleAdForm, paragraphIndex: Number(e.target.value) })}
                              />
                            </div>
                          </div>

                          {/* Duration & Priority */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold uppercase text-slate-555">Duration (Days)</label>
                              <input
                                type="number"
                                min={1}
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:outline-none"
                                value={inArticleAdForm.durationDays}
                                onChange={(e) => setInArticleAdForm({ ...inArticleAdForm, durationDays: Number(e.target.value) })}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold uppercase text-slate-555">Rank Priority</label>
                              <input
                                type="number"
                                min={1}
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:outline-none"
                                value={inArticleAdForm.priority}
                                onChange={(e) => setInArticleAdForm({ ...inArticleAdForm, priority: Number(e.target.value) })}
                              />
                            </div>
                             <div className="space-y-1">
                               <label className="text-[10px] font-semibold uppercase text-slate-555">Pricing (INR) <span className="text-[9px] text-orange-400 font-bold">(Auto)</span></label>
                               <input
                                 type="number"
                                 min={0}
                                 className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-450 focus:outline-none cursor-not-allowed"
                                 placeholder="0"
                                 value={inArticleAdForm.amount}
                                 readOnly
                               />
                             </div>
                          </div>

                          {/* Description */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold uppercase text-slate-555">Short Campaign Excerpt</label>
                            <textarea
                              rows={2}
                              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:outline-none resize-none"
                              placeholder="Briefly describe the promotional campaign offer..."
                              value={inArticleAdForm.description}
                              onChange={(e) => setInArticleAdForm({ ...inArticleAdForm, description: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="flex-1 rounded-full bg-orange-500 hover:bg-orange-400 text-white px-4 py-2.5 text-xs font-bold transition shadow-lg"
                          >
                            {editingInArticleAdId ? "Update Injected Ad" : "Inject Ad Campaign"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowInArticleAdCreateForm(false);
                              setEditingInArticleAdId("");
                              setInArticleAdForm(initialInArticleAdForm);
                            }}
                            className="rounded-full border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white px-4 py-2.5 text-xs font-bold transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="h-full border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-4">
                        <Sliders size={32} className="text-slate-655" />
                        <div>
                          <p className="text-xs font-bold text-white">Ad Server Workspace</p>
                          <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">Inject highly targeted sponsor banners at specific paragraphs or top/bottom layout anchors.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setInArticleAdForm({
                              ...initialInArticleAdForm,
                              articleId: selectedAdArticle._id,
                            });
                            setEditingInArticleAdId("");
                            setShowInArticleAdCreateForm(true);
                          }}
                          className="rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-600 hover:text-white px-4 py-2 text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <Plus size={12} /> Inject New Ad
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Premium Slide-Over Resolution Drawer */}
      {editingContactId && currentEditingMessage && (
        <div className="fixed inset-0 z-[110] flex justify-end bg-slate-950/60 backdrop-blur-md transition-all duration-300 animate-[fadeIn_0.2s_ease-out]">
          {/* Click backdrop to close */}
          <div className="absolute inset-0" onClick={resetContactAdminForm} />

          <div className="relative w-full max-w-xl h-full border-l border-white/10 bg-[#0f172a]/95 p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl flex flex-col justify-between overflow-y-auto animate-slideInRight">
            {/* Upper Section */}
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    currentEditingMessage.userId ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                  }`}>
                    {currentEditingMessage.userId ? "Journalist Support Query" : "Public Inquiry"}
                  </span>
                  <h3 className="text-xl font-bold text-white mt-2">Resolution Desk</h3>
                </div>
                <button
                  type="button"
                  onClick={resetContactAdminForm}
                  className="rounded-full p-2 text-slate-400 hover:bg-white/5 hover:text-white transition"
                  title="Close panel"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Sender Details */}
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sender Details</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Full Name</span>
                    <span className="text-white font-medium">{currentEditingMessage.fullName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Email Address</span>
                    <span className="text-white font-medium truncate block" title={currentEditingMessage.email}>{currentEditingMessage.email}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Phone Number</span>
                    <span className="text-white font-medium">{currentEditingMessage.phone || "Not provided"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Submitted On</span>
                    <span className="text-white font-medium">{formatDateTime(currentEditingMessage.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Query Content */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Query Content</p>
                <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4 space-y-2.5">
                  <h4 className="text-sm font-bold text-white leading-snug">{currentEditingMessage.subject}</h4>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{currentEditingMessage.message}</p>
                </div>
              </div>

              {/* Action & Resolution */}
              <div className="space-y-4 pt-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Action & Resolution</p>
                
                {/* Status Chips */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-400">Current Status</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "unresolved", label: "Unresolved", color: "bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20" },
                      { value: "in_progress", label: "In Progress", color: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20" },
                      { value: "resolved", label: "Resolved", color: "bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20" }
                    ].map((opt) => (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => setContactAdminForm({ ...contactAdminForm, status: opt.value })}
                        className={`rounded-xl border p-2.5 text-xs font-bold transition-all text-center ${opt.color} ${
                          contactAdminForm.status === opt.value ? "ring-2 ring-orange-500/50 border-orange-500/50 scale-[1.03] opacity-100" : "opacity-50 hover:opacity-75"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Follow-up Note */}
                <div className="space-y-2 mt-4">
                  <label className="block text-xs font-medium text-slate-400">Administrative Response Note</label>
                  <textarea
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-sm leading-relaxed"
                    rows={4}
                    placeholder="Type follow-up directions, next steps, or resolution feedback. If this is a journalist support ticket, this response updates their workspace instantly."
                    value={contactAdminForm.adminNote}
                    onChange={(event) => setContactAdminForm({ ...contactAdminForm, adminNote: event.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/5 pt-4 mt-8 flex justify-between gap-3 bg-[#0f172a]/95 sticky bottom-0 z-10">
              <button
                type="button"
                onClick={() => deleteContactMessage(currentEditingMessage._id)}
                className="rounded-full bg-rose-600/10 border border-rose-500/20 px-4 py-2.5 text-sm font-semibold text-rose-400 hover:bg-rose-600 hover:text-white transition-all duration-150 flex items-center gap-1.5"
              >
                <Trash2 size={16} /> Delete Message
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={resetContactAdminForm}
                  className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/5 transition-all duration-150"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => saveContactMessage(currentEditingMessage._id)}
                  className="rounded-full bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-500 shadow-lg shadow-green-950/30 hover:scale-105 active:scale-95 transition-all duration-150 flex items-center gap-1.5"
                >
                  <Check size={16} /> Save Resolution
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Premium Slide-Over Sponsor Campaign Composer Drawer */}
      {(editingAdId || isCreatingAd) && (
        <div className="fixed inset-0 z-[110] flex justify-end bg-slate-950/60 backdrop-blur-md transition-all duration-300 animate-[fadeIn_0.2s_ease-out]">
          {/* Click backdrop to close */}
          <div className="absolute inset-0" onClick={resetAdForm} />

          <div className="relative w-full max-w-xl h-full border-l border-white/10 bg-[#0f172a]/95 p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl flex flex-col justify-between overflow-y-auto animate-slideInRight">
            {/* Form Section */}
            <form onSubmit={handleAdFormSubmitClick} className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <span className="inline-flex items-center rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                    Sponsorship Desk
                  </span>
                  <h3 className="text-xl font-bold text-white mt-2">
                    {editingAdId ? "Edit Sponsor Campaign" : "Launch Sponsor Campaign"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={resetAdForm}
                  className="rounded-full p-2 text-slate-400 hover:bg-white/5 hover:text-white transition"
                  title="Close panel"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form Input fields */}
              <div className="space-y-4">
                {/* Brand / Company name */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Company / Brand Name *</label>
                    <input
                      className={`w-full rounded-2xl border ${adErrors.companyName ? 'border-rose-500 bg-rose-500/5' : 'border-white/10 bg-white/5'} px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500/30`}
                      placeholder="e.g. Sony India"
                      value={adForm.companyName}
                      onChange={(event) => setAdForm({ ...adForm, companyName: event.target.value })}
                    />
                    {adErrors.companyName && <p className="text-[10px] text-rose-450 font-bold">{adErrors.companyName}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Campaign Title *</label>
                    <input
                      className={`w-full rounded-2xl border ${adErrors.title ? 'border-rose-500 bg-rose-500/5' : 'border-white/10 bg-white/5'} px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500/30`}
                      placeholder="e.g. Xperia Summer Sale"
                      value={adForm.title}
                      onChange={(event) => setAdForm({ ...adForm, title: event.target.value })}
                    />
                    {adErrors.title && <p className="text-[10px] text-rose-450 font-bold">{adErrors.title}</p>}
                  </div>
                </div>

                {/* Advertiser Details */}
                <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-4 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Advertiser Contact Info</p>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-450">Contact Full Name *</label>
                      <input
                        className={`w-full rounded-xl border ${adErrors.advertiserName ? 'border-rose-500 bg-rose-500/5' : 'border-white/10 bg-white/5'} px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-orange-500/30`}
                        placeholder="Full name of representative"
                        value={adForm.advertiserName}
                        onChange={(event) => setAdForm({ ...adForm, advertiserName: event.target.value })}
                      />
                      {adErrors.advertiserName && <p className="text-[10px] text-rose-450 font-bold">{adErrors.advertiserName}</p>}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-450">Email Address</label>
                        <input
                          type="email"
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none"
                          placeholder="e.g. rep@sony.in"
                          value={adForm.advertiserEmail}
                          onChange={(event) => setAdForm({ ...adForm, advertiserEmail: event.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-450">Phone Number</label>
                        <input
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none"
                          placeholder="10-digit phone"
                          value={adForm.advertiserPhone}
                          onChange={(event) => setAdForm({ ...adForm, advertiserPhone: event.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Short Campaign Summary</label>
                  <textarea
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500/30"
                    rows={2}
                    placeholder="Brief description for sponsor displays"
                    value={adForm.description}
                    onChange={(event) => setAdForm({ ...adForm, description: event.target.value })}
                  />
                </div>

                {/* Image Picker */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-semibold">Banner Image Asset *</label>
                  <ImagePicker
                    label="Campaign Banner Upload"
                    helpText="Choose local image file or insert a direct URL below."
                    value={adForm.imageUrl}
                    onChange={(value) => setAdForm({ ...adForm, imageUrl: value })}
                  />
                  <input
                    className={`w-full rounded-2xl border ${adErrors.imageUrl ? 'border-rose-500 bg-rose-500/5' : 'border-white/10 bg-white/5'} px-4 py-3 text-xs text-white focus:outline-none`}
                    placeholder="Or paste a direct asset URL: https://hosted.com/banner.jpg"
                    value={adForm.imageUrl.startsWith("data:") ? "" : adForm.imageUrl}
                    onChange={(event) => setAdForm({ ...adForm, imageUrl: event.target.value })}
                  />
                  {adErrors.imageUrl && <p className="text-[10px] text-rose-450 font-bold">{adErrors.imageUrl}</p>}
                </div>

                {/* Live Image Preview Inside Drawer */}
                {adForm.imageUrl && (
                  <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-2.5">
                    <span className="block text-[9px] uppercase tracking-wider text-slate-555 mb-2 font-bold">Live Banner Preview</span>
                    <div className="overflow-hidden rounded-xl border border-white/5 bg-slate-900/60 aspect-[16/9] flex items-center justify-center">
                      <img src={adForm.imageUrl} alt="Sponsor Banner Preview" className="max-h-full max-w-full object-contain" />
                    </div>
                  </div>
                )}

                {/* Destination & CTA button Customization */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Destination URL</label>
                    <input
                      type="url"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:outline-none"
                      placeholder="e.g. https://brand.com/deals"
                      value={adForm.targetUrl}
                      onChange={(event) => setAdForm({ ...adForm, targetUrl: event.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">CTA Button Text</label>
                    <input
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:outline-none"
                      placeholder="e.g. Visit Sponsor"
                      value={adForm.ctaLabel}
                      onChange={(event) => setAdForm({ ...adForm, ctaLabel: event.target.value })}
                    />
                  </div>
                </div>

                {/* Placement & Status selection */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-semibold">Homepage Placement</label>
                    <select
                      className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white focus:outline-none"
                      value={adForm.placement}
                      onChange={(event) => setAdForm({ ...adForm, placement: event.target.value })}
                    >
                      {adPlacements.filter((p) => p.value !== "in-article").map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-semibold">Publish Status</label>
                    <select
                      className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white focus:outline-none"
                      value={adForm.status}
                      onChange={(event) => setAdForm({ ...adForm, status: event.target.value })}
                    >
                      {adStatuses.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Duration, Amount, Priority */}
                <div className="grid gap-4 grid-cols-3">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Duration (Days)</label>
                    <input
                      type="number"
                      min="1"
                      className={`w-full rounded-2xl border ${adErrors.durationDays ? 'border-rose-500 bg-rose-500/5' : 'border-white/10 bg-white/5'} px-3 py-3 text-sm text-white focus:outline-none`}
                      value={adForm.durationDays}
                      onChange={(event) => setAdForm({ ...adForm, durationDays: Number(event.target.value) })}
                    />
                    {adErrors.durationDays && <p className="text-[9px] text-rose-450 font-bold leading-tight">{adErrors.durationDays}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 font-semibold">Price (INR) <span className="text-[9px] text-orange-400 font-bold">(Auto)</span></label>
                    <input
                      type="number"
                      min="0"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-3 text-sm text-slate-450 focus:outline-none cursor-not-allowed"
                      value={adForm.amount}
                      readOnly
                    />
                    {adErrors.amount && <p className="text-[9px] text-rose-450 font-bold leading-tight">{adErrors.amount}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Priority Weight</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white focus:outline-none"
                      value={adForm.priority}
                      onChange={(event) => setAdForm({ ...adForm, priority: Number(event.target.value) })}
                    />
                  </div>
                </div>

                {/* Internal notes */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Internal Desk Remarks</label>
                  <textarea
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500/30"
                    rows={2}
                    placeholder="Internal invoices, approval context, etc."
                    value={adForm.notes}
                    onChange={(event) => setAdForm({ ...adForm, notes: event.target.value })}
                  />
                </div>

                {adForm.placement === "promotional-article" && (
                  <div className="space-y-4 rounded-2xl border border-dashed border-emerald-500/20 bg-emerald-500/5 p-4 mt-2">
                    <p className="text-xs font-semibold text-emerald-450 uppercase tracking-wider">Promotional Article Parameters</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Target District</label>
                        <select
                          className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-2.5 text-xs text-white focus:outline-none"
                          value={adForm.district || "Palamu"}
                          onChange={(e) => setAdForm({ ...adForm, district: e.target.value, block: jharkhandBlocksByDistrict[e.target.value]?.[0] || "" })}
                        >
                          {jharkhandDistricts.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Target Block / Area</label>
                        <select
                          className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-2.5 text-xs text-white focus:outline-none"
                          value={adForm.block || "Medininagar"}
                          onChange={(e) => setAdForm({ ...adForm, block: e.target.value })}
                        >
                          {(jharkhandBlocksByDistrict[adForm.district || "Palamu"] || []).map((b) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Full Article Body Content</label>
                      <textarea
                        className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                        rows={6}
                        placeholder="Write the full press release, event details, or promotional copy here..."
                        value={adForm.promotionalContent || ""}
                        onChange={(event) => setAdForm({ ...adForm, promotionalContent: event.target.value })}
                      />
                    </div>
                  </div>
                )}

                {adForm.placement === "homepage-popup" && (
                  <div className="space-y-4 rounded-2xl border border-dashed border-orange-500/20 bg-orange-500/5 p-4 mt-2">
                    <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider">Premium Pop-up Targeting & Geofencing</p>
                    
                    {/* Time Slotting active hours */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Hourly Running Slots (Active Hours)</label>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="block text-[9px] text-slate-500 uppercase tracking-wider">Start Hour (24h format)</label>
                          <select
                            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-2.5 text-xs text-white focus:outline-none"
                            value={adForm.timeTargeting?.startHour ?? 0}
                            onChange={(e) => setAdForm({
                              ...adForm,
                              timeTargeting: {
                                ...(adForm.timeTargeting || { startHour: 0, endHour: 24 }),
                                startHour: Number(e.target.value)
                              }
                            })}
                          >
                            {Array.from({ length: 24 }, (_, i) => (
                              <option key={i} value={i}>
                                {i === 0 ? "12:00 AM (00)" : i === 12 ? "12:00 PM (12)" : i > 12 ? `${i - 12}:00 PM (${i})` : `${i}:00 AM (${i})`}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] text-slate-500 uppercase tracking-wider">End Hour (24h format)</label>
                          <select
                            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-2.5 text-xs text-white focus:outline-none"
                            value={adForm.timeTargeting?.endHour ?? 24}
                            onChange={(e) => setAdForm({
                              ...adForm,
                              timeTargeting: {
                                ...(adForm.timeTargeting || { startHour: 0, endHour: 24 }),
                                endHour: Number(e.target.value)
                              }
                            })}
                          >
                            {Array.from({ length: 25 }, (_, i) => i > 0 && (
                              <option key={i} value={i}>
                                {i === 12 ? "12:00 PM (12)" : i === 24 ? "11:59 PM (24)" : i > 12 ? `${i - 12}:00 PM (${i})` : `${i}:00 AM (${i})`}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Geofencing Districts */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-semibold">District Geofencing</label>
                      <div className="flex gap-2">
                        <select
                          className="flex-1 rounded-2xl border border-white/10 bg-slate-900 px-4 py-2.5 text-xs text-white focus:outline-none"
                          value={districtInput}
                          onChange={(e) => {
                            setDistrictInput(e.target.value);
                            setBlockInput("");
                          }}
                        >
                          {jharkhandDistricts.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            if (districtInput && !adForm.targetDistricts?.includes(districtInput)) {
                              setAdForm({
                                ...adForm,
                                targetDistricts: [...(adForm.targetDistricts || []), districtInput]
                              });
                            }
                          }}
                          className="rounded-xl bg-orange-600 hover:bg-orange-500 px-4 py-2 text-xs font-semibold text-white transition-all"
                        >
                          + Add District
                        </button>
                      </div>
                      
                      {/* District badges */}
                      {adForm.targetDistricts?.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 pt-1.5">
                          {adForm.targetDistricts.map((d) => (
                            <span key={d} className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 border border-orange-500/20 px-2.5 py-0.5 text-[10px] font-bold text-orange-400">
                              {d}
                              <button
                                type="button"
                                onClick={() => {
                                  setAdForm({
                                    ...adForm,
                                    targetDistricts: adForm.targetDistricts.filter(dist => dist !== d),
                                    targetBlocks: (adForm.targetBlocks || []).filter(blk => !jharkhandBlocksByDistrict[d]?.includes(blk))
                                  });
                                }}
                                className="text-orange-400 hover:text-white ml-0.5 text-[10px]"
                              >
                                <X size={10} />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-500 italic">No districts targeted. Showing in all districts by default (Broadcast mode).</p>
                      )}
                    </div>

                    {/* Geofencing Blocks */}
                    {adForm.targetDistricts?.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-white/5">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-semibold">Block / Sub-District Geofencing (Optional)</label>
                        <p className="text-[10px] text-slate-500">Fine-tune targeting inside selected districts. Leave empty to target all blocks in those districts.</p>
                        <div className="flex gap-2">
                          <select
                            className="flex-1 rounded-2xl border border-white/10 bg-slate-900 px-4 py-2.5 text-xs text-white focus:outline-none"
                            value={blockInput}
                            onChange={(e) => setBlockInput(e.target.value)}
                          >
                            <option value="">-- Select Block --</option>
                            {adForm.targetDistricts.flatMap((dist) =>
                              (jharkhandBlocksByDistrict[dist] || []).map((blk) => (
                                <option key={`${dist}_${blk}`} value={blk}>{blk} ({dist})</option>
                              ))
                            )}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              if (blockInput && !adForm.targetBlocks?.includes(blockInput)) {
                                setAdForm({
                                  ...adForm,
                                  targetBlocks: [...(adForm.targetBlocks || []), blockInput]
                                });
                              }
                            }}
                            disabled={!blockInput}
                            className="rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white transition-all"
                          >
                            + Add Block
                          </button>
                        </div>
                        
                        {/* Block badges */}
                        {adForm.targetBlocks?.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 pt-1.5">
                            {adForm.targetBlocks.map((b) => {
                              const parentDistrict = adForm.targetDistricts.find(d => jharkhandBlocksByDistrict[d]?.includes(b)) || "";
                              return (
                                <span key={b} className="inline-flex items-center gap-1 rounded-full bg-slate-800 border border-white/10 px-2.5 py-0.5 text-[10px] font-medium text-slate-300">
                                  {b} {parentDistrict && `(${parentDistrict})`}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAdForm({
                                        ...adForm,
                                        targetBlocks: adForm.targetBlocks.filter(blk => blk !== b)
                                      });
                                    }}
                                    className="text-slate-400 hover:text-white ml-0.5 text-[10px]"
                                  >
                                    <X size={10} />
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-500 italic">No specific blocks targeted. Targeting all areas in the selected districts.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </form>

            {/* Sticky Action Footer inside drawer */}
            <div className="border-t border-white/5 pt-4 mt-8 flex justify-between gap-3 bg-[#0f172a]/95 sticky bottom-0 z-10">
              {editingAdId && (
                <button
                  type="button"
                  onClick={() => {
                    const targetAd = ads.find(a => a._id === editingAdId);
                    if (targetAd) setPendingAdDelete(targetAd);
                  }}
                  className="rounded-full bg-rose-600/10 border border-rose-500/20 px-4 py-2.5 text-sm font-semibold text-rose-400 hover:bg-rose-600 hover:text-white transition-all duration-150 flex items-center gap-1.5"
                >
                  <Trash2 size={16} /> Delete Campaign
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <button
                  type="button"
                  onClick={resetAdForm}
                  className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/5 transition-all duration-150"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAdFormSubmitClick}
                  className="rounded-full bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-400 shadow-lg shadow-orange-950/30 hover:scale-105 active:scale-95 transition-all duration-150 flex items-center gap-1.5"
                >
                  <Check size={16} /> {editingAdId ? "Update Campaign" : "Publish Campaign"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmActionModal
        open={showClearExpiryConfirm}
        title="Remove global expiry date"
        description="Are you sure you want to remove the global expiry date? The system will fall back to rolling 1-year calculations for journalist credentials."
        confirmLabel="Remove Expiry Date"
        cancelLabel="Keep Expiry Date"
        kicker="System Control"
        onCancel={() => setShowClearExpiryConfirm(false)}
        onConfirm={confirmClearGlobalExpiry}
      />

      <ConfirmActionModal
        open={showLogoutConfirm}
        title="Confirm log out"
        description="Are you sure you want to log out of the Newsroom CMS Workspace?"
        confirmLabel="Log Out"
        cancelLabel="Cancel"
        kicker="Logout"
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          localStorage.removeItem("dashboard_active_tab");
          localStorage.removeItem("dashboard_prev_active_tab");
          logout();
          navigate("/login");
        }}
      />
      
      <VoiceNewsComposer
        open={showVoiceDesk}
        onClose={closeVoiceDesk}
        userRole={user?.role}
        canSubmit={canAccessVoiceDesk}
        defaultDistrict={profile?.district || ""}
        defaultArea={profile?.area || ""}
        onSubmitted={handleVoiceNewsSubmitted}
      />

      {showOtpModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-[fadeIn_0.2s_ease-out]">
          <div className="relative w-full max-w-md my-auto rounded-3xl border border-white/10 bg-[#0b0f19] p-8 text-center shadow-2xl transition hover:border-white/15">
            {/* Close Modal X */}
            <button
              type="button"
              disabled={otpBusy}
              onClick={() => {
                setShowOtpModal(false);
                setPendingCredentialPayload(null);
                setOtpCode("");
                setOtpError("");
              }}
              className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-white/5 hover:text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X size={18} />
            </button>

            {/* Icon Banner */}
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
              <ShieldCheck className="h-8 w-8" />
            </div>

            {/* Text Header */}
            <h3 className="text-xl font-bold font-display text-white">Security Verification</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              To update your sensitive account credentials (email or phone), please verify your identity by entering the 6-digit code sent to:
            </p>
            <p className="mt-2.5 font-semibold text-orange-400 tracking-wide text-sm break-all select-all">
              {profile?.email || pendingCredentialPayload?.email}
            </p>

            {/* Error Message Box */}
            {otpError && (
              <div className="mt-4 flex items-start gap-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 text-left text-sm text-rose-300">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-400" />
                <p>{otpError}</p>
              </div>
            )}

            {/* OTP Input Form Control */}
            <div className="mt-6 space-y-3">
              <label htmlFor="otp-verification-input" className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 text-left">
                6-Digit Verification Code
              </label>
              <input
                id="otp-verification-input"
                type="text"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setOtpCode(val);
                }}
                disabled={otpBusy}
                className="w-full tracking-[0.75em] text-center text-2xl font-bold rounded-2xl border border-white/10 bg-white/[0.02] py-4 text-white placeholder-slate-600 focus:border-orange-500 focus:bg-orange-500/5 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="000000"
                autoFocus
              />
            </div>

            {/* Resend Controls */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm">
              <span className="text-slate-400">Didn't receive the code?</span>
              {resendCountdown > 0 ? (
                <span className="font-semibold text-orange-400">
                  Resend in {resendCountdown}s
                </span>
              ) : (
                <button
                  type="button"
                  disabled={otpBusy}
                  onClick={handleResendOtp}
                  className="font-semibold text-orange-500 hover:text-orange-400 transition hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Resend Code
                </button>
              )}
            </div>

            {/* Modal Actions */}
            <div className="mt-8 grid grid-cols-2 gap-4">
              <button
                type="button"
                disabled={otpBusy}
                onClick={() => {
                  setShowOtpModal(false);
                  setPendingCredentialPayload(null);
                  setOtpCode("");
                  setOtpError("");
                }}
                className="rounded-2xl border border-white/10 px-4 py-3.5 text-sm font-semibold text-white hover:bg-white/5 transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={otpBusy || otpCode.length !== 6}
                onClick={verifyAndSaveCredentials}
                className="flex items-center justify-center rounded-2xl bg-orange-600 px-4 py-3.5 text-sm font-semibold text-white hover:bg-orange-500 shadow-lg shadow-orange-950/30 transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {otpBusy ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  "Verify & Save"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Buttons for quick news desk action */}
      {showDashboardActions && !showDisabledDashboardState && (
        <div className="fixed bottom-6 right-6 z-[70] flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("write_news")}
            className={`flex h-14 w-14 items-center justify-center rounded-full bg-orange-600 text-white shadow-2xl transition hover:bg-orange-500 hover:scale-105 active:scale-95 shadow-orange-950/40 ${
              activeTab === "write_news" ? "ring-4 ring-orange-500/30 scale-105" : ""
            }`}
            aria-label="Write news article"
            title="Write News Story"
          >
            <FilePlus2 className="h-6 w-6 text-white" />
          </button>

          <button
            type="button"
            onClick={openVoiceDesk}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-2xl transition hover:bg-emerald-500 hover:scale-105 active:scale-95 shadow-emerald-950/40"
            aria-label="Open voice recorder"
            title="Record Voice News"
          >
            <Mic className="h-6 w-6 text-white" />
          </button>
        </div>
      )}

      {/* Mobile Sidebar Backdrop Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/65 backdrop-blur-[2px] lg:hidden transition-opacity duration-300"
        />
      )}

      {/* LEFT COLUMN: SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/5 bg-[#05070c]/95 backdrop-blur-md transition-all duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${sidebarOpen ? "translate-x-0 !z-50" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center justify-between border-b border-white/5 px-6 flex-shrink-0">
          <div className="flex flex-col">
            <span className="text-white font-extrabold text-sm tracking-widest uppercase">PALAMU EXPRESS</span>
            <span className="text-orange-500 font-bold text-[9px] tracking-widest mt-0.5">NEWSROOM CMS</span>
          </div>
          <button type="button" onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>
        
        {/* Nav list */}
        <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto">
          {user?.role === "super_admin" && (
            <>
              <button onClick={() => { setActiveTab("overview"); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${activeTab === "overview" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <LayoutDashboard size={18} />
                Overview
              </button>
              <button onClick={() => { setActiveTab("my_stories"); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${activeTab === "my_stories" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <FileText size={18} />
                My Articles
              </button>
              <button onClick={() => { setActiveTab("archive_logs"); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${activeTab === "archive_logs" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <FolderKanban size={18} />
                Chronological Logs
              </button>
              <button onClick={() => { setActiveTab("approvals"); setSidebarOpen(false); }} className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${activeTab === "approvals" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <div className="flex items-center gap-3">
                  <UserCheck size={18} />
                  Approvals
                </div>
                {pendingUsers.length > 0 && (
                  <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">{pendingUsers.length}</span>
                )}
              </button>
              <button onClick={() => { setActiveTab("queue"); setSidebarOpen(false); }} className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${activeTab === "queue" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <div className="flex items-center gap-3">
                  <Layers size={18} />
                  Publishing Queue
                </div>
                {pendingArticles.length > 0 && (
                  <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">{pendingArticles.length}</span>
                )}
              </button>
              <button onClick={() => { setActiveTab("directory"); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${activeTab === "directory" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <Users size={18} />
                Journalist Directory
              </button>
              <button onClick={() => { setActiveTab("ad_desk"); setSidebarOpen(false); }} className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${activeTab === "ad_desk" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <div className="flex items-center gap-3">
                  <Megaphone size={18} />
                  Ad Desk
                </div>
                {pendingAdRequestsCount > 0 && (
                  <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">{pendingAdRequestsCount}</span>
                )}
              </button>
              <button onClick={() => { setActiveTab("expiry_control"); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${activeTab === "expiry_control" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <Calendar size={18} />
                Global Expiry
              </button>
              <button onClick={() => { setActiveTab("notifications_control"); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${activeTab === "notifications_control" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <Bell size={18} />
                Notification Panel
              </button>
              <button onClick={() => { setActiveTab("contact_inbox"); setSidebarOpen(false); }} className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${activeTab === "contact_inbox" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <div className="flex items-center gap-3">
                  <Inbox size={18} />
                  Inbox Desk
                </div>
                {unreadQueriesCount > 0 && (
                  <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">{unreadQueriesCount}</span>
                )}
              </button>
              <button onClick={() => { setActiveTab("credentials"); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${activeTab === "credentials" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <Settings size={18} />
                Account Settings
              </button>
              <button onClick={() => { setActiveTab("analytics"); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${activeTab === "analytics" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <Activity size={18} className="text-orange-500 animate-pulse" />
                Performance Analytics
              </button>
            </>
          )}

          {user?.role === "chief_editor" && (
            <>
              <button onClick={() => { setActiveTab("overview"); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${activeTab === "overview" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <LayoutDashboard size={18} />
                Overview
              </button>
              <button onClick={() => { setActiveTab("my_stories"); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${activeTab === "my_stories" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <FileText size={18} />
                My Articles
              </button>
              <button onClick={() => { setActiveTab("press_credentials"); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${activeTab === "press_credentials" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <IdCard size={18} />
                Press Documents
              </button>
              <button onClick={() => { setActiveTab("archive_logs"); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${activeTab === "archive_logs" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <FolderKanban size={18} />
                Chronological Logs
              </button>
              <button onClick={() => { setActiveTab("queue"); setSidebarOpen(false); }} className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${activeTab === "queue" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <div className="flex items-center gap-3">
                  <Layers size={18} />
                  Publishing Queue
                </div>
                {pendingArticles.length > 0 && (
                  <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">{pendingArticles.length}</span>
                )}
              </button>
              <button onClick={() => { setActiveTab("support_desk"); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${activeTab === "support_desk" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <Inbox size={18} />
                Support Desk
              </button>
              <button onClick={() => { setActiveTab("credentials"); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${activeTab === "credentials" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <Settings size={18} />
                Account Settings
              </button>
              <button onClick={() => { setActiveTab("analytics"); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${activeTab === "analytics" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <Activity size={18} className="text-orange-500 animate-pulse" />
                Performance Analytics
              </button>
            </>
          )}

          {user?.role === "reporter" && (
            <>
              <button onClick={() => { setActiveTab("overview"); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${activeTab === "overview" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <LayoutDashboard size={18} />
                Overview
              </button>
              <button onClick={() => { setActiveTab("my_stories"); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${activeTab === "my_stories" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <FileText size={18} />
                My Articles
              </button>
              <button onClick={() => { setActiveTab("press_credentials"); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${activeTab === "press_credentials" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <IdCard size={18} />
                Press Documents
              </button>
              <button onClick={() => { setActiveTab("support_desk"); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${activeTab === "support_desk" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <Inbox size={18} />
                Support Desk
              </button>
              <button onClick={() => { setActiveTab("credentials"); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${activeTab === "credentials" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <Settings size={18} />
                Account Settings
              </button>
              <button onClick={() => { setActiveTab("analytics"); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${activeTab === "analytics" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <Activity size={18} className="text-orange-500 animate-pulse" />
                Performance Analytics
              </button>
            </>
          )}
        </nav>

        {/* Sidebar Footer with Home and Logout */}
        <div className="border-t border-white/5 p-4 space-y-2 flex-shrink-0">
          <Link
            to="/"
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-400 hover:bg-white/5 hover:text-white transition-all duration-200"
          >
            <Home size={18} />
            View Website
          </Link>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-rose-400 hover:bg-rose-500/10 transition-all duration-200"
          >
            <LogOut size={18} />
            Log Out
          </button>
        </div>
      </aside>

      {/* RIGHT COLUMN: WORKSPACE CONTAINER */}
      <main className="flex-grow flex-1 flex flex-col overflow-hidden min-h-screen">
        {/* Workspace Top-Bar Header */}
        <header className="relative z-[60] flex h-16 items-center justify-between border-b border-white/5 bg-[#05070c]/50 px-6 backdrop-blur">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-400 hover:text-white">
              <Menu size={22} />
            </button>
            <div className="hidden sm:flex flex-col">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Newsroom CMS Workspace</span>
              <span className="text-white text-[10px] font-bold mt-0.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
                Active Database Node Connected
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="rounded-full border border-white/10 p-2 text-slate-300 transition hover:bg-white/5 active:scale-95 shadow-sm"
              onClick={onToggleDarkMode}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <span className="rounded-full bg-orange-500/15 border border-orange-500/30 px-3 py-1 text-xs font-bold text-orange-300 uppercase tracking-widest">
              {String(profile?.role || user?.role || "staff").replaceAll("_", " ")}
            </span>

            {/* Super Admin Communications & Support Queries Notification Icon */}
            {user?.role === "super_admin" && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAdminQueriesDropdown((prev) => !prev)}
                  className={`relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-slate-400 transition hover:bg-white/5 hover:text-white ${
                    showAdminQueriesDropdown ? "bg-white/5 text-white ring-2 ring-orange-500/30" : ""
                  }`}
                  title="Communications & Queries Inbox"
                >
                  <Mail size={18} />
                  {unreadQueriesCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 text-[10px] font-bold text-white shadow-lg ring-2 ring-[#0b0f19] animate-pulse">
                      {unreadQueriesCount}
                    </span>
                  )}
                </button>

                {showAdminQueriesDropdown && (
                  <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-3xl border border-white/10 bg-[#0b0f19]/95 p-4 shadow-2xl backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-orange-400">Unresolved Support Queries</h4>
                      <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold text-orange-400 animate-pulse">
                        {unreadQueriesCount} New
                      </span>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                      {contactMessages.filter(m => m.status === "new" || m.status === "unresolved").map((msg) => (
                        <button
                          key={msg._id}
                          onClick={() => handleQueryNotificationClick(msg)}
                          className="w-full text-left rounded-2xl border border-white/5 bg-white/[0.01] p-3 transition hover:bg-white/5 hover:border-white/10 flex flex-col gap-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider ${
                              msg.userId ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                            }`}>
                              {msg.userId ? "Journalist Query" : "Public Inquiry"}
                            </span>
                            <span className="text-[9px] text-slate-500">
                              {formatDate(msg.createdAt)}
                            </span>
                          </div>
                          <h5 className="text-xs font-bold text-white truncate w-full">{msg.subject}</h5>
                          <p className="text-[10px] text-slate-400 truncate w-full">{msg.fullName || msg.email}</p>
                        </button>
                      ))}
                      {contactMessages.filter(m => m.status === "new" || m.status === "unresolved").length === 0 && (
                        <div className="py-8 text-center text-slate-550 text-xs italic">
                          All support queries and contact inquiries have been resolved.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notification Bell Dropdown Button */}
            {user?.role !== "super_admin" && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowNotificationsDropdown((prev) => !prev)}
                  className={`relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-slate-400 transition hover:bg-white/5 hover:text-white ${
                    showNotificationsDropdown ? "bg-white/5 text-white ring-2 ring-orange-500/30" : ""
                  }`}
                  title="Notifications"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 text-[10px] font-bold text-white shadow-lg ring-2 ring-[#0b0f19] animate-pulse animate-[fadeIn_0.2s_ease-out]">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Content Container */}
        <div className="flex-grow p-6 overflow-y-auto relative">
          {showNotificationsDropdown && (
            <div className="absolute inset-0 z-30 p-6 bg-slate-950/40 backdrop-blur-2xl animate-[fadeIn_0.3s_ease-out] flex flex-col">
              <div className="panel w-full h-full flex flex-col bg-[#0b0f19]/90 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-lg shadow-orange-950/20">
                      <Bell className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold font-display text-white">Notification Inbox</h2>
                        {unreadCount > 0 && (
                          <span className="rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-bold text-orange-400 border border-orange-500/20 animate-pulse">
                            {unreadCount} New Alerts
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Accredited digital newsroom broadcasts and targeted administrative alerts.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      disabled={!notifications.length || notifications.every((n) => n.isRead)}
                      className="rounded-full border border-white/10 bg-white/[0.02] px-4 py-2 text-xs font-semibold text-orange-400 hover:bg-orange-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      Mark all read
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      disabled={!notifications.length}
                      className="rounded-full border border-white/10 bg-white/[0.02] px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      Clear all
                    </button>
                    <span className="h-6 w-px bg-white/10 hidden sm:inline" />
                    <button
                      type="button"
                      onClick={() => setShowNotificationsDropdown(false)}
                      className="rounded-full bg-white/5 p-2 text-slate-400 hover:bg-orange-600 hover:text-white transition"
                      title="Return to active workspace tab"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* List Body */}
                <div className="flex-grow overflow-y-auto mt-6 space-y-4 pr-1">
                  {notifications.map((notif) => (
                    <div
                      key={notif._id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`group relative rounded-2xl border p-5 transition-all duration-200 cursor-pointer ${
                        notif.isRead
                          ? "border-white/5 bg-white/[0.01] hover:bg-white/[0.02]"
                          : "border-orange-500/20 bg-orange-500/[0.01] hover:bg-orange-500/[0.02]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-6">
                        <div className="space-y-2 flex-grow">
                          <div className="flex flex-wrap items-center gap-2.5">
                            {!notif.isRead && (
                              <span className="h-2 w-2 rounded-full bg-orange-500 flex-shrink-0 animate-pulse" />
                            )}
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              notif.type === "broadcast"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                            }`}>
                              {notif.type === "broadcast" ? "Broadcast Announcement" : "Targeted alert"}
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold tracking-wide">
                              {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>

                          <h3 className={`text-base font-bold ${notif.isRead ? "text-white/95" : "text-white font-extrabold"}`}>
                            {notif.title}
                          </h3>
                          
                          <p className="text-sm text-slate-400 leading-relaxed pr-8 break-words mt-1">
                            {notif.message}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                          {!notif.isRead && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkRead(notif._id);
                              }}
                              className="rounded-full bg-orange-500/10 border border-orange-500/20 p-2 text-orange-400 hover:bg-orange-600 hover:text-white transition"
                              title="Mark as read"
                            >
                              <Check size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClearNotification(notif._id);
                            }}
                            className="rounded-full bg-white/5 p-2 text-slate-400 hover:bg-rose-600/15 hover:text-rose-400 transition"
                            title="Dismiss notification"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {notifications.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-900 border border-white/5 text-slate-700 mb-6 shadow-inner">
                        <BellOff className="h-10 w-10 text-slate-600" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-400 font-display">Your Inbox is Empty</h3>
                      <p className="text-xs text-slate-500 max-w-sm mt-2 leading-relaxed">
                        Accredited newsroom alerts, real-time broadcasts, and emergency system messages will be displayed here as they arrive.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {showDisabledDashboardState ? (
            <div className="flex min-h-[70vh] items-center justify-center">
              <div className="w-full max-w-4xl overflow-hidden rounded-[36px] border border-rose-400/20 bg-[radial-gradient(circle_at_top,rgba(251,113,133,0.2),rgba(15,23,42,0.96)_45%,rgba(2,6,23,0.98))] p-8 text-center shadow-[0_32px_80px_rgba(15,23,42,0.48)] md:p-12">
                <p className="text-sm font-semibold uppercase tracking-[0.34em] text-rose-300">Access Restricted</p>
                <h1 className="mt-6 font-display text-5xl font-semibold text-rose-100 md:text-7xl">Account Disabled</h1>
                <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
                  Your newsroom actions have been disabled by the super admin. Publishing, review, archive, and voice-news tools are temporarily unavailable for this account.
                </p>
                <div className="mx-auto mt-8 max-w-2xl rounded-[28px] border border-white/10 bg-white/5 p-6 text-left">
                  <div className="grid gap-3 text-sm text-slate-300 md:grid-cols-2">
                    <p><span className="font-semibold text-white">Role:</span> {String(profile?.role || user?.role || "-").replaceAll("_", " ")}</p>
                    <p><span className="font-semibold text-white">Approval:</span> {profile?.approvalStatus || "-"}</p>
                    <p><span className="font-semibold text-white">Email Verified:</span> {profile?.isEmailVerified ? "Yes" : "No"}</p>
                    <p><span className="font-semibold text-white">Email:</span> {profile?.email || "-"}</p>
                  </div>
                </div>
                <p className="mt-8 text-sm leading-7 text-slate-400">
                  Please contact the super admin if you need your newsroom access restored.
                </p>
              </div>
            </div>
          ) : (
            <>
              {dashboardLoading && renderSkeleton()}
              {!dashboardLoading && activeTab === "overview" && renderOverview()}
              {!dashboardLoading && activeTab === "write_news" && renderWriteNews()}
              {!dashboardLoading && activeTab === "my_stories" && renderMyStories()}
              {!dashboardLoading && activeTab === "archive_logs" && user?.role !== "reporter" && renderArchiveLogs()}
              {!dashboardLoading && activeTab === "approvals" && user?.role === "super_admin" && renderApprovals()}
              {!dashboardLoading && activeTab === "directory" && user?.role === "super_admin" && renderDirectory()}
              {!dashboardLoading && activeTab === "queue" && (user?.role === "chief_editor" || user?.role === "super_admin") && renderQueue()}
              {!dashboardLoading && activeTab === "ad_desk" && user?.role === "super_admin" && renderAdDesk()}
              {!dashboardLoading && activeTab === "expiry_control" && user?.role === "super_admin" && renderExpiryControl()}
              {!dashboardLoading && activeTab === "notifications_control" && user?.role === "super_admin" && renderNotificationsControl()}
              {!dashboardLoading && activeTab === "contact_inbox" && user?.role === "super_admin" && renderContactInbox()}
              {!dashboardLoading && activeTab === "support_desk" && renderSupportDesk()}
              {!dashboardLoading && activeTab === "credentials" && renderSettings()}
              {!dashboardLoading && activeTab === "analytics" && renderAnalytics()}
              {!dashboardLoading && activeTab === "press_credentials" && (user?.role === "reporter" || user?.role === "chief_editor") && renderPressCredentials()}
            </>
          )}
        </div>
      </main>
    </div>
  );
};
