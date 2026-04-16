# Palamu Express Deployment Guide

## Recommended Topology

- Frontend: Vercel
- Backend API + Socket server: Render or AWS Elastic Beanstalk / ECS
- Database: MongoDB Atlas
- Media: Cloudinary

## Environment Variables

### Backend

- `PORT`
- `CLIENT_URL`
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `GEMINI_API_KEY`

### Frontend

- `VITE_API_URL`
- `VITE_SOCKET_URL`

## Vercel Frontend

1. Import the repository.
2. Set root directory to `client`.
3. Add frontend environment variables.
4. Run build command: `npm run build`.
5. Publish output directory handled by Vite defaults.

## Render Backend

1. Create a new Web Service from this repository.
2. Set root directory to `server`.
3. Build command: `npm install`.
4. Start command: `npm start`.
5. Configure all backend environment variables.
6. Allow WebSocket support for Socket.io.

## AWS Option

- Package backend in a Docker container or deploy on Elastic Beanstalk.
- Host frontend on S3 + CloudFront or Vercel.
- Use Atlas IP allow list and secure production secrets via AWS Systems Manager.

## Production Hardening Checklist

- Replace development OTP stub with SMS provider integration.
- Replace Gemini stub with live Google Gemini API call.
- Verify Razorpay payment signature server-side.
- Upload reporter cards to Cloudinary or S3 instead of data URLs.
- Add test coverage, audit logging, and refresh-token strategy.
