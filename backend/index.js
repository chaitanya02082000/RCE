import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";
import dotenv from "dotenv";
import snippetRoutes from "./routes/snippets.js";
import judge0Service from "./services/judge0.js";

dotenv.config();

const app = express();

// ✅ Production-ready CORS
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:3000",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.some((allowed) => origin.startsWith(allowed))) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposedHeaders: ["Set-Cookie"],
  }),
);

app.use(cookieParser());

// ✅ Trust proxy for production (Render uses proxies)
app.set("trust proxy", 1);

// Request logging (only in dev)
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.url}`);
    next();
  });
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Better Auth routes
app.all("/api/auth/*", toNodeHandler(auth));

// JSON parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// API routes
app.use("/api/snippets", snippetRoutes);

// Redirect dashboard to frontend
app.get("/dashboard", (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  res.redirect(frontendUrl + "/dashboard");
});

// Root endpoint
app.get("/", (req, res) => {
  if (req.cookies && req.cookies["better-auth.session_token"]) {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    return res.redirect(frontendUrl + "/dashboard");
  }

  res.json({
    status: "Code Executor API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    endpoints: {
      auth: "/api/auth/*",
      execute: "/api/execute",
      snippets: "/api/snippets",
      health: "/health",
    },
  });
});

// Code execution endpoint
app.post("/api/execute", async (req, res) => {
  const { code, language, stdin } = req.body;

  if (!code || !language) {
    return res.status(400).json({
      error: "Code and language are required",
    });
  }

  try {
    const result = await judge0Service.execute(code, language, stdin || "");

    res.json({
      output: result.output,
      executionTime: new Date().toISOString(),
      stats: {
        time: result.time,
        memory: result.memory,
      },
    });
  } catch (error) {
    console.error("Execution error:", error.message);

    res.status(500).json({
      error: error.message || "An error occurred during code execution",
      executionTime: new Date().toISOString(),
    });
  }
});

// Get supported languages
app.get("/api/languages", (req, res) => {
  res.json({
    languages: [
      { id: "javascript", name: "JavaScript (Node.js)", judge0Id: 63 },
      { id: "python", name: "Python 3", judge0Id: 71 },
      { id: "java", name: "Java", judge0Id: 62 },
      { id: "cpp", name: "C++", judge0Id: 54 },
      { id: "c", name: "C", judge0Id: 50 },
    ],
  });
});

// Test Judge0 connection
app.get("/api/test-judge0", async (req, res) => {
  try {
    const isConnected = await judge0Service.testConnection();

    res.json({
      success: isConnected,
      apiUrl: process.env.JUDGE0_API_URL,
      usingRapidAPI: process.env.JUDGE0_USE_RAPIDAPI === "true",
      hasApiKey: !!process.env.JUDGE0_API_KEY,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not found",
    path: req.path,
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);

  res.status(err.status || 500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "An unexpected error occurred"
        : err.message,
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

app.listen(Number(PORT), HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(
    `🌐 CORS enabled for: ${process.env.FRONTEND_URL || "all origins"}`,
  );
  console.log(`🔐 Auth endpoints: /api/auth/*`);
  console.log(`📝 Snippet endpoints: /api/snippets`);
  console.log(
    `⚖️  Judge0 API: ${process.env.JUDGE0_API_URL || "Not configured"}`,
  );
});
