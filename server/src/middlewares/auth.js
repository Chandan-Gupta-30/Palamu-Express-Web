import { StatusCodes } from "http-status-codes";
import { verifyToken } from "../utils/jwt.js";
import { User } from "../models/User.js";

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Authentication required" });
  }

  const decoded = verifyToken(token);
  const user = await User.findById(decoded.id).select("-password");

  if (!user) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: "User not found" });
  }

  req.user = user;
  next();
};

export const authorize = (...allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(StatusCodes.FORBIDDEN).json({ message: "Access denied" });
  }
  next();
};

