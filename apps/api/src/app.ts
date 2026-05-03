import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config, validateConfig } from "./config";
import { errorHandler } from "./middlewares/errorHandler";
import predictionRoutes from "./routes/predictionRoutes";

// Validate environment on startup
validateConfig();

const app = express();

// --------------- Middleware ---------------
app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// --------------- Routes ---------------

// Health check
app.get("/health", (_req, res) => {
  res.json({
    success: true,
    data: {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    },
  });
});

// API v1 routes
app.use("/api/v1", predictionRoutes);

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// --------------- Start Server ---------------
app.listen(config.port, () => {
  console.log(`🚀 API server running on http://localhost:${config.port}`);
  console.log(`📋 Health check: http://localhost:${config.port}/health`);
  console.log(`🔧 Environment: ${config.nodeEnv}`);
});

export default app;
