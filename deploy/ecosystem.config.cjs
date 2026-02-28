const fs = require("fs");
const path = require("path");

// Load .env.local so the worker (tsx) gets the same env vars as Next.js
function loadEnvFile(filePath) {
  const env = {};
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      // Strip surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  } catch {
    // File doesn't exist — that's fine
  }
  return env;
}

const appDir = "/app";
const envLocal = loadEnvFile(path.join(appDir, ".env.local"));

module.exports = {
  apps: [
    {
      name: "web",
      script: "npm",
      args: "start",
      cwd: appDir,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "worker",
      script: "npm",
      args: "run worker",
      cwd: appDir,
      env: {
        NODE_ENV: "production",
        RUN_BACKGROUND_WORKER: "true",
        ...envLocal,
      },
    },
  ],
};
