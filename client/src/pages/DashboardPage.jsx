import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, FilePlus2, FolderKanban, IdCard, KeyRound, Megaphone, Mic, X } from "lucide-react";
import { AudioStoryPlayer } from "../components/audio/AudioStoryPlayer";
import { VoiceNewsComposer } from "../components/audio/VoiceNewsComposer";
import { MetricCard } from "../components/dashboard/MetricCard";
import { ImagePicker } from "../components/onboarding/ImagePicker";
import { WebcamCapture } from "../components/onboarding/WebcamCapture";
import { ActionPopup } from "../components/ui/ActionPopup";
import { useAuth } from "../context/AuthContext";
import { http } from "../api/http";
import { jharkhandBlocksByDistrict, jharkhandDistricts } from "../data/districts";

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
  breaking: false,
  coverImageUrl: "",
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
  profilePhotoUrl: "",
  aadhaarImageUrl: "",
  livePhotoUrl: "",
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
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-slate-950/95 p-6 shadow-[0_32px_80px_rgba(15,23,42,0.45)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-300">Confirm Action</p>
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
            Keep Articles
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
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
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
        <button type="button" onClick={onRefresh} className="rounded-full border border-white/10 px-4 py-2 text-sm text-white">
          Refresh List
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy || !articles.length}
          className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Deleting..." : "Delete All For This Date"}
        </button>
      </div>
    </div>

    <div className="mt-5 space-y-4">
      {articles.map((article) => (
        <div key={article._id} className="rounded-2xl border border-white/10 p-4">
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
                By {article.author?.fullName || "Unknown"} • {article.district || "-"} • {article.area || "-"}
              </p>
              <p className="text-sm text-slate-500">Published on {formatDate(article.publishedAt)}</p>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-orange-300">
              {article.status}
            </span>
          </div>
          {article.coverImageUrl ? (
            <div className="mt-4 flex h-48 items-center justify-center overflow-hidden rounded-2xl bg-slate-950/40">
              <img src={article.coverImageUrl} alt={article.title} className="h-full w-full object-contain" />
            </div>
          ) : null}
          {article.excerpt ? <p className="mt-4 text-sm leading-6 text-slate-400">{article.excerpt}</p> : null}
        </div>
      ))}
      {!articles.length ? (
        <p className="text-slate-500">No published articles are available for the selected date.</p>
      ) : null}
    </div>
  </div>
);

