import express from "express";
import { createServer } from "http";
import cors from "cors";
import helmet from "helmet";
import { Router } from "express";
import config from "@shared/config";
import { connectDatabase } from "@shared/config/database";
import { connectRedis } from "@shared/config/redis";
import { initializeMinIO } from "@shared/config/minio";
import { globalRateLimit, errorHandler, notFound } from "@shared/middleware";
import SocketManager from "@sockets/index";
import { startAIResponseConsumer } from "@sockets/consumer";
import logger from "@shared/utils/logger";
import { authRouter } from "@modules/auth";
import { adminRouter } from "@modules/admin";
import { agentRouter } from "@modules/agent";
import { conversationRouter } from "@modules/conversation";
import { widgetRouter } from "@modules/widget";
import { storageRouter } from "@modules/storage";
import { knowledgeRouter } from "@modules/knowledge";

class Application {
  private app: express.Application;
  private server: ReturnType<typeof createServer>;
  private socketManager: SocketManager;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    // SocketManager sets its own module-level singleton — no setSocketManager call needed
    this.socketManager = new SocketManager(this.server);
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(
      helmet({
        crossOriginEmbedderPolicy: false, // required for widget iframe embedding via MinIO
        contentSecurityPolicy: false,     // API serves only JSON — no HTML, no CSP needed
      }),
    );


    this.app.use(
      cors({
        origin: true, // Reflect request origin — allows requests from any origin (adjust in production),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        exposedHeaders: ['Content-Range', 'X-Content-Range'],
        maxAge: 86400 // 24 hours
      }),
    );

    // Rate limiting
    this.app.set("trust proxy", 1); // Trust first proxy (if behind a reverse proxy)
    this.app.use(globalRateLimit);

    // Body parsing middleware
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

 

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });
      next();
    });
  }

  private setupRoutes(): void {
    const router = Router();

    // API Routes
    router.use("/auth", authRouter);
    router.use("/admin", adminRouter);
    router.use("/agent", agentRouter);
    router.use("/widget", widgetRouter);
    router.use("/conversations", conversationRouter);
    router.use("/storage", storageRouter);
    router.use("/knowledge", knowledgeRouter);

    // Health check
    router.get("/health", (req, res) => {
      res.json({
        success: true,
        message: "API is healthy",
        timestamp: new Date().toISOString(),
      });
    });

    // API routes
    this.app.use("/api/v1", router);

    // Root endpoint
    this.app.get("/", (req, res) => {
      res.json({
        success: true,
        message: "Voxora API",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
      });
    });
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use(notFound);

    // Global error handler
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Connect to databases
      await connectDatabase();
      await connectRedis();

      // Start AI response stream consumer (background loop)
      startAIResponseConsumer(this.socketManager);

      // Initialize MinIO (non-blocking - log error but don't crash)
      initializeMinIO().catch((error) => {
        logger.error('MinIO initialization failed (will retry on first use):', error);
      });

      // Start server
      this.server.listen(config.app.port, () => {
        logger.info(`🚀 Server running on port ${config.app.port}`);
        logger.info(`📱 Environment: ${config.app.env}`);
        logger.info(`🔗 API URL: ${config.app.apiUrl}`);
        logger.info(`🔌 Socket.IO: Ready`);
        logger.info(`💾 MongoDB: Connected`);
        logger.info(`📮 Redis: Connected`);
        logger.info(`📦 MinIO: Initializing...`);
        logger.info(`⚡ AI Stream: Starting...`);
      });

      // Graceful shutdown
      this.setupGracefulShutdown();
    } catch (error) {
      logger.error("Failed to start server:", error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      // Close server
      this.server.close(() => {
        logger.info("HTTP server closed");
      });

      // Close Socket.IO
      this.socketManager.getIO().close(() => {
        logger.info("Socket.IO server closed");
      });

      // Close database connections would go here
      // await disconnectDatabase();
      // await disconnectRedis();

      logger.info("Graceful shutdown completed");
      process.exit(0);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled Rejection at:", promise, "reason:", reason);
      process.exit(1);
    });

    process.on("uncaughtException", (error) => {
      logger.error("Uncaught Exception:", error);
      process.exit(1);
    });
  }
}

// Start the application
const app = new Application();
app.start();

export default app;
