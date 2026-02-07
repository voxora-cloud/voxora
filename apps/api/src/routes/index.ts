import { Router } from "express";
import authRoutes from "./auth";
import adminRoutes from "./admin";
import agentRoutes from "./agent";
import widgetRoutes from "./widget";
import conversationRoutes from "./conversations";
import storageRoutes from "./storage";

const router = Router();

// API Routes
router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/agent", agentRoutes);
router.use("/widget", widgetRoutes);
router.use("/conversations", conversationRoutes);
router.use("/storage", storageRoutes);

// Health check
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "API is healthy",
    timestamp: new Date().toISOString(),
  });
});

export default router;
