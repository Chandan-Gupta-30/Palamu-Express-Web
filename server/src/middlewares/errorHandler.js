import { StatusCodes } from "http-status-codes";

export const notFound = (req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({ message: `Route not found: ${req.originalUrl}` });
};

export const errorHandler = (err, req, res, next) => {
  const status = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  res.status(status).json({
    message: err.message || "Server error",
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};

