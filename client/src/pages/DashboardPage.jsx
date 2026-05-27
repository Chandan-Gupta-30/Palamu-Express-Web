import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, FilePlus2, FolderKanban, IdCard, KeyRound, Megaphone, Mic, X, LayoutDashboard, Users, UserCheck, Inbox, Settings, BookOpen, AlertCircle, Calendar, ShieldAlert, BadgeCheck, FileText, CheckSquare, Layers, Menu, Lock, LogOut, Home, Activity, TrendingUp, Share2, Phone, Mail, MapPin, Award, Droplet, GraduationCap, Trash2, UserX, ShieldCheck, Check, Edit3, Bell, BellOff, Sliders, ChevronLeft, ChevronRight, Plus, List, LayoutGrid, FileSpreadsheet } from "lucide-react";
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
  { value: "in-article", label: "In-Article Sponsor Injection", hint: "Injects custom sponsor banners directly inside news articles." },
];

const adStatuses = [
  { value: "pending_payment", label: "Pending Payment" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "active", label: "Active" },
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
};

const initialInArticleAdForm = {
  title: "",
  companyName: "",
  imageUrl: "",
  targetUrl: "",
  adPosition: "middle",
  paragraphIndex: 2,
  durationDays: 7,
  priority: 10,
  ctaLabel: "Visit Sponsor",
  description: "",
  notes: "",
  status: "active",
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

const dedupeArticlesById = (articles = []) => {
  const seen = new Set();

  return articles.filter((article) => {
    const id = article?._id || article?.slug;
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
            {busy ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

let dashboardCache = null;
let dashboardCacheTimestamp = 0;
const DASHBOARD_CACHE_TTL = 15 * 1000; // Cache dashboard data for 15 seconds

export const DashboardPage = () => {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsSearch, setAnalyticsSearch] = useState("");
  const [analyticsSort, setAnalyticsSort] = useState("views-desc");
  const [analyticsAdSearch, setAnalyticsAdSearch] = useState("");
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
  const [adDateFilter, setAdDateFilter] = useState("");
  const [adViewMode, setAdViewMode] = useState("table");
  const [globalIdCardExpiry, setGlobalIdCardExpiry] = useState("");
  const [globalExpiryForm, setGlobalExpiryForm] = useState("");
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
    () => ads.filter((ad) => ad.paymentStatus === "paid" && ad.status === "pending_approval"),
    [ads]
  );
  const pendingAdRequestsCount = useMemo(
    () => reviewableAds.length,
    [reviewableAds]
  );
  const visibleManagedAds = useMemo(
    () =>
      ads.filter((ad) => {
        const matchesStatus = adStatusFilter === "all" || ad.status === adStatusFilter;
        const activityDateValue = getAdvertisementActivityDate(ad);
        const activityDate = activityDateValue ? new Date(activityDateValue).toISOString().slice(0, 10) : "";
        const matchesDate = !adDateFilter || activityDate === adDateFilter;
        const matchesSearch = [ad.title, ad.advertiserName, ad.companyName, ad.advertiserEmail, ad.advertiser?.email, ad.placement, ad.status]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(adSearch.toLowerCase());

        return matchesStatus && matchesDate && matchesSearch;
      }),
    [ads, adDateFilter, adSearch, adStatusFilter]
  );

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const unreadQueriesCount = useMemo(() => {
    return contactMessages.filter((m) => m.status === "new" || m.status === "unresolved").length;
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
    const matchesStatus = articleStatusFilter === "all" || article.status === articleStatusFilter;
    const matchesSearch = !myArticlesSearch.trim() || 
      article.title.toLowerCase().includes(myArticlesSearch.toLowerCase()) || 
      (article.excerpt || "").toLowerCase().includes(myArticlesSearch.toLowerCase()) ||
      (article.district || "").toLowerCase().includes(myArticlesSearch.toLowerCase()) ||
      (article.area || "").toLowerCase().includes(myArticlesSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });
  const pagedArticles = filteredArticles.slice((articlePage - 1) * myArticlesPageSize, articlePage * myArticlesPageSize);
  const totalArticlePages = Math.max(1, Math.ceil(filteredArticles.length / myArticlesPageSize));
  const visiblePendingUsers = pendingUsers.filter((pendingUser) =>
    [pendingUser.fullName, pendingUser.phone, pendingUser.district, pendingUser.area]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(pendingUserSearch.toLowerCase())
  );
  const visibleManagedUsers = managedUsers.filter((managedUser) =>
    (managedUserStatusFilter === "all" || managedUser.approvalStatus === managedUserStatusFilter) &&
    [managedUser.fullName, managedUser.phone, managedUser.email, managedUser.role, managedUser.district, managedUser.area, managedUser.approvalStatus]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(managedUserSearch.toLowerCase())
  );
  const visiblePendingArticles = uniquePendingArticles.filter((article) =>
    [article.title, article.district, article.area, article.author?.fullName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(pendingArticleSearch.toLowerCase())
  );
  const totalPendingArticlePages = Math.ceil(visiblePendingArticles.length / pendingArticlePageSize) || 1;
  const pagedPendingArticles = useMemo(() => {
    const startIndex = (pendingArticlePage - 1) * pendingArticlePageSize;
    return visiblePendingArticles.slice(startIndex, startIndex + pendingArticlePageSize);
  }, [visiblePendingArticles, pendingArticlePage, pendingArticlePageSize]);
  const visibleContactMessages = contactMessages.filter((message) => {
    const matchesSubTab = inboxSubTab === "journalist" ? Boolean(message.userId) : !message.userId;
    const matchesStatus = contactStatusFilter === "all" || message.status === contactStatusFilter;
    const matchesSearch = [message.fullName, message.email, message.phone, message.subject, message.message, message.status]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(contactSearch.toLowerCase());

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
        "in-article": 0,
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
        { label: "In-Article Injections", value: placementCounts["in-article"], color: "#10b981" },
        { label: "Other Slots", value: placementCounts.other, color: "#64748b" }
      ];

      // 2. Compute Clicks Distribution by Placement
      const placementClicks = {
        "homepage-hero": 0,
        "homepage-latest": 0,
        "homepage-district": 0,
        "in-article": 0,
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
        { label: "In-Article Injections", value: placementClicks["in-article"], color: "#10b981" },
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
    setPendingUsers((current) =>
      current.map((pendingUser) => (pendingUser._id === updatedUser._id ? updatedUser : pendingUser))
    );
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
    localStorage.setItem("dashboard_active_tab", activeTab);
    if (activeTab !== "write_news" && activeTab !== "credentials") {
      localStorage.setItem("dashboard_prev_active_tab", activeTab);
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

  const resetCredentialForm = () => {
    setCredentialForm({
      fullName: profile?.fullName || "",
      email: profile?.email || "",
      phone: profile?.phone || "",
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

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
    await handleAction(async () => {
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
          : "News submitted for editorial review.");
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
        articleId: selectedAdArticle?._id || "",
        amount: 0,
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

    const payload = {
      fullName: String(credentialForm.fullName || "").trim(),
      email: String(credentialForm.email || "").trim(),
      phone: String(credentialForm.phone || "").trim(),
      currentPassword: credentialForm.currentPassword,
      newPassword: credentialForm.newPassword,
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

      if (notif.articleId) {
        setActiveTab("queue");
        setExpandedArticleId(notif.articleId);
        setPendingArticleSearch("");
        setPendingArticlePage(1);
      } else if (notif.onboardingUserId) {
        setActiveTab("approvals");
        setPendingUserSearch("");
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
        String(notif.message || "").toLowerCase().includes("onboarding approval")
      ) {
        setActiveTab("approvals");
        setPendingUserSearch("");
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
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-400">Workspace Overview</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white md:text-4xl">
            Welcome back, {profile?.fullName || user?.fullName || "Journalist"}
          </h1>
          <p className="mt-2 text-sm text-slate-400">Here is your customized editorial briefing, metrics, and verification records.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <MetricCard key={card.label} {...card} />
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                  <p>Approved reporters also receive a generated reporter ID card link directly inside this dashboard.</p>
                </>
              )}
            </div>
          </div>

          {/* ID Card Preview Block */}
          {showReporterCardAction && (
            <div className="lg:col-span-1">
              <IDCardPreview profile={profile} cardUrl={reporterCardUrl} globalIdCardExpiry={globalIdCardExpiry} />
            </div>
          )}
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
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Feedback & Audio</th>
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
                        <td className="px-6 py-4 max-w-[200px]">
                          {article.editorFeedback ? (
                            <div className="rounded-xl border border-rose-500/15 bg-rose-500/[0.02] p-2 text-[11px] text-rose-300 line-clamp-2" title={article.editorFeedback}>
                              <span className="font-semibold text-rose-400">Feedback:</span> {article.editorFeedback}
                            </div>
                          ) : article.audioUrl ? (
                            <AudioStoryPlayer article={article} compact className="max-w-[150px]" />
                          ) : (
                            <span className="text-xs text-slate-500 italic">No feedback or audio</span>
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
        </div>
        <input className="mt-5 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none" placeholder="Search pending reporters" value={pendingUserSearch} onChange={(event) => setPendingUserSearch(event.target.value)} />
        <div className="mt-5 space-y-4">
          {visiblePendingUsers.map((pendingUser) => (
            <div key={pendingUser._id} className="rounded-2xl border border-white/10 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-white">{pendingUser.fullName}</p>
                  <p className="text-sm text-slate-500">{joinMetaParts(pendingUser.phone, pendingUser.district, pendingUser.area)}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => approveUser(pendingUser._id)} className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 transition">Approve</button>
                  <button type="button" onClick={() => rejectUser(pendingUser._id)} className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 transition">Reject</button>
                </div>
              </div>
              <input className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none" placeholder="Optional rejection feedback" value={feedbacks[`user-${pendingUser._id}`] || ""} onChange={(event) => setFeedbacks({ ...feedbacks, [`user-${pendingUser._id}`]: event.target.value })} />
            </div>
          ))}
          {!visiblePendingUsers.length ? <p className="text-slate-500 py-4 text-center">No reporter approvals match your search.</p> : null}
        </div>
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
                        onClick={async () => {
                          const reason = window.prompt("Optional rejection/ban feedback:", "KYC details require corrections");
                          if (reason === null) return;
                          await handleAction(async () => {
                            const { data } = await http.patch(`/users/${selectedManagedUser._id}/reject`, { feedback: reason });
                            syncManagedUserState(data.user);
                            setSelectedManagedUser(data.user);
                            await refreshAdminData();
                          }, "User rejected/banned with feedback.");
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
        </div>

        {adDeskSubTab === "all" && (
          /* ALL CAMPAIGNS DIRECTORY */
          <div className="space-y-6">
            {/* Search & Filters */}
            <div className="grid gap-3 sm:grid-cols-[1fr_200px_180px]">
              <input
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none text-sm"
                placeholder="Search campaigns by brand, title, advertiser..."
                value={adSearch}
                onChange={(event) => setAdSearch(event.target.value)}
              />
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
              </div>
            </div>

            {adViewMode === "table" ? (
              /* TABULAR VIEW OF CAMPAIGNS DIRECTORY */
              <div className="panel overflow-hidden border border-white/5 bg-slate-900/10 rounded-3xl">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs text-slate-350">
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
                          </tr>
                        );
                      })}
                      {!visibleManagedAds.length && (
                        <tr>
                          <td colSpan={9} className="px-5 py-12 text-center text-slate-500 italic">
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

                  <div className="mt-5 pt-3 border-t border-white/5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPendingAdApproveId(ad._id)}
                      className="flex-grow rounded-full bg-green-600 hover:bg-green-500 text-white px-4 py-2 text-xs font-bold transition shadow-md hover:scale-[1.03] active:scale-[0.97]"
                    >
                      Approve & Publish
                    </button>
                    <button
                      type="button"
                      onClick={() => rejectAd(ad._id)}
                      className="rounded-full bg-rose-600/10 border border-rose-500/20 text-rose-400 hover:bg-rose-600 hover:text-white px-4 py-2 text-xs font-bold transition shadow-md"
                    >
                      Reject
                    </button>
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
                              grid: { color: "rgba(255, 255, 255, 0.05)" },
                              ticks: { color: "rgba(148, 163, 184, 0.7)", font: { size: 10 } }
                            },
                            x: {
                              grid: { display: false },
                              ticks: { color: "rgba(148, 163, 184, 0.7)", font: { size: 10 } }
                            }
                          },
                          plugins: {
                            legend: {
                              display: true,
                              position: "top",
                              labels: { color: "#fff", font: { size: 11, weight: "600" } }
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

                  {/* Article-Specific Injected Ads Performance Table */}
                  <div className="panel p-6 border border-white/5 bg-slate-900/10 rounded-3xl shadow-xl mt-6">
                    <div className="border-b border-white/5 pb-3 mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <BookOpen size={18} className="text-orange-400" />
                          Individual In-Article Ad Performance
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">Detailed performance audit for sponsor banner campaigns targeted within specific news story blocks.</p>
                      </div>
                      <input
                        className="w-full sm:w-64 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:outline-none text-xs placeholder:text-slate-600"
                        placeholder="Search by campaign, brand, or article..."
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
                            <th className="px-5 py-3">Targeted Article</th>
                            <th className="px-5 py-3 text-center">Ad Spot Position</th>
                            <th className="px-5 py-3 text-center">Impressions</th>
                            <th className="px-5 py-3 text-center">Clicks</th>
                            <th className="px-5 py-3 text-center">CTR</th>
                            <th className="px-5 py-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {(() => {
                            const inArticleCampaigns = ads.filter(a => a.placement === "in-article");
                            const filtered = inArticleCampaigns.filter(a => {
                              const q = analyticsAdSearch.toLowerCase().trim();
                              if (!q) return true;
                              const targetArticle = allArticles.find(art => art._id === a.articleId);
                              return (
                                a.title.toLowerCase().includes(q) ||
                                (a.companyName || "").toLowerCase().includes(q) ||
                                (targetArticle?.title || "").toLowerCase().includes(q)
                              );
                            });

                            if (filtered.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={8} className="px-5 py-8 text-center text-slate-500 italic">
                                    No targeted in-article campaigns found.
                                  </td>
                                </tr>
                              );
                            }

                            return filtered.map((a, idx) => {
                              const targetArticle = allArticles.find(art => art._id === a.articleId);
                              const ctr = a.viewsCount > 0 ? ((a.clicksCount / a.viewsCount) * 100).toFixed(2) : "0.00";
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
                                  <td className="px-5 py-3 max-w-[200px] truncate">
                                    {targetArticle ? (
                                      <span className="text-white hover:text-orange-400 cursor-pointer font-medium text-xs" onClick={() => openArticleFromDashboard(targetArticle)} title={targetArticle.title}>
                                        {targetArticle.title}
                                      </span>
                                    ) : (
                                      <span className="text-slate-500 italic text-xs">All Articles (Broadcast)</span>
                                    )}
                                  </td>
                                  <td className="px-5 py-3 whitespace-nowrap capitalize text-slate-400 text-center text-xs">
                                    {String(a.adPosition).replaceAll("-", " ")}
                                    {a.adPosition === "between-paragraphs" ? ` (Para ${a.paragraphIndex})` : ""}
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
    return (
      <div id="account-credentials-panel" className="panel p-6 border border-white/5 bg-slate-900/10 animate-[fadeIn_0.4s_ease-out]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-400">Security & Credentials</p>
            <h2 className="text-2xl font-bold text-white mt-1">Account Credentials</h2>
            <p className="mt-2 text-sm text-slate-400">Update your login phone, email, display name, and password securely.</p>
          </div>
          <button type="button" onClick={resetCredentialForm} className="rounded-full border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5 transition">
            Reset Form
          </button>
        </div>
        <form onSubmit={submitCredentials} className="mt-5 grid gap-4 lg:grid-cols-2">
          <div>
            <input
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none"
              placeholder="Full name"
              value={credentialForm.fullName}
              onChange={(event) => setCredentialForm({ ...credentialForm, fullName: event.target.value })}
            />
            <p className="mt-2 text-xs text-slate-500">This name appears in your dashboard profile and bylines.</p>
          </div>
          <div>
            <input
              type="email"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none"
              placeholder="Email address"
              value={credentialForm.email}
              onChange={(event) => setCredentialForm({ ...credentialForm, email: event.target.value })}
            />
            <p className="mt-2 text-xs text-slate-500">Use a valid email address so account recovery remains clean.</p>
          </div>
          <div className="lg:col-span-2">
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
          <div>
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
            <p className="mt-2 text-xs text-slate-500">Enter this only when you want to set a new password.</p>
          </div>
          <div>
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
            <p className="mt-2 text-xs text-slate-500">Leave the password fields empty if you only want to update name, phone, or email.</p>
          </div>
          <div className="lg:col-span-2">
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
            <p className="mt-2 text-xs text-slate-500">Your new password must be at least 6 characters long.</p>
          </div>
          <button className="rounded-2xl bg-orange-500 hover:bg-orange-400 transition px-4 py-3 font-semibold text-white lg:col-span-2 shadow-lg">
            {credentialBusy ? "Saving..." : "Update Credentials"}
          </button>
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
                        grid: { color: "rgba(255, 255, 255, 0.05)" },
                        ticks: { color: "rgba(148, 163, 184, 0.7)", font: { size: 10 } }
                      },
                      x: {
                        grid: { display: false },
                        ticks: { color: "rgba(148, 163, 184, 0.7)", font: { size: 10 } }
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
                        grid: { color: "rgba(255, 255, 255, 0.05)" },
                        ticks: { color: "rgba(148, 163, 184, 0.7)", font: { size: 10 } }
                      },
                      x: {
                        grid: { display: false },
                        ticks: { color: "rgba(148, 163, 184, 0.7)", font: { size: 10 } }
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

      <ConfirmActionModal
        open={Boolean(pendingUserRejectId)}
        title="Reject reporter application"
        description="Are you sure you want to reject this reporter application? This will decline their registration credentials and send feedback."
        confirmLabel="Reject Application"
        cancelLabel="Cancel"
        kicker="Reject Reporter"
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
                              ad.status === "active" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-slate-500/10 text-slate-400 border border-slate-500/10"
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
                                  priority: ad.priority || 10,
                                  ctaLabel: ad.ctaLabel || "Visit Sponsor",
                                  description: ad.description || "",
                                  notes: ad.notes || "",
                                  status: ad.status || "active",
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
                      {adPlacements.map((p) => (
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
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Price (INR)</label>
                    <input
                      type="number"
                      min="0"
                      className={`w-full rounded-2xl border ${adErrors.amount ? 'border-rose-500 bg-rose-500/5' : 'border-white/10 bg-white/5'} px-3 py-3 text-sm text-white focus:outline-none`}
                      value={adForm.amount}
                      onChange={(event) => setAdForm({ ...adForm, amount: Number(event.target.value) })}
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
            </>
          )}
        </div>
      </main>
    </div>
  );
};
