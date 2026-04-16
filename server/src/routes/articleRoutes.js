import { Router } from "express";
import {
  approveArticle,
  createArticle,
  deletePublishedArticlesByDate,
  deleteArticle,
  getArticleBySlug,
  getArticles,
  getHomepageFeed,
  getPublishedArticlesByDate,
  getWorkflowArticles,
  generateVoiceArticleDraft,
  incrementArticleView,
  rejectArticle,
  summarizeArticleById,
  updateArticle,
} from "../controllers/articleController.js";
import { authorize, protect } from "../middlewares/auth.js";
import { roles } from "../utils/constants.js";

const router = Router();

router.get("/homepage/feed", getHomepageFeed);
router.get("/workflow/list", protect, authorize(roles.REPORTER, roles.CHIEF_EDITOR, roles.SUPER_ADMIN), getWorkflowArticles);
router.post("/voice-draft", protect, authorize(roles.REPORTER, roles.CHIEF_EDITOR, roles.SUPER_ADMIN), generateVoiceArticleDraft);
router.get("/published/archive", protect, authorize(roles.SUPER_ADMIN, roles.CHIEF_EDITOR), getPublishedArticlesByDate);
router.delete("/published/archive", protect, authorize(roles.SUPER_ADMIN, roles.CHIEF_EDITOR), deletePublishedArticlesByDate);
router.get("/", getArticles);
router.get("/:slug", getArticleBySlug);
router.post("/:slug/view", incrementArticleView);
router.post("/", protect, authorize(roles.REPORTER, roles.CHIEF_EDITOR, roles.SUPER_ADMIN), createArticle);
router.patch("/:id", protect, authorize(roles.REPORTER, roles.CHIEF_EDITOR, roles.SUPER_ADMIN), updateArticle);
router.delete("/:id", protect, authorize(roles.REPORTER, roles.CHIEF_EDITOR, roles.SUPER_ADMIN), deleteArticle);
router.patch("/:id/approve", protect, authorize(roles.SUPER_ADMIN, roles.CHIEF_EDITOR), approveArticle);
router.patch("/:id/reject", protect, authorize(roles.SUPER_ADMIN, roles.CHIEF_EDITOR), rejectArticle);
router.post("/:id/summarize", summarizeArticleById);

export default router;
