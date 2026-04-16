import { asyncHandler } from "../utils/asyncHandler.js";
import { Category } from "../models/Category.js";

export const getCategories = asyncHandler(async (req, res) => {
  const { district } = req.query;
  const query = district ? { district } : {};
  const categories = await Category.find(query).sort({ district: 1, block: 1 });
  res.json({ categories });
});

