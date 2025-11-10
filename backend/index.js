const express = require("express");
const path = require("path");
const cors = require("cors");
const {
  execShellCommand,
  createUser,
  deleteUser,
  killProcessGroup,
} = require("./utils");
const app = express();
const { v4: uuidv4 } = require("uuid");

// CORS configuration
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/test", (req, res) => {
  res.json({ message: "CORS is working!" });
});

app.post("/api/execute", async (req, res) => {
  console.log("Received execution request:", {
    language: req.body.language,
    codeLength: req.body.code?.length,
  });

  const { code, language } = req.body;

  if (!code || !language) {
    return res.status(400).json({ error: "Code and language are required" });
  }

  const execId = `exec_${uuidv4()}`;

  try {
    await createUser(execId);
    const userHomeDir = `/home/${execId}`;
    const tempDir = path.join(userHomeDir, "temp", execId);

    await execShellCommand(`sudo -u ${execId} mkdir -p ${tempDir}`);

    // Escape single quotes in code
    const escapedCode = code.replace(/'/g, "'\\''");

    // Different limits for different languages
    let scriptContent = `#!/bin/bash
set -e
`;

    // Add language-specific execution logic with appropriate limits
    switch (language.toLowerCase()) {
      case "java": {
        const className = "Main";
        const javaFilePath = path.join(tempDir, `${className}.java`);

        await execShellCommand(
          `echo '${escapedCode}' | sudo -u ${execId} tee ${javaFilePath} > /dev/null`,
        );

        // Java needs more memory
        scriptContent += `
ulimit -t 10
ulimit -u 50
ulimit -f 10240
ulimit -m 524288
javac ${javaFilePath}
java -Xmx256m -Xms64m -cp ${tempDir} ${className}
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

        scriptContent += `
ulimit -t 10
ulimit -u 40
ulimit -f 10240
ulimit -d 262144
ulimit -s 8192
g++ -o ${executableFile} ${cppFilePath}
${executableFile}
`;
        break;
      }

      case "javascript":
      case "js": {
        const jsFilePath = path.join(tempDir, "script.js");

        await execShellCommand(
          `echo '${escapedCode}' | sudo -u ${execId} tee ${jsFilePath} > /dev/null`,
        );

        // Node.js needs reasonable memory to start
        scriptContent += `
ulimit -t 10
ulimit -u 40
ulimit -f 10240
ulimit -d 262144
ulimit -s 8192
node --max-old-space-size=128 ${jsFilePath}
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
ulimit -d 262144
ulimit -s 8192
python3 ${pyFilePath}
`;
        break;
      }

      default:
        return res
          .status(400)
          .json({ error: `Unsupported language: ${language}` });
    }

    // Write the script to a file
    const scriptPath = path.join(tempDir, "execute.sh");
    const escapedScript = scriptContent.replace(/'/g, "'\\''");

    await execShellCommand(
      `echo '${escapedScript}' | sudo -u ${execId} tee ${scriptPath} > /dev/null`,
    );
    await execShellCommand(`sudo chmod +x ${scriptPath}`);

    // Execute the script with timeout
    const executeCommand = `sudo -u ${execId} timeout 15 bash ${scriptPath} 2>&1`;

    let output;
    try {
      output = await execShellCommand(executeCommand, {
        timeout: 16000,
        maxBuffer: 1024 * 1024,
      });
    } catch (execError) {
      // Capture error output
      const errorOutput = execError.message || execError.toString();

      if (errorOutput.includes("timeout") || errorOutput.includes("SIGTERM")) {
        throw new Error(
          "Execution timeout: Your code took too long to execute (max 15 seconds)",
        );
      } else if (
        errorOutput.includes("Segmentation fault") ||
        errorOutput.includes("core dumped")
      ) {
        throw new Error(
          "Segmentation fault: Your code caused a memory access violation",
        );
      } else if (
        errorOutput.includes("out of memory") ||
        errorOutput.includes("OOM")
      ) {
        throw new Error("Out of memory: Your code used too much memory");
      } else if (errorOutput.includes("CPU time")) {
        throw new Error("CPU time limit exceeded");
      } else {
        throw new Error(errorOutput);
      }
    }

    res.json({
      output: output || "Program executed successfully with no output",
      executionTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Execution error:", error.message);

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
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`CORS enabled for all origins`);
});
