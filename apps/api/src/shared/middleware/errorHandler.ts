import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import config from "@shared/config";
import logger from "@shared/utils/logger";

export const globalRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: { success: false, message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many authentication attempts, please try again later." },
  skipSuccessfulRequests: true,
});

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  logger.error("Error occurred:", {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  const statusCode = (error as any).statusCode || 500;
  const message =
    config.app.env === "production" ? "Something went wrong!" : error.message;

  res.status(statusCode).json({
    success: false,
    message,
    ...(config.app.env !== "production" && { stack: error.stack }),
  });
};

export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
};
