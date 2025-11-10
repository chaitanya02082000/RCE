import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const JUDGE0_API_URL = process.env.JUDGE0_API_URL || "http://localhost:2358";
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY; // Only needed for RapidAPI

// Language ID mappings for Judge0
const LANGUAGE_IDS = {
  javascript: 63, // Node.js
  js: 63,
  python: 71, // Python 3
  python3: 71,
  java: 62, // Java
  cpp: 54, // C++ (GCC 9.2.0)
  "c++": 54,
  c: 50, // C (GCC 9.2.0)
};

class Judge0Service {
  constructor() {
    this.apiUrl = JUDGE0_API_URL;
    this.apiKey = JUDGE0_API_KEY;

    // Configure axios instance
    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey && {
          "X-RapidAPI-Key": this.apiKey,
          "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
        }),
      },
    });
  }

  /**
   * Get language ID from language name
   */
  getLanguageId(language) {
    const langId = LANGUAGE_IDS[language.toLowerCase()];
    if (!langId) {
      throw new Error(`Unsupported language: ${language}`);
    }
    return langId;
  }

  /**
   * Submit code for execution
   */
  async submitCode(code, language, stdin = "") {
    try {
      const languageId = this.getLanguageId(language);

      const response = await this.client.post(
        "/submissions",
        {
          source_code: Buffer.from(code).toString("base64"),
          language_id: languageId,
          stdin: stdin ? Buffer.from(stdin).toString("base64") : null,
          // Limits
          cpu_time_limit: 10, // 10 seconds
          memory_limit: 256000, // 256 MB
          max_file_size: 1024, // 1 MB
        },
        {
          params: {
            base64_encoded: true,
            wait: false, // Don't wait for result, we'll poll
          },
        },
      );

      return response.data.token;
    } catch (error) {
      console.error(
        "Judge0 submission error:",
        error.response?.data || error.message,
      );
      throw new Error("Failed to submit code for execution");
    }
  }

  /**
   * Get submission result
   */
  async getSubmission(token, maxRetries = 10) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await this.client.get(`/submissions/${token}`, {
          params: {
            base64_encoded: true,
            fields: "*",
          },
        });

        const submission = response.data;

        // Status codes:
        // 1 = In Queue, 2 = Processing
        // 3 = Accepted, 4 = Wrong Answer, 5 = Time Limit Exceeded
        // 6 = Compilation Error, etc.

        if (submission.status.id <= 2) {
          // Still processing, wait and retry
          await this.sleep(1000); // Wait 1 second
          continue;
        }

        // Execution completed
        return this.parseResult(submission);
      } catch (error) {
        console.error(
          "Judge0 get submission error:",
          error.response?.data || error.message,
        );
        throw new Error("Failed to get execution result");
      }
    }

    throw new Error("Execution timeout: Code took too long to execute");
  }

  /**
   * Parse Judge0 result
   */
  parseResult(submission) {
    const status = submission.status;

    // Decode base64 outputs
    const stdout = submission.stdout
      ? Buffer.from(submission.stdout, "base64").toString("utf-8")
      : "";

    const stderr = submission.stderr
      ? Buffer.from(submission.stderr, "base64").toString("utf-8")
      : "";

    const compile_output = submission.compile_output
      ? Buffer.from(submission.compile_output, "base64").toString("utf-8")
      : "";

    const result = {
      success: status.id === 3, // Accepted
      output: stdout || stderr || compile_output || status.description,
      status: status.description,
      time: submission.time, // Execution time in seconds
      memory: submission.memory, // Memory used in KB
    };

    // Handle different status codes
    switch (status.id) {
      case 3: // Accepted
        result.output =
          stdout || "Program executed successfully with no output";
        break;

      case 4: // Wrong Answer (shouldn't happen for our use case)
        result.output = stdout || stderr;
        break;

      case 5: // Time Limit Exceeded
        throw new Error(
          "Execution timeout: Your code took too long to execute (max 10 seconds)",
        );

      case 6: // Compilation Error
        throw new Error(`Compilation Error:\n${compile_output}`);

      case 7: // Runtime Error (SIGSEGV)
      case 8: // Runtime Error (SIGXFSZ)
      case 9: // Runtime Error (SIGFPE)
      case 10: // Runtime Error (SIGABRT)
      case 11: // Runtime Error (NZEC)
      case 12: // Runtime Error (Other)
        throw new Error(
          `Runtime Error:\n${stderr || "Your code crashed during execution"}`,
        );

      case 13: // Internal Error
        throw new Error("Internal execution error. Please try again.");

      case 14: // Exec Format Error
        throw new Error("Execution format error. Please check your code.");

      default:
        if (stderr) {
          throw new Error(stderr);
        }
        break;
    }

    return result;
  }

  /**
   * Execute code and wait for result
   */
  async execute(code, language, stdin = "") {
    const token = await this.submitCode(code, language, stdin);
    const result = await this.getSubmission(token);
    return result;
  }

  /**
   * Helper to sleep
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default new Judge0Service();
