import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, FilePlus2, FolderKanban, IdCard, KeyRound, Megaphone, Mic, X, LayoutDashboard, Users, UserCheck, Inbox, Settings, BookOpen, AlertCircle, Calendar, ShieldAlert, BadgeCheck, FileText, CheckSquare, Layers, Menu, Lock } from "lucide-react";
import { AudioStoryPlayer } from "../components/audio/AudioStoryPlayer";
import { VoiceNewsComposer } from "../components/audio/VoiceNewsComposer";
import { MetricCard } from "../components/dashboard/MetricCard";
import { IDCardPreview } from "../components/dashboard/IDCardPreview";
import { ImagePicker } from "../components/onboarding/ImagePicker";
import { WebcamCapture } from "../components/onboarding/WebcamCapture";
import { ActionPopup } from "../components/ui/ActionPopup";
import { useAuth } from "../context/AuthContext";
import { http } from "../api/http";
import { jharkhandBlocksByDistrict, jharkhandDistricts } from "../data/districts";
import { getArticleAuthorName, getArticlePageUrl, getArticlePublishedLabel } from "../utils/articles";

const adPlacements = [
  { value: "homepage-hero", label: "Homepage Hero Rail", hint: "Shows near the top of the homepage beside the lead story." },
  { value: "homepage-latest", label: "Latest Updates Sponsor Grid", hint: "Appears between headline sections without breaking article flow." },
  { value: "homepage-district", label: "District Coverage Sponsor Strip", hint: "Shows lower on the homepage near district-wise coverage." },
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

const initialManagedUserForm = {
  fullName: "",
  email: "",
  phone: "",
  district: "",
  area: "",
  role: "reporter",
  approvalStatus: "pending",
  isPhoneVerified: false,
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
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm">
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

const PublishedArchiveSection = ({
  selectedDate,
  onDateChange,
  articles,
  onRefresh,
  onDelete,
  busy,
  onEditArticle,
  onDeleteArticle,
  onCopyLink,
  onOpenArticle,
}) => (
  <div className="panel p-6">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h2 className="text-2xl font-semibold text-white">Published News Archive By Date</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Review all homepage articles published on a specific date, then clear that date in one action when older news needs to be removed.
        </p>
      </div>
      <div className="w-full max-w-xs">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-400" htmlFor="published-news-archive-date">
          Published Date
        </label>
        <input
          id="published-news-archive-date"
          type="date"
          max={getTodayDateString()}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none"
          value={selectedDate}
          onChange={(event) => onDateChange(event.target.value)}
        />
      </div>
    </div>

    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-sm text-slate-400">
        <span className="font-semibold text-white">{articles.length}</span> published article{articles.length === 1 ? "" : "s"} found for{" "}
        <span className="font-semibold text-orange-300">{selectedDate}</span>.
      </p>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onRefresh} className="rounded-full border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5 transition">
          Refresh List
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy || !articles.length}
          className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-rose-500 transition"
        >
          {busy ? "Deleting..." : "Delete All For This Date"}
        </button>
      </div>
    </div>

    <div className="mt-5 space-y-4">
      {articles.map((article) => (
        <div
          key={article._id}
          role="button"
          tabIndex={0}
          onClick={() => onOpenArticle(article)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onOpenArticle(article);
            }
          }}
          className="cursor-pointer rounded-2xl border border-white/10 p-4 transition hover:border-white/20 hover:bg-white/[0.03]"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="text-lg font-semibold text-white">{article.title}</p>
                <div className="flex flex-wrap gap-2">
                  {article.audioUrl ? (
                    <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-300">voice</span>
                  ) : null}
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-orange-300">{article.status}</span>
                </div>
              </div>
              <p className="text-sm text-slate-500">
                By {article.author?.fullName || "Unknown"} • {[article.district, article.area, article.panchayat].filter(Boolean).join(" • ") || "-"}
              </p>
              <p className="text-sm text-slate-500">Published: {getArticlePublishedLabel(article)}</p>
              <p className="text-sm text-slate-500">Views: {getArticleViews(article)}</p>
            </div>
          </div>
          {article.coverImageUrl ? (
            <div className="mt-4 flex h-48 items-center justify-center overflow-hidden rounded-2xl bg-slate-950/40">
              <img src={article.coverImageUrl} alt={article.title} className="h-full w-full object-contain" />
            </div>
          ) : null}
          {article.excerpt ? <p className="mt-4 text-sm leading-6 text-slate-400">{article.excerpt}</p> : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={(event) => {
              event.stopPropagation();
              onEditArticle(article);
            }} className="dashboard-outline-button rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition">
              Edit
            </button>
            <button type="button" onClick={(event) => {
              event.stopPropagation();
              onDeleteArticle(article);
            }} className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 transition">
              Delete
            </button>
            <button type="button" onClick={(event) => {
              event.stopPropagation();
              onCopyLink(article);
            }} className="dashboard-copy-button rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5 transition">
              Copy Link
            </button>
          </div>
        </div>
      ))}
      {!articles.length ? (
        <p className="text-slate-500 py-4 text-center">No published articles are available for the selected date.</p>
      ) : null}
    </div>
  </div>
);

let dashboardCache = null;
let dashboardCacheTimestamp = 0;
const DASHBOARD_CACHE_TTL = 15 * 1000; // Cache dashboard data for 15 seconds

