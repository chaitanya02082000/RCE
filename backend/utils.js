import { exec } from "child_process";

class Semaphore {
  constructor(max) {
    this.max = max;
    this.count = 0;
    this.queue = [];
  }

  async acquire() {
    if (this.count < this.max) {
      this.count++;
      return Promise.resolve();
    }
    return new Promise((resolve) => this.queue.push(resolve));
  }

  release() {
    this.count--;
    if (this.queue.length > 0) {
      this.count++;
      const next = this.queue.shift();
      next();
    }
  }
}

const userCreationSemaphore = new Semaphore(1);

export const execShellCommand = (cmd, options = {}) => {
  return new Promise((resolve, reject) => {
    const defaultOptions = {
      timeout: 20000,
      maxBuffer: 1024 * 1024,
      ...options,
    };

    exec(cmd, defaultOptions, (error, stdout, stderr) => {
      if (error) {
        console.error("Command failed:", cmd);
        console.error("Error code:", error.code);

        // Filter out known non-critical errors
        const isCritical =
          !stderr.includes("mail spool") && !stderr.includes("No directory");

        if (isCritical) {
          console.error("Stderr:", stderr);
        }

        reject(error);
      } else {
        resolve(stdout.trim());
      }
    });
  });
};

export const createUser = async (username) => {
  await userCreationSemaphore.acquire();
  try {
    // Check if user already exists
    try {
      await execShellCommand(`id ${username} 2>/dev/null`);
      console.log(`User ${username} already exists, cleaning up...`);
      await execShellCommand(
        `sudo pkill -9 -u ${username} 2>/dev/null || true`,
      );
      await execShellCommand(
        `sudo userdel -r -f ${username} 2>/dev/null || true`,
      );
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch {
      // User doesn't exist, which is fine
    }

    // Create user with home directory and bash shell
    const createUserCommand = `sudo useradd -m -s /bin/bash ${username}`;
    await execShellCommand(createUserCommand);

    console.log(`User ${username} created successfully.`);
  } catch (error) {
    console.error(`Error creating user ${username}:`, error.message);
    throw error;
  } finally {
    userCreationSemaphore.release();
  }
};

export const deleteUser = async (username) => {
  await userCreationSemaphore.acquire();
  try {
    // Kill all processes owned by the user
    await execShellCommand(`sudo pkill -9 -u ${username} 2>/dev/null || true`);

    // Wait for processes to terminate
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Force delete user and home directory, suppress mail spool errors
    await execShellCommand(
      `sudo userdel -r -f ${username} 2>&1 | grep -v "mail spool" || true`,
    );

    console.log(`User ${username} deleted successfully.`);
  } catch (error) {
    if (!error.message.includes("mail spool")) {
      console.error(`Error deleting user ${username}:`, error.message);
    }
  } finally {
    userCreationSemaphore.release();
  }
};

export const killProcessGroup = async (pgid) => {
  try {
    await execShellCommand(`sudo kill -9 -${pgid} 2>/dev/null || true`);
  } catch {
    // Ignore errors silently
  }
};
