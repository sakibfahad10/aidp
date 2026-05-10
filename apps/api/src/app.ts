import { clerkMiddleware } from "@clerk/express";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { config, validateConfig } from "./config";
import { errorHandler } from "./middlewares/errorHandler";
import doctorRoutes from "./routes/doctorRoutes";
import healthProfileRoutes from "./routes/healthProfileRoutes";
import predictionRoutes from "./routes/predictionRoutes";
import userRoutes from "./routes/userRoutes";
import webhookRoutes from "./routes/webhookRoutes";

validateConfig();

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
app.use(morgan("dev"));

// Webhook route BEFORE express.json() — needs raw body for signature verification
app.use("/api/v1", webhookRoutes);

app.use(express.json({ limit: "1mb" }));
app.use(clerkMiddleware());

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

app.use("/api/v1", predictionRoutes);
app.use("/api/v1", userRoutes);
app.use("/api/v1", doctorRoutes);
app.use("/api/v1", healthProfileRoutes);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`🚀 API server running on http://localhost:${config.port}`);
  console.log(`📋 Health check: http://localhost:${config.port}/health`);
  console.log(`🔧 Environment: ${config.nodeEnv}`);
});

export default app;
