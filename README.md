# Palamu Express

Production-oriented MERN news delivery platform for Jharkhand under the Palamu Express brand, with district hierarchy, role-based workflows, reporter KYC onboarding, real-time analytics, advertisement monetization, and AI-assisted article summaries.

## Stack

- Frontend: React, Vite, Tailwind CSS, React Router
- Backend: Node.js, Express, MongoDB, Mongoose, Socket.io
- Auth: JWT, bcrypt
- File uploads: Cloudinary integration scaffold
- Payments: Razorpay integration scaffold
- AI: Gemini summarization scaffold

## Project Structure

```text
client/   React frontend
server/   Express API + Socket.io backend
docs/     API and deployment documentation
```

## Quick Start

1. Copy `server/.env.example` to `server/.env`
2. Copy `client/.env.example` to `client/.env`
3. Install dependencies:

```bash
npm install
```

4. Start both apps:

```bash
npm run dev
```

Implementation notes, API details, and deployment setup are in `docs/API.md` and `docs/DEPLOYMENT.md`.