export const DashboardPage = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [profile, setProfile] = useState(null);
  const [reporterCardUrl, setReporterCardUrl] = useState("");
  const [myArticles, setMyArticles] = useState([]);
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
  const [pendingUserSearch, setPendingUserSearch] = useState("");
  const [managedUserSearch, setManagedUserSearch] = useState("");
  const [managedUserStatusFilter, setManagedUserStatusFilter] = useState("all");
  const [pendingArticleSearch, setPendingArticleSearch] = useState("");
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
  const [busyAction, setBusyAction] = useState("");
  const [managedUserForm, setManagedUserForm] = useState(initialManagedUserForm);
  const [credentialForm, setCredentialForm] = useState(initialCredentialForm);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [credentialBusy, setCredentialBusy] = useState(false);
  const [showCredentialForm, setShowCredentialForm] = useState(false);
  const [showReporterDesk, setShowReporterDesk] = useState(false);
  const [showVoiceDesk, setShowVoiceDesk] = useState(false);
  const [showAdRequestsPanel, setShowAdRequestsPanel] = useState(false);
  const [adSearch, setAdSearch] = useState("");
  const [adStatusFilter, setAdStatusFilter] = useState("all");
  const [adDateFilter, setAdDateFilter] = useState("");
  const [globalIdCardExpiry, setGlobalIdCardExpiry] = useState("");
  const [globalExpiryForm, setGlobalExpiryForm] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const isFunctionalityDisabled = Boolean(profile?.isFunctionalityDisabled);
  const canAccessNewsDesk = (user?.role === "super_admin" || (profile?.approvalStatus === "approved" && profile?.isPhoneVerified)) && !isFunctionalityDisabled;
  const canAccessVoiceDesk = (user?.role === "super_admin" || canAccessNewsDesk) && !isFunctionalityDisabled;
  const showDashboardActions = user?.role === "reporter" || user?.role === "chief_editor" || user?.role === "super_admin";
  const showDisabledDashboardState =
    isFunctionalityDisabled && (user?.role === "reporter" || user?.role === "chief_editor");
  const showReporterCardAction = (user?.role === "reporter" || user?.role === "chief_editor") && reporterCardUrl;
  const uniqueMyArticles = useMemo(() => dedupeArticlesById(myArticles), [myArticles]);
  const uniquePendingArticles = useMemo(() => dedupeArticlesById(pendingArticles), [pendingArticles]);
  const filteredArticles = uniqueMyArticles.filter((article) => articleStatusFilter === "all" || article.status === articleStatusFilter);
  const pagedArticles = filteredArticles.slice((articlePage - 1) * 4, articlePage * 4);
  const totalArticlePages = Math.max(1, Math.ceil(filteredArticles.length / 4));
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
  const visibleContactMessages = contactMessages.filter((message) =>
    (contactStatusFilter === "all" || message.status === contactStatusFilter) &&
    [message.fullName, message.email, message.phone, message.subject, message.message, message.status]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(contactSearch.toLowerCase())
  );

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

    if (user.role === "reporter" || user.role === "chief_editor") {
      http.get("/users/id-card").then(({ data }) => setReporterCardUrl(data.idCardUrl)).catch(() => {});
    }
  }, [user]);

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

  const cards =
    user?.role === "reporter"
      ? [
          { label: "My Stories", value: uniqueMyArticles.length, hint: "Draft, pending, rejected, and published" },
          { label: "Verification", value: canAccessNewsDesk ? "Ready" : "Locked", hint: "Desk unlocks after approval and phone verification" },
          { label: "Reporter Card", value: reporterCardUrl ? "Available" : "Pending", hint: "Generated automatically for approved reporters" },
        ]
      : user?.role === "chief_editor"
        ? [
            { label: "My Stories", value: uniqueMyArticles.length, hint: "Draft, pending, rejected, and published" },
            { label: "Verification", value: canAccessNewsDesk ? "Ready" : "Locked", hint: "Desk unlocks after approval and phone verification" },
            { label: "Pending News", value: pendingArticles.length, hint: "Reporter stories waiting for editorial action" },
            { label: "Chief Editor Card", value: reporterCardUrl ? "Available" : "Pending", hint: "Generated automatically for approved chief editors" },
          ]
      : metrics
        ? [
            { label: "Users", value: metrics.users, hint: "All registered accounts" },
            { label: "Pending Users", value: metrics.pendingUsers, hint: "Reporter approvals waiting" },
            { label: "Pending News", value: metrics.pendingArticles, hint: "Stories waiting for publication" },
            { label: "Published News", value: metrics.publishedArticles, hint: "Live Palamu Express stories" },
            { label: "Active Ads", value: metrics.activeAds, hint: "Currently visible sponsored placements" },
            { label: "Contact Requests", value: metrics.contactMessages, hint: "Reader and newsroom support messages" },
          ]
        : [];

  const resetArticleForm = () => {
    setArticleForm(initialArticleForm);
    setEditingArticleId("");
    setArticleErrors({});
  };

  const resetAdForm = () => {
    setAdForm(initialAdForm);
    setEditingAdId("");
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
    setActiveTab("overview");
    resetCredentialForm();
  };

  const openReporterDesk = () => {
    setActiveTab("write_news");
  };

  const closeReporterDesk = () => {
    setActiveTab("overview");
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
      setActiveTab("my_stories");
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
    });
  };

  const deleteArticle = async (articleId) => {
    if (!window.confirm("Delete this article draft? This action cannot be undone.")) return;
    await handleAction(async () => {
      await http.delete(`/articles/${articleId}`);
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
    event.preventDefault();
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

  const startEditAd = (ad) => {
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

  const approveAd = async (adId) => {
    await handleAction(async () => {
      await http.patch(`/ads/${adId}/approve`);
      refreshAdminData();
    }, "Advertisement approved and published.");
  };

  const rejectAd = async (adId) => {
    const reason = feedbacks[`ad-${adId}`] || "Advertisement was rejected during review.";
    if (!window.confirm("Reject this advertisement request?")) return;
    await handleAction(async () => {
      await http.patch(`/ads/${adId}/reject`, { reason });
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
      isPhoneVerified: Boolean(managedUser.isPhoneVerified),
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
        isPhoneVerified: Boolean(managedUserForm.isPhoneVerified),
        isFunctionalityDisabled: Boolean(managedUserForm.isFunctionalityDisabled),
      };
      const { data } = await http.patch(`/users/${userId}`, payload);
      const updatedUser = {
        ...data.user,
        isPhoneVerified: Boolean(data.user?.isPhoneVerified),
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

  const deleteContactMessage = async (contactId) => {
    if (!window.confirm("Delete this contact request? This cannot be undone.")) return;
    await handleAction(async () => {
      await http.delete(`/contact/${contactId}`);
      if (editingContactId === contactId) {
        resetContactAdminForm();
      }
      refreshAdminData();
    }, "Contact message deleted.");
  };

  const approveUser = async (userId) => {
    await handleAction(async () => {
      await http.patch(`/users/${userId}/approve`);
      refreshAdminData();
    }, "User approved.");
  };

  const rejectUser = async (userId) => {
    if (!window.confirm("Reject this reporter application?")) return;
    await handleAction(async () => {
      await http.patch(`/users/${userId}/reject`, { feedback: feedbacks[`user-${userId}`] || "KYC details require corrections" });
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

  const rejectArticle = async (articleId) => {
    if (!window.confirm("Reject this submitted story?")) return;
    await handleAction(async () => {
      await http.patch(`/articles/${articleId}/reject`, { feedback: feedbacks[`article-${articleId}`] || "Please revise and resubmit" });
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

  const clearGlobalExpiry = async () => {
    if (!window.confirm("Are you sure you want to remove the global expiry date? System will fall back to rolling 1-year calculations.")) return;

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

    setCredentialBusy(true);
    setActionPopup({
      type: "loading",
      title: "Updating credentials",
      message: "We are saving your new account details securely.",
      persistent: true,
    });

    try {
      const payload = {
        fullName: String(credentialForm.fullName || "").trim(),
        email: String(credentialForm.email || "").trim(),
        phone: String(credentialForm.phone || "").trim(),
        currentPassword: credentialForm.currentPassword,
        newPassword: credentialForm.newPassword,
      };

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
      setActionPopup({
        type: "success",
        title: "Credentials updated",
        message: data.message || "Account credentials updated.",
      });
    } catch (error) {
      setActionPopup({
        type: "error",
        title: "Update failed",
        message: error.response?.data?.message || "Unable to update account credentials",
      });
    } finally {
      setCredentialBusy(false);
    }
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
                <DetailRow label="Phone Verified" value={profile.isPhoneVerified ? "Yes" : "No"} />
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
                  <p>Your chief editor desk opens after approval, phone verification, and active newsroom access. Super admin can temporarily disable these actions when needed.</p>
                  <p>Use the editorial queue to publish strong reports quickly or send revision feedback back to the reporter desk.</p>
                  <p>Your dashboard also shows live newsroom metrics so you can monitor pending and published coverage.</p>
                </>
              ) : (
                <>
                  <p>Your reporter desk opens after approval, phone verification, and active newsroom access. Super admin can temporarily disable these actions when needed.</p>
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
          {editingArticleId ? (
            <button type="button" onClick={resetArticleForm} className="rounded-full border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5 transition">
              Cancel Edit
            </button>
          ) : null}
        </div>

        {!canAccessNewsDesk ? (
          <div className="mt-6 flex flex-col items-center justify-center p-8 text-center border border-dashed border-white/10 rounded-2xl">
            <Lock size={36} className="text-slate-500 mb-3" />
            <p className="text-slate-400 text-sm max-w-md">
              {isFunctionalityDisabled
                ? "Your newsroom actions are currently disabled by the super admin. Article publishing and review tools are temporarily unavailable."
                : "Your news desk unlocks after super admin approval and phone verification."}
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

  const renderMyStories = () => {
    return (
      <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
        {user?.role !== "reporter" && (
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
        )}

        <div className="panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-400">Content Library</p>
              <h2 className="text-2xl font-bold text-white mt-1">My Articles</h2>
            </div>
            <select
              className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white focus:outline-none"
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
          <div className="mt-5 space-y-4">
            {pagedArticles.map((article) => (
              <div
                key={article._id}
                role="button"
                tabIndex={0}
                onClick={() => openArticleFromDashboard(article)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openArticleFromDashboard(article);
                  }
                }}
                className="cursor-pointer rounded-2xl border border-white/10 p-4 transition hover:border-white/20 hover:bg-white/[0.03]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-white">{article.title}</p>
                    <p className="text-sm text-slate-500">By {getArticleAuthorName(article)}</p>
                    <p className="text-sm text-slate-500">Published: {getArticlePublishedLabel(article)}</p>
                    <p className="text-sm text-slate-500">Views: {getArticleViews(article)}</p>
                    <p className="text-sm text-slate-500">{joinMetaParts(article.district, article.area, article.panchayat, article.status)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {article.audioUrl ? (
                      <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-300">voice</span>
                    ) : null}
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-orange-300">{article.status}</span>
                  </div>
                </div>
                {article.editorFeedback ? <p className="mt-3 text-sm text-rose-300">Feedback: {article.editorFeedback}</p> : null}
                {article.coverImageUrl ? (
                  <div className="mt-4 flex h-48 items-center justify-center overflow-hidden rounded-2xl bg-slate-950/40">
                    <img src={article.coverImageUrl} alt={article.title} className="h-full w-full object-contain" />
                  </div>
                ) : null}
                {article.audioUrl ? <AudioStoryPlayer article={article} compact className="mt-4" /> : null}
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" onClick={(event) => {
                    event.stopPropagation();
                    copyArticleLink(article);
                  }} className="dashboard-copy-button rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5 transition">
                    Copy Link
                  </button>
                </div>
                {article.status !== "published" ? (
                  <div className="mt-4 flex gap-3">
                    {!article.audioUrl ? (
                      <button type="button" onClick={(event) => {
                        event.stopPropagation();
                        startEditArticle(article);
                      }} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition">
                        Edit
                      </button>
                    ) : null}
                    <button type="button" onClick={(event) => {
                      event.stopPropagation();
                      deleteArticle(article._id);
                    }} className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 transition">
                      Delete
                    </button>
                  </div>
                ) : null}
                {article.audioUrl && article.status !== "published" ? (
                  <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">
                    Voice submissions can be re-recorded from the floating voice desk before resubmitting.
                  </p>
                ) : null}
              </div>
            ))}
            {!pagedArticles.length ? (
              <p className="text-slate-500 py-4 text-center">No articles are available in this status.</p>
            ) : null}
          </div>
          {filteredArticles.length > 4 ? (
            <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4">
              <button type="button" disabled={articlePage === 1} onClick={() => setArticlePage((value) => Math.max(1, value - 1))} className="rounded-full border border-white/10 px-4 py-2 text-sm text-white disabled:opacity-40 hover:bg-white/5 transition">
                Previous
              </button>
              <span className="text-sm text-slate-500">Page {articlePage} of {totalArticlePages}</span>
              <button type="button" disabled={articlePage === totalArticlePages} onClick={() => setArticlePage((value) => Math.min(totalArticlePages, value + 1))} className="rounded-full border border-white/10 px-4 py-2 text-sm text-white disabled:opacity-40 hover:bg-white/5 transition">
                Next
              </button>
            </div>
          ) : null}
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
    return (
      <div className="panel p-6 border border-white/5 bg-slate-900/10 animate-[fadeIn_0.4s_ease-out]">
        <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-400">Platform Users</p>
            <h2 className="text-2xl font-bold text-white mt-1">Manage Reporters And Chief Editors</h2>
          </div>
          {editingManagedUserId ? (
            <button type="button" onClick={resetManagedUserForm} className="rounded-full border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5 transition">
              Cancel Edit
            </button>
          ) : null}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px]">
          <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none" placeholder="Search all registered reporters and chief editors" value={managedUserSearch} onChange={(event) => setManagedUserSearch(event.target.value)} />
          <select className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white focus:outline-none" value={managedUserStatusFilter} onChange={(event) => setManagedUserStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="mt-5 space-y-4">
          {visibleManagedUsers.map((managedUser) => (
            <div id={`managed-user-${managedUser._id}`} key={managedUser._id} className="rounded-2xl border border-white/10 p-4">
              {editingManagedUserId === managedUser._id ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {managedUserForm.role === "reporter" ? (
                    <>
                      <div className="md:col-span-1">
                        <ManagedImagePreview
                          title="Profile Photo"
                          src={managedUserForm.profilePhotoUrl}
                          alt={managedUserForm.fullName || "Profile preview"}
                        />
                      </div>
                      <div className="md:col-span-1">
                        <ManagedImagePreview
                          title="Aadhaar Photo"
                          src={managedUserForm.aadhaarImageUrl}
                          alt={managedUserForm.fullName || "Aadhaar preview"}
                        />
                      </div>
                    </>
                  ) : null}
                  {managedUserForm.role === "chief_editor" ? (
                    <div className="md:col-span-2">
                      <ManagedImagePreview
                        title="Live Photo"
                        src={managedUserForm.livePhotoUrl}
                        alt={managedUserForm.fullName || "Live photo preview"}
                      />
                    </div>
                  ) : null}
                  {managedUserForm.role === "reporter" ? (
                    <>
                      <div className="md:col-span-2">
                        <ImagePicker
                          label="Reupload Profile Photo"
                          helpText="Replace the current reporter profile image if the existing file needs correction."
                          value={managedUserForm.profilePhotoUrl}
                          onChange={(value) => setManagedUserForm({ ...managedUserForm, profilePhotoUrl: value })}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <ImagePicker
                          label="Reupload Aadhaar Photo"
                          helpText="Replace the Aadhaar image for KYC correction or better clarity."
                          value={managedUserForm.aadhaarImageUrl}
                          onChange={(value) => setManagedUserForm({ ...managedUserForm, aadhaarImageUrl: value })}
                        />
                      </div>
                    </>
                  ) : null}
                  {managedUserForm.role === "chief_editor" ? (
                    <div className="md:col-span-2">
                      <WebcamCapture
                        value={managedUserForm.livePhotoUrl}
                        onCapture={(value) => setManagedUserForm({ ...managedUserForm, livePhotoUrl: value })}
                      />
                    </div>
                  ) : null}
                  <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none" value={managedUserForm.fullName} onChange={(event) => setManagedUserForm({ ...managedUserForm, fullName: event.target.value })} placeholder="Full name" />
                  <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none" value={managedUserForm.email} onChange={(event) => setManagedUserForm({ ...managedUserForm, email: event.target.value })} placeholder="Email" />
                  <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none" value={managedUserForm.phone} onChange={(event) => setManagedUserForm({ ...managedUserForm, phone: event.target.value })} placeholder="Phone" />
                  <select className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white focus:outline-none" value={managedUserForm.role} onChange={(event) => setManagedUserForm({ ...managedUserForm, role: event.target.value })}>
                    {managedRoleOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none" value={managedUserForm.district} onChange={(event) => setManagedUserForm({ ...managedUserForm, district: event.target.value })} placeholder="District" />
                  <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none" value={managedUserForm.area} onChange={(event) => setManagedUserForm({ ...managedUserForm, area: event.target.value })} placeholder="Area / Block" />
                  <select className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white focus:outline-none" value={managedUserForm.approvalStatus} onChange={(event) => setManagedUserForm({ ...managedUserForm, approvalStatus: event.target.value })}>
                    {approvalOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500 font-bold uppercase pl-1 tracking-wider">Valid Upto Expiry Date</span>
                    <input 
                      type="date" 
                      className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white focus:ring-0 focus:outline-none" 
                      value={managedUserForm.validUpto ? managedUserForm.validUpto.slice(0, 10) : ""} 
                      onChange={(event) => setManagedUserForm({ ...managedUserForm, validUpto: event.target.value })} 
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500 font-bold uppercase pl-1 tracking-wider">Blood Group</span>
                    <select 
                      className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white focus:ring-0 focus:outline-none" 
                      value={managedUserForm.bloodGroup || "O+"} 
                      onChange={(event) => setManagedUserForm({ ...managedUserForm, bloodGroup: event.target.value })}
                    >
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase pl-1 tracking-wider">Educational Qualification</span>
                    <input 
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:ring-0 focus:outline-none" 
                      value={managedUserForm.education || ""} 
                      onChange={(event) => setManagedUserForm({ ...managedUserForm, education: event.target.value })} 
                      placeholder="Educational details (e.g. Graduate, Postgraduate)" 
                    />
                  </div>
                  <label className="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-400">
                    <input type="checkbox" checked={managedUserForm.isPhoneVerified} onChange={(event) => setManagedUserForm({ ...managedUserForm, isPhoneVerified: event.target.checked })} />
                    Phone verified
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-400">
                    <input
                      type="checkbox"
                      checked={managedUserForm.isFunctionalityDisabled}
                      onChange={(event) => setManagedUserForm({ ...managedUserForm, isFunctionalityDisabled: event.target.checked })}
                    />
                    Disable all newsroom actions
                  </label>
                  <div className="flex gap-3 md:col-span-2 border-t border-white/5 pt-4">
                    <button type="button" onClick={() => saveManagedUser(managedUser._id)} className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 transition">Save</button>
                    <button type="button" onClick={() => setPendingManagedUserDelete(managedUser)} className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 transition">Delete</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-white">{managedUser.fullName}</p>
                    <p className="text-sm text-slate-500">{managedUser.phone} • {managedUser.email || "-"}</p>
                    <p className="text-sm text-slate-500">
                       {managedUser.district || "-"} • {managedUser.area || "-"}
                       {managedUser.bloodGroup ? ` • Blood: ${managedUser.bloodGroup}` : ""}
                       {managedUser.education ? ` • Edu: ${managedUser.education}` : ""}
                       {managedUser.validUpto 
                         ? ` • Expiry: ${new Date(managedUser.validUpto).toLocaleDateString()}` 
                         : globalIdCardExpiry 
                           ? ` • Expiry: ${new Date(globalIdCardExpiry).toLocaleDateString()} (Global)` 
                           : " • Expiry: Permanent / Auto-Renewal"}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-orange-300">{String(managedUser.role || "").replaceAll("_", " ")}</span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                          managedUser.approvalStatus === "approved"
                            ? "bg-green-500/15 text-green-300"
                            : managedUser.approvalStatus === "pending"
                              ? "bg-yellow-500/15 text-yellow-300"
                              : "bg-rose-500/15 text-rose-300"
                        }`}
                      >
                        {managedUser.approvalStatus}
                      </span>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-400">{managedUser.isPhoneVerified ? "Phone Verified" : "Phone Pending"}</span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                          managedUser.isFunctionalityDisabled ? "bg-rose-500/15 text-rose-300" : "bg-emerald-500/15 text-emerald-300"
                        }`}
                      >
                        {managedUser.isFunctionalityDisabled ? "Actions Disabled" : "Actions Enabled"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {managedUser.approvalStatus === "pending" ? <button type="button" onClick={() => approveUser(managedUser._id)} className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 transition">Approve</button> : null}
                    <button type="button" onClick={() => startEditManagedUser(managedUser)} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition">Edit</button>
                    <button type="button" onClick={() => setPendingManagedUserDelete(managedUser)} className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 transition">Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!visibleManagedUsers.length ? <p className="text-slate-500 py-4 text-center">No registered reporters or chief editors match your search.</p> : null}
        </div>
      </div>
    );
  };

  const renderQueue = () => {
    return (
      <div className="panel p-6 border border-white/5 bg-slate-900/10 animate-[fadeIn_0.4s_ease-out]">
        <div className="border-b border-white/5 pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-400">Editorial Review Queue</p>
          <h2 className="text-2xl font-bold text-white mt-1">News Publishing Queue</h2>
        </div>
        <input className="mt-5 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none" placeholder="Search pending stories" value={pendingArticleSearch} onChange={(event) => setPendingArticleSearch(event.target.value)} />
        <div className="mt-5 space-y-4">
          {visiblePendingArticles.map((article) => (
            <div key={article._id} className="rounded-2xl border border-white/10 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="text-lg font-semibold text-white">{article.title}</p>
                <div className="flex flex-wrap gap-2">
                  {article.audioUrl ? (
                    <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-300">voice</span>
                  ) : null}
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-orange-300">{article.status}</span>
                </div>
              </div>
              <p className="mt-1 text-sm text-slate-500">By {joinMetaParts(article.author?.fullName, article.district, article.area)}</p>
              <p className="mt-3 text-sm text-slate-400">{article.excerpt}</p>
              {article.coverImageUrl ? (
                <div className="mt-4 flex h-48 items-center justify-center overflow-hidden rounded-2xl bg-slate-950/40">
                  <img src={article.coverImageUrl} alt={article.title} className="h-full w-full object-contain" />
                </div>
              ) : null}
              {article.audioUrl ? <AudioStoryPlayer article={article} compact className="mt-4" /> : null}
              <textarea className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none" rows="2" placeholder="Editorial feedback for rejection" value={feedbacks[`article-${article._id}`] || ""} onChange={(event) => setFeedbacks({ ...feedbacks, [`article-${article._id}`]: event.target.value })} />
              <div className="mt-4 flex gap-3">
                <button type="button" onClick={() => approveArticle(article._id)} className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 transition">Publish</button>
                <button type="button" onClick={() => rejectArticle(article._id)} className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 transition">Reject</button>
              </div>
            </div>
          ))}
          {!visiblePendingArticles.length ? <p className="text-slate-500 py-4 text-center">No pending stories match your search.</p> : null}
        </div>
      </div>
    );
  };

  const renderAdDesk = () => {
    return (
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr] animate-[fadeIn_0.4s_ease-out]">
        <div id="advertisement-management-form" className="panel p-6 border border-white/5 bg-slate-900/10 h-fit">
          <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-400">Marketing Desk</p>
              <h2 className="text-2xl font-bold text-white mt-1">Advertisement Management</h2>
            </div>
            {editingAdId ? (
              <button type="button" onClick={resetAdForm} className="rounded-full border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5 transition">
                Cancel Edit
              </button>
            ) : null}
          </div>
          <form onSubmit={submitAd} className="mt-5 grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none" placeholder="Advertiser name" value={adForm.advertiserName} onChange={(event) => setAdForm({ ...adForm, advertiserName: event.target.value })} />
              <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none" placeholder="Advertiser email" value={adForm.advertiserEmail} onChange={(event) => setAdForm({ ...adForm, advertiserEmail: event.target.value })} />
              <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none" placeholder="Advertiser phone" value={adForm.advertiserPhone} onChange={(event) => setAdForm({ ...adForm, advertiserPhone: event.target.value })} />
              <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none" placeholder="Company or brand name" value={adForm.companyName} onChange={(event) => setAdForm({ ...adForm, companyName: event.target.value })} />
            </div>
            <div>
              <input id="advertisement-title-input" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none" placeholder="Campaign title, for example Palamu Trade Fair 2026" value={adForm.title} onChange={(event) => setAdForm({ ...adForm, title: event.target.value })} />
              <p className="mt-2 text-xs text-slate-500">Use a short sponsor title that is easy to recognize on the homepage.</p>
            </div>
            <div>
              <textarea className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none" rows="3" placeholder="Optional short sponsor summary for homepage cards" value={adForm.description} onChange={(event) => setAdForm({ ...adForm, description: event.target.value })} />
              <p className="mt-2 text-xs text-slate-500">Keep this to one or two lines so the sponsored panel stays clean and readable.</p>
            </div>
            <ImagePicker
              label="Advertisement Banner Upload"
              helpText="Upload a sponsor banner here, or leave this empty and paste a direct banner image URL below."
              value={adForm.imageUrl}
              onChange={(value) => setAdForm({ ...adForm, imageUrl: value })}
            />
            <div>
              <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none" placeholder="Optional banner URL, for example https://example.com/banner.jpg" value={adForm.imageUrl.startsWith("data:") ? "" : adForm.imageUrl} onChange={(event) => setAdForm({ ...adForm, imageUrl: event.target.value })} />
              <p className="mt-2 text-xs text-slate-500">Use this when the sponsor already hosts the banner online. Upload and URL are interchangeable; one banner source is enough.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <input type="url" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none" placeholder="Sponsor destination URL, for example https://example.com/offer" value={adForm.targetUrl} onChange={(event) => setAdForm({ ...adForm, targetUrl: event.target.value })} />
                <p className="mt-2 text-xs text-slate-500">Readers are taken here after clicking the ad.</p>
              </div>
              <div>
                <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none" placeholder="CTA label, for example View Offer" value={adForm.ctaLabel} onChange={(event) => setAdForm({ ...adForm, ctaLabel: event.target.value })} />
                <p className="mt-2 text-xs text-slate-500">Short button text works best.</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <select className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white focus:outline-none" value={adForm.placement} onChange={(event) => setAdForm({ ...adForm, placement: event.target.value })}>
                  {adPlacements.map((placement) => (
                    <option key={placement.value} value={placement.value}>
                      {placement.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-500">{selectedPlacement?.hint}</p>
              </div>
              <div>
                <select className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white focus:outline-none" value={adForm.status} onChange={(event) => setAdForm({ ...adForm, status: event.target.value })}>
                  {adStatuses.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-500">Use Pending Approval for paid requests waiting on review, or Active to publish immediately.</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <input type="number" min="1" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none" placeholder="Duration in days" value={adForm.durationDays} onChange={(event) => setAdForm({ ...adForm, durationDays: Number(event.target.value) })} />
                <p className="mt-2 text-xs text-slate-500">How long the ad should stay active once published.</p>
              </div>
              <div>
                <input type="number" min="0" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none" placeholder="Price in INR" value={adForm.amount} onChange={(event) => setAdForm({ ...adForm, amount: Number(event.target.value) })} />
                <p className="mt-2 text-xs text-slate-500">Internal campaign price or billing amount.</p>
              </div>
              <div>
                <input type="number" min="1" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none" placeholder="Priority, lower means higher" value={adForm.priority} onChange={(event) => setAdForm({ ...adForm, priority: Number(event.target.value) })} />
                <p className="mt-2 text-xs text-slate-500">Priority decides ordering inside the selected homepage placement.</p>
              </div>
            </div>
            <div>
              <textarea className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none" rows="3" placeholder="Optional internal notes or advertiser remarks" value={adForm.notes} onChange={(event) => setAdForm({ ...adForm, notes: event.target.value })} />
              <p className="mt-2 text-xs text-slate-500">Useful for approval notes, invoice references, or campaign instructions.</p>
            </div>
            <button
               type="submit"
               disabled={Boolean(busyAction)}
               className="rounded-2xl bg-orange-500 hover:bg-orange-400 disabled:bg-orange-500/20 disabled:text-white/40 disabled:cursor-not-allowed transition-all duration-300 px-4 py-3 font-semibold text-white shadow-lg"
             >
               {busyAction ? "Saving..." : editingAdId ? "Update Advertisement" : "Publish Advertisement"}
             </button>
          </form>
        </div>

        <div className="panel p-6 border border-white/5 bg-slate-900/10">
          <div className="flex flex-col gap-4 border-b border-white/5 pb-4">
            <div>
              <h3 className="text-xl font-bold text-white">Sponsor Campaigns</h3>
              <p className="mt-1 text-sm text-slate-400">
                Filter and manage published homepage campaigns.
              </p>
            </div>
            <div className="text-xs text-orange-300 font-semibold bg-orange-500/10 border border-orange-500/20 rounded-full px-3 py-1 w-fit">
              {visibleManagedAds.length} ad{visibleManagedAds.length === 1 ? "" : "s"} matches
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <input
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none text-sm"
              placeholder="Search campaigns..."
              value={adSearch}
              onChange={(event) => setAdSearch(event.target.value)}
            />
            <select
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white focus:outline-none text-sm"
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
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none text-sm"
              value={adDateFilter}
              onChange={(event) => setAdDateFilter(event.target.value)}
            />
          </div>

          <div className="mt-5 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {visibleManagedAds.map((ad) => (
              <div key={ad._id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                {ad.imageUrl ? (
                  <div className="overflow-hidden rounded-xl border border-white/5 bg-slate-950/40 p-2">
                    <img src={ad.imageUrl} alt={ad.title} className="aspect-[16/9] w-full object-contain" />
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-white text-base leading-tight">{ad.title}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {adPlacements.find((placement) => placement.value === ad.placement)?.label || ad.placement}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] uppercase tracking-wider text-orange-300">{ad.status}</span>
                  </div>
                </div>
                <div className="mt-3 border-t border-white/5 pt-3 grid gap-1.5 text-xs text-slate-400">
                  <p><span className="text-slate-400 font-semibold">Advertiser:</span> {ad.advertiserName || "-"}</p>
                  <p><span className="text-slate-400 font-semibold">Brand:</span> {ad.companyName || "-"}</p>
                  <p><span className="text-slate-400 font-semibold">Billing:</span> Rs. {Number(ad.amount || 0).toLocaleString("en-IN")} • {ad.durationDays} days</p>
                  <p><span className="text-slate-400 font-semibold">Priority:</span> {ad.priority}</p>
                </div>
                <div className="mt-4 flex gap-2 border-t border-white/5 pt-3">
                  <button type="button" onClick={() => startEditAd(ad)} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-100 transition">
                    Edit
                  </button>
                  <button type="button" onClick={() => setPendingAdDelete(ad)} className="rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 transition">
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {!visibleManagedAds.length ? <p className="text-slate-500 text-xs py-4 text-center">No campaign matching the criteria.</p> : null}
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
        <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-400">Reader Inbox</p>
            <h2 className="text-2xl font-bold text-white mt-1">Contact Us Messages</h2>
          </div>
          {editingContactId ? (
            <button type="button" onClick={resetContactAdminForm} className="rounded-full border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5 transition">
              Cancel Edit
            </button>
          ) : null}
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
            <div id={`contact-message-${contactMessage._id}`} key={contactMessage._id} className="rounded-2xl border border-white/10 p-4">
              {editingContactId === contactMessage._id ? (
                <div className="grid gap-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" value={contactMessage.fullName} readOnly />
                    <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" value={contactMessage.email} readOnly />
                    <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" value={contactMessage.phone || "Phone not provided"} readOnly />
                    <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" value={contactMessage.subject} readOnly />
                  </div>
                  <textarea className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" rows="5" value={contactMessage.message} readOnly />
                  <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                    <select
                      className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white"
                      value={contactAdminForm.status}
                      onChange={(event) => setContactAdminForm({ ...contactAdminForm, status: event.target.value })}
                    >
                      {contactStatusOptions.filter((option) => option.value !== "all").map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <textarea
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                      rows="3"
                      placeholder="Admin note for follow-up, resolution, or internal handling"
                      value={contactAdminForm.adminNote}
                      onChange={(event) => setContactAdminForm({ ...contactAdminForm, adminNote: event.target.value })}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => saveContactMessage(contactMessage._id)} className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 transition">Save</button>
                    <button type="button" onClick={() => deleteContactMessage(contactMessage._id)} className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-555 transition">Delete</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-white">{contactMessage.subject}</p>
                    <p className="text-sm text-slate-500">{contactMessage.fullName} • {contactMessage.email} • {contactMessage.phone || "No phone provided"}</p>
                    <p className="text-sm text-slate-400">{contactMessage.message}</p>
                    {contactMessage.adminNote ? <p className="text-sm text-slate-500">Admin Note: {contactMessage.adminNote}</p> : null}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span
                        className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                          contactMessage.status === "resolved"
                            ? "bg-green-500/15 text-green-300"
                            : contactMessage.status === "in_progress"
                              ? "bg-yellow-500/15 text-yellow-300"
                              : "bg-orange-500/15 text-orange-300"
                        }`}
                      >
                        {String(contactMessage.status || "new").replaceAll("_", " ")}
                      </span>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                        {formatDate(contactMessage.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => startEditContact(contactMessage)} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition">Edit</button>
                    <button type="button" onClick={() => deleteContactMessage(contactMessage._id)} className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 transition">Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!visibleContactMessages.length ? <p className="text-slate-500 py-4 text-center">No contact messages match your filters.</p> : null}
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
      
      <VoiceNewsComposer
        open={showVoiceDesk}
        onClose={closeVoiceDesk}
        userRole={user?.role}
        canSubmit={canAccessVoiceDesk}
        defaultDistrict={profile?.district || ""}
        defaultArea={profile?.area || ""}
        onSubmitted={handleVoiceNewsSubmitted}
      />

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

      {/* LEFT COLUMN: SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/5 bg-[#05070c]/95 backdrop-blur-md transition-all duration-300 lg:sticky lg:top-[68px] lg:h-[calc(100vh-68px)] lg:translate-x-0 ${sidebarOpen ? "translate-x-0 !z-50" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center justify-between border-b border-white/5 px-6">
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
              <button onClick={() => { setActiveTab("approvals"); setSidebarOpen(false); }} className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${activeTab === "approvals" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <div className="flex items-center gap-3">
                  <UserCheck size={18} />
                  Approvals
                </div>
                {pendingUsers.length > 0 && (
                  <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">{pendingUsers.length}</span>
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
              <button onClick={() => { setActiveTab("contact_inbox"); setSidebarOpen(false); }} className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${activeTab === "contact_inbox" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <div className="flex items-center gap-3">
                  <Inbox size={18} />
                  Contact Inbox
                </div>
                {contactMessages.filter(m => m.status === "new").length > 0 && (
                  <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">{contactMessages.filter(m => m.status === "new").length}</span>
                )}
              </button>
              <button onClick={() => { setActiveTab("credentials"); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${activeTab === "credentials" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <Settings size={18} />
                Account Settings
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
              <button onClick={() => { setActiveTab("queue"); setSidebarOpen(false); }} className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${activeTab === "queue" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <div className="flex items-center gap-3">
                  <Layers size={18} />
                  Publishing Queue
                </div>
                {pendingArticles.length > 0 && (
                  <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">{pendingArticles.length}</span>
                )}
              </button>
              <button onClick={() => { setActiveTab("credentials"); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${activeTab === "credentials" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <Settings size={18} />
                Account Settings
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
              <button onClick={() => { setActiveTab("credentials"); setSidebarOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${activeTab === "credentials" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <Settings size={18} />
                Account Settings
              </button>
            </>
          )}
        </nav>
      </aside>

      {/* RIGHT COLUMN: WORKSPACE CONTAINER */}
      <main className="flex-grow flex-1 flex flex-col overflow-hidden min-h-screen">
        {/* Workspace Top-Bar Header */}
        <header className="flex h-16 items-center justify-between border-b border-white/5 bg-[#05070c]/50 px-6 backdrop-blur">
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
          </div>
        </header>

        {/* Content Container */}
        <div className="flex-grow p-6 overflow-y-auto">
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
                    <p><span className="font-semibold text-white">Phone Verified:</span> {profile?.isPhoneVerified ? "Yes" : "No"}</p>
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
              {!dashboardLoading && activeTab === "approvals" && user?.role === "super_admin" && renderApprovals()}
              {!dashboardLoading && activeTab === "directory" && user?.role === "super_admin" && renderDirectory()}
              {!dashboardLoading && activeTab === "queue" && user?.role === "chief_editor" && renderQueue()}
              {!dashboardLoading && activeTab === "ad_desk" && user?.role === "super_admin" && renderAdDesk()}
              {!dashboardLoading && activeTab === "expiry_control" && user?.role === "super_admin" && renderExpiryControl()}
              {!dashboardLoading && activeTab === "contact_inbox" && user?.role === "super_admin" && renderContactInbox()}
              {!dashboardLoading && activeTab === "credentials" && renderSettings()}
            </>
          )}
        </div>
      </main>
    </div>
  );
};
