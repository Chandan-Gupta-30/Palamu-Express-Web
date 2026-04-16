# Palamu Express API Documentation

Base URL: `/api`

## Auth

- `POST /auth/register`
  Registers reporter, chief editor, advertiser, or admin users.
- `POST /auth/login`
  Returns JWT token and current user.
- `PATCH /auth/verify-phone/:userId`
  Development scaffold for OTP verification state.
- `POST /auth/seed-super-admin`
  Seeds the initial super admin account.

## Users

- `GET /users/me`
  Returns the authenticated user profile.
- `GET /users`
  Admin/editor user management list.
- `PATCH /users/:id/approve`
  Approves reporter/editor onboarding. Reporter approval generates ID card PDF.
- `PATCH /users/:id/reject`
  Rejects onboarding with feedback.
- `PATCH /users/bookmarks/:articleId`
  Toggles bookmark for logged-in user.

## Articles

- `GET /articles/homepage/feed`
  Homepage blocks: breaking, latest, trending, district-wise.
- `GET /articles`
  Search and filter by `district`, `keyword`, `status`.
- `GET /articles/:slug`
  Fetches article detail and increments views.
- `POST /articles`
  Reporter submits article into pending review.
- `PATCH /articles/:id`
  Reporter updates own article.
- `PATCH /articles/:id/approve`
  Chief editor/admin publishes article.
- `PATCH /articles/:id/reject`
  Chief editor/admin rejects with feedback.
- `POST /articles/:id/summarize`
  Generates AI summary through Gemini service wrapper.

## Admin

- `GET /admin/overview`
  Dashboard metrics for users, pending approvals, published stories, and active ads.

## Advertisements

- `GET /ads/active`
  Lists active, non-expired ads.
- `POST /ads`
  Creates ad and Razorpay order for advertiser.
- `PATCH /ads/:id/verify-payment`
  Marks ad payment successful and activates duration.

## Analytics

- `GET /analytics`
  Top viewed articles and total views.

## Socket Events

- `analytics:join`
  Join article room by slug.
- `analytics:update`
  Receive updated page-view count.
