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

app.post("/api/execute", async (req, res) => {
  console.log("\n=== NEW EXECUTION REQUEST ===");
  console.log("Language:", req.body.language);
  console.log("Code:", req.body.code);

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

    let scriptContent = `#!/bin/bash
`;

    // Add language-specific execution logic
    switch (language.toLowerCase()) {
      case "java": {
        const className = "Main";
        const javaFilePath = path.join(tempDir, `${className}.java`);

        await execShellCommand(
          `echo '${escapedCode}' | sudo -u ${execId} tee ${javaFilePath} > /dev/null`,
        );

        scriptContent += `
ulimit -t 10
ulimit -u 50
ulimit -f 10240
ulimit -s 8192
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

        scriptContent += `
ulimit -t 10
ulimit -u 40
ulimit -f 10240
ulimit -s 8192
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

        // Node.js needs less restrictive limits
        scriptContent += `
ulimit -t 10
ulimit -u 40
ulimit -f 10240
ulimit -s 16384
cd ${tempDir}
/usr/bin/node --max-old-space-size=256 ${jsFilePath} 2>&1
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
ulimit -s 8192
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

    // Write the script to a file
    const scriptPath = path.join(tempDir, "execute.sh");
    const escapedScript = scriptContent.replace(/'/g, "'\\''");

    await execShellCommand(
      `echo '${escapedScript}' | sudo -u ${execId} tee ${scriptPath} > /dev/null`,
    );
    await execShellCommand(`sudo chmod +x ${scriptPath}`);

    console.log("Executing script...");
    const executeCommand = `sudo -u ${execId} bash ${scriptPath}`;

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

      // Check if it was killed by timeout
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

      if (execError.code === 124) {
        throw new Error(
          "Execution timeout: Your code took too long to execute",
        );
      }

      // Return the actual error output if available
      if (execError.output && execError.output.trim()) {
        const errorOutput = execError.output.trim();
        // Filter out the bash line number info, just show the actual error
        const lines = errorOutput.split("\n");
        const relevantError = lines
          .filter(
            (line) =>
              !line.includes("execute.sh: line") &&
              !line.includes("core dumped") &&
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
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`CORS enabled for all origins`);
});
