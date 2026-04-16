import { validationResult } from "express-validator";
import { StatusCodes } from "http-status-codes";

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
    message: "Validation failed",
    errors: errors.array(),
  });
};

