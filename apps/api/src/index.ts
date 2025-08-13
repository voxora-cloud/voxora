import express from "express";
import { createServer } from "http";
import cors from "cors";
import helmet from "helmet";
import config from "./config";
import { connectDatabase } from "./config/database";
import { connectRedis } from "./config/redis";
import routes from "./routes";
import { globalRateLimit, errorHandler, notFound } from "./middleware";
import SocketManager from "./sockets";
import { setSocketManager } from "./controllers/conversationController";
import logger from "./utils/logger";
import path from "path";

class Application {
  private app: express.Application;
  private server: any;
  private socketManager: SocketManager;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    this.socketManager = new SocketManager(this.server);

    // Set socket manager instance in conversation controller
    setSocketManager(this.socketManager);
  }

  private setupMiddleware(): void {
    // Security middleware
    // Todo: Implement security best practices
    this.app.use(
      helmet({
        crossOriginEmbedderPolicy: false,
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            frameAncestors: ["*"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["*", "data:", "blob:"],
            connectSrc: ["*"],
            fontSrc: ["*", "data:"],
            mediaSrc: ["*"],
            objectSrc: ["'none'"],
          },
        },
      }),
    );

    // CORS configuration
    // Todo: Implement CORS best practices
    this.app.use(
      cors({
        origin: "*",
      }),
    );

    // Rate limiting
    this.app.use(globalRateLimit);

    // Body parsing middleware
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // Serve uploads statically (for logos and assets)
    const uploadsDir = path.resolve(process.cwd(), config.upload.uploadPath);
    this.app.use(
      "/uploads",
      express.static(uploadsDir, {
        maxAge: "1d",
        setHeaders: (res) => {
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        },
      }),
    );

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
    // API routes
    this.app.use("/api/v1", routes);

    // Serve HTML at /widget
    // ** NOTE: temporary hosting cdn from this api server later cdn will seprately hosted
    this.app.get("/widget", (req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.type("text/html"); // correct MIME type for HTML
      res.sendFile(path.join(__dirname, "public", "widget.html"));
    });

    this.app.get("/widget-loader.js", (req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.type("application/javascript");
      res.sendFile(path.join(__dirname, "public", "widget-loader.js"));
    });

    // Root endpoint
    this.app.get("/", (req, res) => {
      res.json({
        success: true,
        message: "Voxora Chat API",
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

      // Start server
      this.server.listen(config.app.port, () => {
        logger.info(`🚀 Server running on port ${config.app.port}`);
        logger.info(`📱 Environment: ${config.app.env}`);
        logger.info(`🔗 API URL: ${config.app.apiUrl}`);
        logger.info(`💾 MongoDB: Connected`);
        logger.info(`📮 Redis: Connected`);
        logger.info(`🔌 Socket.IO: Ready`);
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