export const DashboardPage = () => {
  const { user, refreshUser } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [profile, setProfile] = useState(null);
  const [reporterCardUrl, setReporterCardUrl] = useState("");
  const [myArticles, setMyArticles] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [managedUsers, setManagedUsers] = useState([]);
  const [pendingArticles, setPendingArticles] = useState([]);
  const [ads, setAds] = useState([]);
  const [articleForm, setArticleForm] = useState(initialArticleForm);
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
        const matchesSearch = [ad.title, ad.advertiserName, ad.companyName, ad.advertiserEmail, ad.placement, ad.status]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(adSearch.toLowerCase());

        return matchesStatus && matchesDate && matchesSearch;
      }),
    [ads, adDateFilter, adSearch, adStatusFilter]
  );

  const canAccessNewsDesk = user?.role === "super_admin" || (profile?.approvalStatus === "approved" && profile?.isPhoneVerified);
  const canAccessVoiceDesk = user?.role === "super_admin" || canAccessNewsDesk;
  const showDashboardActions = user?.role === "reporter" || user?.role === "chief_editor" || user?.role === "super_admin";
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

  const refreshProfile = () => {
    http.get("/users/me").then(({ data }) => setProfile(data.user)).catch(() => {});
  };

  const refreshMyArticles = () => {
    const mineQuery = user?.role === "chief_editor" || user?.role === "super_admin" ? "&mine=true" : "";
    http.get(`/articles/workflow/list?status=all${mineQuery}`).then(({ data }) => setMyArticles(dedupeArticlesById(data.articles))).catch(() => {});
  };

  const refreshEditorialQueue = () => {
    http.get("/articles/workflow/list?status=pending").then(({ data }) => setPendingArticles(dedupeArticlesById(data.articles))).catch(() => {});
  };

  const refreshChiefMetrics = () => {
    http.get("/admin/overview").then(({ data }) => setMetrics(data.metrics)).catch(() => {});
  };

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

  const refreshAdminData = () => {
    http.get("/admin/overview").then(({ data }) => setMetrics(data.metrics)).catch(() => {});
    http.get("/admin/pending-approvals").then(({ data }) => {
      setPendingUsers(data.pendingUsers);
      setPendingArticles(data.pendingArticles);
    }).catch(() => {});
    http.get("/users?roles=reporter,chief_editor").then(({ data }) => setManagedUsers(data.users)).catch(() => {});
    http.get("/ads").then(({ data }) => setAds(data.ads)).catch(() => {});
    http.get("/contact").then(({ data }) => setContactMessages(data.messages)).catch(() => {});
  };

  useEffect(() => {
    if (!user) return;

    refreshProfile();

    if (user.role === "reporter" || user.role === "chief_editor" || user.role === "super_admin") {
      refreshMyArticles();
      if (user.role === "reporter" || user.role === "chief_editor") {
        http.get("/users/id-card").then(({ data }) => setReporterCardUrl(data.idCardUrl)).catch(() => {});
      }
    }

    if (user.role === "super_admin") {
      refreshAdminData();
      refreshPublishedArchive();
    }

    if (user.role === "chief_editor") {
      refreshChiefMetrics();
      refreshEditorialQueue();
      refreshPublishedArchive();
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
    setShowCredentialForm(true);
    setTimeout(() => {
      document.getElementById("account-credentials-panel")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 0);
  };

  const closeCredentialForm = () => {
    setShowCredentialForm(false);
    resetCredentialForm();
  };

  const openReporterDesk = () => {
    setShowReporterDesk(true);
    setTimeout(() => {
      document.getElementById("reporter-desk-panel")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 0);
  };

  const closeReporterDesk = () => {
    setShowReporterDesk(false);
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
    setEditingArticleId(article._id);
    setArticleForm({
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      district: article.district,
      area: article.area,
      breaking: article.breaking,
      coverImageUrl: article.coverImageUrl || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteArticle = async (articleId) => {
    if (!window.confirm("Delete this article draft? This action cannot be undone.")) return;
    await handleAction(async () => {
      await http.delete(`/articles/${articleId}`);
      refreshMyArticles();
    }, "Article deleted.");
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
    setShowAdRequestsPanel(false);
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
    setTimeout(() => {
      document.getElementById("advertisement-management-form")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 180);
  };

  const focusManageAdsSection = () => {
    setShowAdRequestsPanel(false);
    setTimeout(() => {
      document.getElementById("advertisement-management-form")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };

  const deleteAd = async (adId) => {
    if (!window.confirm("Delete this advertisement? This cannot be undone.")) return;
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
      profilePhotoUrl: managedUser.profilePhotoUrl || "",
      aadhaarImageUrl: managedUser.aadhaarImageUrl || "",
      livePhotoUrl: managedUser.livePhotoUrl || "",
    });
    setTimeout(() => {
      document.getElementById(`managed-user-${managedUser._id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 0);
  };

  const saveManagedUser = async (userId) => {
    await handleAction(async () => {
      await http.patch(`/users/${userId}`, managedUserForm);
      resetManagedUserForm();
      refreshAdminData();
    }, "User updated.");
  };

  const deleteManagedUser = async (userId) => {
    if (!window.confirm("Delete this user account? This cannot be undone.")) return;
    await handleAction(async () => {
      await http.delete(`/users/${userId}`);
      if (editingManagedUserId === userId) {
        resetManagedUserForm();
      }
      refreshAdminData();
    }, "User deleted.");
  };

  const startEditContact = (contactMessage) => {
    setEditingContactId(contactMessage._id);
    setContactAdminForm({
      status: contactMessage.status || "new",
      adminNote: contactMessage.adminNote || "",
    });
    setTimeout(() => {
      document.getElementById(`contact-message-${contactMessage._id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 0);
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

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10">
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
        onCancel={() => {
          if (!archiveBusy) {
            setShowArchiveDeleteModal(false);
          }
        }}
        onConfirm={confirmPublishedArchiveDelete}
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
      {showDashboardActions ? (
        <>
          <div className="fixed bottom-4 left-4 z-[70] flex flex-col gap-3 sm:bottom-6 sm:left-6">
            <button
              type="button"
              onClick={openCredentialForm}
              className="inline-flex w-[min(44vw,14rem)] items-center justify-center gap-3 rounded-full bg-orange-500 px-4 py-3 text-[13px] font-semibold text-white shadow-2xl shadow-orange-900/30 transition hover:bg-orange-400 sm:w-auto sm:justify-start sm:px-5 sm:text-sm"
            >
              <KeyRound size={18} />
              Update Credentials
            </button>
            {showReporterCardAction ? (
              <a
                href={reporterCardUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-[min(44vw,14rem)] items-center justify-center gap-3 rounded-full bg-white px-4 py-3 text-[13px] font-semibold text-slate-900 shadow-2xl shadow-slate-950/20 transition hover:bg-slate-100 sm:w-auto sm:justify-start sm:px-5 sm:text-sm"
              >
                <IdCard size={18} />
                {user?.role === "chief_editor" ? "Chief Editor ID Card" : "Reporter ID Card"}
              </a>
            ) : null}
          </div>
          <div className="fixed bottom-4 right-4 z-[70] flex flex-col gap-3 sm:bottom-6 sm:right-6">
            <button
              type="button"
              onClick={openReporterDesk}
              className="inline-flex w-[min(44vw,14rem)] items-center justify-center gap-3 rounded-full bg-emerald-600 px-4 py-3 text-[13px] font-semibold text-white shadow-2xl shadow-emerald-950/30 transition hover:bg-emerald-500 sm:w-auto sm:justify-start sm:px-5 sm:text-sm"
            >
              <FilePlus2 size={18} />
              {user?.role === "super_admin" ? "Publish News" : "Add News"}
            </button>
            <button
              type="button"
              onClick={openVoiceDesk}
              className="inline-flex w-[min(44vw,14rem)] items-center justify-center gap-3 rounded-full border border-emerald-300/30 bg-slate-950/95 px-4 py-3 text-[13px] font-semibold text-white shadow-[0_20px_55px_rgba(5,150,105,0.34)] backdrop-blur transition hover:border-emerald-300/60 hover:bg-slate-900 sm:w-auto sm:justify-start sm:px-5 sm:text-sm"
              aria-label="Open voice news recorder"
            >
              <Mic className="h-5 w-5 text-emerald-300" />
              <span>Record News</span>
            </button>
            {user?.role === "super_admin" ? (
              <button
                type="button"
                onClick={() => setShowAdRequestsPanel(true)}
                className="inline-flex w-[min(44vw,14rem)] items-center justify-center gap-3 rounded-full border border-orange-300/35 bg-slate-950/95 px-4 py-3 text-[13px] font-semibold text-white shadow-[0_20px_50px_rgba(15,23,42,0.35)] backdrop-blur transition hover:border-orange-300/60 hover:bg-slate-900 sm:w-auto sm:justify-start sm:px-5 sm:text-sm"
              >
                <Megaphone className="h-5 w-5 text-orange-300" />
                <span>Ad Requests</span>
                {pendingAdRequestsCount ? (
                  <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-bold text-white">{pendingAdRequestsCount}</span>
                ) : null}
              </button>
            ) : null}
            {user?.role === "super_admin" ? (
              <button
                type="button"
                onClick={focusManageAdsSection}
                className="inline-flex w-[min(44vw,14rem)] items-center justify-center gap-3 rounded-full border border-emerald-300/35 bg-slate-950/95 px-4 py-3 text-[13px] font-semibold text-white shadow-[0_20px_50px_rgba(15,23,42,0.35)] backdrop-blur transition hover:border-emerald-300/60 hover:bg-slate-900 sm:w-auto sm:justify-start sm:px-5 sm:text-sm"
              >
                <FolderKanban className="h-5 w-5 text-emerald-300" />
                <span>Manage Ads</span>
              </button>
            ) : null}
          </div>
        </>
      ) : null}
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-orange-300">Dashboard</p>
        <h1 className="mt-3 font-display text-4xl text-white">{user ? `${user.fullName} workspace` : "Role-based operations"}</h1>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-6">
          <h2 className="text-xl font-semibold text-white">{onboardingTitle}</h2>
          {profile ? (
            <div className="mt-5">
              <DetailRow label="Role" value={String(profile.role || "-").replaceAll("_", " ")} />
              <DetailRow label="Approval Status" value={profile.approvalStatus || "-"} />
              <DetailRow label="Phone Verified" value={profile.isPhoneVerified ? "Yes" : "No"} />
              <DetailRow label="Phone" value={profile.phone || "-"} />
              <DetailRow label="Email" value={profile.email || "-"} />
              <DetailRow label="Joined On" value={formatDate(profile.createdAt)} />
              {(user?.role === "reporter" || user?.role === "chief_editor") ? <DetailRow label="District" value={profile.district || "-"} /> : null}
              {(user?.role === "reporter" || user?.role === "chief_editor") ? <DetailRow label="Area / Block" value={profile.area || "-"} /> : null}
              {user?.role === "reporter" ? <DetailRow label="Reporter Code" value={profile.reporterCode || "Not generated yet"} /> : null}
              {user?.role === "chief_editor" ? <DetailRow label="Chief Editor Code" value={profile.chiefEditorCode || "Not generated yet"} /> : null}
              {profile.rejectionFeedback ? <DetailRow label="Admin Feedback" value={profile.rejectionFeedback} valueClassName="text-right text-rose-300" /> : null}
            </div>
          ) : (
            <p className="mt-4 text-slate-500">Loading profile...</p>
          )}
        </div>

        <div className="panel p-6">
          <h2 className="text-xl font-semibold text-white">{user?.role === "super_admin" ? "Admin Access Notes" : "Desk Access Notes"}</h2>
          <div className="mt-5 space-y-4 text-sm leading-6 text-slate-500">
            {user?.role === "super_admin" ? (
              <>
                <p>Your dashboard controls reporter approvals, story publishing, advertisement priority, and overall homepage sponsor visibility.</p>
                <p>Higher priority ads appear earlier in each homepage placement. Use small numbers like 1, 2, and 3 for your most important campaigns.</p>
                <p>When an ad is marked active, it becomes eligible for homepage display until its duration window ends.</p>
              </>
            ) : user?.role === "chief_editor" ? (
              <>
                <p>Your chief editor desk opens after approval and phone verification. You can submit stories, track your own articles, and review pending reporter news.</p>
                <p>Use the editorial queue to publish strong reports quickly or send revision feedback back to the reporter desk.</p>
                <p>Your dashboard also shows live newsroom metrics so you can monitor pending and published coverage.</p>
              </>
            ) : (
              <>
                <p>Your reporter desk opens after approval and phone verification. Once unlocked, every submission goes to the super admin publishing queue.</p>
                <p>Use the excerpt field for a concise summary and the full content field for the complete report copy.</p>
                <p>Approved reporters also receive a generated reporter ID card link directly inside this dashboard.</p>
              </>
            )}
          </div>
        </div>
      </div>

      {showCredentialForm ? (
        <div id="account-credentials-panel" className="panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-white">Account Credentials</h2>
              <p className="mt-2 text-sm text-slate-500">Update your login phone, email, display name, and password from one place.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={resetCredentialForm} className="rounded-full border border-white/10 px-4 py-2 text-sm text-white">
                Reset
              </button>
              <button type="button" onClick={closeCredentialForm} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white">
                <X size={16} />
                Close
              </button>
            </div>
          </div>
          <form onSubmit={submitCredentials} className="mt-5 grid gap-4 lg:grid-cols-2">
            <div>
              <input
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                placeholder="Full name"
                value={credentialForm.fullName}
                onChange={(event) => setCredentialForm({ ...credentialForm, fullName: event.target.value })}
              />
              <p className="mt-2 text-xs text-slate-500">This name appears in your dashboard profile and bylines where applicable.</p>
            </div>
            <div>
              <input
                type="email"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                placeholder="Email address"
                value={credentialForm.email}
                onChange={(event) => setCredentialForm({ ...credentialForm, email: event.target.value })}
              />
              <p className="mt-2 text-xs text-slate-500">Use a valid email address so account recovery and contact details stay correct.</p>
            </div>
            <div className="lg:col-span-2">
              <input
                inputMode="numeric"
                maxLength="10"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
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
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-white"
                  placeholder="Current password"
                  value={credentialForm.currentPassword}
                  onChange={(event) => setCredentialForm({ ...credentialForm, currentPassword: event.target.value })}
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
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
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-white"
                  placeholder="New password"
                  value={credentialForm.newPassword}
                  onChange={(event) => setCredentialForm({ ...credentialForm, newPassword: event.target.value })}
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
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
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-white"
                  placeholder="Confirm new password"
                  value={credentialForm.confirmNewPassword}
                  onChange={(event) => setCredentialForm({ ...credentialForm, confirmNewPassword: event.target.value })}
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">Your new password must be at least 6 characters long.</p>
            </div>
            <button className="rounded-2xl bg-orange-500 px-4 py-3 font-semibold text-white lg:col-span-2">
              {credentialBusy ? "Saving..." : "Update Credentials"}
            </button>
          </form>
        </div>
      ) : null}

      {(user?.role === "reporter" || user?.role === "chief_editor" || user?.role === "super_admin") ? (
        <div className="space-y-6">
          {showReporterDesk ? (
            <div id="reporter-desk-panel" className="panel p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold text-white">
                  {user?.role === "super_admin" ? "Super Admin News Desk" : user?.role === "chief_editor" ? "Chief Editor Desk" : "Reporter Desk"}
                </h2>
                <div className="flex flex-wrap gap-3">
                  {editingArticleId ? (
                    <button type="button" onClick={resetArticleForm} className="rounded-full border border-white/10 px-4 py-2 text-sm text-white">
                      Cancel Edit
                    </button>
                  ) : null}
                  <button type="button" onClick={closeReporterDesk} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white">
                    <X size={16} />
                    Close
                  </button>
                </div>
              </div>

              {!canAccessNewsDesk ? (
                <p className="mt-4 text-slate-500">Your news desk unlocks after super admin approval and phone verification.</p>
              ) : (
                <form onSubmit={submitArticle} className="mt-5 grid gap-4 md:grid-cols-2">
                  <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white md:col-span-2" placeholder="Headline" value={articleForm.title} onChange={(event) => setArticleForm({ ...articleForm, title: event.target.value })} />
                  <select className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white" value={articleForm.district} onChange={(event) => setArticleForm({ ...articleForm, district: event.target.value, area: "" })}>
                    <option value="">Select district</option>
                    {jharkhandDistricts.map((district) => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                  </select>
                  <select className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white" value={articleForm.area} onChange={(event) => setArticleForm({ ...articleForm, area: event.target.value })}>
                    <option value="">Select block</option>
                    {articleBlocks.map((block) => (
                      <option key={block} value={block}>{block}</option>
                    ))}
                  </select>
                  <textarea className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white md:col-span-2" rows="3" placeholder="Short excerpt" value={articleForm.excerpt} onChange={(event) => setArticleForm({ ...articleForm, excerpt: event.target.value })} />
                  <textarea className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white md:col-span-2" rows="8" placeholder="Full article content" value={articleForm.content} onChange={(event) => setArticleForm({ ...articleForm, content: event.target.value })} />
                  <div className="md:col-span-2">
                    <ImagePicker
                      label="Article Cover Image"
                      helpText="Upload a strong visual to make the story look professional on cards and article pages."
                      value={articleForm.coverImageUrl}
                      onChange={(value) => setArticleForm({ ...articleForm, coverImageUrl: value })}
                    />
                  </div>
                  <label className="flex items-center gap-3 text-sm text-slate-500 md:col-span-2">
                    <input type="checkbox" checked={articleForm.breaking} onChange={(event) => setArticleForm({ ...articleForm, breaking: event.target.checked })} />
                    Mark as breaking news
                  </label>
                  <button className="rounded-2xl bg-orange-500 px-4 py-3 font-semibold text-white md:col-span-2">
                    {busyAction ? "Saving..." : editingArticleId ? "Update Article" : user?.role === "super_admin" ? "Publish News" : "Submit News"}
                  </button>
                </form>
              )}
            </div>
          ) : null}

          <div className="panel p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-white">My Articles</h2>
              <select
                className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white"
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
                <div key={article._id} className="rounded-2xl border border-white/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-white">{article.title}</p>
                      <p className="text-sm text-slate-500">{article.district} Ã¢â‚¬Â¢ {article.area} Ã¢â‚¬Â¢ {article.status}</p>
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
                  {article.status !== "published" ? (
                    <div className="mt-4 flex gap-3">
                      {!article.audioUrl ? (
                        <button type="button" onClick={() => startEditArticle(article)} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900">
                          Edit
                        </button>
                      ) : null}
                      <button type="button" onClick={() => deleteArticle(article._id)} className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white">
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
            </div>
            {filteredArticles.length > 4 ? (
              <div className="mt-5 flex items-center justify-between">
                <button type="button" disabled={articlePage === 1} onClick={() => setArticlePage((value) => Math.max(1, value - 1))} className="rounded-full border border-white/10 px-4 py-2 text-sm text-white disabled:opacity-40">
                  Previous
                </button>
                <span className="text-sm text-slate-500">Page {articlePage} of {totalArticlePages}</span>
                <button type="button" disabled={articlePage === totalArticlePages} onClick={() => setArticlePage((value) => Math.min(totalArticlePages, value + 1))} className="rounded-full border border-white/10 px-4 py-2 text-sm text-white disabled:opacity-40">
                  Next
                </button>
              </div>
            ) : null}
          </div>

          {user?.role === "chief_editor" ? (
            <>
              <PublishedArchiveSection
                selectedDate={publishedArchiveDate}
                onDateChange={setPublishedArchiveDate}
                articles={publishedArchiveArticles}
                onRefresh={() => refreshPublishedArchive()}
                onDelete={requestPublishedArchiveDelete}
                busy={archiveBusy}
              />

            <div className="panel p-6">
              <h2 className="text-2xl font-semibold text-white">News Publishing Queue</h2>
              <input className="mt-5 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" placeholder="Search pending stories" value={pendingArticleSearch} onChange={(event) => setPendingArticleSearch(event.target.value)} />
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
                    <p className="mt-1 text-sm text-slate-500">By {article.author?.fullName} ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ {article.district} ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ {article.area}</p>
                    <p className="mt-3 text-sm text-slate-400">{article.excerpt}</p>
                    {article.coverImageUrl ? (
                      <div className="mt-4 flex h-48 items-center justify-center overflow-hidden rounded-2xl bg-slate-950/40">
                        <img src={article.coverImageUrl} alt={article.title} className="h-full w-full object-contain" />
                      </div>
                    ) : null}
                    {article.audioUrl ? <AudioStoryPlayer article={article} compact className="mt-4" /> : null}
                    <textarea className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" rows="2" placeholder="Editorial feedback for rejection" value={feedbacks[`article-${article._id}`] || ""} onChange={(event) => setFeedbacks({ ...feedbacks, [`article-${article._id}`]: event.target.value })} />
                    <div className="mt-4 flex gap-3">
                      <button type="button" onClick={() => approveArticle(article._id)} className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white">Publish</button>
                      <button type="button" onClick={() => rejectArticle(article._id)} className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white">Reject</button>
                    </div>
                  </div>
                ))}
                {!visiblePendingArticles.length ? <p className="text-slate-500">No pending stories match your search.</p> : null}
              </div>
            </div>
            </>
          ) : null}
        </div>
      ) : null}

      {user?.role === "super_admin" ? (
        <div className="space-y-6">
          <PublishedArchiveSection
            selectedDate={publishedArchiveDate}
            onDateChange={setPublishedArchiveDate}
            articles={publishedArchiveArticles}
            onRefresh={() => refreshPublishedArchive()}
            onDelete={requestPublishedArchiveDelete}
            busy={archiveBusy}
          />

          <div className="panel p-6">
            <h2 className="text-2xl font-semibold text-white">Reporter Approvals</h2>
            <input className="mt-5 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" placeholder="Search pending reporters" value={pendingUserSearch} onChange={(event) => setPendingUserSearch(event.target.value)} />
            <div className="mt-5 space-y-4">
              {visiblePendingUsers.map((pendingUser) => (
                <div key={pendingUser._id} className="rounded-2xl border border-white/10 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-white">{pendingUser.fullName}</p>
                      <p className="text-sm text-slate-500">{pendingUser.phone} Ã¢â‚¬Â¢ {pendingUser.district} Ã¢â‚¬Â¢ {pendingUser.area}</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => approveUser(pendingUser._id)} className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white">Approve</button>
                      <button type="button" onClick={() => rejectUser(pendingUser._id)} className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white">Reject</button>
                    </div>
                  </div>
                  <input className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" placeholder="Optional rejection feedback" value={feedbacks[`user-${pendingUser._id}`] || ""} onChange={(event) => setFeedbacks({ ...feedbacks, [`user-${pendingUser._id}`]: event.target.value })} />
                </div>
              ))}
              {!visiblePendingUsers.length ? <p className="text-slate-500">No reporter approvals match your search.</p> : null}
            </div>
          </div>

          <div className="panel p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold text-white">Manage Reporters And Chief Editors</h2>
              {editingManagedUserId ? (
                <button type="button" onClick={resetManagedUserForm} className="rounded-full border border-white/10 px-4 py-2 text-sm text-white">
                  Cancel Edit
                </button>
              ) : null}
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px]">
              <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" placeholder="Search all registered reporters and chief editors" value={managedUserSearch} onChange={(event) => setManagedUserSearch(event.target.value)} />
              <select className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white" value={managedUserStatusFilter} onChange={(event) => setManagedUserStatusFilter(event.target.value)}>
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
                      <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" value={managedUserForm.fullName} onChange={(event) => setManagedUserForm({ ...managedUserForm, fullName: event.target.value })} placeholder="Full name" />
                      <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" value={managedUserForm.email} onChange={(event) => setManagedUserForm({ ...managedUserForm, email: event.target.value })} placeholder="Email" />
                      <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" value={managedUserForm.phone} onChange={(event) => setManagedUserForm({ ...managedUserForm, phone: event.target.value })} placeholder="Phone" />
                      <select className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white" value={managedUserForm.role} onChange={(event) => setManagedUserForm({ ...managedUserForm, role: event.target.value })}>
                        {managedRoleOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" value={managedUserForm.district} onChange={(event) => setManagedUserForm({ ...managedUserForm, district: event.target.value })} placeholder="District" />
                      <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" value={managedUserForm.area} onChange={(event) => setManagedUserForm({ ...managedUserForm, area: event.target.value })} placeholder="Area / Block" />
                      <select className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white" value={managedUserForm.approvalStatus} onChange={(event) => setManagedUserForm({ ...managedUserForm, approvalStatus: event.target.value })}>
                        {approvalOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <label className="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-400">
                        <input type="checkbox" checked={managedUserForm.isPhoneVerified} onChange={(event) => setManagedUserForm({ ...managedUserForm, isPhoneVerified: event.target.checked })} />
                        Phone verified
                      </label>
                      <div className="flex gap-3 md:col-span-2">
                        <button type="button" onClick={() => saveManagedUser(managedUser._id)} className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white">Save</button>
                        <button type="button" onClick={() => deleteManagedUser(managedUser._id)} className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white">Delete</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-lg font-semibold text-white">{managedUser.fullName}</p>
                        <p className="text-sm text-slate-500">{managedUser.phone} • {managedUser.email || "-"}</p>
                        <p className="text-sm text-slate-500">{managedUser.district || "-"} • {managedUser.area || "-"}</p>
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
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {managedUser.approvalStatus === "pending" ? <button type="button" onClick={() => approveUser(managedUser._id)} className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white">Approve</button> : null}
                        <button type="button" onClick={() => startEditManagedUser(managedUser)} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900">Edit</button>
                        <button type="button" onClick={() => deleteManagedUser(managedUser._id)} className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white">Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {!visibleManagedUsers.length ? <p className="text-slate-500">No registered reporters or chief editors match your search.</p> : null}
            </div>
          </div>

          <div className="panel p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold text-white">Contact Us Messages</h2>
              {editingContactId ? (
                <button type="button" onClick={resetContactAdminForm} className="rounded-full border border-white/10 px-4 py-2 text-sm text-white">
                  Cancel Edit
                </button>
              ) : null}
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px]">
              <input
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                placeholder="Search by name, email, phone, subject, or message"
                value={contactSearch}
                onChange={(event) => setContactSearch(event.target.value)}
              />
              <select
                className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white"
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
                        <button type="button" onClick={() => saveContactMessage(contactMessage._id)} className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white">Save</button>
                        <button type="button" onClick={() => deleteContactMessage(contactMessage._id)} className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white">Delete</button>
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
                        <button type="button" onClick={() => startEditContact(contactMessage)} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900">Edit</button>
                        <button type="button" onClick={() => deleteContactMessage(contactMessage._id)} className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white">Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {!visibleContactMessages.length ? <p className="text-slate-500">No contact messages match your filters.</p> : null}
            </div>
          </div>

          <div className="panel p-6">
            <h2 className="text-2xl font-semibold text-white">News Publishing Queue</h2>
            <input className="mt-5 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" placeholder="Search pending stories" value={pendingArticleSearch} onChange={(event) => setPendingArticleSearch(event.target.value)} />
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
                  <p className="mt-1 text-sm text-slate-500">By {article.author?.fullName} Ã¢â‚¬Â¢ {article.district} Ã¢â‚¬Â¢ {article.area}</p>
                  <p className="mt-3 text-sm text-slate-400">{article.excerpt}</p>
                  {article.coverImageUrl ? (
                    <div className="mt-4 flex h-48 items-center justify-center overflow-hidden rounded-2xl bg-slate-950/40">
                      <img src={article.coverImageUrl} alt={article.title} className="h-full w-full object-contain" />
                    </div>
                  ) : null}
                  {article.audioUrl ? <AudioStoryPlayer article={article} compact className="mt-4" /> : null}
                  <textarea className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" rows="2" placeholder="Editorial feedback for rejection" value={feedbacks[`article-${article._id}`] || ""} onChange={(event) => setFeedbacks({ ...feedbacks, [`article-${article._id}`]: event.target.value })} />
                  <div className="mt-4 flex gap-3">
                    <button type="button" onClick={() => approveArticle(article._id)} className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white">Publish</button>
                    <button type="button" onClick={() => rejectArticle(article._id)} className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white">Reject</button>
                  </div>
                </div>
              ))}
              {!visiblePendingArticles.length ? <p className="text-slate-500">No pending stories match your search.</p> : null}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div id="advertisement-management-form" className="panel p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold text-white">Advertisement Management</h2>
                {editingAdId ? (
                  <button type="button" onClick={resetAdForm} className="rounded-full border border-white/10 px-4 py-2 text-sm text-white">
                    Cancel Edit
                  </button>
                ) : null}
              </div>
              <form onSubmit={submitAd} className="mt-5 grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" placeholder="Advertiser name" value={adForm.advertiserName} onChange={(event) => setAdForm({ ...adForm, advertiserName: event.target.value })} />
                  <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" placeholder="Advertiser email" value={adForm.advertiserEmail} onChange={(event) => setAdForm({ ...adForm, advertiserEmail: event.target.value })} />
                  <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" placeholder="Advertiser phone" value={adForm.advertiserPhone} onChange={(event) => setAdForm({ ...adForm, advertiserPhone: event.target.value })} />
                  <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" placeholder="Company or brand name" value={adForm.companyName} onChange={(event) => setAdForm({ ...adForm, companyName: event.target.value })} />
                </div>
                <div>
                  <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" placeholder="Campaign title, for example Palamu Trade Fair 2026" value={adForm.title} onChange={(event) => setAdForm({ ...adForm, title: event.target.value })} />
                  <p className="mt-2 text-xs text-slate-500">Use a short sponsor title that is easy to recognize on the homepage.</p>
                </div>
                <div>
                  <textarea className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" rows="3" placeholder="Optional short sponsor summary for homepage cards" value={adForm.description} onChange={(event) => setAdForm({ ...adForm, description: event.target.value })} />
                  <p className="mt-2 text-xs text-slate-500">Keep this to one or two lines so the sponsored panel stays clean and readable.</p>
                </div>
                <ImagePicker
                  label="Advertisement Banner Upload"
                  helpText="Upload a sponsor banner here, or leave this empty and paste a direct banner image URL below."
                  value={adForm.imageUrl}
                  onChange={(value) => setAdForm({ ...adForm, imageUrl: value })}
                />
                <div>
                  <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" placeholder="Optional banner URL, for example https://example.com/banner.jpg" value={adForm.imageUrl.startsWith("data:") ? "" : adForm.imageUrl} onChange={(event) => setAdForm({ ...adForm, imageUrl: event.target.value })} />
                  <p className="mt-2 text-xs text-slate-500">Use this when the sponsor already hosts the banner online. Upload and URL are interchangeable; one banner source is enough.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <input type="url" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" placeholder="Sponsor destination URL, for example https://example.com/offer" value={adForm.targetUrl} onChange={(event) => setAdForm({ ...adForm, targetUrl: event.target.value })} />
                    <p className="mt-2 text-xs text-slate-500">Readers are taken here after clicking the ad.</p>
                  </div>
                  <div>
                    <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" placeholder="CTA label, for example View Offer" value={adForm.ctaLabel} onChange={(event) => setAdForm({ ...adForm, ctaLabel: event.target.value })} />
                    <p className="mt-2 text-xs text-slate-500">Short button text works best.</p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <select className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white" value={adForm.placement} onChange={(event) => setAdForm({ ...adForm, placement: event.target.value })}>
                      {adPlacements.map((placement) => (
                        <option key={placement.value} value={placement.value}>
                          {placement.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-slate-500">{selectedPlacement?.hint}</p>
                  </div>
                  <div>
                    <select className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white" value={adForm.status} onChange={(event) => setAdForm({ ...adForm, status: event.target.value })}>
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
                    <input type="number" min="1" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" placeholder="Duration in days" value={adForm.durationDays} onChange={(event) => setAdForm({ ...adForm, durationDays: Number(event.target.value) })} />
                    <p className="mt-2 text-xs text-slate-500">How long the ad should stay active once published.</p>
                  </div>
                  <div>
                    <input type="number" min="0" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" placeholder="Price in INR" value={adForm.amount} onChange={(event) => setAdForm({ ...adForm, amount: Number(event.target.value) })} />
                    <p className="mt-2 text-xs text-slate-500">Internal campaign price or billing amount.</p>
                  </div>
                  <div>
                    <input type="number" min="1" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" placeholder="Priority, lower means higher" value={adForm.priority} onChange={(event) => setAdForm({ ...adForm, priority: Number(event.target.value) })} />
                    <p className="mt-2 text-xs text-slate-500">Priority decides ordering inside the selected homepage placement.</p>
                  </div>
                </div>
                <div>
                  <textarea className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" rows="3" placeholder="Optional internal notes or advertiser remarks" value={adForm.notes} onChange={(event) => setAdForm({ ...adForm, notes: event.target.value })} />
                  <p className="mt-2 text-xs text-slate-500">Useful for approval notes, invoice references, or campaign instructions.</p>
                </div>
                <button className="rounded-2xl bg-orange-500 px-4 py-3 font-semibold text-white">{busyAction ? "Saving..." : editingAdId ? "Update Advertisement" : "Publish Advertisement"}</button>
              </form>

              <div className="mt-8 border-t border-white/10 pt-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-white">Manage All Ads</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Filter advertisements by date, status, or advertiser and then edit or delete any single campaign.
                    </p>
                  </div>
                  <div className="text-sm text-slate-400">
                    <span className="font-semibold text-white">{visibleManagedAds.length}</span> ad{visibleManagedAds.length === 1 ? "" : "s"} match the current filters.
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                    placeholder="Search by title, advertiser, company, email"
                    value={adSearch}
                    onChange={(event) => setAdSearch(event.target.value)}
                  />
                  <select
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white"
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
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                    value={adDateFilter}
                    onChange={(event) => setAdDateFilter(event.target.value)}
                  />
                </div>

                <div className="mt-5 space-y-4">
                  {visibleManagedAds.map((ad) => (
                    <div key={ad._id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                      {ad.imageUrl ? (
                        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                          <img src={ad.imageUrl} alt={ad.title} className="aspect-[16/9] w-full object-contain" />
                        </div>
                      ) : null}
                      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold text-white">{ad.title}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {adPlacements.find((placement) => placement.value === ad.placement)?.label || ad.placement}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-orange-300">{ad.status}</span>
                          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-300">{ad.paymentStatus || "pending"}</span>
                        </div>
                      </div>
                      {ad.description ? <p className="mt-3 text-sm leading-6 text-slate-400">{ad.description}</p> : null}
                      <div className="mt-4 grid gap-2 text-sm text-slate-500 md:grid-cols-2">
                        <p>Advertiser: {ad.advertiserName || "-"}</p>
                        <p>Company: {ad.companyName || "-"}</p>
                        <p>Email: {ad.advertiserEmail || "-"}</p>
                        <p>Phone: {ad.advertiserPhone || "-"}</p>
                        <p>Priority: {ad.priority}</p>
                        <p>Price: Rs. {Number(ad.amount || 0).toLocaleString("en-IN")}</p>
                        <p>Duration: {ad.durationDays} day{ad.durationDays > 1 ? "s" : ""}</p>
                        <p>Activity Date: {formatDate(getAdvertisementActivityDate(ad))}</p>
                        <p>Paid At: {formatDateTime(ad.paidAt)}</p>
                        <p>Runs: {formatDate(ad.startsAt)} to {formatDate(ad.endsAt)}</p>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button type="button" onClick={() => startEditAd(ad)} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900">
                          Edit
                        </button>
                        <button type="button" onClick={() => deleteAd(ad._id)} className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white">
                          Delete
                        </button>
                        {ad.status === "pending_approval" ? (
                          <button type="button" onClick={() => approveAd(ad._id)} className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white">
                            Approve
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {!visibleManagedAds.length ? <p className="text-slate-500">No advertisements match the current filters.</p> : null}
                </div>
              </div>
            </div>

          </div>
        </div>
      ) : null}

      {user?.role === "super_admin" ? (
        <>
          {showAdRequestsPanel ? (
            <div className="fixed inset-0 z-[85] flex justify-end bg-slate-950/70 px-4 py-4 backdrop-blur-sm">
              <div className="voice-desk-scroll w-full max-w-2xl rounded-[32px] border border-white/10 bg-slate-950/95 p-6 shadow-[0_32px_80px_rgba(15,23,42,0.45)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">Super Admin Queue</p>
                    <h2 className="mt-3 text-2xl font-semibold text-white">Advertisement Requests</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Only pending paid advertisement requests appear here for final super admin review.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAdRequestsPanel(false)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/20 hover:text-white"
                    aria-label="Close advertisement requests panel"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-6 space-y-4">
                  {reviewableAds.map((ad) => (
                    <div key={ad._id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                      {ad.imageUrl ? (
                        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                          <img src={ad.imageUrl} alt={ad.title} className="aspect-[16/9] w-full object-contain" />
                        </div>
                      ) : null}
                      <div className="mt-4 flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{ad.title}</p>
                          <p className="mt-1 text-sm text-slate-500">{adPlacements.find((placement) => placement.value === ad.placement)?.label || ad.placement}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-orange-300">{ad.status}</span>
                          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-300">{ad.paymentStatus || "pending"}</span>
                        </div>
                      </div>
                      {ad.description ? <p className="mt-3 text-sm leading-6 text-slate-400">{ad.description}</p> : null}
                      <div className="mt-4 grid gap-2 text-sm text-slate-500">
                        <p>Advertiser: {ad.advertiserName || "-"}</p>
                        <p>Email: {ad.advertiserEmail || "-"}</p>
                        <p>Phone: {ad.advertiserPhone || "-"}</p>
                        <p>Company: {ad.companyName || "-"}</p>
                        <p>Priority: {ad.priority}</p>
                        <p>Duration: {ad.durationDays} day{ad.durationDays > 1 ? "s" : ""}</p>
                        <p>Price: Rs. {Number(ad.amount || 0).toLocaleString("en-IN")}</p>
                        <p>Target URL: {ad.targetUrl || "Not provided"}</p>
                        <p>Paid At: {formatDate(ad.paidAt)}</p>
                        <p>Runs: {formatDate(ad.startsAt)} to {formatDate(ad.endsAt)}</p>
                        {ad.notes ? <p>Notes: {ad.notes}</p> : null}
                        {ad.rejectionReason ? <p>Review note: {ad.rejectionReason}</p> : null}
                      </div>
                      {ad.status === "pending_approval" ? (
                        <textarea className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" rows="2" placeholder="Optional approval or rejection note" value={feedbacks[`ad-${ad._id}`] || ""} onChange={(event) => setFeedbacks({ ...feedbacks, [`ad-${ad._id}`]: event.target.value })} />
                      ) : null}
                      <div className="mt-4 flex flex-wrap gap-3">
                        {ad.status === "pending_approval" ? (
                          <button type="button" onClick={() => approveAd(ad._id)} className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white">
                            Approve & Publish
                          </button>
                        ) : null}
                        {ad.status === "pending_approval" ? (
                          <button type="button" onClick={() => rejectAd(ad._id)} className="rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white">
                            Reject
                          </button>
                        ) : null}
                        <button type="button" onClick={() => startEditAd(ad)} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900">
                          Edit
                        </button>
                        <button type="button" onClick={() => deleteAd(ad._id)} className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white">
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {!reviewableAds.length ? <p className="text-slate-500">No pending paid advertisement requests are available right now.</p> : null}
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
};
