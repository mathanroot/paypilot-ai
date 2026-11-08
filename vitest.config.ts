import { defineConfig } from "vitest/config";
import path from "path";
import fs from "fs";

// Load .env cleanly into process.env for tests
const envPath = path.resolve(__dirname, "./.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  });
}

// In headless unit tests, mock network if offline
if (!process.env.TEST_LIVE_PAYPAL) {
  process.env.PAYPAL_CLIENT_ID = "sb-demo-client-id";
  process.env.PAYPAL_CLIENT_SECRET = "sb-demo-client-secret";
}

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
