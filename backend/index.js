import express from "express";
import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser"; // ✅ Add this
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config();

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const {
  execShellCommand,
  createUser,
  deleteUser,
  killProcessGroup,
} = require("./utils.js");

const app = express();

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposedHeaders: ["Set-Cookie"],
  }),
);

// ✅ Add cookie parser
app.use(cookieParser());

// Debug middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url}`);
  if (req.url.includes("callback")) {
    console.log("Query params:", req.query);
  }
  next();
});

// Better Auth routes
app.all("/api/auth/*", toNodeHandler(auth));

// ✅ Redirect handler for dashboard
app.get("/dashboard", (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  console.log(
    "🔄 Redirecting /dashboard to frontend:",
    frontendUrl + "/dashboard",
  );
  res.redirect(frontendUrl + "/dashboard");
});

// Root endpoint
app.get("/", (req, res) => {
  // Check if user has session cookie
  if (req.cookies && req.cookies["better-auth.session_token"]) {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    console.log("🔄 User has session, redirecting to frontend dashboard");
    return res.redirect(frontendUrl + "/dashboard");
  }

  res.json({
    status: "Server is running",
    timestamp: new Date().toISOString(),
    database: process.env.DATABASE_URL ? "Connected" : "Not configured",
  });
});

app.use(express.json());

// Your existing /api/execute endpoint
app.post("/api/execute", async (req, res) => {
  console.log("\n=== NEW EXECUTION REQUEST ===");
  console.log("Language:", req.body.language);
  console.log("Code:", req.body.code);

  const { code, language } = req.body;

  if (!code || !language) {
    return res.status(400).json({ error: "Code and language are required" });
  }

  const execId = `exec_${uuidv4().replace(/-/g, "")}`;

  try {
    await createUser(execId);
    const userHomeDir = `/home/${execId}`;
    const tempDir = path.join(userHomeDir, "temp", execId);

    await execShellCommand(`sudo -u ${execId} mkdir -p ${tempDir}`);

    const escapedCode = code.replace(/'/g, "'\\''");
    let scriptContent = `#!/bin/bash\n`;
    let memoryLimit = "256M";
    let cpuQuota = "100%";

    switch (language.toLowerCase()) {
      case "java": {
        const className = "Main";
        const javaFilePath = path.join(tempDir, `${className}.java`);
        await execShellCommand(
          `echo '${escapedCode}' | sudo -u ${execId} tee ${javaFilePath} > /dev/null`,
        );
        memoryLimit = "512M";
        scriptContent += `
ulimit -t 10
ulimit -u 50
ulimit -f 10240
cd ${tempDir}
javac ${javaFilePath} 2>&1
java -Xmx256m -Xms64m -cp ${tempDir} ${className} 2>&1
`;
        break;
      }

      case "cpp":
      case "c++": {
        const cppFilePath = path.join(tempDir, "program.cpp");
        const executableFile = path.join(tempDir, "program");
        await execShellCommand(
          `echo '${escapedCode}' | sudo -u ${execId} tee ${cppFilePath} > /dev/null`,
        );
        memoryLimit = "256M";
        scriptContent += `
ulimit -t 10
ulimit -u 40
ulimit -f 10240
cd ${tempDir}
g++ -o ${executableFile} ${cppFilePath} 2>&1
${executableFile} 2>&1
`;
        break;
      }

      case "javascript":
      case "js": {
        const jsFilePath = path.join(tempDir, "script.js");
        await execShellCommand(
          `echo '${escapedCode}' | sudo -u ${execId} tee ${jsFilePath} > /dev/null`,
        );
        scriptContent += `
ulimit -t 10
ulimit -u 40
ulimit -f 10240
cd ${tempDir}
/usr/bin/node --max-old-space-size=200 ${jsFilePath} 2>&1
`;
        break;
      }

      case "python3":
      case "python": {
        const pyFilePath = path.join(tempDir, "script.py");
        await execShellCommand(
          `echo '${escapedCode}' | sudo -u ${execId} tee ${pyFilePath} > /dev/null`,
        );
        scriptContent += `
ulimit -t 10
ulimit -u 40
ulimit -f 10240
cd ${tempDir}
/usr/bin/python3 ${pyFilePath} 2>&1
`;
        break;
      }

      default:
        return res
          .status(400)
          .json({ error: `Unsupported language: ${language}` });
    }

    const scriptPath = path.join(tempDir, "execute.sh");
    const escapedScript = scriptContent.replace(/'/g, "'\\''");

    await execShellCommand(
      `echo '${escapedScript}' | sudo -u ${execId} tee ${scriptPath} > /dev/null`,
    );
    await execShellCommand(`sudo chmod +x ${scriptPath}`);

    console.log("Executing script with systemd-run...");

    const executeCommand = `sudo systemd-run \
      --uid=${execId} \
      --scope \
      --slice=user.slice \
      --property=MemoryMax=${memoryLimit} \
      --property=MemoryHigh=${memoryLimit} \
      --property=CPUQuota=${cpuQuota} \
      --property=TasksMax=50 \
      bash ${scriptPath}`;

    let output;
    try {
      output = await execShellCommand(executeCommand, {
        timeout: 15000,
        maxBuffer: 1024 * 1024,
        killSignal: "SIGKILL",
      });

      console.log("Execution successful!");
      console.log("Output:", output);
    } catch (execError) {
      console.error("Execution failed!");
      console.error("Error code:", execError.code);
      console.error("Error output:", execError.output || execError.message);

      if (execError.killed || execError.signal === "SIGKILL") {
        throw new Error(
          "Execution timeout: Your code took too long to execute (max 15 seconds)",
        );
      }

      if (execError.code === 137) {
        throw new Error(
          "Process killed: CPU time limit exceeded (max 10 seconds)",
        );
      }

      if (execError.output && execError.output.includes("memory")) {
        throw new Error("Out of memory: Your code used too much memory");
      }

      if (execError.output && execError.output.trim()) {
        const errorOutput = execError.output.trim();
        const lines = errorOutput.split("\n");
        const relevantError = lines
          .filter(
            (line) =>
              !line.includes("execute.sh: line") &&
              !line.includes("core dumped") &&
              !line.includes("Running scope") &&
              line.trim().length > 0,
          )
          .join("\n");

        if (relevantError) {
          throw new Error(relevantError);
        }
      }

      throw new Error(execError.message || "Code execution failed");
    }

    res.json({
      output: output || "Program executed successfully with no output",
      executionTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Final error:", error.message);
    res.status(500).json({
      error: error.message || "An error occurred during code execution",
    });
  } finally {
    try {
      await deleteUser(execId);
    } catch (cleanupError) {
      console.error(`Cleanup error: ${cleanupError.message}`);
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(
    `🌐 CORS enabled for: ${process.env.FRONTEND_URL || "http://localhost:5173"}`,
  );
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth/*`);
  console.log(
    `📊 Database: ${process.env.DATABASE_URL ? "✅ Connected" : "❌ Not configured"}`,
  );
});
