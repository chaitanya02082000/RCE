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

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

const allowedOrigins = [
  FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.BASE_URL,
].filter(Boolean);

console.log("🌐 CORS allowed origins:", allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      const isAllowed = allowedOrigins.some(
        (allowed) => origin === allowed || origin.startsWith(allowed),
      );

      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn("❌ CORS blocked origin:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cookie",
      "X-Requested-With",
      "Accept",
    ],
    exposedHeaders: ["Set-Cookie"],
    maxAge: 86400,
  }),
);

app.options("*", cors());

app.use(cookieParser());

app.set("trust proxy", 1);

// ✅ Middleware to fix cookie attributes
if (IS_PRODUCTION) {
  app.use((req, res, next) => {
    const originalSetHeader = res.setHeader.bind(res);

    res.setHeader = function (name, value) {
      if (name.toLowerCase() === "set-cookie") {
        if (Array.isArray(value)) {
          value = value.map((cookie) => fixCookie(cookie));
        } else {
          value = fixCookie(value);
        }
      }
      return originalSetHeader(name, value);
    };

    next();
  });
}

function fixCookie(cookie) {
  if (typeof cookie !== "string") return cookie;

  // Remove __Secure- prefix that's causing issues
  cookie = cookie.replace("__Secure-better-auth", "better-auth");

  // Ensure SameSite=None and Secure for production
  if (IS_PRODUCTION) {
    // Remove existing SameSite
    cookie = cookie.replace(/;\s*SameSite=(Lax|Strict|None)/gi, "");
    // Remove existing Secure
    cookie = cookie.replace(/;\s*Secure/gi, "");

    // Add correct attributes
    cookie += "; SameSite=None; Secure";
  }

  return cookie;
}

// Request logging
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== "production" || req.url.includes("auth")) {
    console.log(`📨 ${req.method} ${req.url}`);
    if (req.url.includes("auth")) {
      console.log("   Origin:", req.headers.origin);
      console.log("   Cookies:", Object.keys(req.cookies).join(", ") || "none");
    }
  }
  next();
});

// Health check
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
  res.redirect(FRONTEND_URL + "/dashboard");
});

// Root endpoint
app.get("/", (req, res) => {
  if (req.cookies && req.cookies["better-auth.session_token"]) {
    return res.redirect(FRONTEND_URL + "/dashboard");
  }

  res.json({
    status: "Code Executor API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
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

// Debug auth config
app.get("/api/auth-config", (req, res) => {
  res.json({
    baseURL: process.env.BASE_URL,
    frontendURL: process.env.FRONTEND_URL,
    googleCallbackURL: `${process.env.BASE_URL}/api/auth/callback/google`,
    environment: process.env.NODE_ENV,
    isProduction: IS_PRODUCTION,
    cookieSettings: {
      sameSite: IS_PRODUCTION ? "none" : "lax",
      secure: IS_PRODUCTION,
    },
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleSecret: !!process.env.GOOGLE_CLIENT_SECRET,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not found",
    path: req.path,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);

  res.status(err.status || 500).json({
    error: IS_PRODUCTION ? "An unexpected error occurred" : err.message,
  });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

app.listen(Number(PORT), HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🌐 Frontend: ${FRONTEND_URL}`);
  console.log(`🍪 Cookie SameSite: ${IS_PRODUCTION ? "none" : "lax"}`);
  console.log(`🔒 Cookie Secure: ${IS_PRODUCTION}`);
});
